"use strict";
const express = require('express');
const app = express();
const handler = require('./function/handler');
const bodyParser = require('body-parser');
app.disable('x-powered-by');
app.use((req, res, next) => { if (!req.headers['content-type']) req.headers['content-type'] = 'text/plain'; next(); });
app.use(bodyParser.json({ limit: '100kb' }));
app.use(bodyParser.urlencoded({ extended: true }));

const isArray = (a) => (!!a) && (a.constructor === Array);
const isObject = (a) => (!!a) && (a.constructor === Object);

class FunctionEvent {
  constructor(req) { this.body = req.body; this.headers = req.headers; this.method = req.method; this.query = req.query; this.path = req.path; }
}
class FunctionContext {
  constructor(cb) { this.statusCode = 200; this.cb = cb; this.headerValues = {}; this.cbCalled = 0; }
  status(sc) { if (!sc) return this.statusCode; this.statusCode = sc; return this; }
  headers(v) { if (!v) return this.headerValues; this.headerValues = v; return this; }
  succeed(v) { this.cbCalled++; this.cb(null, v); }
  fail(v) { if (this.status() === 200) this.status(500); this.cbCalled++; this.cb(v, null); }
}

const middleware = async (req, res) => {
  const cb = (err, result) => {
    if (err) return res.status(fnContext.status()).send(err.toString ? err.toString() : err);
    if (isArray(result) || isObject(result)) res.set(fnContext.headers()).status(fnContext.status()).send(JSON.stringify(result));
    else res.set(fnContext.headers()).status(fnContext.status()).send(result);
  };
  const fnEvent = new FunctionEvent(req);
  const fnContext = new FunctionContext(cb);
  Promise.resolve(handler(fnEvent, fnContext, cb)).then(r => { if (!fnContext.cbCalled) fnContext.succeed(r); }).catch(e => cb(e));
};

app.post('/*', middleware);
app.get('/*', middleware);
const port = process.env.http_port || 3000;
app.listen(port, () => console.log('2fa listening on', port));
