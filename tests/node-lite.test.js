// Unit tests for assets/js/node-lite.js, the simulated Node.js used by the
// Chapter 13 playgrounds. Run with: node --test tests/
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const lite = require('../assets/js/node-lite.js');

// A fresh simulated Node, installed on a plain object (no page, so no client is built).
function fresh() {
  const logs = [];
  const con = {
    log: (...a) => logs.push(['log', a.join(' ')]), info: (...a) => logs.push(['info', a.join(' ')]),
    warn: (...a) => logs.push(['warn', a.join(' ')]), error: (...a) => logs.push(['error', a.join(' ')])
  };
  const G = { console: con };
  const api = lite.nodePreview(G);
  return { G, api, logs, require: G.require };
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test('the preview function stands alone, because it is turned into text', () => {
  const again = new Function('return (' + lite.nodePreview.toString() + ')')();
  assert.equal(typeof again, 'function');
  assert.equal(lite.runtime.preview, lite.nodePreview);
  assert.equal(typeof lite.runtime.transform, 'function');
});

test('installs Node globals: require, module, exports, process, __dirname, Buffer', () => {
  const { G } = fresh();
  assert.equal(typeof G.require, 'function');
  assert.equal(G.exports, G.module.exports);
  assert.equal(G.require.main, G.module);
  assert.equal(G.__dirname, '/app');
  assert.equal(G.__filename, '/app/server.js');
  assert.equal(G.process.env.NODE_ENV, 'development');
  assert.equal(G.Buffer.from('hi').toString(), 'hi');
});

test('require() knows the built-in and npm modules and rejects unknown ones like Node', () => {
  const { require, logs } = fresh();
  for (const m of ['http', 'express', 'fs', 'fs/promises', 'node:path', 'path', 'events', 'url', 'ws', 'os', 'crypto', 'util', 'cors', 'morgan', 'dotenv', 'uuid', 'body-parser', 'ejs', 'pug', 'hbs']) {
    assert.ok(require(m), m);
  }
  assert.throws(() => require('mongoose'), (e) => e.code === 'MODULE_NOT_FOUND' && /Cannot find module 'mongoose'/.test(e.message));
  assert.ok(logs.some((l) => /has these modules/.test(l[1])));
});

test('local modules and JSON files load from the in-memory file system, once', () => {
  const { G, require } = fresh();
  G.__nodeFiles({ 'data/books.json': '[{"id":1}]', 'lib/math.js': 'let n = 0; module.exports = { add: (a, b) => a + b, count: () => ++n };' });
  assert.deepEqual(require('./data/books.json'), [{ id: 1 }]);
  const m = require('./lib/math');
  assert.equal(m.add(2, 3), 5);
  m.count();
  assert.equal(require('./lib/math.js').count(), 2, 'the second require gets the cached module');
});

test('path joins, resolves and splits paths the POSIX way', () => {
  const path = fresh().require('path');
  assert.equal(path.join('/app', 'views', '..', 'public', 'style.css'), '/app/public/style.css');
  assert.equal(path.join('a', './b', '../c'), 'a/c');
  assert.equal(path.resolve('views'), '/app/views');
  assert.equal(path.extname('index.html'), '.html');
  assert.equal(path.basename('/a/b/c.txt', '.txt'), 'c');
  assert.equal(path.dirname('/a/b/c.txt'), '/a/b');
  assert.deepEqual(path.parse('/home/a.js'), { root: '/', dir: '/home', base: 'a.js', ext: '.js', name: 'a' });
  assert.throws(() => path.join('a', undefined), /must be of type string/);
});

test('fs reads and writes synchronously, with callbacks and with promises', async () => {
  const { require } = fresh();
  const fs = require('fs');
  fs.writeFileSync('notes.txt', 'one');
  fs.appendFileSync('notes.txt', ' two');
  assert.equal(fs.readFileSync('notes.txt', 'utf8'), 'one two');
  assert.equal(fs.readFileSync('/app/notes.txt').toString(), 'one two', 'no encoding gives a Buffer');
  assert.equal(fs.existsSync('notes.txt'), true);
  assert.deepEqual(fs.readdirSync('.'), ['notes.txt']);
  assert.throws(() => fs.readFileSync('missing.txt', 'utf8'), (e) => e.code === 'ENOENT' && /no such file or directory, open 'missing.txt'/.test(e.message));
  const viaCb = await new Promise((res) => fs.readFile('notes.txt', 'utf8', (err, data) => res([err, data])));
  assert.deepEqual(viaCb, [null, 'one two']);
  const errCb = await new Promise((res) => fs.readFile('nope.txt', 'utf8', (err) => res(err)));
  assert.equal(errCb.code, 'ENOENT');
  await require('fs/promises').writeFile('a.json', '{"x":1}');
  assert.equal(JSON.parse(await fs.promises.readFile('a.json', 'utf8')).x, 1);
  await assert.rejects(fs.promises.readFile('zzz'), { code: 'ENOENT' });
});

test('events: on, once, off and emit', () => {
  const EventEmitter = fresh().require('events');
  const e = new EventEmitter();
  const got = [];
  const f = (x) => got.push('on ' + x);
  e.on('ping', f);
  e.once('ping', (x) => got.push('once ' + x));
  e.emit('ping', 1);
  e.emit('ping', 2);
  e.off('ping', f);
  e.emit('ping', 3);
  assert.deepEqual(got, ['on 1', 'once 1', 'on 2']);
  assert.throws(() => e.emit('error', new Error('boom')), /boom/);
  class Shop extends EventEmitter {}
  const s = new Shop();
  s.on('sale', (n) => got.push('sale ' + n));
  s.emit('sale', 5);
  assert.equal(got.pop(), 'sale 5');
});

test('a plain http server answers, reads a streamed body, and is reachable only after listen()', async () => {
  const { require, api } = fresh();
  const http = require('http');
  let r = await api.request('GET', '/');
  assert.equal(r.status, 0);
  assert.match(r.error, /ECONNREFUSED/);
  const server = http.createServer((req, res) => {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => { res.writeHead(201, { 'Content-Type': 'text/plain' }); res.end('got ' + body); });
      return;
    }
    if (req.url === '/') { res.statusCode = 200; res.setHeader('Content-Type', 'text/html'); res.end('<h1>Hello</h1>'); return; }
    res.writeHead(404); res.end('nope');
  });
  let listened = false;
  server.listen(3000, () => { listened = true; });
  assert.deepEqual(api.ports(), [3000]);
  r = await api.request('GET', '/');
  assert.equal(listened, true);
  assert.equal(r.status, 200);
  assert.equal(r.body, '<h1>Hello</h1>');
  assert.equal(r.headers['content-type'], 'text/html');
  assert.equal(r.headers['content-length'], '14');
  r = await api.request('POST', '/x', 'hello');
  assert.equal(r.status, 201);
  assert.equal(r.body, 'got hello');
  r = await api.request('GET', '/missing');
  assert.equal(r.status, 404);
});

