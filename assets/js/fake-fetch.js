/* ==========================================================================
   Web Development I: practice API runtime for playgrounds (Chapter 10)

   Playgrounds that teach fetch() must work offline and must never depend on
   someone else's server, so this runtime replaces fetch() inside the preview
   with a small pretend server. A playground opts in with
   data-runtime="fetch", then its hidden setup script describes the routes:

     mockApi.route('GET', '/api/posts', (req) => ({ body: [ ... ] }));
     mockApi.route('GET', '/api/posts/:id', (req) => req.params.id === '1'
       ? { body: { id: 1 } } : { status: 404, body: { error: 'No such post' } });
     mockApi.route('GET', 'https://api.weather.example/v1/current', (req) => ...);

   A handler receives { method, url, path, params, query, headers, body,
   json() } and returns { status, body, headers, delay, fail }. A body that is
   not a string is sent as JSON. fail: 'network' makes fetch() reject with the
   same TypeError a browser gives when it cannot reach the server.

   The Response object behaves like the real one where students meet it:
   ok/status/statusText/headers.get(), json() and text() return promises, the
   body can only be read once, and json() on an HTML error page rejects with
   the browser's own SyntaxError. Every request is logged to the console, like
   a tiny Network panel, and recorded in mockApi.calls for the checks.

   The preview function is turned into text and run inside the preview, so it
   must not use anything outside itself. Node can also load this file (for the
   unit tests in tests/fake-fetch.test.js).
   ========================================================================== */
