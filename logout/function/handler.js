'use strict';

// Stateless logout: acknowledge client sign-out. No server-side session to invalidate.
module.exports = async (event, context) => {
  return context.status(200).succeed(JSON.stringify({ ok: true }));
};