test('a second server on the same port fails with EADDRINUSE', async () => {
  const { require, logs } = fresh();
  const http = require('http');
  http.createServer(() => {}).listen(3000);
  http.createServer(() => {}).listen(3000);
  await wait(10);
  assert.ok(logs.some((l) => l[0] === 'error' && /EADDRINUSE: address already in use :::3000/.test(l[1])));
});

test('a handler that never responds times out instead of hanging the check', async () => {
  const { require, api } = fresh();
  require('http').createServer(() => {}).listen(3000);
  const r = await api.request('GET', '/');
  assert.equal(r.timedOut, true);
  assert.match(r.error, /No response after 3 seconds/);
});

test('an uncaught error in a plain http handler crashes the process, like real Node', async () => {
  const { require, api, logs } = fresh();
  require('http').createServer((req) => { req.nothing.here = 1; }).listen(3000);
  const r = await api.request('GET', '/');
  assert.equal(r.crashed, true);
  assert.ok(logs.some((l) => /TypeError: Cannot (read|set) properties of undefined/.test(l[1])));
  assert.deepEqual(api.ports(), []);
});

function bookApp(require) {
  const express = require('express');
  const app = express();
  const books = [{ id: 1, title: 'Dune' }, { id: 2, title: 'Emma' }];
  app.use(express.json());
  app.get('/', (req, res) => res.send('<h1>Books</h1>'));
  app.get('/api/books', (req, res) => {
    const q = (req.query.q || '').toLowerCase();
    res.json(books.filter((b) => b.title.toLowerCase().includes(q)));
  });
  app.get('/api/books/:id', (req, res) => {
    const book = books.find((b) => b.id === Number(req.params.id));
    if (!book) return res.status(404).json({ error: 'Book not found' });
    res.json(book);
  });
  app.post('/api/books', (req, res) => {
    if (!req.body || !req.body.title) return res.status(400).json({ error: 'title is required' });
    const book = { id: books.length + 1, title: req.body.title };
    books.push(book);
    res.status(201).location('/api/books/' + book.id).json(book);
  });
  app.delete('/api/books/:id', (req, res) => {
    const i = books.findIndex((b) => b.id === Number(req.params.id));
    if (i < 0) return res.sendStatus(404);
    books.splice(i, 1);
    res.sendStatus(204);
  });
  return app;
}

