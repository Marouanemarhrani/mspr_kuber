'use strict';

const { Pool } = require('pg');
const crypto = require('crypto');
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

function generatePassword() {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%&*';
  const all = upper + lower + numbers + special;
  let pwd = '';
  pwd += upper[Math.floor(Math.random() * upper.length)];
  pwd += lower[Math.floor(Math.random() * lower.length)];
  pwd += numbers[Math.floor(Math.random() * numbers.length)];
  pwd += special[Math.floor(Math.random() * special.length)];
  for (let i = 4; i < 24; i++) pwd += all[Math.floor(Math.random() * all.length)];
  return pwd.split('').sort(() => Math.random() - 0.5).join('');
}

function parseInput(event) {
  const raw = event.body;
  // OpenFaaS gateway sometimes sends envelope: { body: '{"username":"..."}', "content-type": "..." }
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
  const method = (event.method || 'POST').toUpperCase();

  try {
    const data = parseInput(event);
    const username = (data.username || '').trim();
    if (!username) {
      return context.status(400).succeed(JSON.stringify({ error: 'username required' }));
    }

    const client = await getPool().connect();
    try {
      const existing = await client.query(
        'SELECT 1 FROM users WHERE username = $1 LIMIT 1',
        [username]
      );
      if (existing.rows.length > 0) {
        return context.status(409).succeed(JSON.stringify({ error: 'username already exists' }));
      }

      const plainPassword = generatePassword();
      const encryptedPassword = encrypt(plainPassword);
      const gendate = Math.floor(Date.now() / 1000);

      const qrBuffer = await QRCode.toBuffer(plainPassword, { type: 'png', margin: 1 });
      const qrBase64 = qrBuffer.toString('base64');

      await client.query(
        `INSERT INTO users (username, password, mfa, gendate, expired)
         VALUES ($1, $2, NULL, $3, 0)`,
        [username, encryptedPassword, gendate]
      );

      return context.status(200).succeed(JSON.stringify({
        username,
        password: plainPassword,
        qr_code: 'data:image/png;base64,' + qrBase64,
        gendate,
      }));
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    return context.status(500).fail(JSON.stringify({ error: err.message }));
  }
};
