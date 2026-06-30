'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');

process.env.ENCRYPTION_KEY = 'change-me-32-bytes-key-for-aes!!';

function encrypt(text) {
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);
  const iv = Buffer.alloc(16, 1);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let enc = cipher.update(text, 'utf8', 'base64');
  enc += cipher.final('base64');
  return iv.toString('base64') + ':' + enc;
}

function createContext() {
  const response = { statusCode: 200, body: undefined, failed: false };
  return {
    response,
    status(code) {
      response.statusCode = code;
      return this;
    },
    succeed(body) {
      response.body = body;
      return response;
    },
    fail(body) {
      response.failed = true;
      response.body = body;
      return response;
    },
  };
}

function parseResponse(response) {
  return JSON.parse(response.body);
}

function createPgMock(results) {
  const queries = [];
  const client = {
    async query(sql, params) {
      queries.push({ sql, params });
      return results.shift() || { rows: [] };
    },
    releaseCalled: false,
    release() {
      this.releaseCalled = true;
    },
  };

  class Pool {
    async connect() {
      return client;
    }
  }

  return { pg: { Pool }, client, queries };
}

async function withMocks(mocks, callback) {
  const originalLoad = Module._load;
  Module._load = function mockedLoad(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) {
      return mocks[request];
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return await callback();
  } finally {
    Module._load = originalLoad;
  }
}

function loadHandler(relativePath) {
  const handlerPath = path.resolve(__dirname, '..', relativePath);
  delete require.cache[handlerPath];
  return require(handlerPath);
}

