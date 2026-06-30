'use strict';

const { Pool } = require('pg');
const crypto = require('crypto');
const speakeasy = require('speakeasy');

const SIX_MONTHS_SEC = 6 * 30 * 24 * 60 * 60;

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

function decrypt(encrypted) {
  if (!encrypted || !encrypted.includes(':')) return null;
  const [ivB64, enc] = encrypted.split(':');
  const key = getEncryptionKey();
  const iv = Buffer.from(ivB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let dec = decipher.update(enc, 'base64', 'utf8');
  dec += decipher.final('utf8');
  return dec;
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
  return {};
}

module.exports = async (event, context) => {
  const data = parseInput(event);
  const username = (data.username || data.login || '').trim();
  const password = data.password || '';
  const twoFactorCode = (data.code || data.totp || data['2fa'] || '').trim();
  const step = data.step || '';

  if (!username || !password) {
    return context.status(400).succeed(JSON.stringify({ error: 'username and password required' }));
  }

  try {
    const client = await getPool().connect();
    try {
      const row = await client.query(
        'SELECT id, username, password, mfa, gendate, expired FROM users WHERE username = $1',
        [username]
      );
      if (row.rows.length === 0) {
        return context.status(401).succeed(JSON.stringify({ error: 'invalid credentials' }));
      }

      const user = row.rows[0];
      const decryptedPassword = decrypt(user.password);
      const decryptedMfa = user.mfa ? decrypt(user.mfa) : null;

      if (decryptedPassword !== password) {
        return context.status(401).succeed(JSON.stringify({ error: 'invalid credentials' }));
      }

      const now = Math.floor(Date.now() / 1000);
      if (user.gendate && (now - user.gendate) > SIX_MONTHS_SEC) {
        await client.query('UPDATE users SET expired = 1 WHERE id = $1', [user.id]);
        return context.status(200).succeed(JSON.stringify({
          expired: true,
          message: 'Credentials older than 6 months. Please restart password and 2FA creation.',
        }));
      }

      // Step 1: validate username + password only (frontend then shows OTP page for 2FA)
      const passwordOnlyStep = String(step).toLowerCase() === 'password' || !twoFactorCode;
      if (passwordOnlyStep) {
        if (decryptedMfa) {
          return context.status(200).succeed(JSON.stringify({ need2FA: true }));
        }
        return context.status(200).succeed(JSON.stringify({
          authenticated: true,
          username: user.username,
          id: user.id,
          has2FA: false,
        }));
      }

      // Step 2: validate 2FA code (only when a code was actually sent)
      if (decryptedMfa) {
        const sanitizedToken = String(twoFactorCode).replace(/\s+/g, '');
        const valid = speakeasy.totp.verify({
          secret: decryptedMfa,
          encoding: 'base32',
          token: sanitizedToken,
          // Allow a small clock drift between phone and server.
          window: 1,
        });
        if (!valid) {
          return context.status(401).succeed(JSON.stringify({ error: 'invalid 2FA code' }));
        }
      }

      return context.status(200).succeed(JSON.stringify({
        authenticated: true,
        username: user.username,
        id: user.id,
        has2FA: true,
      }));
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    return context.status(500).fail(JSON.stringify({ error: err.message }));
  }
};
