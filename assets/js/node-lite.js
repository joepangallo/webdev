/* ==========================================================================
   Web Development I: a simulated Node.js for the Chapter 13 playgrounds

   Real Node.js runs on a computer, not inside a web page, and this course
   must work offline with no server. So the playgrounds run a small, faithful
   imitation of Node inside the preview instead. A playground opts in with
   data-runtime="node" and its JS tab (labeled server.js) holds the server
   code, written exactly as it would be for real Node:

     const express = require('express');      // or: import express from 'express'
     const app = express();
     app.use(express.json());
     app.get('/api/books/:id', (req, res) => res.json({ id: req.params.id }));
     app.listen(3000, () => console.log('Listening on port 3000'));

   What is simulated: require() for http, express (routing with :params,
   middleware and next(), Router, express.json/urlencoded/static, error
   handlers, res.send/json/status/sendStatus/set/redirect/render/sendFile),
   fs (an in-memory folder; sync, callback and promise versions), path, url,
   events, ws (WebSocketServer, paired with a pretend browser WebSocket in the
   same preview), os, crypto, util, cors, morgan, dotenv, uuid and the ejs,
   handlebars and pug view engines; plus module.exports, process, __dirname
   and Buffer. Express behaves like Express 5, the version npm installs today:
   req.body stays undefined until a body parser runs, and a rejected promise in
   an async handler goes to the error handler.

   After the student's code runs, the preview shows a pretend HTTP client
   (like Postman) aimed at whatever port the code listens on. A file that
   exports a serverless function (exports.handler or export default) gets a
   function invoker instead. Optional settings, made in a playground's hidden
   setup script (which runs before the student's code):

     __nodeFiles({ 'views/books.ejs': WD1_CODE.ejs, 'public/style.css': '…' });
     NODE_START_PATH = '/api/books';   // the first request the client sends
     NODE_AUTO = false;                // do not send a first request at all
     NODE_WS_CLIENTS = ['Ana', 'Ben']; // pretend browsers for a ws server

   Checks talk to the server through window.__node:
     await win.__node.request('POST', '/api/books', { title: 'Dune' })
       -> { status, statusText, headers, body, json, timedOut, error }
     win.__node.routes() -> [{ method: 'GET', path: '/api/books' }]
     win.__node.ports(), win.__node.invoke(method, url, body), win.__node.chat

   The preview function is turned into text and run inside the preview, so it
   must not use anything outside itself. Node can also load this file, which
   is how tests/node-lite.test.js runs it; there it installs itself on a plain
   object instead of window and builds no client.
   ========================================================================== */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.WD1) {
    root.WD1.runtimes = root.WD1.runtimes || {};
    root.WD1.runtimes.node = api.runtime;
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  function nodePreview(G) {
    'use strict';
    G = G || window;
    var con = G.console || console;
    var hasDOM = !!(G.document && G.document.createElement && G.addEventListener);
    // Where this runtime's own code sits in the preview document, so an error's
    // stack can be searched for the first line the STUDENT wrote.
    var RT_FIRST = srcLine(new Error());

    /* ---------- Small helpers ---------- */

    function srcLine(err) {
      var m = /about:srcdoc:(\d+)/.exec((err && err.stack) || '');
      return m ? +m[1] : 0;
    }
    var later = function (fn) { return setTimeout(fn, 1); };      // simulated disk / network time
    var later0 = function (fn) { return setTimeout(fn, 0); };
    var STATUS = { 100: 'Continue', 101: 'Switching Protocols', 200: 'OK', 201: 'Created', 202: 'Accepted', 204: 'No Content',
      301: 'Moved Permanently', 302: 'Found', 303: 'See Other', 304: 'Not Modified', 307: 'Temporary Redirect',
      308: 'Permanent Redirect', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found',
      405: 'Method Not Allowed', 409: 'Conflict', 413: 'Payload Too Large', 415: 'Unsupported Media Type',
      422: 'Unprocessable Content', 429: 'Too Many Requests', 500: 'Internal Server Error', 501: 'Not Implemented',
      502: 'Bad Gateway', 503: 'Service Unavailable', 504: 'Gateway Timeout' };
    var METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];
    var MIME = { html: 'text/html', htm: 'text/html', css: 'text/css', js: 'text/javascript', mjs: 'text/javascript',
      json: 'application/json', txt: 'text/plain', md: 'text/markdown', svg: 'image/svg+xml', png: 'image/png',
      jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', ico: 'image/x-icon', ejs: 'text/plain' };
    function escHTML(s) {
      return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&#34;', "'": '&#39;' }[c]; });
    }
    function byteLength(s) {
      try { return new TextEncoder().encode(s).length; } catch (e) { return String(s).length; }
    }
    function errText(e) {
      if (!(e instanceof Error) && !(e && typeof e === 'object' && 'message' in e)) return 'Uncaught ' + (typeof e === 'string' ? "'" + e + "'" : String(e));
      return (e.name || 'Error') + (e.code && /^ERR_/.test(e.code) ? ' [' + e.code + ']' : '') + ': ' + e.message;
    }
    function nodeError(Ctor, message, code, extra) {
      var e = new Ctor(message);
      if (code) e.code = code;
      if (extra) Object.keys(extra).forEach(function (k) { e[k] = extra[k]; });
      return e;
    }
    // Report an error the way Node prints one. In the preview it goes through the playground's
    // error handler, which turns the first line the student wrote into "(JS line N)".
    function reportError(e) {
      var text = errText(e);
      if (hasDOM && typeof G.ErrorEvent === 'function') {
        var line = 0, re = /about:srcdoc:(\d+)/g, m;
        var stack = (e && e.stack) || '';
        while ((m = re.exec(stack))) {
          var n = +m[1];
          if (n < RT_FIRST - 5 || n > RT_LAST + 5) { line = n; break; }
        }
        try { G.dispatchEvent(new G.ErrorEvent('error', { message: text, filename: G.location.href, lineno: line, error: e })); return; } catch (x) { /* fall through */ }
      }
      con.error(text);
    }
    function parseQuery(qs) {
      var out = {};
      String(qs || '').replace(/^\?/, '').split('&').forEach(function (p) {
        if (!p) return;
        var i = p.indexOf('='), k = i < 0 ? p : p.slice(0, i), v = i < 0 ? '' : p.slice(i + 1);
        var dec = function (s) { try { return decodeURIComponent(s.replace(/\+/g, ' ')); } catch (x) { return s; } };
        k = dec(k); v = dec(v);
        if (Object.prototype.hasOwnProperty.call(out, k)) out[k] = [].concat(out[k], v); else out[k] = v;
      });
      return out;
    }
    function splitUrl(url) {
      url = String(url || '/');
      var h = url.indexOf('#'); if (h >= 0) url = url.slice(0, h);
      var q = url.indexOf('?');
      return { pathname: q < 0 ? url : url.slice(0, q), search: q < 0 ? '' : url.slice(q), query: q < 0 ? '' : url.slice(q + 1) };
    }

    /* ---------- events ---------- */

    function EventEmitter() { Object.defineProperty(this, '_ev', { value: {}, writable: true, configurable: true }); }
    EventEmitter.prototype.on = function (n, f) {
      if (typeof f !== 'function') throw nodeError(TypeError, 'The "listener" argument must be of type function. Received ' + (f === null ? 'null' : typeof f), 'ERR_INVALID_ARG_TYPE');
      if (!this._ev) Object.defineProperty(this, '_ev', { value: {}, writable: true, configurable: true });
      (this._ev[n] = this._ev[n] || []).push(f);
      return this;
    };
    EventEmitter.prototype.addListener = EventEmitter.prototype.on;
    EventEmitter.prototype.prependListener = function (n, f) { this.on(n, f); this._ev[n].unshift(this._ev[n].pop()); return this; };
    EventEmitter.prototype.once = function (n, f) {
      var self = this;
      var w = function () { self.off(n, w); return f.apply(self, arguments); };
      w.listener = f;
      return this.on(n, w);
    };
    EventEmitter.prototype.off = function (n, f) {
      var l = this._ev && this._ev[n];
      if (l) this._ev[n] = l.filter(function (x) { return x !== f && x.listener !== f; });
      return this;
    };
    EventEmitter.prototype.removeListener = EventEmitter.prototype.off;
    EventEmitter.prototype.removeAllListeners = function (n) { if (!this._ev) return this; if (n) delete this._ev[n]; else this._ev = {}; return this; };
    EventEmitter.prototype.emit = function (n) {
      var args = Array.prototype.slice.call(arguments, 1);
      var l = ((this._ev && this._ev[n]) || []).slice();
      if (n === 'error' && !l.length) throw args[0] instanceof Error ? args[0] : new Error('Unhandled error. (' + args[0] + ')');
      var self = this;
      l.forEach(function (f) { f.apply(self, args); });
      return l.length > 0;
    };
    EventEmitter.prototype.listenerCount = function (n) { return ((this._ev && this._ev[n]) || []).length; };
    EventEmitter.prototype.listeners = function (n) { return ((this._ev && this._ev[n]) || []).map(function (f) { return f.listener || f; }); };
    EventEmitter.prototype.eventNames = function () { var e = this._ev || {}; return Object.keys(e).filter(function (k) { return e[k].length; }); };
    EventEmitter.EventEmitter = EventEmitter;
    EventEmitter.once = function (em, n) { return new Promise(function (res) { em.once(n, function () { res(Array.prototype.slice.call(arguments)); }); }); };
    function inherit(Child) { Child.prototype = Object.create(EventEmitter.prototype); Child.prototype.constructor = Child; }

    /* ---------- Buffer (just enough to read text) ---------- */

    function Buffer(text) { Object.defineProperty(this, '_s', { value: String(text) }); this.length = byteLength(this._s); }
    Buffer.prototype.toString = function () { return this._s; };
    Buffer.prototype.toJSON = function () {
      var bytes = [];
      try { bytes = Array.from(new TextEncoder().encode(this._s)); } catch (e) { /* ignore */ }
      return { type: 'Buffer', data: bytes };
    };
    Buffer.from = function (x) { return x instanceof Buffer ? new Buffer(x._s) : new Buffer(typeof x === 'string' ? x : Array.isArray(x) ? String.fromCharCode.apply(null, x) : String(x)); };
    Buffer.isBuffer = function (x) { return x instanceof Buffer; };
    Buffer.byteLength = function (s) { return byteLength(String(s)); };
    Buffer.concat = function (list) { return new Buffer(list.map(String).join('')); };

    /* ---------- path and the in-memory file system ---------- */

    var CWD = '/app';
    function normalize(p) {
      p = String(p);
      var abs = p.charAt(0) === '/', out = [];
      p.split('/').forEach(function (seg) {
        if (!seg || seg === '.') return;
        if (seg === '..') { if (out.length && out[out.length - 1] !== '..') out.pop(); else if (!abs) out.push('..'); }
        else out.push(seg);
      });
      var r = (abs ? '/' : '') + out.join('/');
      return r || (abs ? '/' : '.');
    }
    var path = {
      sep: '/', delimiter: ':',
      normalize: normalize,
      join: function () {
        var parts = Array.prototype.slice.call(arguments).map(function (a) {
          if (typeof a !== 'string') throw nodeError(TypeError, 'The "path" argument must be of type string. Received ' + (a === undefined ? 'undefined' : typeof a), 'ERR_INVALID_ARG_TYPE');
          return a;
        }).filter(function (a) { return a !== ''; });
        return parts.length ? normalize(parts.join('/')) : '.';
      },
      resolve: function () {
        var r = CWD;
        Array.prototype.slice.call(arguments).forEach(function (x) { x = String(x); if (!x) return; r = x.charAt(0) === '/' ? x : r + '/' + x; });
        return normalize(r);
      },
      isAbsolute: function (p) { return String(p).charAt(0) === '/'; },
      basename: function (p, ext) {
        var b = String(p).replace(/\/+$/, '').split('/').pop();
        return ext && b.slice(-ext.length) === ext && b !== ext ? b.slice(0, -ext.length) : b;
      },
      dirname: function (p) {
        p = String(p).replace(/\/+$/, '');
        var i = p.lastIndexOf('/');
        return i < 0 ? '.' : i === 0 ? '/' : p.slice(0, i);
      },
      extname: function (p) {
        var b = path.basename(p), i = b.lastIndexOf('.');
        return i <= 0 ? '' : b.slice(i);
      },
      parse: function (p) {
        var base = path.basename(p), ext = path.extname(p);
        return { root: path.isAbsolute(p) ? '/' : '', dir: path.dirname(p), base: base, ext: ext, name: ext ? base.slice(0, -ext.length) : base };
      },
      format: function (o) { return (o.dir ? o.dir + '/' : '') + (o.base || (o.name || '') + (o.ext || '')); },
      relative: function (from, to) {
        var a = path.resolve(from).split('/').filter(Boolean), b = path.resolve(to).split('/').filter(Boolean);
        while (a.length && b.length && a[0] === b[0]) { a.shift(); b.shift(); }
        return a.map(function () { return '..'; }).concat(b).join('/');
      }
    };
    path.posix = path;

    var files = {};   // '/app/views/books.ejs' -> text
    var absPath = function (p) { p = String(p).replace(/^file:\/\//, ''); return path.resolve(p); };
    function isDir(k) {
      var pre = k.replace(/\/$/, '') + '/';
      return k === '/' || k === CWD || Object.keys(files).some(function (f) { return f.indexOf(pre) === 0; });
    }
    function fsErr(code, syscall, p) {
      var msg = { ENOENT: 'no such file or directory', EISDIR: 'illegal operation on a directory', ENOTDIR: 'not a directory' }[code];
      return nodeError(Error, code + ': ' + msg + ', ' + syscall + " '" + p + "'", code, { errno: code === 'ENOENT' ? -2 : -21, syscall: syscall, path: String(p) });
    }
    function encOf(opt) { return typeof opt === 'string' ? opt : opt && opt.encoding; }
    var fs = {
      existsSync: function (p) { var k = absPath(p); return Object.prototype.hasOwnProperty.call(files, k) || isDir(k); },
      readFileSync: function (p, opt) {
        var k = absPath(p);
        if (!Object.prototype.hasOwnProperty.call(files, k)) throw isDir(k) ? fsErr('EISDIR', 'read', p) : fsErr('ENOENT', 'open', p);
        return encOf(opt) ? files[k] : new Buffer(files[k]);
      },
      writeFileSync: function (p, data) { files[absPath(p)] = data instanceof Buffer ? data.toString() : String(data); },
      appendFileSync: function (p, data) { var k = absPath(p); files[k] = (files[k] || '') + String(data); },
      unlinkSync: function (p) { var k = absPath(p); if (!(k in files)) throw fsErr('ENOENT', 'unlink', p); delete files[k]; },
      mkdirSync: function () { return undefined; },
      readdirSync: function (p) {
        var k = absPath(p).replace(/\/$/, '') + '/', names = {};
        Object.keys(files).forEach(function (f) { if (f.indexOf(k) === 0) names[f.slice(k.length).split('/')[0]] = 1; });
        if (!Object.keys(names).length && !isDir(absPath(p))) throw fsErr('ENOENT', 'scandir', p);
        return Object.keys(names).sort();
      },
      statSync: function (p) {
        var k = absPath(p);
        if (k in files) return { size: byteLength(files[k]), isFile: function () { return true; }, isDirectory: function () { return false; }, mtime: new Date() };
        if (isDir(k)) return { size: 4096, isFile: function () { return false; }, isDirectory: function () { return true; }, mtime: new Date() };
        throw fsErr('ENOENT', 'stat', p);
      }
    };
    // The callback versions: the same work, a moment later, with an error-first callback.
    ['readFile', 'writeFile', 'appendFile', 'unlink', 'mkdir', 'readdir', 'stat'].forEach(function (name) {
      fs[name] = function () {
        var args = Array.prototype.slice.call(arguments);
        var cb = typeof args[args.length - 1] === 'function' ? args.pop() : null;
        if (!cb) throw nodeError(TypeError, 'The "cb" argument must be of type function. Received undefined', 'ERR_INVALID_ARG_TYPE');
        later(function () {
          var r, err = null;
          try { r = fs[name + 'Sync'].apply(fs, args); } catch (e) { err = e; }
          cb(err, r);
        });
      };
    });
    fs.exists = function (p, cb) { later(function () { cb(fs.existsSync(p)); }); };
    fs.promises = {};
    ['readFile', 'writeFile', 'appendFile', 'unlink', 'mkdir', 'readdir', 'stat'].forEach(function (name) {
      fs.promises[name] = function () {
        var args = Array.prototype.slice.call(arguments);
        return new Promise(function (resolve, reject) {
          later(function () { try { resolve(fs[name + 'Sync'].apply(fs, args)); } catch (e) { reject(e); } });
        });
      };
    });
    fs.promises.access = function (p) { return fs.promises.stat(p).then(function () { return undefined; }); };

    /* ---------- View engines: EJS, Handlebars and Pug (the parts courses use) ---------- */

    // EJS: <%= escaped %>, <%- raw %>, <% code %>, <%# comment %>, -%> trims the next
    // newline, <%_ _%> trim whitespace, include('name', data). Variables come from the data
    // object (EJS uses `with`), so a missing one is a ReferenceError naming the template line.
    function ejsCompile(src, opts) {
      opts = opts || {};
      var name = opts.filename ? path.relative(CWD, opts.filename) : 'ejs';
      src = String(src);
      var code = 'var __out = "", __line = 1;\ntry {\nwith (locals) {\n';
      var i = 0, line = 1, trimNext = false;
      var count = function (s) { return (s.match(/\n/g) || []).length; };
      while (i < src.length) {
        var at = src.indexOf('<%', i);
        var text = at < 0 ? src.slice(i) : src.slice(i, at);
        if (trimNext) { text = text.replace(/^[ \t]*\r?\n/, ''); trimNext = false; }
        if (text) code += '__out += ' + JSON.stringify(text) + ';\n';
        line += count(at < 0 ? src.slice(i) : src.slice(i, at));
        if (at < 0) break;
        if (src.charAt(at + 2) === '%') { code += '__out += "<%";\n'; i = at + 3; continue; }
        var kind = /[=\-#_]/.test(src.charAt(at + 2)) ? src.charAt(at + 2) : '';
        var start = at + 2 + (kind ? 1 : 0);
        var end = src.indexOf('%>', start);
        if (end < 0) throw new SyntaxError('Could not find matching close tag for "<%' + kind + '" in ' + name + ':' + line + '.');
        var body = src.slice(start, end);
        var closeTrim = /[-_]$/.test(body) ? body.slice(-1) : '';
        if (closeTrim) body = body.slice(0, -1);
        if (kind === '_') code = code.replace(/__out \+= ("(?:[^"\\]|\\.)*");\n$/, function (m, s) { return '__out += ' + JSON.stringify(JSON.parse(s).replace(/[ \t]+$/, '')) + ';\n'; });
        code += '__line = ' + line + ';\n';
        if (kind === '=') code += '__out += __esc(' + body + '\n);\n';
        else if (kind === '-') code += '__out += __raw(' + body + '\n);\n';
        else if (kind !== '#') code += body + '\n';
        line += count(src.slice(at, end + 2));
        i = end + 2;
        if (closeTrim === '-') trimNext = true;
        if (closeTrim === '_') { var ws = /^[ \t]*(\r?\n)?/.exec(src.slice(i)); i += ws[0].length; line += ws[1] ? 1 : 0; }
      }
      code += '}\n} catch (e) {\n  e.message = ' + JSON.stringify(name) + ' + ":" + __line + "\\n" + e.message;\n  throw e;\n}\nreturn __out;';
      var fn;
      try { fn = new Function('locals', '__esc', '__raw', 'include', code); } catch (e) {
        throw new SyntaxError(e.message + ' in ' + name + ' while compiling ejs');
      }
      var raw = function (v) { return v == null ? '' : String(v); };
      var esc = function (v) { return v == null ? '' : escHTML(v); };
      return function (data) {
        data = data || {};
        var include = function (p, extra) {
          var base = opts.filename ? path.dirname(opts.filename) : path.join(CWD, 'views');
          var file = path.resolve(base, path.extname(p) ? p : p + '.ejs');
          if (!(file in files)) throw new Error('Could not find the include file "' + p + '"');
          return ejsCompile(files[file], { filename: file })(Object.assign({}, data, extra || {}));
        };
        return fn(Object.assign(Object.create(null), data), esc, raw, include);
      };
    }

    // Handlebars: {{x}} escaped, {{{x}}} raw, {{#each}} / {{#if}} / {{#unless}} / {{#with}}
    // with {{else}}, {{this}}, {{@index}}, {{@key}}, {{../x}}, {{> partial}} and {{! comments }}.
    function hbsCompile(src, opts) {
      opts = opts || {};
      var re = /\{\{(\{?)(~?)\s*([#\/^>!]|else\b)?\s*([\s\S]*?)\s*(~?)\}?\}\}/g, tokens = [], last = 0, m;
      src = String(src);
      while ((m = re.exec(src))) {
        if (m.index > last) tokens.push({ t: 'text', v: src.slice(last, m.index) });
        tokens.push({ t: m[3] === 'else' ? 'else' : m[3] || (m[1] ? 'raw' : 'var'), v: m[4], raw: !!m[1] });
        last = re.lastIndex;
      }
      if (last < src.length) tokens.push({ t: 'text', v: src.slice(last) });
      var pos = 0;
      function parse(closer) {
        var nodes = [], node = nodes;
        var block = { body: nodes, inverse: null };
        while (pos < tokens.length) {
          var tk = tokens[pos++];
          if (tk.t === '/') {
            if (tk.v !== closer) throw new Error('Parse error: {{/' + tk.v + '}} does not match {{#' + closer + '}}');
            return block;
          }
          if (tk.t === 'else') { block.inverse = node = []; continue; }
          if (tk.t === '#' || tk.t === '^') {
            var parts = tk.v.split(/\s+/), helper = tk.t === '^' ? 'unless' : parts[0];
            var arg = tk.t === '^' ? parts[0] : parts.slice(1).join(' ');
            var inner = parse(tk.t === '^' ? parts[0] : parts[0]);
            node.push({ t: 'block', helper: helper, arg: arg, body: inner.body, inverse: inner.inverse });
            continue;
          }
          node.push(tk);
        }
        if (closer) throw new Error('Parse error: {{#' + closer + '}} is never closed with {{/' + closer + '}}');
        return block;
      }
      var tree = parse(null).body;
      var esc = function (v) {
        return v == null ? '' : String(v).replace(/[&<>"'`=]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '`': '&#x60;', '=': '&#x3D;' }[c]; });
      };
      function lookup(expr, stack, data) {
        expr = String(expr).trim();
        if (/^(['"]).*\1$/.test(expr)) return expr.slice(1, -1);
        if (/^-?\d+(\.\d+)?$/.test(expr)) return +expr;
        if (expr.charAt(0) === '@') return data[expr.slice(1)];
        var depth = stack.length - 1;
        while (expr.indexOf('../') === 0) { expr = expr.slice(3); depth = Math.max(0, depth - 1); }
        var ctx = stack[depth];
        if (expr === 'this' || expr === '.') return ctx;
        expr = expr.replace(/^this\./, '');
        var segs = expr.split('.');
        for (var k = 0; k < segs.length; k++) { if (ctx == null) return undefined; ctx = ctx[segs[k]]; }
        return ctx;
      }
      var truthy = function (v) { return !(v == null || v === false || v === '' || v === 0 || (Array.isArray(v) && !v.length)); };
      function run(nodes, stack, data) {
        var out = '';
        nodes.forEach(function (n) {
          if (n.t === 'text') out += n.v;
          else if (n.t === '!') return;
          else if (n.t === 'var' || n.t === 'raw') { var v = lookup(n.v, stack, data); out += n.raw ? (v == null ? '' : String(v)) : esc(v); }
          else if (n.t === '>') {
            var file = path.resolve(opts.views || path.join(CWD, 'views'), 'partials', n.v.split(/\s+/)[0] + '.hbs');
            if (!(file in files)) file = path.resolve(opts.views || path.join(CWD, 'views'), n.v.split(/\s+/)[0] + '.hbs');
            if (!(file in files)) throw new Error('The partial ' + n.v + ' could not be found');
            out += hbsCompile(files[file], opts)(stack[stack.length - 1]);
          } else if (n.t === 'block') {
            var val = lookup(n.arg, stack, data);
            if (n.helper === 'if' || n.helper === 'unless') {
              var yes = n.helper === 'if' ? truthy(val) : !truthy(val);
              out += yes ? run(n.body, stack, data) : n.inverse ? run(n.inverse, stack, data) : '';
            } else if (n.helper === 'each') {
              var items = val == null ? [] : Array.isArray(val) ? val : Object.keys(val).map(function (k) { return val[k]; });
              var keys = val == null ? [] : Array.isArray(val) ? null : Object.keys(val);
              if (!items.length) { if (n.inverse) out += run(n.inverse, stack, data); return; }
              items.forEach(function (item, idx) {
                out += run(n.body, stack.concat([item]), { index: idx, key: keys ? keys[idx] : idx, first: idx === 0, last: idx === items.length - 1, root: data.root });
              });
            } else if (n.helper === 'with') {
              out += truthy(val) ? run(n.body, stack.concat([val]), data) : n.inverse ? run(n.inverse, stack, data) : '';
            } else throw new Error('Missing helper: "' + n.helper + '"');
          }
        });
        return out;
      }
      return function (ctx) { return run(tree, [ctx || {}], { root: ctx || {} }); };
    }

    // Pug: indentation makes the nesting. tag.class#id(attr=value) text, tag= expression,
    // #{escaped} and !{raw} interpolation, | piped text, each / if / else if / else / unless,
    // doctype html, //- silent comments and // HTML comments.
    var VOID = /^(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/;
    function pugCompile(src, opts) {
      opts = opts || {};
      var evalIn = function (expr, scope) {
        try { return new Function('__s', 'with (__s) { return (' + expr + '\n); }')(scope); } catch (e) {
          if (e instanceof SyntaxError) throw new SyntaxError('Pug: bad expression `' + expr + '`: ' + e.message);
          throw e;
        }
      };
      var lines = String(src).replace(/\t/g, '  ').split('\n').map(function (l, k) { return { ind: /^ */.exec(l)[0].length, text: l.trim(), n: k + 1 }; })
        .filter(function (l) { return l.text; });
      // Build a tree from the indentation.
      var rootNode = { kids: [], ind: -1 }, stack = [rootNode];
      lines.forEach(function (l) {
        while (stack.length > 1 && stack[stack.length - 1].ind >= l.ind) stack.pop();
        var node = { text: l.text, ind: l.ind, n: l.n, kids: [] };
        stack[stack.length - 1].kids.push(node);
        stack.push(node);
      });
      var interp = function (s, scope) {
        return s.replace(/([#!])\{([^}]*)\}/g, function (m, kind, expr) {
          var v = evalIn(expr, scope);
          return kind === '#' ? escHTML(v == null ? '' : v) : v == null ? '' : String(v);
        });
      };
      function parseAttrs(s, scope) {
        var out = [], i = 0;
        while (i < s.length) {
          while (i < s.length && /[\s,]/.test(s[i])) i++;
          var nm = /^[\w:@.-]+/.exec(s.slice(i));
          if (!nm) break;
          i += nm[0].length;
          var val = true;
          if (s[i] === '!' && s[i + 1] === '=') i++;
          if (s[i] === '=') {
            i++;
            var start = i, depth = 0, q = null;
            for (; i < s.length; i++) {
              var c = s[i];
              if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
              if (c === '"' || c === "'" || c === '`') { q = c; continue; }
              if ('([{'.indexOf(c) >= 0) depth++;
              else if (')]}'.indexOf(c) >= 0) depth--;
              else if (depth === 0 && c === ',') break;
              else if (depth === 0 && /\s/.test(c)) {
                // A space ends the value only when the value is complete and a new attribute follows,
                // so cond ? "a" : "b" and "x" + (n + 1) stay whole.
                var soFar = s.slice(start, i).trim(), ahead = s.slice(i).replace(/^\s+/, '');
                if (soFar && !/[?:+\-*\/%&|=<>!(,]$/.test(soFar) && /^[A-Za-z_@][\w:@.-]*(?:\s*!?=(?!=)|\s*,|\s*$|\s+[A-Za-z_@])/.test(ahead) &&
                  !/^(?:in|of|instanceof|typeof)\b/.test(ahead)) break;
              }
            }
            val = evalIn(s.slice(start, i), scope);
          }
          out.push([nm[0], val]);
        }
        return out;
      }
      function render(nodes, scope) {
        var out = '', k = 0;
        while (k < nodes.length) {
          var node = nodes[k++], t = node.text, m;
          if (/^\/\/-/.test(t)) continue;
          if (/^\/\//.test(t)) { out += '<!--' + t.slice(2) + '-->'; continue; }
          if (/^doctype\b/.test(t)) { out += '<!DOCTYPE ' + (t.slice(7).trim() || 'html') + '>'; continue; }
          if (t.charAt(0) === '|') { out += interp(t.slice(1).replace(/^ /, ''), scope) + (nodes[k] && nodes[k].text.charAt(0) === '|' ? '\n' : ''); continue; }
          if ((m = /^-\s*(?:const|let|var)\s+([\w$]+)\s*=\s*([\s\S]+)$/.exec(t))) { scope = Object.assign(Object.create(scope), {}); scope[m[1]] = evalIn(m[2], scope); continue; }
          if ((m = /^(?:each|for)\s+([\w$]+)(?:\s*,\s*([\w$]+))?\s+in\s+([\s\S]+)$/.exec(t))) {
            var list = evalIn(m[3], scope) || [];
            var arr = Array.isArray(list) ? list : Object.keys(list).map(function (key) { return list[key]; });
            var keys = Array.isArray(list) ? null : Object.keys(list);
            var elseNode = nodes[k] && /^else$/.test(nodes[k].text) ? nodes[k++] : null;
            if (!arr.length && elseNode) out += render(elseNode.kids, scope);
            arr.forEach(function (item, idx) {
              var s2 = Object.create(scope);
              s2[m[1]] = item;
              if (m[2]) s2[m[2]] = keys ? keys[idx] : idx;
              out += render(node.kids, s2);
            });
            continue;
          }
          if ((m = /^(if|unless)\s+([\s\S]+)$/.exec(t))) {
            var chain = [{ cond: m[1] === 'if' ? !!evalIn(m[2], scope) : !evalIn(m[2], scope), kids: node.kids }];
            while (nodes[k] && /^else(\s+if\s+[\s\S]+)?$/.test(nodes[k].text)) {
              var e2 = /^else(?:\s+if\s+([\s\S]+))?$/.exec(nodes[k].text);
              chain.push({ expr: e2[1], kids: nodes[k].kids });
              k++;
            }
            for (var c = 0; c < chain.length; c++) {
              var ok = c === 0 ? chain[0].cond : chain[c].expr === undefined ? true : !!evalIn(chain[c].expr, scope);
              if (ok) { out += render(chain[c].kids, scope); break; }
            }
            continue;
          }
          // A tag line: tag.class#id(attrs) text | tag= expr | tag!= expr | tag. (a block of text)
          m = /^([a-zA-Z][\w-]*)?((?:[.#][\w-]+)*)/.exec(t);
          if (!m[0]) { out += interp(t, scope); continue; }
          var rest = t.slice(m[0].length), attrSrc = null;
          if (rest.charAt(0) === '(') {
            var depth2 = 0, q2 = null, close = -1;
            for (var ci = 0; ci < rest.length; ci++) {
              var ch = rest.charAt(ci);
              if (q2) { if (ch === '\\') ci++; else if (ch === q2) q2 = null; continue; }
              if (ch === '"' || ch === "'" || ch === '`') q2 = ch;
              else if (ch === '(') depth2++;
              else if (ch === ')' && --depth2 === 0) { close = ci; break; }
            }
            if (close < 0) throw new SyntaxError('Pug line ' + node.n + ': an attribute list is missing its )');
            attrSrc = rest.slice(1, close);
            rest = rest.slice(close + 1);
          }
          var block = rest === '.', mode = '', content = rest;
          if (!block) {
            if (rest.slice(0, 2) === '!=') { mode = '!='; content = rest.slice(2); }
            else if (rest.charAt(0) === '=') { mode = '='; content = rest.slice(1); }
            else content = rest.replace(/^ /, '');
          }
          m = [t, m[1], m[2], null, attrSrc, block ? '.' : '', mode, content.trim() && mode ? content.trim() : content];
          var tag = m[1] || 'div', classes = [], id = null;
          (m[2].match(/[.#][\w-]+/g) || []).forEach(function (x) { if (x.charAt(0) === '.') classes.push(x.slice(1)); else id = x.slice(1); });
          var attrs = m[4] !== null ? parseAttrs(m[4], scope) : [];
          var html = '<' + tag;
          if (id) html += ' id="' + escHTML(id) + '"';
          attrs.forEach(function (a) { if (a[0] === 'class' && a[1]) classes.push(a[1]); });
          if (classes.length) html += ' class="' + escHTML(classes.join(' ')) + '"';
          attrs.forEach(function (a) {
            if (a[0] === 'class' || a[1] === false || a[1] == null) return;
            html += a[1] === true ? ' ' + a[0] : ' ' + a[0] + '="' + escHTML(a[1]) + '"';
          });
          html += '>';
          if (VOID.test(tag)) { out += html; continue; }
          var inner = '';
          if (m[5]) inner = node.kids.map(function (kid) { return interp(kid.text, scope); }).join('\n');
          else {
            if (m[6] === '=') inner = escHTML(evalIn(m[7], scope) == null ? '' : evalIn(m[7], scope));
            else if (m[6] === '!=') inner = String(evalIn(m[7], scope));
            else if (m[7]) inner = interp(m[7], scope);
            inner += render(node.kids, scope);
          }
          out += html + inner + '</' + tag + '>';
        }
        return out;
      }
      return function (locals) { return render(rootNode.kids, Object.assign(Object.create(null), locals || {})); };
    }

    var engines = {
      '.ejs': function (file, data) { return ejsCompile(files[file], { filename: file })(data); },
      '.hbs': function (file, data, views) { return hbsCompile(files[file], { views: views })(data); },
      '.handlebars': function (file, data, views) { return hbsCompile(files[file], { views: views })(data); },
      '.pug': function (file, data) { return pugCompile(files[file], { filename: file })(data); }
    };

    /* ---------- http ---------- */

    var servers = {};          // port -> Server
    var wsServers = {};        // port -> WebSocketServer
    var exited = false;

    function Server(handler) {
      EventEmitter.call(this);
      if (handler) this.on('request', handler);
      this.listening = false;
      this.port = null;
    }
    inherit(Server);
    Server.prototype.listen = function () {
      var self = this, port = null, cb = null;
      Array.prototype.slice.call(arguments).forEach(function (a) {
        if (typeof a === 'function') cb = a;
        else if (port === null && (typeof a === 'number' || (typeof a === 'string' && /^\d+$/.test(a)))) port = +a;
        else if (a && typeof a === 'object' && a.port != null) port = +a.port;
      });
      if (!port) port = 49152 + Math.floor(Math.random() * 1000);   // port 0 or none: the OS picks a free one
      if (exited) return this;
      if (servers[port] && servers[port] !== this) {
        later(function () {
          var e = nodeError(Error, 'listen EADDRINUSE: address already in use :::' + port, 'EADDRINUSE', { errno: -98, syscall: 'listen', port: port });
          if (self.listenerCount('error')) self.emit('error', e); else reportError(e);
        });
        return this;
      }
      servers[port] = this;
      this.listening = true;
      this.port = port;
      this.emit('_bound');
      if (cb) this.once('listening', cb);
      later0(function () { if (self.listening) self.emit('listening'); });
      changed();
      return this;
    };
    Server.prototype.close = function (cb) {
      var self = this;
      if (servers[this.port] === this) delete servers[this.port];
      this.listening = false;
      later0(function () { self.emit('close'); if (cb) cb(); });
      changed();
      return this;
    };
    Server.prototype.address = function () { return this.listening ? { address: '::', family: 'IPv6', port: this.port } : null; };

    // The request the server receives. Its body arrives as 'data' and 'end' events, just
    // after the handler has had a chance to listen for them.
    function IncomingMessage(o) {
      EventEmitter.call(this);
      this.method = o.method;
      this.url = o.url;
      this.headers = o.headers;
      this.rawHeaders = [];
      this.httpVersion = '1.1';
      this.socket = this.connection = { remoteAddress: '::1', remotePort: 52314, encrypted: false };
      this.complete = false;
      Object.defineProperty(this, '_body', { value: o.body || '', writable: true });
    }
    inherit(IncomingMessage);
    IncomingMessage.prototype.setEncoding = function () { return this; };
    IncomingMessage.prototype.pipe = function (dest) { var b = this._body; later(function () { if (dest.end) dest.end(b); }); return dest; };
    if (typeof Symbol === 'function' && Symbol.asyncIterator) {
      IncomingMessage.prototype[Symbol.asyncIterator] = function () {
        var body = this._body, done = !body;
        return { next: function () { var r = done ? { value: undefined, done: true } : { value: new Buffer(body), done: false }; done = true; return Promise.resolve(r); } };
      };
    }

    function headersSentError() {
      return nodeError(Error, 'Cannot set headers after they are sent to the client', 'ERR_HTTP_HEADERS_SENT');
    }
    function ServerResponse(req, done) {
      EventEmitter.call(this);
      this.req = req;
      this.statusCode = 200;
      this.statusMessage = '';
      this.headersSent = false;
      this.writableEnded = false;
      this.finished = false;
      this.sendDate = true;
      Object.defineProperty(this, '_h', { value: {}, writable: true });
      Object.defineProperty(this, '_chunks', { value: [], writable: true });
      Object.defineProperty(this, '_done', { value: done, writable: true });
    }
    inherit(ServerResponse);
    ServerResponse.prototype.setHeader = function (n, v) {
      if (this.headersSent) throw headersSentError();
      this._h[String(n).toLowerCase()] = [String(n), v];
      return this;
    };
    ServerResponse.prototype.getHeader = function (n) { var x = this._h[String(n).toLowerCase()]; return x ? x[1] : undefined; };
    ServerResponse.prototype.getHeaders = function () { var o = {}, h = this._h; Object.keys(h).forEach(function (k) { o[k] = h[k][1]; }); return o; };
    ServerResponse.prototype.getHeaderNames = function () { return Object.keys(this._h); };
    ServerResponse.prototype.hasHeader = function (n) { return String(n).toLowerCase() in this._h; };
    ServerResponse.prototype.removeHeader = function (n) { if (this.headersSent) throw headersSentError(); delete this._h[String(n).toLowerCase()]; };
    ServerResponse.prototype.writeHead = function (code, msg, headers) {
      if (typeof msg === 'object' && msg) { headers = msg; msg = ''; }
      if (this.headersSent) throw headersSentError();
      code = +code;
      if (!(code >= 100 && code <= 999)) throw nodeError(RangeError, 'Invalid status code: ' + code, 'ERR_HTTP_INVALID_STATUS_CODE');
      this.statusCode = code;
      if (msg) this.statusMessage = msg;
      var self = this;
      if (Array.isArray(headers)) { for (var i = 0; i + 1 < headers.length; i += 2) self.setHeader(headers[i], headers[i + 1]); }
      else if (headers) Object.keys(headers).forEach(function (k) { self.setHeader(k, headers[k]); });
      this.headersSent = true;
      return this;
    };
    ServerResponse.prototype.write = function (chunk) {
      if (this.writableEnded) {
        var e = nodeError(Error, 'write after end', 'ERR_STREAM_WRITE_AFTER_END');
        var self = this;
        later0(function () { if (self.listenerCount('error')) self.emit('error', e); else reportError(e); });
        return false;
      }
      this.headersSent = true;
      this._streamed = true;
      if (chunk != null) this._chunks.push(chunk instanceof Buffer ? chunk.toString() : String(chunk));
      return true;
    };
    ServerResponse.prototype.end = function (chunk, enc, cb) {
      if (typeof chunk === 'function') { cb = chunk; chunk = null; }
      if (typeof enc === 'function') cb = enc;
      if (this.writableEnded) return this;
      if (chunk != null) this._chunks.push(chunk instanceof Buffer ? chunk.toString() : String(chunk));
      var body = this._chunks.join('');
      if (!this._streamed && !this.hasHeader('content-length')) this._h['content-length'] = ['Content-Length', String(byteLength(body))];
      if (this._streamed && !this.hasHeader('content-length')) this._h['transfer-encoding'] = ['Transfer-Encoding', 'chunked'];
      this.headersSent = true;
      this.writableEnded = this.finished = true;
      var self = this;
      later0(function () { self.emit('finish'); self.emit('close'); if (cb) cb(); });
      if (this._done) this._done(this._snapshot(body));
      return this;
    };
    ServerResponse.prototype._snapshot = function (body) {
      var headers = {}, h = this._h, status = this.statusCode;
      if (this.sendDate) headers.date = new Date().toUTCString();
      Object.keys(h).forEach(function (k) { var v = h[k][1]; headers[k] = Array.isArray(v) ? (k === 'set-cookie' ? v.join('\n') : v.join(', ')) : String(v); });
      headers.connection = 'keep-alive';
      headers['keep-alive'] = 'timeout=5';
      if (status === 204 || status === 304 || this.req.method === 'HEAD') {
        body = '';
        if (status !== 200) { delete headers['content-length']; delete headers['content-type']; }
      }
      return { status: status, statusText: this.statusMessage || STATUS[status] || '', headers: headers, body: body };
    };

    var http = {
      createServer: function (opts, handler) { if (typeof opts === 'function') handler = opts; return new Server(handler); },
      Server: Server, IncomingMessage: IncomingMessage, ServerResponse: ServerResponse,
      STATUS_CODES: STATUS,
      METHODS: ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT']
    };

    /* ---------- express ---------- */

    // A route path such as /books/:id becomes a regular expression. Matching ignores letter
    // case and one trailing slash, as Express does. A middleware path (end = false) matches
    // the start of the path at a segment boundary: /api matches /api/books but not /apis.
    function compilePath(p, end) {
      if (p instanceof RegExp) return { re: p, keys: [] };
      if (Array.isArray(p)) {
        var parts = p.map(function (x) { return compilePath(x, end); });
        return { multi: parts };
      }
      p = String(p);
      if (!end && (p === '/' || p === '' || p === '*' || p === '/*')) return { re: /^/, keys: [], all: true };
      var keys = [], src = '', i = 0;
      if (!end) p = p.replace(/\/+$/, '');
      while (i < p.length) {
        var c = p.charAt(i), rest = p.slice(i), m;
        if (c === ':' && (m = /^:([A-Za-z_$][\w$]*)(\?)?/.exec(rest))) {
          keys.push(m[1]);
          if (m[2] && /\\\/$/.test(src)) src = src.slice(0, -2) + '(?:\\/([^\\/]+?))?';
          else src += '([^\\/]+?)';
          i += m[0].length; continue;
        }
        if (c === '*') { m = /^\*([A-Za-z_$][\w$]*)?/.exec(rest); keys.push(m[1] || '0'); src += '(.*)'; i += m[0].length; continue; }
        if (c === '{') { src += '(?:'; i++; continue; }
        if (c === '}') { src += ')?'; i++; continue; }
        src += c === '/' ? '\\/' : c.replace(/[.+?^$()[\]\\|]/g, '\\$&');
        i++;
      }
      return { re: new RegExp('^' + src + (end ? '\\/?$' : '(?=\\/|$)'), 'i'), keys: keys };
    }
    function matchLayer(layer, pathname) {
      var c = layer.compiled;
      if (c.multi) { for (var k = 0; k < c.multi.length; k++) { var r = matchLayer({ compiled: c.multi[k] }, pathname); if (r) return r; } return null; }
      if (c.all) return { params: {}, path: '' };
      var m = c.re.exec(pathname);
      if (!m) return null;
      var params = {};
      c.keys.forEach(function (key, k) {
        if (m[k + 1] === undefined) return;
        try { params[key] = decodeURIComponent(m[k + 1]); } catch (e) { params[key] = m[k + 1]; }
      });
      if (!c.keys.length) for (var j = 1; j < m.length; j++) if (m[j] !== undefined) params[j - 1] = m[j];
      return { params: params, path: m[0] };
    }
    function describe(fn) { return Object.prototype.toString.call(fn); }
    // Calls one handler. A thrown error, or (Express 5) a rejected promise, goes to next(err).
    function callHandler(fn, err, req, res, next) {
      var arity = fn.length;
      if (err && arity !== 4) return next(err);
      if (!err && arity === 4) return next();
      req.next = next;
      try {
        var r = err ? fn(err, req, res, next) : fn(req, res, next);
        if (r && typeof r.then === 'function') r.then(null, function (e) { next(e || new Error('Rejected promise')); });
      } catch (e) { next(e); }
    }

    function Route(p) { this.path = p; this.stack = []; this.methods = {}; }
    Route.prototype.handlesMethod = function (m) {
      if (this.methods._all) return true;
      m = String(m).toLowerCase();
      if (m === 'head' && !this.methods.head) m = 'get';
      return !!this.methods[m];
    };
    Route.prototype.dispatch = function (req, res, done) {
      var idx = 0, stack = this.stack, self = this;
      var method = String(req.method).toLowerCase();
      if (method === 'head' && !this.methods.head) method = 'get';
      req.route = this;
      function next(err) {
        if (err === 'route') return done();
        if (err === 'router') return done(err);
        var layer = stack[idx++];
        if (!layer) return done(err);
        if (layer.method !== 'all' && layer.method !== method) return next(err);
        callHandler(layer.handle, err, req, res, next);
      }
      next();
      return self;
    };
    METHODS.concat('all').forEach(function (m) {
      Route.prototype[m] = function () {
        var self = this;
        var fns = Array.prototype.concat.apply([], Array.prototype.slice.call(arguments));
        if (!fns.length) throw new TypeError('Route.' + m + '() requires a callback function but got a ' + describe(undefined));
        fns.forEach(function (fn) {
          if (typeof fn !== 'function') throw new TypeError('Route.' + m + '() requires a callback function but got a ' + describe(fn));
          self.stack.push({ method: m, handle: fn });
          self.methods[m === 'all' ? '_all' : m] = true;
        });
        return this;
      };
    });

    function createRouter(opts) {
      opts = opts || {};
      var router = function (req, res, next) { router.handle(req, res, next); };
      router.stack = [];
      router.mergeParams = !!opts.mergeParams;
      router.use = function (first) {
        var args = Array.prototype.slice.call(arguments), p = '/';
        if (typeof first === 'string' || first instanceof RegExp || (Array.isArray(first) && typeof first[0] === 'string')) p = args.shift();
        var fns = Array.prototype.concat.apply([], args);
        if (!fns.length) throw new TypeError('app.use() requires a middleware function');
        fns.forEach(function (fn) {
          if (typeof fn !== 'function') throw new TypeError('app.use() requires a middleware function but got a ' + describe(fn));
          router.stack.push({ path: p, compiled: compilePath(p, false), handle: fn, name: fn.name || '<anonymous>' });
          if (fn._isApp) { fn.mountpath = p; fn.parent = router; }
        });
        return router;
      };
      router.route = function (p) {
        var route = new Route(p);
        router.stack.push({ path: p, compiled: compilePath(p, true), route: route, handle: function (req, res, next) { route.dispatch(req, res, next); } });
        return route;
      };
      METHODS.concat('all').forEach(function (m) {
        router[m] = function (p) {
          var route = router.route(p);
          route[m].apply(route, Array.prototype.slice.call(arguments, 1));
          return router;
        };
      });
      router.handle = function (req, res, out) {
        var idx = 0, stack = router.stack;
        var parentUrl = req.url, parentBase = req.baseUrl || '', parentParams = req.params || {};
        function next(err) {
          req.url = parentUrl;
          req.baseUrl = parentBase;
          if (err === 'route') err = null;
          if (err === 'router') { req.params = parentParams; return out(); }
          var pathname = splitUrl(req.url).pathname, layer = null, match = null;
          while (idx < stack.length) {
            var l = stack[idx++];
            var mm = matchLayer(l, pathname);
            if (!mm) continue;
            if (l.route && !l.route.handlesMethod(req.method)) continue;
            if (l.route && err) continue;            // a route never handles an error
            layer = l; match = mm; break;
          }
          if (!layer) { req.params = parentParams; return out(err); }
          req.params = Object.assign({}, router.mergeParams ? parentParams : {}, match.params);
          if (!layer.route && match.path && match.path !== '/') {
            req.url = parentUrl.slice(match.path.length) || '/';
            if (req.url.charAt(0) !== '/') req.url = '/' + req.url;
            req.baseUrl = parentBase + match.path;
          }
          if (layer.route) { req.next = next; layer.handle(req, res, next); }
          else callHandler(layer.handle, err, req, res, next);
        }
        next();
      };
      // Every route this router (and the routers mounted on it) answers, for the client's list.
      router._routes = function (prefix) {
        var out = [];
        router.stack.forEach(function (l) {
          var base = typeof l.path === 'string' ? l.path : String(l.path);
          if (l.route) {
            Object.keys(l.route.methods).forEach(function (m) { out.push({ method: m === '_all' ? 'ALL' : m.toUpperCase(), path: (prefix + base).replace(/\/\/+/g, '/') || '/' }); });
          } else if (l.handle && typeof l.handle._routes === 'function') {
            out = out.concat(l.handle._routes(prefix + (base === '/' ? '' : base)));
          } else if (l.handle && l.handle._isApp) {
            out = out.concat(l.handle._router._routes(prefix + (base === '/' ? '' : base)));
          }
        });
        return out;
      };
      return router;
    }

    var MIME_SHORT = { json: 'application/json', html: 'text/html', text: 'text/plain', txt: 'text/plain', css: 'text/css', js: 'text/javascript', xml: 'application/xml' };
    function mimeFor(t) {
      if (/\//.test(t)) return t;
      var ext = String(t).replace(/^\./, '');
      return MIME_SHORT[ext] || MIME[ext] || 'application/octet-stream';
    }
    function withCharset(t) { return /^(text\/|application\/(json|javascript|xml))/.test(t) && !/charset/.test(t) ? t + '; charset=utf-8' : t; }

    // Adds Express's request and response helpers to Node's plain request and response.
    function expressify(app, req, res) {
      req.app = res.app = app;
      req.res = res; res.req = req;
      if (!req.originalUrl) req.originalUrl = req.url;
      if (!('path' in req)) Object.defineProperty(req, 'path', { get: function () { return splitUrl(this.url).pathname; }, configurable: true, enumerable: true });
      req.query = parseQuery(splitUrl(req.originalUrl).query);
      req.params = req.params || {};
      req.hostname = 'localhost';
      req.ip = '::1';
      req.ips = [];
      req.protocol = 'http';
      req.secure = false;
      req.subdomains = [];
      req.xhr = req.headers['x-requested-with'] === 'XMLHttpRequest';
      req.get = req.header = function (n) {
        n = String(n).toLowerCase();
        if (n === 'referer' || n === 'referrer') return req.headers.referer || req.headers.referrer;
        return req.headers[n];
      };
      req.is = function (type) {
        var ct = (req.headers['content-type'] || '').split(';')[0].trim();
        if (!ct) return null;
        var want = mimeFor(type);
        return ct === want || (want.indexOf('*') >= 0 && new RegExp('^' + want.replace('*', '.*') + '$').test(ct)) ? type : false;
      };
      req.accepts = function () { var a = Array.prototype.slice.call(arguments); a = [].concat.apply([], a); return a.length ? a[0] : ['*/*']; };
      res.locals = res.locals || {};
      res.status = function (code) {
        if (!Number.isInteger(code) || code < 100 || code > 999) throw new RangeError('Invalid status code: ' + code + '. Status code must be an integer greater than 99 and less than 1000.');
        res.statusCode = code;
        return res;
      };
      res.set = res.header = function (field, val) {
        if (field && typeof field === 'object') { Object.keys(field).forEach(function (k) { res.set(k, field[k]); }); return res; }
        if (String(field).toLowerCase() === 'content-type' && !Array.isArray(val)) val = withCharset(mimeFor(String(val)));
        res.setHeader(field, Array.isArray(val) ? val.map(String) : String(val));
        return res;
      };
      res.append = function (field, val) {
        var prev = res.getHeader(field);
        res.setHeader(field, prev ? [].concat(prev, val) : val);
        return res;
      };
      res.get = function (field) { return res.getHeader(field); };
      res.type = res.contentType = function (t) { return res.set('Content-Type', withCharset(mimeFor(t))); };
      res.send = function (body) {
        if (res.writableEnded) throw headersSentError();
        var chunk = body;
        if (chunk !== null && typeof chunk === 'object' && !(chunk instanceof Buffer)) return res.json(chunk);
        if (typeof chunk === 'number' || typeof chunk === 'boolean') return res.json(chunk);
        if (chunk instanceof Buffer) { if (!res.get('Content-Type')) res.type('bin'); chunk = chunk.toString(); }
        if (typeof chunk === 'string' && !res.get('Content-Type')) res.set('Content-Type', 'text/html; charset=utf-8');
        if (chunk == null) chunk = '';
        if (app.enabled('x-powered-by') && !res.get('X-Powered-By')) res.setHeader('X-Powered-By', 'Express');
        res.setHeader('Content-Length', String(byteLength(chunk)));
        if (res.statusCode === 204 || res.statusCode === 304) { res.removeHeader('Content-Type'); res.removeHeader('Content-Length'); chunk = ''; }
        res.end(req.method === 'HEAD' ? '' : chunk);
        return res;
      };
      res.json = function (obj) {
        var spaces = app.get('json spaces');
        var body = JSON.stringify(obj, app.get('json replacer'), spaces);
        if (body === undefined) body = '';
        if (!res.get('Content-Type')) res.set('Content-Type', 'application/json; charset=utf-8');
        return res.send(body);
      };
      res.sendStatus = function (code) {
        res.status(code);
        res.type('txt');
        return res.send(STATUS[code] || String(code));
      };
      res.location = function (url) { return res.set('Location', url === 'back' ? (req.get('Referrer') || '/') : url); };
      res.redirect = function (a, b) {
        var status = 302, url = a;
        if (b !== undefined) { status = a; url = b; }
        res.location(url);
        res.status(status);
        res.type('txt');
        return res.send(STATUS[status] + '. Redirecting to ' + url);
      };
      res.cookie = function (name, value, opts) {
        opts = opts || {};
        var v = typeof value === 'object' ? 'j:' + JSON.stringify(value) : String(value);
        var c = name + '=' + encodeURIComponent(v) + '; Path=' + (opts.path || '/');
        if (opts.maxAge != null) c += '; Max-Age=' + Math.floor(opts.maxAge / 1000);
        if (opts.httpOnly) c += '; HttpOnly';
        if (opts.secure) c += '; Secure';
        if (opts.sameSite) c += '; SameSite=' + (opts.sameSite === true ? 'Strict' : String(opts.sameSite).replace(/^./, function (x) { return x.toUpperCase(); }));
        return res.append('Set-Cookie', c);
      };
      res.clearCookie = function (name, opts) { return res.cookie(name, '', Object.assign({}, opts, { maxAge: 0 })); };
      res.render = function (view, opts, cb) {
        if (typeof opts === 'function') { cb = opts; opts = {}; }
        var locals = Object.assign({}, app.locals, res.locals, opts || {});
        app.render(view, locals, function (err, html) {
          if (cb) return cb(err, html);
          if (err) return req.next(err);
          res.send(html);
        });
      };
      res.sendFile = function (p, opts, cb) {
        if (typeof opts === 'function') { cb = opts; opts = {}; }
        opts = opts || {};
        if (!opts.root && !path.isAbsolute(p)) throw new TypeError('path must be absolute or specify root to res.sendFile');
        var file = opts.root ? path.resolve(opts.root, p) : normalize(p);
        later(function () {
          if (!(file in files)) {
            var e = fsErr('ENOENT', 'stat', file);
            e.status = e.statusCode = 404;
            if (cb) cb(e); else req.next(e);
            return;
          }
          if (!res.get('Content-Type')) res.type(path.extname(file) || 'bin');
          res.send(files[file]);
          if (cb) cb();
        });
      };
      res.download = function (p, name) {
        res.set('Content-Disposition', 'attachment; filename="' + (name || path.basename(p)) + '"');
        res.sendFile(path.resolve(p));
      };
      res.attachment = function (name) { res.set('Content-Disposition', name ? 'attachment; filename="' + path.basename(name) + '"' : 'attachment'); if (name) res.type(path.extname(name)); return res; };
      res.vary = function (f) { return res.append('Vary', f); };
      res.links = function () { return res; };
      res.format = function (obj) { var k = Object.keys(obj).filter(function (x) { return x !== 'default'; })[0]; (obj[k] || obj.default)(); return res; };
    }

    // What Express does when nothing answered: a 404 page, or the error as a 500 page.
    function finalHandler(req, res) {
      return function (err) {
        if (err && res.headersSent) { reportError(err); return; }
        if (res.writableEnded) return;
        var status = 404, msg;
        if (err) {
          status = err.status || err.statusCode;
          if (!(status >= 400 && status < 600)) status = 500;
          reportError(err);
          msg = escHTML(errText(err));
        } else msg = 'Cannot ' + escHTML(req.method) + ' ' + escHTML(splitUrl(req.originalUrl || req.url).pathname);
        var doc = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>Error</title>\n</head>\n<body>\n<pre>' + msg + '</pre>\n</body>\n</html>\n';
        res.statusCode = status;
        Object.keys(res._h).forEach(function (k) { delete res._h[k]; });
        res.setHeader('Content-Security-Policy', "default-src 'none'");
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Length', String(byteLength(doc)));
        res.end(req.method === 'HEAD' ? '' : doc);
      };
    }

    var apps = [];
    function createApplication() {
      var app = function (req, res, next) { app.handle(req, res, next); };
      var ee = new EventEmitter();
      app.on = function (n, f) { ee.on(n, f); return app; };
      app.emit = function () { return ee.emit.apply(ee, arguments); };
      app._isApp = true;
      app.settings = { 'x-powered-by': true, env: 'development', views: path.join(CWD, 'views'), 'json spaces': undefined, 'json replacer': undefined };
      app.locals = { settings: app.settings };
      app.mountpath = '/';
      app.engines = {};
      app._router = createRouter();
      app.set = function (k, v) { if (arguments.length === 1) return app.settings[k]; app.settings[k] = v; return app; };
      app.enable = function (k) { return app.set(k, true); };
      app.disable = function (k) { return app.set(k, false); };
      app.enabled = function (k) { return !!app.settings[k]; };
      app.disabled = function (k) { return !app.settings[k]; };
      app.engine = function (ext, fn) {
        if (typeof fn !== 'function') throw new Error('callback function required');
        app.engines[ext.charAt(0) === '.' ? ext : '.' + ext] = fn;
        return app;
      };
      app.use = function () { app._router.use.apply(app._router, arguments); return app; };
      app.route = function (p) { return app._router.route(p); };
      METHODS.concat('all').forEach(function (m) {
        app[m] = function (p) {
          if (m === 'get' && arguments.length === 1) return app.set(p);
          var route = app._router.route(p);
          route[m].apply(route, Array.prototype.slice.call(arguments, 1));
          return app;
        };
      });
      app.param = function () { return app; };
      app.path = function () { return app.parent ? '' : ''; };
      app.handle = function (req, res, outer) {
        expressify(app, req, res);
        app._router.handle(req, res, outer || finalHandler(req, res));
      };
      app.render = function (name, opts, cb) {
        if (typeof opts === 'function') { cb = opts; opts = {}; }
        var ext = path.extname(name), engineName = app.get('view engine');
        if (!ext && !engineName) return cb(new Error('No default engine was specified and no extension was provided.'));
        if (!ext) ext = (engineName.charAt(0) === '.' ? '' : '.') + engineName;
        var views = app.get('views');
        var file = path.resolve(views, path.extname(name) ? name : name + ext);
        if (!(file in files)) return cb(new Error('Failed to lookup view "' + name + '" in views directory "' + views + '"'));
        var engine = app.engines[ext];
        try {
          if (engine) {
            var sync = null, done = false;
            engine(file, Object.assign({ settings: app.settings }, opts), function (err, html) { done = true; sync = [err, html]; });
            if (done) return cb(sync[0], sync[1]);
            return cb(new Error('The view engine for "' + ext + '" did not call back'));
          }
          var builtin = engines[ext];
          if (!builtin) return cb(new Error("Cannot find module '" + ext.slice(1) + "'"));
          cb(null, builtin(file, opts, views));
        } catch (e) { cb(e); }
      };
      app.listen = function () {
        var server = http.createServer(app);
        return server.listen.apply(server, arguments);
      };
      apps.push(app);
      return app;
    }

    function rawBodyText(req) { return req._body instanceof Buffer ? req._body.toString() : String(req._body || ''); }
    function hasBody(req) { return rawBodyText(req).length > 0; }
    function typeIs(req, re) { return re.test((req.headers['content-type'] || '').split(';')[0].trim()); }
    function bodyError(message, status, type) { var e = new SyntaxError(message); e.status = e.statusCode = status; e.type = type; e.expose = true; return e; }
    function express() { return createApplication(); }
    express.json = function (opts) {
      opts = opts || {};
      var strict = opts.strict !== false;
      return function jsonParser(req, res, next) {
        if (req._bodyParsed) return next();
        if (!hasBody(req) || !typeIs(req, /^application\/(.+\+)?json$/i)) return next();
        req._bodyParsed = true;
        var text = rawBodyText(req);
        if (strict && !/^[\s]*[{[]/.test(text)) return next(bodyError('Unexpected token \'' + text.trim().charAt(0) + '\', "' + text.trim().slice(0, 20) + '" is not valid JSON', 400, 'entity.parse.failed'));
        try { req.body = JSON.parse(text); } catch (e) { return next(bodyError(e.message, 400, 'entity.parse.failed')); }
        next();
      };
    };
    express.urlencoded = function () {
      return function urlencodedParser(req, res, next) {
        if (req._bodyParsed) return next();
        if (!hasBody(req) || !typeIs(req, /^application\/x-www-form-urlencoded$/i)) return next();
        req._bodyParsed = true;
        req.body = parseQuery(rawBodyText(req));
        next();
      };
    };
    express.text = function () {
      return function textParser(req, res, next) {
        if (req._bodyParsed || !hasBody(req) || !typeIs(req, /^text\//i)) return next();
        req._bodyParsed = true;
        req.body = rawBodyText(req);
        next();
      };
    };
    express.raw = function () {
      return function rawParser(req, res, next) {
        if (req._bodyParsed || !hasBody(req)) return next();
        req._bodyParsed = true;
        req.body = new Buffer(rawBodyText(req));
        next();
      };
    };
    // Serves files from a folder in the in-memory file system: GET /style.css -> public/style.css.
    express.static = function (root, opts) {
      opts = opts || {};
      var dir = path.resolve(root);
      return function serveStatic(req, res, next) {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        var p;
        try { p = decodeURIComponent(splitUrl(req.url).pathname); } catch (e) { return next(); }
        var file = normalize(dir + '/' + p);
        if (file.indexOf(dir) !== 0) return next();
        if (!(file in files) && (opts.index !== false)) {
          var idx = normalize(file + '/' + (opts.index || 'index.html'));
          if (idx in files) file = idx;
        }
        if (!(file in files)) return next();
        res.setHeader('Content-Type', withCharset(MIME[path.extname(file).slice(1)] || 'application/octet-stream'));
        res.setHeader('Cache-Control', 'public, max-age=0');
        res.setHeader('Accept-Ranges', 'bytes');
        res.statusCode = 200;
        res.send(files[file]);
      };
    };
    express.Router = function (opts) { return createRouter(opts); };
    express.application = {};
    express.request = {};
    express.response = {};

    /* ---------- Other modules the textbook and tutorials use ---------- */

    function cors(opts) {
      opts = opts || {};
      return function corsMiddleware(req, res, next) {
        var origin = opts.origin;
        var allow = origin === undefined || origin === '*' || origin === true ? (origin === true ? req.headers.origin || '*' : '*')
          : Array.isArray(origin) ? (origin.indexOf(req.headers.origin) >= 0 ? req.headers.origin : null)
          : typeof origin === 'string' ? origin : null;
        if (allow) res.setHeader('Access-Control-Allow-Origin', allow);
        if (allow && allow !== '*') res.setHeader('Vary', 'Origin');
        if (opts.credentials) res.setHeader('Access-Control-Allow-Credentials', 'true');
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Methods', (opts.methods || ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE']).join(','));
          if (req.headers['access-control-request-headers']) res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers']);
          res.statusCode = 204;
          res.setHeader('Content-Length', '0');
          return res.end();
        }
        next();
      };
    }
    function morgan(format) {
      return function logger(req, res, next) {
        var t0 = Date.now();
        res.once('finish', function () {
          var len = res.getHeader('content-length');
          var line = format === 'tiny'
            ? req.method + ' ' + req.originalUrl + ' ' + res.statusCode + ' ' + (len || '-') + ' - ' + (Date.now() - t0).toFixed(3) + ' ms'
            : req.method + ' ' + req.originalUrl + ' ' + res.statusCode + ' ' + (Date.now() - t0 + Math.random()).toFixed(3) + ' ms - ' + (len || '-');
          con.log(line);
        });
        next();
      };
    }
    function uuid4() {
      if (G.crypto && typeof G.crypto.randomUUID === 'function') { try { return G.crypto.randomUUID(); } catch (e) { /* not a secure context */ } }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
    }
    var proc = {
      env: { NODE_ENV: 'development' },
      argv: ['/usr/local/bin/node', '/app/server.js'],
      platform: 'linux', arch: 'x64', pid: 4242,
      version: 'v22.11.0', versions: { node: '22.11.0', v8: '12.4.254.21-node.21' },
      cwd: function () { return CWD; },
      exit: function (code) {
        exited = true;
        Object.keys(servers).forEach(function (p) { servers[p].close(); });
        Object.keys(wsServers).forEach(function (p) { wsServers[p].close(); });
        con.info('Process exited with code ' + (code || 0) + '.');
      },
      nextTick: function (fn) { var a = Array.prototype.slice.call(arguments, 1); Promise.resolve().then(function () { fn.apply(null, a); }); },
      on: function () { return proc; },
      once: function () { return proc; },
      uptime: function () { return (Date.now() - started) / 1000; },
      memoryUsage: function () { return { rss: 45678592, heapTotal: 6438912, heapUsed: 5213456, external: 1234567 }; },
      hrtime: { bigint: function () { return typeof BigInt === 'function' ? BigInt(Math.round(Date.now() * 1e6)) : Date.now() * 1e6; } },
      stdout: { write: function (s) { con.log(String(s).replace(/\n$/, '')); return true; } },
      stderr: { write: function (s) { con.error(String(s).replace(/\n$/, '')); return true; } }
    };
    var started = Date.now();
    var util = {
      format: function () {
        var a = Array.prototype.slice.call(arguments), f = String(a.shift() || '');
        return f.replace(/%[sdifjo%]/g, function (m) {
          if (m === '%%') return '%';
          var v = a.shift();
          return m === '%j' || m === '%o' ? JSON.stringify(v) : m === '%d' || m === '%i' ? String(parseInt(v, 10)) : m === '%f' ? String(parseFloat(v)) : String(v);
        }) + (a.length ? ' ' + a.join(' ') : '');
      },
      inspect: function (v) { try { return JSON.stringify(v); } catch (e) { return String(v); } },
      promisify: function (fn) { return function () { var a = Array.prototype.slice.call(arguments); return new Promise(function (res, rej) { fn.apply(null, a.concat(function (e, r) { if (e) rej(e); else res(r); })); }); }; },
      isDeepStrictEqual: function (a, b) { return JSON.stringify(a) === JSON.stringify(b); }
    };

    /* ---------- ws: WebSocket servers and pretend browsers ---------- */

    // One end of a connection, as the ws library gives it to the server.
    function WebSocket(url) {
      EventEmitter.call(this);
      this.readyState = 0;
      this.url = url || '';
      this.protocol = '';
      Object.defineProperty(this, '_peer', { value: null, writable: true });
    }
    inherit(WebSocket);
    WebSocket.CONNECTING = 0; WebSocket.OPEN = 1; WebSocket.CLOSING = 2; WebSocket.CLOSED = 3;
    ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].forEach(function (k, v) { WebSocket.prototype[k] = v; });
    WebSocket.prototype.send = function (data, opts, cb) {
      if (typeof opts === 'function') cb = opts;
      if (this.readyState !== 1) {
        var e = new Error('WebSocket is not open: readyState ' + this.readyState + ' (' + ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][this.readyState] + ')');
        if (cb) { cb(e); return; }
        throw e;
      }
      if (data instanceof Buffer && !wsWarned) {
        wsWarned = true;
        con.warn('ws: you sent a Buffer. Real ws sends a Buffer as binary data, so a browser receives a Blob instead of text. Send data.toString() (or a JSON string) instead.');
      }
      var text = data instanceof Buffer ? data.toString() : typeof data === 'string' ? data : data && data.toString ? data.toString() : String(data);
      var peer = this._peer;
      later(function () { if (peer) peer._receive(text); if (cb) cb(); });
    };
    WebSocket.prototype.close = function (code, reason) {
      if (this.readyState >= 2) return;
      this.readyState = 2;
      var self = this, peer = this._peer;
      later(function () { closePair(self, peer, code || 1000, reason || ''); });
    };
    WebSocket.prototype.terminate = function () { this.close(1006, ''); };
    WebSocket.prototype.ping = function () { };
    WebSocket.prototype._receive = function (text) { if (this.readyState === 1) this.emit('message', new Buffer(text), false); };
    WebSocket.prototype._closed = function (code, reason) {
      if (this.readyState === 3) return;
      this.readyState = 3;
      if (this._server) this._server.clients.delete(this);
      this.emit('close', code, new Buffer(reason || ''));
    };
    var wsWarned = false;
    function closePair(a, b, code, reason) { if (a) a._closed(code, reason); if (b) b._closed(code, reason); }

    function WebSocketServer(opts, cb) {
      EventEmitter.call(this);
      opts = opts || {};
      if (!opts.port && !opts.server && !opts.noServer) throw new TypeError('One and only one of the "port", "server", or "noServer" options must be specified');
      this.options = opts;
      this.clients = new Set();
      var self = this;
      var bind = function (port) {
        if (wsServers[port] && wsServers[port] !== self) {
          later(function () { var e = nodeError(Error, 'listen EADDRINUSE: address already in use :::' + port, 'EADDRINUSE'); if (self.listenerCount('error')) self.emit('error', e); else reportError(e); });
          return;
        }
        self.port = port;
        wsServers[port] = self;
        changed();
      };
      if (opts.port) { bind(+opts.port); later0(function () { self.emit('listening'); if (cb) cb(); }); }
      else if (opts.server) {
        if (opts.server.port) bind(opts.server.port);
        else opts.server.once('_bound', function () { bind(opts.server.port); });
      }
    }
    inherit(WebSocketServer);
    WebSocketServer.prototype.close = function (cb) {
      if (wsServers[this.port] === this) delete wsServers[this.port];
      this.clients.forEach(function (c) { c.close(1001, 'Server closing'); });
      var self = this;
      later0(function () { self.emit('close'); if (cb) cb(); });
      changed();
    };
    WebSocketServer.prototype.address = function () { return { address: '::', family: 'IPv6', port: this.port }; };
    // A browser connected: make the server's end of the connection and announce it.
    WebSocketServer.prototype._accept = function (client, url) {
      var sock = new WebSocket();
      Object.defineProperty(sock, '_server', { value: this });
      sock._peer = client;
      client._peer = sock;
      sock.readyState = 1;
      this.clients.add(sock);
      var req = new IncomingMessage({ method: 'GET', url: splitUrl(url).pathname + splitUrl(url).search, headers: { host: 'localhost:' + this.port, upgrade: 'websocket', connection: 'Upgrade', 'sec-websocket-version': '13', 'sec-websocket-key': 'dGhlIHNhbXBsZSBub25jZQ==' } });
      this.emit('connection', sock, req);
      return sock;
    };
    WebSocket.Server = WebSocketServer;
    WebSocket.WebSocketServer = WebSocketServer;
    WebSocket.WebSocket = WebSocket;

    // The browser's WebSocket, for pages (and pretend browsers) in the same preview.
    function BrowserWebSocket(url) {
      var self = this;
      this.url = String(url);
      this.readyState = 0;
      this.protocol = '';
      this.extensions = '';
      this.binaryType = 'blob';
      this.bufferedAmount = 0;
      this.onopen = this.onmessage = this.onclose = this.onerror = null;
      Object.defineProperty(this, '_l', { value: {} });
      Object.defineProperty(this, '_peer', { value: null, writable: true });
      var m = /^wss?:\/\/([^/:]+)(?::(\d+))?(\/.*)?$/i.exec(this.url);
      if (!m) throw new SyntaxError("Failed to construct 'WebSocket': The URL '" + url + "' is invalid.");
      var port = m[2] ? +m[2] : /^wss/i.test(this.url) ? 443 : 80;
      setTimeout(function () {
        var server = wsServers[port];
        if (!server) {
          self.readyState = 3;
          con.error("WebSocket connection to '" + self.url + "' failed: nothing is listening on port " + port + '.');
          self._fire('error', {});
          self._fire('close', { code: 1006, reason: '', wasClean: false });
          return;
        }
        server._accept(self, m[3] || '/');
        self.readyState = 1;
        self._fire('open', {});
      }, 5);
    }
    BrowserWebSocket.CONNECTING = 0; BrowserWebSocket.OPEN = 1; BrowserWebSocket.CLOSING = 2; BrowserWebSocket.CLOSED = 3;
    BrowserWebSocket.prototype.addEventListener = function (t, f) { (this._l[t] = this._l[t] || []).push(f); };
    BrowserWebSocket.prototype.removeEventListener = function (t, f) { this._l[t] = (this._l[t] || []).filter(function (x) { return x !== f; }); };
    BrowserWebSocket.prototype._fire = function (type, props) {
      var ev = Object.assign({ type: type, target: this, currentTarget: this, timeStamp: Date.now() }, props);
      var self = this;
      if (typeof this['on' + type] === 'function') this['on' + type].call(this, ev);
      (this._l[type] || []).slice().forEach(function (f) { f.call(self, ev); });
    };
    BrowserWebSocket.prototype.send = function (data) {
      if (this.readyState === 0) throw new Error("Failed to execute 'send' on 'WebSocket': Still in CONNECTING state.");
      if (this.readyState !== 1) return;
      var peer = this._peer, text = String(data);
      later(function () { if (peer) peer._receive(text); });
    };
    BrowserWebSocket.prototype.close = function (code, reason) {
      if (this.readyState >= 2) return;
      this.readyState = 2;
      var self = this;
      later(function () { closePair(self._peer, self, code || 1000, reason || ''); });
    };
    BrowserWebSocket.prototype._receive = function (text) { if (this.readyState === 1) this._fire('message', { data: text, origin: 'ws://localhost' }); };
    BrowserWebSocket.prototype._closed = function (code, reason) {
      if (this.readyState === 3) return;
      this.readyState = 3;
      this._fire('close', { code: code, reason: String(reason || ''), wasClean: code !== 1006 });
    };

    /* ---------- require() and module ---------- */

    var cache = {};
    var builtins = {
      http: http, https: http, express: express, fs: fs, 'fs/promises': fs.promises, path: path, events: EventEmitter,
      url: { URL: G.URL, URLSearchParams: G.URLSearchParams, parse: function (u, q) { var s = splitUrl(u); return { pathname: s.pathname, search: s.search, query: q ? parseQuery(s.query) : s.query, path: s.pathname + s.search, href: u }; } },
      ws: WebSocket, os: {
        platform: function () { return 'linux'; }, type: function () { return 'Linux'; }, arch: function () { return 'x64'; },
        hostname: function () { return 'webdev-sandbox'; }, homedir: function () { return '/home/student'; }, EOL: '\n',
        cpus: function () { return [0, 1, 2, 3].map(function () { return { model: 'Simulated CPU', speed: 2400 }; }); },
        totalmem: function () { return 8589934592; }, freemem: function () { return 5368709120; }, uptime: function () { return 3600; }
      },
      crypto: { randomUUID: uuid4, randomInt: function (a, b) { if (b === undefined) { b = a; a = 0; } return a + Math.floor(Math.random() * (b - a)); } },
      util: util, cors: cors, morgan: morgan, uuid: { v4: uuid4 },
      'body-parser': { json: express.json, urlencoded: express.urlencoded, text: express.text, raw: express.raw },
      dotenv: { config: function () {
        var k = path.resolve('.env'), parsed = {};
        (files[k] || '').split('\n').forEach(function (l) {
          var m = /^\s*([\w.]+)\s*=\s*(.*?)\s*$/.exec(l);
          if (m && l.trim().charAt(0) !== '#') { parsed[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2'); if (!(m[1] in proc.env)) proc.env[m[1]] = parsed[m[1]]; }
        });
        return { parsed: parsed };
      } },
      ejs: { compile: function (s, o) { return ejsCompile(s, o); }, render: function (s, d, o) { return ejsCompile(s, o)(d); } },
      handlebars: { compile: function (s) { return hbsCompile(s); } },
      hbs: { compile: function (s) { return hbsCompile(s); } },
      pug: { compile: function (s) { return pugCompile(s); }, render: function (s, d) { return pugCompile(s)(d); } }
    };
    function makeRequire(fromDir) {
      var req = function require(id) {
        if (typeof id !== 'string') throw nodeError(TypeError, 'The "id" argument must be of type string. Received ' + typeof id, 'ERR_INVALID_ARG_TYPE');
        var name = id.replace(/^node:/, '');
        if (name === 'dotenv/config') { builtins.dotenv.config(); return {}; }
        if (Object.prototype.hasOwnProperty.call(builtins, name)) return builtins[name];
        if (/^\.{0,2}\//.test(name)) {
          var base = path.resolve(fromDir, name);
          var tries = [base, base + '.js', base + '.json', base + '/index.js'];
          for (var k = 0; k < tries.length; k++) {
            var f = tries[k];
            if (!(f in files)) continue;
            if (cache[f]) return cache[f].exports;
            if (/\.json$/.test(f)) {
              try { return (cache[f] = { exports: JSON.parse(files[f]) }).exports; } catch (e) { e.message = f + ': ' + e.message; throw e; }
            }
            var mod = cache[f] = { exports: {}, id: f, filename: f, loaded: false };
            new Function('exports', 'require', 'module', '__filename', '__dirname', files[f])(mod.exports, makeRequire(path.dirname(f)), mod, f, path.dirname(f));
            mod.loaded = true;
            return mod.exports;
          }
        }
        var e = nodeError(Error, "Cannot find module '" + id + "'\nRequire stack:\n- /app/server.js", 'MODULE_NOT_FOUND', { requireStack: ['/app/server.js'] });
        if (!/^\.{0,2}\//.test(name)) con.info('This simulated Node.js has these modules: ' + Object.keys(builtins).filter(function (x) { return x !== 'https'; }).join(', ') + '.');
        throw e;
      };
      req.resolve = function (id) { return /^\.{0,2}\//.test(id) ? path.resolve(fromDir, id) : id; };
      req.cache = cache;
      return req;
    }

    var mainModule = { exports: {}, id: '.', filename: '/app/server.js', loaded: false, paths: ['/app/node_modules'] };
    var require = makeRequire(CWD);
    require.main = mainModule;
    G.require = require;
    G.module = mainModule;
    G.exports = mainModule.exports;
    G.process = proc;
    G.global = G;
    G.__dirname = CWD;
    G.__filename = '/app/server.js';
    G.Buffer = Buffer;
    if (!G.setImmediate) { G.setImmediate = function (fn) { var a = Array.prototype.slice.call(arguments, 1); return setTimeout(function () { fn.apply(null, a); }, 0); }; G.clearImmediate = function (t) { clearTimeout(t); }; }
    if (hasDOM) G.WebSocket = BrowserWebSocket;
    G.__nodeFiles = function (map) { Object.keys(map || {}).forEach(function (k) { if (map[k] != null) files[path.resolve(k)] = String(map[k]); }); };

    /* ---------- Sending requests to the student's server ---------- */

    function bodyAndType(body) {
      if (body == null || body === '') return { text: '', type: null };
      if (typeof body === 'object') return { text: JSON.stringify(body), type: 'application/json' };
      var t = String(body), s = t.trim();
      if (/^[[{]/.test(s)) return { text: t, type: 'application/json' };
      if (/^[^=&\s]+=[^&]*(&[^=&\s]+=[^&]*)*$/.test(s)) return { text: t, type: 'application/x-www-form-urlencoded' };
      return { text: t, type: 'text/plain' };
    }
    function finish(r) {
      var json;
      if (/json/i.test(r.headers['content-type'] || '') && r.body) { try { json = JSON.parse(r.body); } catch (e) { json = undefined; } }
      r.json = json;
      return r;
    }
    function pickServer(port) {
      if (port && servers[port]) return servers[port];
      var ports = Object.keys(servers);
      return ports.length ? servers[ports[0]] : null;
    }
    // One request, start to finish. Resolves with what the client would receive.
    function request(method, url, body, headers, port) {
      method = String(method || 'GET').toUpperCase();
      url = String(url || '/');
      if (url.charAt(0) !== '/') url = '/' + url;
      var server = pickServer(port);
      var t0 = Date.now();
      if (!server) {
        return Promise.resolve({ status: 0, statusText: '', headers: {}, body: '', json: undefined, ms: 0,
          error: 'connect ECONNREFUSED 127.0.0.1:' + (port || 3000) });
      }
      var bt = bodyAndType(method === 'GET' || method === 'HEAD' ? '' : body);
      var hdrs = { host: 'localhost:' + server.port, 'user-agent': 'node-lite-client/1.0', accept: '*/*' };
      if (bt.text) { hdrs['content-type'] = bt.type; hdrs['content-length'] = String(byteLength(bt.text)); }
      Object.keys(headers || {}).forEach(function (k) { hdrs[k.toLowerCase()] = String(headers[k]); });
      return new Promise(function (resolve) {
        var settled = false;
        var req = new IncomingMessage({ method: method, url: url, headers: hdrs, body: bt.text });
        var res = new ServerResponse(req, function (snap) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          snap.ms = Date.now() - t0;
          resolve(finish(snap));
        });
        var timer = setTimeout(function () {
          if (settled) return;
          settled = true;
          resolve({ status: 0, statusText: '', headers: {}, body: '', json: undefined, timedOut: true, ms: Date.now() - t0,
            error: 'No response after 3 seconds. Every request must end with a response: res.send(), res.json(), res.end() or similar.' });
        }, 3000);
        // The request arrives a moment later, after the server has finished starting up.
        later0(function () { dispatchTo(server, req, res, resolve, function () { settled = true; clearTimeout(timer); }, t0); });
      });
    }
    function dispatchTo(server, req, res, resolve, settle, t0) {
      try { server.emit('request', req, res); } catch (e) {
        // Plain Node has no safety net: an uncaught error in a request handler stops the whole
        // process, and every later request fails until the server is started again.
        reportError(e);
        con.error('The server process crashed and stopped. Real Node.js stops on an uncaught error like this, so every later request fails until you fix the code and start the server again.');
        proc.exit(1);
        settle();
        resolve({ status: 0, statusText: '', headers: {}, body: '', json: undefined, ms: Date.now() - t0, crashed: true,
          error: 'socket hang up: the server crashed while handling this request (' + errText(e) + ')' });
      }
      later0(function () { if (req._body) req.emit('data', new Buffer(req._body)); req.complete = true; req.emit('end'); });
    }

    /* ---------- Serverless functions ---------- */

    var invocations = 0;
    function exported() {
      var ex = mainModule.exports || {};
      if (typeof ex === 'function') return { kind: 'node', fn: ex };
      if (ex.default) {
        if (typeof ex.default === 'function') return { kind: ex.default.length >= 2 ? 'node' : 'web', fn: ex.default };
        if (typeof ex.default.fetch === 'function') return { kind: 'worker', fn: ex.default.fetch.bind(ex.default) };
      }
      if (typeof ex.handler === 'function') return { kind: 'lambda', fn: ex.handler };
      return null;
    }
    // Calls the exported function the way a serverless platform would. The first call after
    // the code loads is a cold start: the platform has to start a fresh copy first.
    function invoke(method, url, body) {
      var ex = exported();
      method = String(method || 'GET').toUpperCase();
      url = String(url || '/');
      if (url.charAt(0) !== '/') url = '/' + url;
      if (!ex) return Promise.resolve({ status: 0, headers: {}, body: '', error: 'No function is exported. Export one with export default async (req) => … or exports.handler = async (event) => …' });
      var cold = invocations++ === 0;
      var init = cold ? 180 + Math.round(Math.random() * 120) : 0;
      var t0 = Date.now();
      var bt = bodyAndType(method === 'GET' || method === 'HEAD' ? '' : body);
      var su = splitUrl(url);
      var done = function (r) {
        r.cold = cold; r.initMs = init; r.ms = Date.now() - t0 - init; r.kind = ex.kind;
        r.headers = r.headers || {};
        con.info((cold ? 'Cold start: ' + init + ' ms to load your function. ' : '') + 'Invoked ' + method + ' ' + url + ' → ' + r.status + ' in ' + Math.max(1, r.ms) + ' ms');
        return finish(r);
      };
      var fail = function (e) {
        reportError(e);
        return done({ status: 502, headers: { 'content-type': 'text/plain' }, body: 'Error: the function crashed (' + errText(e) + ')' });
      };
      return new Promise(function (r) { setTimeout(r, init); }).then(function () {
        if (ex.kind === 'lambda') {
          var q = parseQuery(su.query);
          var event = { httpMethod: method, path: su.pathname, rawPath: su.pathname, rawQueryString: su.query,
            queryStringParameters: Object.keys(q).length ? q : null, headers: bt.type ? { 'content-type': bt.type } : {},
            body: bt.text || null, isBase64Encoded: false, requestContext: { http: { method: method, path: su.pathname } } };
          return Promise.resolve().then(function () { return ex.fn(event, { functionName: 'my-function', awsRequestId: uuid4() }); }).then(function (out) {
            if (out === undefined) return done({ status: 502, headers: { 'content-type': 'text/plain' }, body: 'The function returned undefined. Return an object such as { statusCode: 200, body: "…" }.' });
            if (typeof out === 'string') return done({ status: 200, headers: { 'content-type': 'text/plain' }, body: out });
            var h = {};
            Object.keys(out.headers || {}).forEach(function (k) { h[k.toLowerCase()] = String(out.headers[k]); });
            var b = out.body == null ? '' : typeof out.body === 'string' ? out.body : JSON.stringify(out.body);
            if (!h['content-type']) h['content-type'] = /^\s*[{[]/.test(b) ? 'application/json' : 'text/plain';
            return done({ status: out.statusCode || 200, headers: h, body: b });
          }, fail);
        }
        if (ex.kind === 'web' || ex.kind === 'worker') {
          var init2 = { method: method, headers: bt.type ? { 'content-type': bt.type } : {} };
          if (bt.text) init2.body = bt.text;
          var request2 = new Request('http://localhost:8888' + url, init2);
          var ctx = { params: {}, geo: { city: 'Fort Lauderdale', country: { code: 'US' } }, waitUntil: function () { }, env: {} };
          return Promise.resolve().then(function () { return ex.kind === 'worker' ? ex.fn(request2, {}, ctx) : ex.fn(request2, ctx); }).then(function (out) {
            if (!out || typeof out.text !== 'function' || !out.headers) {
              return done({ status: 500, headers: { 'content-type': 'text/plain' }, body: 'The function must return a Response, for example: return new Response("Hello") or return Response.json({ ok: true }).' });
            }
            var h = {};
            out.headers.forEach(function (v, k) { h[k] = v; });
            return out.text().then(function (t) { return done({ status: out.status, headers: h, body: t }); });
          }, fail);
        }
        // (req, res) style, as in Vercel's Node.js functions: Express-like helpers on Node's objects.
        return new Promise(function (resolve) {
          var req = new IncomingMessage({ method: method, url: url, headers: bt.type ? { 'content-type': bt.type } : {}, body: bt.text });
          var res = new ServerResponse(req, function (snap) { resolve(done(snap)); });
          var fake = createApplication();
          fake.disable('x-powered-by');
          expressify(fake, req, res);
          if (bt.type === 'application/json') { try { req.body = JSON.parse(bt.text); } catch (e) { req.body = bt.text; } }
          else req.body = bt.text || undefined;
          try {
            var r = ex.fn(req, res);
            if (r && typeof r.then === 'function') r.then(null, function (e) { resolve(fail(e)); });
          } catch (e) { resolve(fail(e)); }
        });
      });
    }

    /* ---------- What checks (and the page's widgets) can use ---------- */

    var listeners = [];
    function changed() { listeners.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } }); }
    var chat = [];
    var api = {
      request: request,
      invoke: invoke,
      routes: function () {
        var out = [];
        apps.forEach(function (a) { out = out.concat(a._router._routes('')); });
        return out;
      },
      ports: function () { return Object.keys(servers).map(Number); },
      wsPorts: function () { return Object.keys(wsServers).map(Number); },
      get listening() { return Object.keys(servers).length > 0; },
      exported: function () { var e = exported(); return e ? e.kind : null; },
      files: {
        read: function (p) { return files[path.resolve(p)]; },
        write: function (p, s) { files[path.resolve(p)] = String(s); },
        list: function () { return Object.keys(files).sort(); }
      },
      chat: chat,
      onChange: function (f) { listeners.push(f); },
      ejs: { compile: ejsCompile, render: function (s, d, o) { return ejsCompile(s, o)(d); } },
      hbs: { compile: hbsCompile, render: function (s, d) { return hbsCompile(s)(d); } },
      pug: { compile: pugCompile, render: function (s, d) { return pugCompile(s)(d); } },
      matchPath: function (pattern, p) { var m = matchLayer({ compiled: compilePath(pattern, true) }, p); return m ? m.params : null; },
      parseQuery: parseQuery,
      STATUS: STATUS,
      BrowserWebSocket: BrowserWebSocket
    };
    G.__node = api;

    /* ---------- The pretend client shown in the preview ---------- */

    if (hasDOM) {
      G.addEventListener('DOMContentLoaded', function () {
        if (G.NODE_CLIENT === false) return;
        try { buildClient(); } catch (e) { con.error('The simulated client failed to start: ' + e.message); }
      });
    }

    function buildClient() {
      var doc = G.document;
      var h = function (tag, attrs) {
        var el = doc.createElement(tag);
        Object.keys(attrs || {}).forEach(function (k) {
          var v = attrs[k];
          if (v == null || v === false) return;
          if (k === 'text') el.textContent = v;
          else if (k === 'class') el.className = v;
          else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
          else el.setAttribute(k, v === true ? '' : v);
        });
        for (var i = 2; i < arguments.length; i++) { var c = arguments[i]; if (c != null) el.append(c.nodeType ? c : doc.createTextNode(String(c))); }
        return el;
      };
      var css = doc.createElement('style');
      css.textContent = '.nl{all:initial;display:block;font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1d2330;padding:12px;box-sizing:border-box}' +
        '.nl *{box-sizing:border-box}.nl b{font-weight:700}.nl-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 10px;font-size:13px;color:#454d5e}' +
        '.nl-dot{width:10px;height:10px;border-radius:50%;background:#b9322a;flex:none}.nl-dot.on{background:#0f7a55;box-shadow:0 0 0 3px #dff3ea}' +
        '.nl-title{font-weight:700;color:#161a23}.nl-routes{display:flex;flex-wrap:wrap;gap:5px;margin:0 0 10px}.nl-lbl{font:700 10px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.08em;text-transform:uppercase;color:#697184;align-self:center;margin-right:2px}' +
        '.nl .nl-chip{font:12px ui-monospace,Menlo,Consolas,monospace;padding:3px 8px;min-height:26px;border:1px solid #c3cad7;border-radius:99px;background:#fff;color:#1d2330;cursor:pointer}.nl .nl-chip:hover{border-color:#1f4fd1;background:#f3f5f8}' +
        '.nl .nl-chip i{font-style:normal;font-weight:700;color:#1f4fd1;margin-right:4px}.nl-form{display:flex;gap:6px;flex-wrap:wrap}.nl [hidden]{display:none!important}' +
        '.nl select,.nl input,.nl textarea{font:13px ui-monospace,Menlo,Consolas,monospace;color:#161a23;background:#fff;border:1px solid #c3cad7;border-radius:7px;padding:6px 8px;min-height:34px}' +
        '.nl input{flex:1 1 160px;min-width:0}.nl textarea{display:block;width:100%;margin-top:6px;min-height:64px;resize:vertical}' +
        '.nl button{font:600 13px system-ui,sans-serif;border:0;border-radius:7px;padding:7px 14px;background:#1f4fd1;color:#fff;cursor:pointer;min-height:34px}.nl button:hover{background:#1840b0}' +
        '.nl button.ghost{background:#edf0f5;color:#1d2330}.nl :focus-visible{outline:2px solid #1f4fd1;outline-offset:2px}' +
        '.nl-res{margin-top:10px;border:1px solid #d9dee7;border-radius:9px;overflow:hidden;background:#fff}.nl-res:empty{display:none}' +
        '.nl-line{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;padding:7px 10px;background:#f3f5f8;border-bottom:1px solid #d9dee7;font-size:12px;color:#454d5e}' +
        '.nl-pill{font:700 12px ui-monospace,Menlo,Consolas,monospace;padding:2px 8px;border-radius:99px;background:#dff3ea;color:#0f7a55}.nl-pill.w{background:#fcefd8;color:#9a5a00}.nl-pill.b{background:#fbe6e4;color:#b9322a}.nl-pill.i{background:#e4ebfd;color:#1f4fd1}' +
        '.nl details{padding:4px 10px;border-bottom:1px solid #eef1f5}.nl summary{cursor:pointer;font-size:12px;color:#697184}.nl dl{display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 12px;margin:6px 0;font:12px ui-monospace,Menlo,Consolas,monospace}' +
        '.nl dt{color:#1d55b5}.nl dd{margin:0;overflow-wrap:anywhere}.nl pre{margin:0;padding:10px;font:12.5px/1.5 ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;word-break:break-word;max-height:260px;overflow:auto}' +
        '.nl .k{color:#8a2bb3}.nl .s{color:#127046}.nl .n{color:#b0331f}.nl .nul{color:#697184}.nl iframe{display:block;width:100%;height:200px;border:0;background:#fff}' +
        '.nl-tabs{display:flex;gap:4px;padding:6px 10px 0}.nl .nl-tabs button{padding:3px 10px;min-height:26px;font-size:12px;background:#edf0f5;color:#454d5e}.nl .nl-tabs button[aria-pressed="true"]{background:#1d2330;color:#fff}' +
        '.nl .nl-hdrs{padding:6px 0 0;border:0}.nl-hdrs input{display:block;width:100%;margin-top:4px}.nl-note{padding:10px;color:#454d5e}.nl-note.bad{color:#b9322a}.nl-hist{margin-top:10px;font-size:12px}.nl-hist ol{margin:6px 0 0;padding-left:20px;font-family:ui-monospace,Menlo,Consolas,monospace}.nl-hist li{cursor:pointer;margin:2px 0}.nl-hist li:hover{color:#1f4fd1}' +
        '.nl-empty{padding:14px;border:1px dashed #c3cad7;border-radius:9px;color:#454d5e;background:#f9fafc}.nl-empty code{font:12px ui-monospace,Menlo,Consolas,monospace;background:#edf0f5;padding:1px 5px;border-radius:4px}' +
        '.nl-chat{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}.nl-pane{border:1px solid #d9dee7;border-radius:9px;display:flex;flex-direction:column;min-height:190px;background:#fff}' +
        '.nl-pane h3{margin:0;padding:6px 10px;font:700 12px system-ui,sans-serif;background:#f3f5f8;border-bottom:1px solid #d9dee7;display:flex;justify-content:space-between}.nl-pane h3 span{font-weight:400;color:#697184}' +
        '.nl-msgs{flex:1;list-style:none;margin:0;padding:6px 8px;overflow:auto;max-height:150px;font-size:12.5px}.nl-msgs li{margin:2px 0;overflow-wrap:anywhere}.nl-msgs li.me{color:#697184}' +
        '.nl-send{display:flex;gap:4px;padding:6px;border-top:1px solid #eef1f5}.nl-send input{min-height:30px;padding:4px 6px;font-size:12px}.nl-send button{min-height:30px;padding:4px 10px;font-size:12px}';
      doc.head.appendChild(css);

      var wsNames = G.NODE_WS_CLIENTS;
      var root = h('section', { class: 'nl', 'aria-label': wsNames ? 'Pretend browsers connected to your WebSocket server' : 'Simulated HTTP client' });
      var hasPage = Array.prototype.some.call(doc.body.children, function (c) { return !/^(SCRIPT|STYLE|TEMPLATE)$/.test(c.tagName) && c.tagName.indexOf('-') < 0; });
      if (hasPage) {
        var det = h('details', { class: 'nl', open: true }, h('summary', { text: wsNames ? 'Pretend browsers' : 'Simulated HTTP client' }));
        det.style.borderTop = '1px solid #d9dee7';
        det.appendChild(root);
        doc.body.appendChild(det);
        root.style.padding = '8px 0 0';
      } else doc.body.appendChild(root);

      if (wsNames) { buildChat(root, h, wsNames); return; }

      var head = h('div', { class: 'nl-head' });
      var routesEl = h('div', { class: 'nl-routes' });
      var method = h('select', { 'aria-label': 'HTTP method' });
      ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].forEach(function (m) { method.appendChild(h('option', { text: m })); });
      var urlIn = h('input', { type: 'text', value: '/', 'aria-label': 'Path and query string, for example /api/books?sort=title', spellcheck: 'false', autocomplete: 'off' });
      var bodyIn = h('textarea', { 'aria-label': 'Request body (JSON)', placeholder: '{ "title": "Dune" }', spellcheck: 'false' });
      var hdrIn = h('input', { type: 'text', 'aria-label': 'Extra request headers, for example X-API-Key: letmein (separate several with ;)', placeholder: 'X-API-Key: letmein; Accept: application/json', spellcheck: 'false', autocomplete: 'off' });
      var hdrBox = h('details', { class: 'nl-hdrs' }, h('summary', { text: 'Request headers (optional)' }), hdrIn);
      var readHeaders = function () {
        var out = {};
        hdrIn.value.split(/;|\n/).forEach(function (part) { var i = part.indexOf(':'); if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim(); });
        return out;
      };
      var send = h('button', { type: 'submit', text: 'Send' });
      var form = h('form', { class: 'nl-form' }, method, urlIn, send);
      var resEl = h('div', { class: 'nl-res', 'aria-live': 'polite' });
      var histList = h('ol');
      var hist = h('details', { class: 'nl-hist' }, h('summary', { text: 'History' }), histList);
      hist.hidden = true;
      root.append(head, routesEl, form, bodyIn, hdrBox, resEl, hist);
      var syncBody = function () { bodyIn.hidden = !/^(POST|PUT|PATCH|DELETE)$/.test(method.value); };
      method.addEventListener('change', syncBody);
      syncBody();
      var fnMode = function () { return !api.listening && !!exported(); };

      function renderHead() {
        head.replaceChildren();
        routesEl.replaceChildren();
        var ports = api.ports();
        if (ports.length) {
          head.append(h('span', { class: 'nl-dot on' }), h('span', { class: 'nl-title', text: 'Server running' }),
            h('span', { text: 'on http://localhost:' + ports.join(', :') + ' · a pretend client sends it requests, like Postman or curl' }));
          var routes = api.routes();
          if (routes.length) {
            routesEl.appendChild(h('span', { class: 'nl-lbl', text: 'Routes' }));
            routes.forEach(function (r) {
              var example = r.path.replace(/:([A-Za-z_$][\w$]*)\??/g, '1').replace(/\{|\}|\*\w*/g, '');
              routesEl.appendChild(h('button', { type: 'button', class: 'nl-chip', title: 'Fill in ' + r.method + ' ' + example, onclick: function () {
                method.value = r.method === 'ALL' ? 'GET' : r.method; urlIn.value = example; syncBody();
                if (!bodyIn.hidden && !bodyIn.value) bodyIn.value = '{ "title": "Example" }';
                urlIn.focus();
              } }, h('i', { text: r.method }), r.path));
            });
          }
          send.disabled = false;
        } else if (fnMode()) {
          head.append(h('span', { class: 'nl-dot on' }), h('span', { class: 'nl-title', text: 'Function deployed' }),
            h('span', { text: '(' + { lambda: 'exports.handler: AWS Lambda / Netlify style', web: 'export default: web-standard Request and Response', worker: 'export default { fetch }: Cloudflare Workers style', node: '(req, res): Vercel Node.js style' }[exported().kind] + ')' }));
          send.textContent = 'Invoke';
        } else {
          head.append(h('span', { class: 'nl-dot' }), h('span', { class: 'nl-title', text: 'No server is listening yet' }));
          routesEl.appendChild(h('div', { class: 'nl-empty' }, 'Your code ran, but nothing is listening for requests. Start a server with ', h('code', { text: 'app.listen(3000)' }), ' or ', h('code', { text: 'server.listen(3000)' }), '.'));
        }
      }

      function pretty(json) {
        var s = JSON.stringify(json, null, 2);
        var out = doc.createElement('pre');
        s.split(/("(?:[^"\\]|\\.)*"(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)/).forEach(function (part, k) {
          if (!(k % 2)) { out.append(part); return; }
          var cls = /:$/.test(part) ? 'k' : /^"/.test(part) ? 's' : /null/.test(part) ? 'nul' : /true|false/.test(part) ? 'k' : 'n';
          out.appendChild(h('span', { class: cls, text: part }));
        });
        return out;
      }
      function showResponse(m, u, r) {
        resEl.replaceChildren();
        if (r.error) {
          resEl.appendChild(h('div', { class: 'nl-note bad' }, h('b', { text: r.timedOut ? 'Timed out. ' : 'Could not connect. ' }), r.timedOut ? r.error : r.error + '. Nothing is listening: did your code call listen()?'));
          return;
        }
        var s = r.status, kind = s >= 500 ? 'b' : s >= 400 ? 'w' : s >= 300 ? 'i' : '';
        var ct = r.headers['content-type'] || '';
        var line = h('div', { class: 'nl-line' }, h('span', { class: 'nl-pill ' + kind, text: s + ' ' + (r.statusText || STATUS[s] || '') }),
          h('span', { text: m + ' ' + u }), h('span', { text: (r.cold ? 'cold start ' + r.initMs + ' ms + ' : '') + Math.max(1, r.ms || 0) + ' ms' }),
          h('span', { text: ct ? ct.split(';')[0] : (r.body ? 'no Content-Type header' : 'empty body') }));
        var dl = h('dl');
        Object.keys(r.headers).forEach(function (k) { dl.append(h('dt', { text: k.replace(/(^|-)([a-z])/g, function (x, a, b) { return a + b.toUpperCase(); }) }), h('dd', { text: r.headers[k] })); });
        resEl.append(line, h('details', null, h('summary', { text: 'Response headers (' + Object.keys(r.headers).length + ')' }), dl));
        if (!r.body) { resEl.appendChild(h('div', { class: 'nl-note', text: s === 204 ? '204 No Content: success, with no body to show.' : '(empty body)' })); return; }
        if (r.json !== undefined) { resEl.appendChild(pretty(r.json)); return; }
        var isHtml = /html/i.test(ct) || (!ct && /^\s*</.test(r.body));
        if (isHtml) {
          var frame = h('iframe', { title: 'The page your server sent', sandbox: '' });
          frame.srcdoc = r.body;
          var raw = h('pre', { text: r.body });
          raw.hidden = true;
          var bPage = h('button', { type: 'button', text: 'Page', 'aria-pressed': 'true' }), bRaw = h('button', { type: 'button', text: 'HTML', 'aria-pressed': 'false' });
          var set = function (page) { frame.hidden = !page; raw.hidden = page; bPage.setAttribute('aria-pressed', String(page)); bRaw.setAttribute('aria-pressed', String(!page)); };
          bPage.addEventListener('click', function () { set(true); });
          bRaw.addEventListener('click', function () { set(false); });
          resEl.append(h('div', { class: 'nl-tabs' }, bPage, bRaw), frame, raw);
          if (!ct) resEl.appendChild(h('div', { class: 'nl-note', text: 'No Content-Type header was sent, so a browser has to guess what this is. Set one with res.setHeader(\'Content-Type\', \'text/html\').' }));
          return;
        }
        resEl.appendChild(h('pre', { text: r.body }));
      }
      var history = [];
      function go(m, u, b) {
        send.disabled = true;
        var hd = readHeaders();
        var p = fnMode() ? invoke(m, u, b) : request(m, u, b, hd);
        return p.then(function (r) {
          send.disabled = false;
          showResponse(m, u, r);
          history.unshift({ m: m, u: u, b: b, s: r.status, hd: hdrIn.value });
          histList.replaceChildren.apply(histList, history.slice(0, 12).map(function (x) {
            return h('li', { tabindex: '0', title: 'Fill this request in again', onclick: function () { method.value = x.m; urlIn.value = x.u; bodyIn.value = x.b || ''; hdrIn.value = x.hd || ''; if (x.hd) hdrBox.open = true; syncBody(); } }, x.m + ' ' + x.u + ' → ' + (x.s || 'no response'));
          }));
          hist.hidden = false;
          return r;
        });
      }
      form.addEventListener('submit', function (e) { e.preventDefault(); go(method.value, urlIn.value.trim() || '/', bodyIn.hidden ? '' : bodyIn.value); });
      renderHead();
      api.onChange(renderHead);
      // Like a browser opening the site: send a first request so there is something to see.
      setTimeout(function () {
        var start = G.NODE_START_PATH;
        if (!start) {
          var gets = api.routes().filter(function (r) { return r.method === 'GET' && !/[:*{]/.test(r.path); });
          start = gets.some(function (r) { return r.path === '/'; }) ? '/' : gets.length ? gets[0].path : '/';
        }
        urlIn.value = start;
        if (G.NODE_AUTO !== false && (api.listening || fnMode())) go('GET', start, '');
      }, 20);
    }

    // Pretend browsers, each with its own WebSocket to the student's server.
    function buildChat(root, h, names) {
      var head = h('div', { class: 'nl-head' });
      var grid = h('div', { class: 'nl-chat' });
      root.append(head, grid);
      var port = G.NODE_WS_PORT || api.wsPorts()[0];
      head.append(h('span', { class: 'nl-dot' + (port ? ' on' : '') }), h('span', { class: 'nl-title', text: port ? 'WebSocket server on ws://localhost:' + port : 'No WebSocket server yet' }),
        h('span', { text: port ? '· ' + names.length + ' pretend browsers connect to it' : '· create one with new WebSocketServer({ port: 8080 })' }));
      if (!port) return;
      names.forEach(function (name) {
        var list = h('ul', { class: 'nl-msgs', 'aria-live': 'polite' });
        var state = h('span', { text: 'connecting…' });
        var input = h('input', { type: 'text', 'aria-label': 'Message from ' + name, placeholder: 'Message…' });
        var btn = h('button', { type: 'submit', text: 'Send' });
        var pane = h('div', { class: 'nl-pane' }, h('h3', null, name, state), list, h('form', { class: 'nl-send' }, input, btn));
        grid.appendChild(pane);
        var sock = new BrowserWebSocket('ws://localhost:' + port);
        var client = { name: name, socket: sock, messages: [], sent: [], send: function (text) { client.sent.push(String(text)); add('me', 'You: ' + text); sock.send(text); } };
        function add(cls, text) { list.appendChild(h('li', { class: cls, text: text })); list.scrollTop = list.scrollHeight; }
        sock.addEventListener('open', function () { state.textContent = 'connected'; });
        sock.addEventListener('close', function (e) { state.textContent = 'closed (' + e.code + ')'; });
        sock.addEventListener('message', function (e) {
          client.messages.push(e.data);
          var shown = e.data;
          try { var j = JSON.parse(e.data); if (j && typeof j === 'object' && 'text' in j) shown = (j.from || j.name || j.user ? (j.from || j.name || j.user) + ': ' : '') + j.text; } catch (x) { /* plain text */ }
          add('', shown);
        });
        pane.querySelector('form').addEventListener('submit', function (e) {
          e.preventDefault();
          if (!input.value.trim()) return;
          try { client.send(input.value); } catch (x) { add('me', x.message); }
          input.value = '';
        });
        chat.push(client);
      });
    }

    var RT_LAST = srcLine(new Error());
    return api;
  }

  // import / export lines become require() and module.exports, one line for one line, so
  // error line numbers still match what the student wrote.
  function transform(js) {
    var tail = [];
    // A multi-line import { a, b } from 'x' becomes one line plus the same number of blank lines.
    js = js.replace(/^([ \t]*import\s*\{[^}]*\}\s*from\s*['"][^'"]+['"][ \t]*;?)/gm, function (m) {
      var n = (m.match(/\n/g) || []).length;
      return m.replace(/\s*\n\s*/g, ' ') + new Array(n + 1).join('\n');
    });
    var lines = js.split('\n').map(function (line) {
      var m;
      if ((m = /^(\s*)import\s+([\s\S]+?)\s+from\s+(['"])([^'"]+)\3\s*;?\s*$/.exec(line))) {
        var what = m[2].trim(), req = 'require(' + JSON.stringify(m[4]) + ')', parts = [], ns;
        if ((ns = /^\*\s+as\s+([\w$]+)$/.exec(what))) return m[1] + 'const ' + ns[1] + ' = ' + req + ';';
        var def = /^([\w$]+)\s*(?:,|$)/.exec(what);
        var named = /\{([^}]*)\}/.exec(what);
        if (def) parts.push('const ' + def[1] + ' = ' + req + ';');
        if (named) {
          var list = named[1].split(',').map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) {
            var ab = s.split(/\s+as\s+/);
            return ab[1] ? ab[0].trim() + ': ' + ab[1].trim() : ab[0].trim();
          });
          parts.push('const { ' + list.join(', ') + ' } = ' + req + ';');
        }
        return m[1] + parts.join(' ');
      }
      if ((m = /^(\s*)import\s+(['"])([^'"]+)\2\s*;?\s*$/.exec(line))) return m[1] + 'require(' + JSON.stringify(m[3]) + ');';
      line = line.replace(/^(\s*)export\s+default\s+/, '$1module.exports.default = ');
      line = line.replace(/^(\s*)export\s+((?:const|let|var)\s+([\w$]+))/, function (all, sp, decl, name) { tail.push(name); return sp + decl; });
      line = line.replace(/^(\s*)export\s+((?:async\s+)?function\s*\*?\s*([\w$]+)|class\s+([\w$]+))/, function (all, sp, decl, fname, cname) { tail.push(fname || cname); return sp + decl; });
      line = line.replace(/^(\s*)export\s*\{([^}]*)\}\s*;?/, function (all, sp, list) {
        return sp + list.split(',').map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) {
          var ab = s.split(/\s+as\s+/);
          return 'module.exports.' + (ab[1] || ab[0]).trim() + ' = ' + ab[0].trim() + ';';
        }).join(' ');
      });
      return line.replace(/\bimport\.meta\.url\b/g, "'file:///app/server.js'").replace(/\bimport\.meta\.dirname\b/g, "'/app'");
    });
    if (tail.length) lines[lines.length - 1] += ' ' + tail.map(function (n) { return 'module.exports.' + n + ' = ' + n + ';'; }).join(' ');
    return lines.join('\n');
  }

  return {
    nodePreview: nodePreview,
    transform: transform,
    runtime: { label: 'Simulated Node.js', preview: nodePreview, transform: transform }
  };
});