test('express: routes, params, query strings, JSON and status codes', async () => {
  const { require, api } = fresh();
  bookApp(require).listen(3000);
  let r = await api.request('GET', '/');
  assert.equal(r.status, 200);
  assert.equal(r.headers['content-type'], 'text/html; charset=utf-8');
  assert.equal(r.headers['x-powered-by'], 'Express');
  r = await api.request('GET', '/api/books?q=du');
  assert.deepEqual(r.json, [{ id: 1, title: 'Dune' }]);
  assert.equal(r.headers['content-type'], 'application/json; charset=utf-8');
  r = await api.request('GET', '/API/Books/2/');
  assert.equal(r.json.title, 'Emma', 'matching ignores case and one trailing slash');
  r = await api.request('GET', '/api/books/9');
  assert.equal(r.status, 404);
  assert.deepEqual(r.json, { error: 'Book not found' });
  r = await api.request('POST', '/api/books', { title: 'Kindred' });
  assert.equal(r.status, 201);
  assert.equal(r.headers.location, '/api/books/3');
  assert.equal(r.statusText, 'Created');
  r = await api.request('POST', '/api/books', {});
  assert.equal(r.status, 400);
  r = await api.request('DELETE', '/api/books/3');
  assert.equal(r.status, 204);
  assert.equal(r.body, '');
  r = await api.request('DELETE', '/api/books/3');
  assert.equal(r.status, 404);
  assert.equal(r.body, 'Not Found');
  assert.deepEqual(api.routes().map((x) => x.method + ' ' + x.path), ['GET /', 'GET /api/books', 'GET /api/books/:id', 'POST /api/books', 'DELETE /api/books/:id']);
});

test("express: an unmatched route gets Express's own 404 page", async () => {
  const { require, api } = fresh();
  bookApp(require).listen(3000);
  const r = await api.request('PUT', '/api/books/1?x=1');
  assert.equal(r.status, 404);
  assert.match(r.body, /<pre>Cannot PUT \/api\/books\/1<\/pre>/);
  assert.equal(r.headers['content-security-policy'], "default-src 'none'");
});

