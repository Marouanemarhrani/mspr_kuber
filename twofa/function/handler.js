'use strict';

const { Pool } = require('pg');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

let pool = null;

function getPool() {
  if (pool) return pool;
  pool = new Pool({
    host: process.env.POSTGRES_HOST || 'postgres-service.default.svc.cluster.local',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'mspr',
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB || 'msprdb',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  return pool;
}

function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY is not configured');
  }
  return crypto.scryptSync(key, 'salt', 32);
}

function encrypt(text) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let enc = cipher.update(text, 'utf8', 'base64');
  enc += cipher.final('base64');
  return iv.toString('base64') + ':' + enc;
}

function parseInput(event) {
  const raw = event.body;
  if (typeof raw === 'object' && raw !== null && typeof raw.body === 'string') {
    try {
      const inner = JSON.parse(raw.body);
      if (inner && typeof inner === 'object') return inner;
    } catch (_) {}
  }
  if (typeof raw === 'object' && raw !== null) return raw;
  const str = typeof raw === 'string' ? raw : (raw && raw.toString ? raw.toString() : '');
  if (str.trim().startsWith('{')) {
    try { return JSON.parse(str); } catch (_) { return {}; }
  }
  return str.trim() ? { username: str } : {};
}

module.exports = async (event, context) => {
  const data = parseInput(event);
  const username = (data.username || '').trim();
  if (!username) {
    return context.status(400).succeed(JSON.stringify({ error: 'username required' }));
  }

  try {
    const client = await getPool().connect();
    try {
      const row = await client.query('SELECT id, username, mfa FROM users WHERE username = $1', [username]);
      if (row.rows.length === 0) {
        return context.status(404).succeed(JSON.stringify({ error: 'user not found; run generate-password first' }));
      }
      if (row.rows[0].mfa) {
        return context.status(400).succeed(JSON.stringify({ error: '2FA already activated', alreadyActivated: true }));
      }

      const secret = speakeasy.generateSecret({ name: 'MSPR-' + username, length: 20 });
      const otpauth = secret.otpauth_url;
      const encryptedMfa = encrypt(secret.base32);

      await client.query(
        'UPDATE users SET mfa = $1 WHERE username = $2',
        [encryptedMfa, username]
      );

      const qrBuffer = await QRCode.toBuffer(otpauth, { type: 'png', margin: 1 });
      const qrBase64 = qrBuffer.toString('base64');

      return context.status(200).succeed(JSON.stringify({
        username,
        qr_code: 'data:image/png;base64,' + qrBase64,
        secret: secret.base32,
      }));
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    return context.status(500).fail(JSON.stringify({ error: err.message }));
  }
};