test('generate-password creates a user with a 24 character password and QR code', async () => {
  const pgMock = createPgMock([{ rows: [] }, { rows: [] }]);
  const qrcode = { toBuffer: async () => Buffer.from('png') };

  await withMocks({ pg: pgMock.pg, qrcode }, async () => {
    const handler = loadHandler('generate-password/function/handler.js');
    const context = createContext();
    await handler({ body: { body: JSON.stringify({ username: 'alice' }) } }, context);

    const body = parseResponse(context.response);
    assert.equal(context.response.statusCode, 200);
    assert.equal(body.username, 'alice');
    assert.equal(body.password.length, 24);
    assert.match(body.password, /[A-Z]/);
    assert.match(body.password, /[a-z]/);
    assert.match(body.password, /[0-9]/);
    assert.match(body.password, /[!@#$%&*]/);
    assert.equal(body.qr_code, 'data:image/png;base64,cG5n');
    assert.equal(pgMock.queries[1].params[0], 'alice');
    assert.notEqual(pgMock.queries[1].params[1], body.password);
    assert.equal(pgMock.client.releaseCalled, true);
  });
});

test('generate-password rejects an existing username', async () => {
  const pgMock = createPgMock([{ rows: [{ '?column?': 1 }] }]);

  await withMocks({ pg: pgMock.pg, qrcode: { toBuffer: async () => Buffer.from('png') } }, async () => {
    const handler = loadHandler('generate-password/function/handler.js');
    const context = createContext();
    await handler({ body: { username: 'alice' } }, context);

    assert.equal(context.response.statusCode, 409);
    assert.deepEqual(parseResponse(context.response), { error: 'username already exists' });
    assert.equal(pgMock.queries.length, 1);
  });
});

test('twofa stores an encrypted TOTP secret and returns setup data', async () => {
  const pgMock = createPgMock([{ rows: [{ id: 1, username: 'alice', mfa: null }] }, { rows: [] }]);
  const speakeasy = {
    generateSecret: () => ({ base32: 'BASE32SECRET', otpauth_url: 'otpauth://totp/MSPR-alice' }),
  };
  const qrcode = { toBuffer: async () => Buffer.from('qr') };

  await withMocks({ pg: pgMock.pg, speakeasy, qrcode }, async () => {
    const handler = loadHandler('twofa/function/handler.js');
    const context = createContext();
    await handler({ body: JSON.stringify({ username: 'alice' }) }, context);

    const body = parseResponse(context.response);
    assert.equal(context.response.statusCode, 200);
    assert.equal(body.username, 'alice');
    assert.equal(body.secret, 'BASE32SECRET');
    assert.equal(body.qr_code, 'data:image/png;base64,cXI=');
    assert.equal(pgMock.queries[1].params[1], 'alice');
    assert.notEqual(pgMock.queries[1].params[0], 'BASE32SECRET');
  });
});

test('twofa reports a missing user', async () => {
  const pgMock = createPgMock([{ rows: [] }]);

  await withMocks({ pg: pgMock.pg, speakeasy: {}, qrcode: {} }, async () => {
    const handler = loadHandler('twofa/function/handler.js');
    const context = createContext();
    await handler({ body: { username: 'missing' } }, context);

    assert.equal(context.response.statusCode, 404);
    assert.deepEqual(parseResponse(context.response), { error: 'user not found; run generate-password first' });
  });
});

test('authenticate validates password-only sign in for users without 2FA', async () => {
  const pgMock = createPgMock([{
    rows: [{
      id: 7,
      username: 'alice',
      password: encrypt('CorrectHorseBatteryStaple'),
      mfa: null,
      gendate: Math.floor(Date.now() / 1000),
      expired: 0,
    }],
  }]);

  await withMocks({ pg: pgMock.pg, speakeasy: { totp: { verify: () => false } } }, async () => {
    const handler = loadHandler('authenticate/function/handler.js');
    const context = createContext();
    await handler({
      body: { username: 'alice', password: 'CorrectHorseBatteryStaple', step: 'password' },
    }, context);

    assert.equal(context.response.statusCode, 200);
    assert.deepEqual(parseResponse(context.response), {
      authenticated: true,
      username: 'alice',
      id: 7,
      has2FA: false,
    });
  });
});

test('authenticate asks for 2FA after a valid password when MFA exists', async () => {
  const pgMock = createPgMock([{
    rows: [{
      id: 8,
      username: 'bob',
      password: encrypt('secret-password'),
      mfa: encrypt('BASE32SECRET'),
      gendate: Math.floor(Date.now() / 1000),
      expired: 0,
    }],
  }]);

  await withMocks({ pg: pgMock.pg, speakeasy: { totp: { verify: () => false } } }, async () => {
    const handler = loadHandler('authenticate/function/handler.js');
    const context = createContext();
    await handler({ body: { username: 'bob', password: 'secret-password', step: 'password' } }, context);

    assert.equal(context.response.statusCode, 200);
    assert.deepEqual(parseResponse(context.response), { need2FA: true });
  });
});

test('authenticate accepts a valid TOTP code', async () => {
  const pgMock = createPgMock([{
    rows: [{
      id: 8,
      username: 'bob',
      password: encrypt('secret-password'),
      mfa: encrypt('BASE32SECRET'),
      gendate: Math.floor(Date.now() / 1000),
      expired: 0,
    }],
  }]);
  const speakeasy = {
    totp: {
      verify(options) {
        assert.equal(options.secret, 'BASE32SECRET');
        assert.equal(options.token, '123456');
        return true;
      },
    },
  };

  await withMocks({ pg: pgMock.pg, speakeasy }, async () => {
    const handler = loadHandler('authenticate/function/handler.js');
    const context = createContext();
    await handler({ body: { username: 'bob', password: 'secret-password', code: '123 456' } }, context);

    assert.equal(context.response.statusCode, 200);
    assert.deepEqual(parseResponse(context.response), {
      authenticated: true,
      username: 'bob',
      id: 8,
      has2FA: true,
    });
  });
});

test('authenticate marks credentials older than six months as expired', async () => {
  const pgMock = createPgMock([{
    rows: [{
      id: 9,
      username: 'charlie',
      password: encrypt('old-password'),
      mfa: null,
      gendate: Math.floor(Date.now() / 1000) - (181 * 24 * 60 * 60),
      expired: 0,
    }],
  }, { rows: [] }]);

  await withMocks({ pg: pgMock.pg, speakeasy: { totp: { verify: () => false } } }, async () => {
    const handler = loadHandler('authenticate/function/handler.js');
    const context = createContext();
    await handler({ body: { username: 'charlie', password: 'old-password' } }, context);

    const body = parseResponse(context.response);
    assert.equal(context.response.statusCode, 200);
    assert.equal(body.expired, true);
    assert.match(pgMock.queries[1].sql, /UPDATE users SET expired = 1/);
    assert.deepEqual(pgMock.queries[1].params, [9]);
  });
});

test('logout returns a stateless acknowledgement', async () => {
  const handler = loadHandler('logout/function/handler.js');
  const context = createContext();
  await handler({ body: {} }, context);

  assert.equal(context.response.statusCode, 200);
  assert.deepEqual(parseResponse(context.response), { ok: true });
});
