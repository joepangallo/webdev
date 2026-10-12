// Unit tests for assets/js/fake-fetch.js, the offline practice API used by the
// Chapter 10 playgrounds. Run with: node --test tests/
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const runtime = require('../assets/js/fake-fetch.js');

// The runtime installs itself on `window`, as it does inside a preview iframe.
function fresh() {
  globalThis.window = globalThis;
  const logs = [];
  const quiet = { info: (...a) => logs.push(['info', a.join(' ')]), warn: (...a) => logs.push(['warn', a.join(' ')]), error: (...a) => logs.push(['error', a.join(' ')]) };
  const saved = { info: console.info, warn: console.warn, error: console.error };
  Object.assign(console, quiet);
  runtime.preview();
  window.mockApi.delay = 1;
  return { api: window.mockApi, fetch: window.fetch, logs, restore: () => Object.assign(console, saved) };
}

test('exports a preview function that can run on its own (it is turned into text)', () => {
  assert.equal(typeof runtime.preview, 'function');
  const src = runtime.preview.toString();
  // Re-creating it from its own text proves it does not depend on outside variables.
  const again = new Function('return (' + src + ')')();
  assert.equal(typeof again, 'function');
});

test('a JSON route resolves with an ok Response whose json() gives the data', async () => {
  const t = fresh();
  t.api.route('GET', '/api/posts', () => ({ body: [{ id: 1 }, { id: 2 }] }));
  const res = await t.fetch('/api/posts');
  assert.equal(res.ok, true);
  assert.equal(res.status, 200);
  assert.equal(res.statusText, 'OK');
  assert.match(res.headers.get('Content-Type'), /application\/json/);
  assert.deepEqual(await res.json(), [{ id: 1 }, { id: 2 }]);
  assert.equal(res.bodyUsed, true);
  t.restore();
});

test('route parameters and query strings reach the handler', async () => {
  const t = fresh();
  t.api.route('GET', '/api/users/:id', (req) => ({ body: { id: req.params.id, sort: req.query.sort } }));
  const res = await t.fetch('/api/users/42?sort=name');
  assert.deepEqual(await res.json(), { id: '42', sort: 'name' });
  assert.equal(t.api.calls.length, 1);
  assert.equal(t.api.calls[0].path, '/api/users/42');
  t.restore();
});

test('a 404 is still a resolved promise (fetch only rejects when there is no response)', async () => {
  const t = fresh();
  t.api.route('GET', '/api/posts/:id', () => ({ status: 404, body: { error: 'No such post' } }));
  const res = await t.fetch('/api/posts/99');
  assert.equal(res.ok, false);
  assert.equal(res.status, 404);
  assert.equal(res.statusText, 'Not Found');
  assert.deepEqual(await res.json(), { error: 'No such post' });
  t.restore();
});

test('an unknown local path returns an HTML 404 page, so json() rejects with a SyntaxError', async () => {
  const t = fresh();
  const res = await t.fetch('/api/nothing-here');
  assert.equal(res.status, 404);
  await assert.rejects(res.json(), SyntaxError);
  t.restore();
});

test('the body can be read only once, unless cloned first', async () => {
  const t = fresh();
  t.api.route('GET', '/x', () => ({ body: 'hello' }));
  const res = await t.fetch('/x');
  const copy = res.clone();
  assert.equal(await res.text(), 'hello');
  await assert.rejects(res.text(), /already read/);
  assert.equal(await copy.text(), 'hello');
  assert.throws(() => res.clone(), /already used/);
  t.restore();
});

test('fail: "network" rejects with TypeError("Failed to fetch")', async () => {
  const t = fresh();
  t.api.route('GET', '/down', () => ({ fail: 'network' }));
  await assert.rejects(t.fetch('/down'), (e) => e instanceof TypeError && e.message === 'Failed to fetch');
  t.restore();
});

test('absolute URLs match full-URL routes and carry a CORS header; unknown hosts are offline', async () => {
  const t = fresh();
  t.api.route('GET', 'https://api.weather.example/v1/current', (req) => ({ body: { city: req.query.city } }));
  const res = await t.fetch('https://api.weather.example/v1/current?city=Miami');
  assert.equal(res.type, 'cors');
  assert.equal(res.headers.get('access-control-allow-origin'), '*');
  assert.deepEqual(await res.json(), { city: 'Miami' });
  await assert.rejects(t.fetch('https://example.org/data.json'), TypeError);
  assert.ok(t.logs.some((l) => l[0] === 'warn' && /offline/.test(l[1])));
  t.restore();
});

test('POST bodies and headers reach the handler; the wrong method gets 405', async () => {
  const t = fresh();
  t.api.route('POST', '/api/notes', (req) => ({ status: 201, body: { saved: req.json(), type: req.headers.get('content-type') } }));
  const res = await t.fetch('/api/notes', { method: 'post', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'hi' }) });
  assert.equal(res.status, 201);
  assert.deepEqual(await res.json(), { saved: { text: 'hi' }, type: 'application/json' });
  const wrong = await t.fetch('/api/notes', { method: 'DELETE' });
  assert.equal(wrong.status, 405);
  t.restore();
});

test('a handler that throws becomes a 500 response and an error in the console', async () => {
  const t = fresh();
  t.api.route('GET', '/boom', () => { throw new Error('kaput'); });
  const res = await t.fetch('/boom');
  assert.equal(res.status, 500);
  assert.ok(t.logs.some((l) => l[0] === 'error' && /kaput/.test(l[1])));
  t.restore();
});

test('custom headers and delay are honored, and every request is logged', async () => {
  const t = fresh();
  t.api.route('GET', '/slow', () => ({ delay: 30, headers: { 'X-RateLimit-Remaining': 4 }, body: { ok: 1 } }));
  const start = Date.now();
  const res = await t.fetch('/slow');
  assert.ok(Date.now() - start >= 25);
  assert.equal(res.headers.get('x-ratelimit-remaining'), '4');
  assert.ok(t.logs.some((l) => l[0] === 'info' && /GET \/slow → 200/.test(l[1])));
  t.restore();
});

test('an AbortController signal cancels the request with an AbortError', async () => {
  const t = fresh();
  t.api.route('GET', '/slow', () => ({ delay: 200, body: {} }));
  const ctrl = new AbortController();
  const p = t.fetch('/slow', { signal: ctrl.signal });
  ctrl.abort();
  await assert.rejects(p, (e) => e.name === 'AbortError');
  const pre = new AbortController();
  pre.abort();
  await assert.rejects(t.fetch('/slow', { signal: pre.signal }), (e) => e.name === 'AbortError');
  t.restore();
});

test('a malformed URL rejects with a TypeError, and reset() clears routes and calls', async () => {
  const t = fresh();
  await assert.rejects(t.fetch('http://['), TypeError);
  t.api.route('GET', '/a', () => ({ body: 1 }));
  await t.fetch('/a');
  t.api.reset();
  assert.equal(t.api.calls.length, 0);
  const res = await t.fetch('/a');
  assert.equal(res.status, 404);
  t.restore();
});

test('registers itself as WD1.runtimes.fetch in a browser page', () => {
  const path = require.resolve('../assets/js/fake-fetch.js');
  delete require.cache[path];
  globalThis.WD1 = { runtimes: {} };
  require(path);
  assert.equal(typeof globalThis.WD1.runtimes.fetch.preview, 'function');
  delete globalThis.WD1;
});