test('express 5: req.body is undefined without a body parser, so destructuring it throws (500)', async () => {
  const { require, api, logs } = fresh();
  const app = require('express')();
  app.post('/x', (req, res) => { const { title } = req.body; res.json({ title }); });
  app.listen(3000);
  const r = await api.request('POST', '/x', { title: 'A' });
  assert.equal(r.status, 500);
  assert.match(r.body, /TypeError: Cannot destructure property &#39;title&#39; of &#39;req.body&#39; as it is undefined/);
  assert.ok(logs.some((l) => l[0] === 'error' && /Cannot destructure/.test(l[1])));
});

test('express: bad JSON is a 400, not a crash', async () => {
  const { require, api } = fresh();
  bookApp(require).listen(3000);
  const r = await api.request('POST', '/api/books', '{"title": Dune}', { 'content-type': 'application/json' });
  assert.equal(r.status, 400);
  assert.match(r.body, /SyntaxError/);
});

test('express: urlencoded forms, text bodies and headers', async () => {
  const { require, api } = fresh();
  const express = require('express');
  const app = express();
  app.use(express.urlencoded({ extended: false }));
  app.post('/form', (req, res) => res.json({ body: req.body, ua: req.get('User-Agent'), is: req.is('urlencoded') }));
  app.listen(3000);
  const r = await api.request('POST', '/form', 'name=Ana+Li&tag=a&tag=b');
  assert.deepEqual(r.json.body, { name: 'Ana Li', tag: ['a', 'b'] });
  assert.equal(r.json.ua, 'node-lite-client/1.0');
});

test('express: middleware runs in order, next() passes control, and a forgotten next() hangs', async () => {
  const { require, api } = fresh();
  const app = require('express')();
  const seen = [];
  app.use((req, res, next) => { seen.push('logger'); next(); });
  app.use('/admin', (req, res, next) => {
    seen.push('auth ' + req.baseUrl + ' ' + req.url);
    if (req.get('authorization') !== 'Bearer ok') return res.status(401).json({ error: 'Log in first' });
    next();
  });
  app.get('/admin/stats', (req, res) => res.json({ users: 3 }));
  app.get('/stuck', (req, res, next) => { seen.push('stuck'); });
  app.listen(3000);
  let r = await api.request('GET', '/admin/stats');
  assert.equal(r.status, 401);
  r = await api.request('GET', '/admin/stats', '', { Authorization: 'Bearer ok' });
  assert.deepEqual(r.json, { users: 3 });
  assert.deepEqual(seen.slice(0, 4), ['logger', 'auth /admin /stats', 'logger', 'auth /admin /stats']);
  r = await api.request('GET', '/stuck');
  assert.equal(r.timedOut, true);
});

test('express: Router mounted on a prefix, with mergeParams', async () => {
  const { require, api } = fresh();
  const express = require('express');
  const app = express();
  const router = express.Router();
  router.get('/', (req, res) => res.json(['all']));
  router.get('/:id', (req, res) => res.json({ id: req.params.id, base: req.baseUrl }));
  const nested = express.Router({ mergeParams: true });
  nested.get('/', (req, res) => res.json({ book: req.params.bookId }));
  app.use('/api/books', router);
  app.use('/api/books/:bookId/reviews', nested);
  app.listen(3000);
  assert.deepEqual((await api.request('GET', '/api/books')).json, ['all']);
  assert.deepEqual((await api.request('GET', '/api/books/7')).json, { id: '7', base: '/api/books' });
  assert.deepEqual((await api.request('GET', '/api/books/7/reviews')).json, { book: '7' });
  assert.ok(api.routes().some((x) => x.path === '/api/books/:id'));
});

test('express: thrown errors and rejected promises reach the error handler (Express 5)', async () => {
  const { require, api } = fresh();
  const app = require('express')();
  app.get('/sync', () => { throw new Error('sync boom'); });
  app.get('/async', async () => { await wait(1); throw new Error('async boom'); });
  app.get('/teapot', (req, res, next) => { const e = new Error('short and stout'); e.status = 418; next(e); });
  app.use((err, req, res, next) => res.status(err.status || 500).json({ error: err.message }));
  app.listen(3000);
  assert.deepEqual((await api.request('GET', '/sync')).json, { error: 'sync boom' });
  assert.deepEqual((await api.request('GET', '/async')).json, { error: 'async boom' });
  assert.equal((await api.request('GET', '/teapot')).status, 418);
});

test('express: sending twice reports ERR_HTTP_HEADERS_SENT', async () => {
  const { require, api, logs } = fresh();
  const app = require('express')();
  app.get('/', (req, res) => { res.send('one'); res.send('two'); });
  app.listen(3000);
  const r = await api.request('GET', '/');
  assert.equal(r.body, 'one');
  assert.ok(logs.some((l) => /ERR_HTTP_HEADERS_SENT.*Cannot set headers after they are sent/.test(l[1])));
});

test('express: redirects, set(), type(), cookies, HEAD and invalid status codes', async () => {
  const { require, api } = fresh();
  const app = require('express')();
  app.get('/old', (req, res) => res.redirect(301, '/new'));
  app.get('/csv', (req, res) => res.set('X-Count', 2).type('text').cookie('seen', 'yes', { httpOnly: true }).send('a,b'));
  app.get('/bad', (req, res) => res.status('200').send('x'));
  app.listen(3000);
  let r = await api.request('GET', '/old');
  assert.equal(r.status, 301);
  assert.equal(r.headers.location, '/new');
  r = await api.request('GET', '/csv');
  assert.equal(r.headers['x-count'], '2');
  assert.equal(r.headers['content-type'], 'text/plain; charset=utf-8');
  assert.match(r.headers['set-cookie'], /^seen=yes; Path=\/; HttpOnly/);
  r = await api.request('HEAD', '/csv');
  assert.equal(r.body, '');
  r = await api.request('GET', '/bad');
  assert.equal(r.status, 500);
  assert.match(r.body, /Invalid status code: 200/);
});

test('express.static serves files from the in-memory public folder', async () => {
  const { G, require, api } = fresh();
  G.__nodeFiles({ 'public/index.html': '<h1>Home</h1>', 'public/css/site.css': 'body{color:red}' });
  const express = require('express');
  const app = express();
  app.use(express.static('public'));
  app.listen(3000);
  let r = await api.request('GET', '/');
  assert.equal(r.body, '<h1>Home</h1>');
  r = await api.request('GET', '/css/site.css');
  assert.equal(r.headers['content-type'], 'text/css; charset=utf-8');
  r = await api.request('GET', '/../secret.txt');
  assert.equal(r.status, 404);
});

test('cors() adds the Access-Control headers and answers the preflight', async () => {
  const { require, api } = fresh();
  const app = require('express')();
  app.use(require('cors')());
  app.get('/api', (req, res) => res.json({ ok: true }));
  app.listen(3000);
  let r = await api.request('GET', '/api');
  assert.equal(r.headers['access-control-allow-origin'], '*');
  r = await api.request('OPTIONS', '/api', '', { 'Access-Control-Request-Method': 'POST' });
  assert.equal(r.status, 204);
  assert.match(r.headers['access-control-allow-methods'], /POST/);
});

test('morgan logs each request after it finishes', async () => {
  const { require, api, logs } = fresh();
  const app = require('express')();
  app.use(require('morgan')('dev'));
  app.get('/', (req, res) => res.send('hi'));
  app.listen(3000);
  await api.request('GET', '/');
  await wait(5);
  assert.ok(logs.some((l) => /^GET \/ 200 [\d.]+ ms - 2$/.test(l[1])));
});

test('dotenv loads .env into process.env', () => {
  const { G, require } = fresh();
  G.__nodeFiles({ '.env': 'PORT=4000\n# comment\nAPI_KEY="abc"' });
  require('dotenv').config();
  assert.equal(G.process.env.PORT, '4000');
  assert.equal(G.process.env.API_KEY, 'abc');
});

test('EJS: escapes <%= %>, keeps <%- %> raw, runs <% %> code, includes partials', () => {
  const { G, api } = fresh();
  G.__nodeFiles({ 'views/partials/head.ejs': '<h1><%= title %></h1>' });
  const tpl = "<%- include('partials/head', { title: 'Books' }) %>\n<ul>\n<% books.forEach((b) => { -%>\n  <li><%= b %></li>\n<% }) -%>\n</ul><%# hidden %><p><%- note %></p>";
  const html = api.ejs.compile(tpl, { filename: '/app/views/books.ejs' })({ books: ['Dune', '<script>x</script>'], note: '<b>raw</b>' });
  assert.equal(html, '<h1>Books</h1>\n<ul>\n  <li>Dune</li>\n  <li>&lt;script&gt;x&lt;/script&gt;</li>\n</ul><p><b>raw</b></p>');
  assert.throws(() => api.ejs.render('<p>\n<%= missing %></p>', {}, { filename: '/app/views/x.ejs' }), (e) => e instanceof ReferenceError && /views\/x\.ejs:2\nmissing is not defined/.test(e.message));
});

test('Handlebars: escaping, each with @index, if/else, unless, with and partials', () => {
  const { G, api } = fresh();
  G.__nodeFiles({ 'views/partials/footer.hbs': '<footer>{{site}}</footer>' });
  const tpl = '{{#each books}}<li>{{@index}}. {{title}}{{#if sale}} (sale){{else}} (full){{/if}}</li>{{else}}none{{/each}}{{{raw}}}{{#unless open}}closed{{/unless}}{{#with shop}}{{name}}{{/with}}{{> footer}}{{! comment }}';
  const out = api.hbs.render(tpl, { books: [{ title: 'A&B', sale: true }, { title: 'C' }], raw: '<i>r</i>', open: false, shop: { name: 'Shop' }, site: 'S' });
  assert.equal(out, '<li>0. A&amp;B (sale)</li><li>1. C (full)</li><i>r</i>closedShop<footer>S</footer>');
  assert.equal(api.hbs.render('{{#each list}}x{{else}}empty{{/each}}', { list: [] }), 'empty');
  assert.throws(() => api.hbs.render('{{#each a}}x', {}), /never closed/);
});

test('Pug: indentation, classes, ids, attributes, each, if/else and interpolation', () => {
  const { api } = fresh();
  const tpl = [
    'doctype html',
    'ul#books.list(data-count=books.length)',
    '  each b, i in books',
    '    li(class=b.sale ? "sale" : null)= b.title',
    'if open',
    '  p Open until #{hours}!',
    'else',
    '  p Closed',
    'a(href="/books?page=" + (page + 1)) Next (more)',
    'p',
    '  | Plain text',
    '//- not in the output',
    'input(type="checkbox" checked)'
  ].join('\n');
  const out = api.pug.render(tpl, { books: [{ title: '<Dune>', sale: true }, { title: 'Emma' }], open: true, hours: '9pm', page: 1 });
  assert.equal(out, '<!DOCTYPE html><ul id="books" class="list" data-count="2"><li class="sale">&lt;Dune&gt;</li><li>Emma</li></ul><p>Open until 9pm!</p><a href="/books?page=2">Next (more)</a><p>Plain text</p><input type="checkbox" checked>');
});

test('res.render uses the view engine and views folder, and reports missing views', async () => {
  const { G, require, api } = fresh();
  G.__nodeFiles({ 'views/books.ejs': '<h1><%= heading %></h1><p><%= user %></p>', 'views/home.pug': 'h1= heading' });
  const express = require('express');
  const app = express();
  app.set('view engine', 'ejs');
  app.locals.user = 'Ana';
  app.get('/', (req, res) => res.render('books', { heading: 'All books' }));
  app.get('/pug', (req, res) => res.render('home.pug', { heading: 'Pug!' }));
  app.get('/missing', (req, res) => res.render('nope'));
  app.listen(3000);
  assert.equal((await api.request('GET', '/')).body, '<h1>All books</h1><p>Ana</p>');
  assert.equal((await api.request('GET', '/pug')).body, '<h1>Pug!</h1>');
  const r = await api.request('GET', '/missing');
  assert.equal(r.status, 500);
  assert.match(r.body, /Failed to lookup view &#34;nope&#34; in views directory &#34;\/app\/views&#34;/);
});

test('ws: a WebSocketServer pairs with pretend browsers and can broadcast', async () => {
  const { require, api } = fresh();
  const { WebSocketServer, WebSocket } = require('ws');
  const wss = new WebSocketServer({ port: 8080 });
  const seen = [];
  wss.on('connection', (ws, req) => {
    seen.push('connect ' + req.url);
    ws.on('message', (data) => {
      seen.push('msg ' + data.toString());
      wss.clients.forEach((c) => { if (c.readyState === WebSocket.OPEN) c.send(data.toString()); });
    });
    ws.on('close', (code) => seen.push('close ' + code));
  });
  const a = new api.BrowserWebSocket('ws://localhost:8080/chat');
  const b = new api.BrowserWebSocket('ws://localhost:8080/chat');
  const got = { a: [], b: [] };
  a.onmessage = (e) => got.a.push(e.data);
  b.addEventListener('message', (e) => got.b.push(e.data));
  assert.throws(() => a.send('too soon'), /Still in CONNECTING state/);
  await wait(20);
  assert.equal(a.readyState, 1);
  assert.equal(wss.clients.size, 2);
  a.send('hello');
  await wait(20);
  assert.deepEqual(got, { a: ['hello'], b: ['hello'] });
  b.close();
  await wait(20);
  assert.equal(wss.clients.size, 1);
  assert.deepEqual(seen, ['connect /chat', 'connect /chat', 'msg hello', 'close 1000']);
  const lost = new api.BrowserWebSocket('ws://localhost:9999');
  let closed = null;
  lost.onclose = (e) => { closed = e.code; };
  await wait(20);
  assert.equal(closed, 1006);
});

test('ws: a server attached to an http server shares its port; sending a Buffer warns', async () => {
  const { require, api, logs } = fresh();
  const http = require('http');
  const { WebSocketServer } = require('ws');
  const server = http.createServer((req, res) => res.end('ok'));
  const wss = new WebSocketServer({ server });
  wss.on('connection', (ws) => ws.on('message', (data) => ws.send(data)));
  server.listen(3000);
  assert.deepEqual(api.wsPorts(), [3000]);
  const c = new api.BrowserWebSocket('ws://localhost:3000');
  const got = [];
  c.onmessage = (e) => got.push(e.data);
  await wait(15);
  c.send('echo');
  await wait(20);
  assert.deepEqual(got, ['echo']);
  assert.ok(logs.some((l) => l[0] === 'warn' && /browser receives a Blob/.test(l[1])));
});

test('serverless: a Lambda-style handler gets an event and returns { statusCode, body }', async () => {
  const { G, api } = fresh();
  G.module.exports.handler = async (event) => {
    const name = event.queryStringParameters && event.queryStringParameters.name;
    if (!name) return { statusCode: 400, body: JSON.stringify({ error: 'name is required' }) };
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Hello, ' + name }) };
  };
  assert.equal(api.exported(), 'lambda');
  let r = await api.invoke('GET', '/hello?name=Ana');
  assert.equal(r.cold, true);
  assert.deepEqual(r.json, { message: 'Hello, Ana' });
  r = await api.invoke('GET', '/hello');
  assert.equal(r.cold, false);
  assert.equal(r.status, 400);
});

test('serverless: web-standard default exports get a Request and must return a Response', async () => {
  const { G, api } = fresh();
  G.module.exports.default = async (req) => {
    if (req.method !== 'POST') return new Response('Use POST', { status: 405 });
    const body = await req.json();
    return Response.json({ received: body.title });
  };
  assert.equal(api.exported(), 'web');
  let r = await api.invoke('GET', '/');
  assert.equal(r.status, 405);
  r = await api.invoke('POST', '/', { title: 'Dune' });
  assert.deepEqual(r.json, { received: 'Dune' });
  G.module.exports.default = () => ({ not: 'a response' });
  r = await api.invoke('GET', '/');
  assert.equal(r.status, 500);
  assert.match(r.body, /must return a Response/);
});

test('serverless: Cloudflare-style { fetch } and Vercel-style (req, res) exports', async () => {
  const { G, api } = fresh();
  G.module.exports.default = { async fetch(request) { return new Response('worker ' + new URL(request.url).pathname); } };
  assert.equal(api.exported(), 'worker');
  assert.equal((await api.invoke('GET', '/hi')).body, 'worker /hi');
  G.module.exports.default = (req, res) => { res.status(200).json({ q: req.query.q }); };
  assert.equal(api.exported(), 'node');
  assert.deepEqual((await api.invoke('GET', '/?q=x')).json, { q: 'x' });
});

test('matchPath explains which route a path matches', () => {
  const { api } = fresh();
  assert.deepEqual(api.matchPath('/books/:id', '/books/42'), { id: '42' });
  assert.deepEqual(api.matchPath('/users/:user/posts/:post', '/users/ana/posts/7'), { user: 'ana', post: '7' });
  assert.equal(api.matchPath('/books/:id', '/books'), null);
  assert.deepEqual(api.matchPath('/books/:id?', '/books'), {});
});

test('process.exit closes every server', async () => {
  const { G, require, api, logs } = fresh();
  require('express')().listen(3000);
  G.process.exit(0);
  assert.deepEqual(api.ports(), []);
  assert.ok(logs.some((l) => /exited with code 0/.test(l[1])));
});

test('transform turns import/export into require/module.exports, keeping every line', () => {
  const src = [
    "import express from 'express';",
    "import { WebSocketServer, WebSocket as WS } from 'ws';",
    "import * as path from 'node:path';",
    "import 'dotenv/config';",
    'import {',
    '  readFile,',
    '  writeFile',
    "} from 'fs/promises';",
    'export const config = { path: "/hello" };',
    'export async function helper() {}',
    'export default async (req) => new Response("hi");',
    'const x = import.meta.url;'
  ].join('\n');
  const out = lite.transform(src);
  const lines = out.split('\n');
  assert.equal(lines.length, src.split('\n').length);
  assert.equal(lines[0], "const express = require(\"express\");");
  assert.equal(lines[1], "const { WebSocketServer, WebSocket: WS } = require(\"ws\");");
  assert.equal(lines[2], "const path = require(\"node:path\");");
  assert.equal(lines[3], "require(\"dotenv/config\");");
  assert.equal(lines[4], "const { readFile, writeFile } = require(\"fs/promises\");");
  assert.equal(lines[5], '');
  assert.equal(lines[8], 'const config = { path: "/hello" };');
  assert.equal(lines[9], 'async function helper() {}');
  assert.equal(lines[10], 'module.exports.default = async (req) => new Response("hi");');
  assert.match(lines[11], /^const x = 'file:\/\/\/app\/server\.js'; module\.exports\.config = config; module\.exports\.helper = helper;$/);
});