(function (root, factory) {
  var runtime = factory();
  if (typeof module === 'object' && module.exports) module.exports = runtime;
  if (root && root.WD1) {
    root.WD1.runtimes = root.WD1.runtimes || {};
    root.WD1.runtimes.fetch = runtime;
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function practiceApi() {
    var BASE = 'https://playground.local';
    var REASONS = { 200: 'OK', 201: 'Created', 204: 'No Content', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden',
      404: 'Not Found', 405: 'Method Not Allowed', 409: 'Conflict', 422: 'Unprocessable Content', 429: 'Too Many Requests',
      500: 'Internal Server Error', 503: 'Service Unavailable' };
    var routes = [];

    // A small stand-in for the Headers class: names are case-insensitive.
    function Headers(init) {
      var map = {};
      var add = function (k, v) { map[String(k).toLowerCase()] = String(v); };
      if (init && typeof init.forEach === 'function' && !Array.isArray(init)) init.forEach(function (v, k) { add(k, v); });
      else if (Array.isArray(init)) init.forEach(function (p) { add(p[0], p[1]); });
      else if (init) Object.keys(init).forEach(function (k) { add(k, init[k]); });
      this._map = map;
    }
    Headers.prototype.get = function (name) { var v = this._map[String(name).toLowerCase()]; return v === undefined ? null : v; };
    Headers.prototype.has = function (name) { return String(name).toLowerCase() in this._map; };
    Headers.prototype.forEach = function (fn) { var m = this._map; Object.keys(m).forEach(function (k) { fn(m[k], k); }); };
    Headers.prototype.toJSON = function () { return this._map; };

    // The object fetch() resolves with.
    function Response(text, status, headers, url) {
      this.status = status;
      this.statusText = REASONS[status] || '';
      this.ok = status >= 200 && status < 300;
      this.headers = headers;
      this.url = url;
      this.redirected = false;
      this.type = /^https:\/\/playground\.local\//.test(url) ? 'basic' : 'cors';
      this.bodyUsed = false;
      Object.defineProperty(this, '_text', { value: text, enumerable: false });
    }
    Response.prototype._read = function (kind) {
      if (this.bodyUsed) return Promise.reject(new TypeError("Failed to execute '" + kind + "' on 'Response': body stream already read"));
      this.bodyUsed = true;
      return Promise.resolve(this._text);
    };
    Response.prototype.text = function () { return this._read('text'); };
    Response.prototype.json = function () {
      // JSON.parse throws the same SyntaxError the browser reports for a bad body.
      return this._read('json').then(function (t) { return JSON.parse(t); });
    };
    Response.prototype.clone = function () {
      if (this.bodyUsed) throw new TypeError("Failed to execute 'clone' on 'Response': Response body is already used");
      return new Response(this._text, this.status, this.headers, this.url);
    };

    // '/api/posts/:id' -> a RegExp and the parameter names
    function compile(pattern) {
      var names = [];
      var src = String(pattern).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\?:(\w+)/g, function (m, n) { names.push(n); return '([^/]+)'; });
      return { re: new RegExp('^' + src + '/?$'), names: names };
    }

    var api = {
      calls: [],
      delay: 60,
      log: true,
      route: function (method, pattern, handler) {
        var abs = /^https?:\/\//i.test(pattern);
        var c = compile(abs ? pattern.replace(/\/+$/, '') : pattern);
        routes.push({ method: String(method).toUpperCase(), abs: abs, re: c.re, names: c.names, handler: handler });
        return api;
      },
      reset: function () { routes.length = 0; api.calls.length = 0; }
    };

    function realFetchBlocked(url) {
      console.warn('This practice page works offline, so only its practice API answers. A real request to ' + url + ' would need an internet connection.');
      return Promise.reject(new TypeError('Failed to fetch'));
    }

    function fakeFetch(input, init) {
      init = init || {};
      var raw = typeof input === 'string' ? input : input && input.url ? input.url : String(input);
      var u;
      try { u = new URL(raw, BASE + '/'); } catch (e) { return Promise.reject(new TypeError("Failed to execute 'fetch' on 'Window': Failed to parse URL from " + raw)); }
      var method = String(init.method || (input && input.method) || 'GET').toUpperCase();
      var headers = new Headers(init.headers || (input && input.headers) || {});
      var local = u.origin === BASE;
      var full = local ? u.pathname + u.search : u.origin + u.pathname + u.search;
      var bodyText = init.body == null ? '' : String(init.body);
      var query = {};
      u.searchParams.forEach(function (v, k) { query[k] = v; });
      var req = {
        method: method, url: full, path: u.pathname, query: query, params: {}, headers: headers, body: bodyText,
        json: function () { return bodyText ? JSON.parse(bodyText) : null; }
      };
      api.calls.push({ method: method, url: full, path: u.pathname, query: query, headers: headers._map, body: bodyText });

      var match = null, allowed = [];
      for (var i = 0; i < routes.length; i++) {
        var r = routes[i];
        var target = r.abs ? (u.origin + u.pathname).replace(/\/+$/, '') : u.pathname;
        if (!r.abs && !local) continue;
        var m = r.re.exec(target);
        if (!m) continue;
        if (r.method !== method) { allowed.push(r.method); continue; }
        match = r;
        r.names.forEach(function (n, k) { req.params[n] = decodeURIComponent(m[k + 1]); });
        break;
      }

      var out;
      if (match) {
        try { out = match.handler(req) || {}; } catch (e) {
          console.error('The practice server crashed: ' + (e && e.message ? e.message : e));
          out = { status: 500, body: { error: 'Internal Server Error' } };
        }
      } else if (allowed.length) {
        out = { status: 405, body: { error: 'Method ' + method + ' is not allowed here. Try ' + allowed.join(' or ') + '.' } };
      } else if (!local) {
        return realFetchBlocked(full);
      } else {
        out = { status: 404, headers: { 'Content-Type': 'text/html' },
          body: '<!DOCTYPE html><html><head><title>404 Not Found</title></head><body><h1>Not Found</h1><p>The requested URL ' + u.pathname + ' was not found on this server.</p></body></html>' };
      }

      var status = out.status || 200;
      var body = out.body;
      var hdrs = {};
      var text;
      if (body === undefined || body === null) text = '';
      else if (typeof body === 'string') { text = body; hdrs['content-type'] = 'text/plain; charset=utf-8'; }
      else { text = JSON.stringify(body); hdrs['content-type'] = 'application/json; charset=utf-8'; }
      if (!local) hdrs['access-control-allow-origin'] = '*';
      Object.keys(out.headers || {}).forEach(function (k) { hdrs[k.toLowerCase()] = String(out.headers[k]); });
      var delay = typeof out.delay === 'number' ? out.delay : api.delay;
      var signal = init.signal;

      return new Promise(function (resolve, reject) {
        var done = false;
        var abort = function () {
          if (done) return;
          done = true;
          clearTimeout(timer);
          var err;
          try { err = new DOMException('signal is aborted without reason', 'AbortError'); } catch (e) { err = new Error('The operation was aborted.'); err.name = 'AbortError'; }
          if (api.log) console.info(method + ' ' + full + ' → cancelled');
          reject(err);
        };
        if (signal && signal.aborted) { abort(); return; }
        if (signal && signal.addEventListener) signal.addEventListener('abort', abort);
        var timer = setTimeout(function () {
          if (done) return;
          done = true;
          if (out.fail === 'network') {
            if (api.log) console.info(method + ' ' + full + ' → network error (no response)');
            reject(new TypeError('Failed to fetch'));
            return;
          }
          if (api.log) console.info(method + ' ' + full + ' → ' + status + ' ' + (REASONS[status] || '') + ' (' + delay + ' ms)');
          resolve(new Response(text, status, new Headers(hdrs), local ? BASE + full : full));
        }, delay);
      });
    }
    fakeFetch.isPractice = true;

    window.fetch = fakeFetch;
    window.mockApi = api;
  }

  return { preview: practiceApi };
});
