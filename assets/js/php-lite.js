/* ==========================================================================
   PHP Lite: a teaching subset of PHP 8, written in JavaScript.

   Browsers cannot run PHP and this course never needs a server, so the
   Chapter 12 playgrounds run PHP here instead. It reads a .php file the way
   PHP does (HTML outside <?php ?> tags is sent as it is), then tokenizes,
   parses and runs the code with PHP's own rules where a student would notice
   them: arrays are ordered maps copied on assignment, "5" + 5 is 10, 7 / 2 is
   3.5, private properties are really private, and warnings look like PHP's
   ("Warning: Undefined variable $x in /index.php on line 4").

   Load it AFTER course.js. It registers WD1.runtimes.php, the server runtime
   that playgrounds opt into with data-runtime="php", and WD1.php, whose
   run(source, options) returns { output, status, headers, logs }.
   In Node.js, require() returns the same API, which is how tests/ uses it.
   ========================================================================== */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.WD1) {
    root.WD1.runtimes = root.WD1.runtimes || {};
    root.WD1.runtimes.php = api.runtime;
    root.WD1.php = api;
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  const PHP_VERSION = '8.3.12';

  /* ---------- Values ----------
     null, booleans and strings are the JavaScript values. An int is a whole
     JavaScript number. A float is any other number, or a PFloat box when its
     value happens to be whole (2.0 must stay a float: var_dump says float(2)).
     Arrays are PArray (an ordered map), objects PObject, closures PClosure. */

  class PFloat { constructor(v) { this.v = v; } }
  const isInt = (v) => typeof v === 'number' && Number.isInteger(v);
  const isFloat = (v) => v instanceof PFloat || (typeof v === 'number' && !Number.isInteger(v));
  const isNum = (v) => typeof v === 'number' || v instanceof PFloat;
  const fv = (v) => (v instanceof PFloat ? v.v : v);           // the JS number inside an int or float
  const mkFloat = (x) => (Number.isInteger(x) ? new PFloat(x) : x);
  const mkInt = (x) => (Number.isSafeInteger(x) ? x : mkFloat(x)); // ints that overflow become floats, as in PHP

  // A variable slot. References (&) make two names share one Ref.
  class Ref { constructor(v) { this.v = v === undefined ? null : v; } }

  // Array keys: "5" becomes the int 5, "05" stays a string, floats are truncated, true is 1.
  function normKey(k) {
    if (typeof k === 'number') return Number.isFinite(k) ? Math.trunc(k) : 0;
    if (k instanceof PFloat) return Math.trunc(k.v);
    if (typeof k === 'string') {
      if (/^(0|-?[1-9][0-9]*)$/.test(k)) { const n = Number(k); if (Number.isSafeInteger(n)) return n; }
      return k;
    }
    if (k === true) return 1;
    if (k === false) return 0;
    if (k === null || k === undefined) return '';
    return undefined; // arrays and objects cannot be keys
  }

  let objIds = 0;
  class PArray {
    constructor() { this.m = new Map(); this.next = 0; this.pos = 0; }
    static list(values) { const a = new PArray(); values.forEach((v) => a.push(v)); return a; }
    static fromPairs(pairs) { const a = new PArray(); pairs.forEach(([k, v]) => a.set(k, v)); return a; }
    get size() { return this.m.size; }
    has(k) { return this.m.has(normKey(k)); }
    get(k) { const v = this.m.get(normKey(k)); return v instanceof Ref ? v.v : v; }
    raw(k) { return this.m.get(normKey(k)); }
    set(k, v) {
      k = normKey(k);
      const cur = this.m.get(k);
      if (cur instanceof Ref) cur.v = v; else this.m.set(k, v);
      if (typeof k === 'number' && k >= this.next) this.next = k + 1;
    }
    setRaw(k, v) { k = normKey(k); this.m.set(k, v); if (typeof k === 'number' && k >= this.next) this.next = k + 1; }
    push(v) { this.set(this.next, v); }
    delete(k) { this.m.delete(normKey(k)); }
    keys() { return Array.from(this.m.keys()); }
    values() { return Array.from(this.m.values(), (v) => (v instanceof Ref ? v.v : v)); }
    entries() { return Array.from(this.m.entries(), ([k, v]) => [k, v instanceof Ref ? v.v : v]); }
    isList() { let i = 0; for (const k of this.m.keys()) { if (k !== i++) return false; } return true; }
    // Value semantics: assigning an array copies it (nested arrays too). A slot that is a
    // reference stays shared, which is exactly how PHP behaves.
    clone() {
      const a = new PArray();
      this.m.forEach((v, k) => { a.m.set(k, v instanceof PArray ? v.clone() : v); });
      a.next = this.next; a.pos = this.pos;
      return a;
    }
  }

  class PObject {
    constructor(cls) { this.cls = cls; this.props = new Map(); this.id = ++objIds; }
  }
  class PClosure {
    constructor(decl, bound, thisObj, scopeCls) { this.decl = decl; this.bound = bound; this.thisObj = thisObj; this.scopeCls = scopeCls; this.id = ++objIds; }
  }

  const copyVal = (v) => (v instanceof PArray ? v.clone() : v);

  /* ---------- Errors that travel through the interpreter ---------- */

  class ParseError extends Error { constructor(msg, line) { super(msg); this.line = line; } }
  class FatalSignal { constructor(msg, line) { this.msg = msg; this.line = line; } }
  class ThrowSignal { constructor(obj) { this.obj = obj; } }
  class BreakSignal { constructor(n) { this.n = n; } }
  class ContinueSignal { constructor(n) { this.n = n; } }
  class ReturnSignal { constructor(v) { this.v = v; } }
  class ExitSignal { }

  /* ---------- Tokenizer ----------
     Starts in HTML mode, like PHP: everything up to <?php (or <?=) is inline HTML.
     ?> ends a statement and swallows one newline right after it. */

  const OPS = ['<<=', '>>=', '**=', '...', '<=>', '===', '!==', '??=', '?->', '**', '++', '--', '->', '=>', '::', '==', '!=', '<>',
    '<=', '>=', '&&', '||', '??', '+=', '-=', '*=', '/=', '.=', '%=', '&=', '|=', '^=', '<<', '>>', '+', '-', '*', '/', '%',
    '=', '<', '>', '!', '.', ',', ';', ':', '?', '(', ')', '[', ']', '{', '}', '&', '|', '^', '~', '@', '$'];
  const CAST_RE = /\(\s*(int|integer|float|double|real|string|bool|boolean|array|object|unset|binary)\s*\)/iy;
  const ID_START = /[A-Za-z_\x80-￿\\]/;
  const ID_RE = /[A-Za-z_\x80-￿\\][A-Za-z0-9_\x80-￿\\]*/y;

  function decodeEscapes(s) {
    return s.replace(/\\(?:([nrtvef\\$"])|([0-7]{1,3})|x([0-9A-Fa-f]{1,2})|u\{([0-9A-Fa-f]+)\})/g, (m, c, oct, hex, uni) => {
      if (c) return { n: '\n', r: '\r', t: '\t', v: '\v', e: '\x1b', f: '\f', '\\': '\\', $: '$', '"': '"' }[c];
      if (oct) return String.fromCharCode(parseInt(oct, 8) & 255);
      if (hex) return String.fromCharCode(parseInt(hex, 16));
      try { return String.fromCodePoint(parseInt(uni, 16)); } catch (e) { return m; }
    });
  }

  // Splits the inside of a "double-quoted string" (or heredoc) into literal text and
  // interpolated pieces: $name, $name[key], $name->prop, and {$any->expression['here']}.
  function interpolate(body, line, quote) {
    const parts = [];
    let lit = '', i = 0;
    const n = body.length;
    const flush = () => { if (lit) { parts.push({ t: 'lit', v: decodeEscapes(quote === '"' ? lit : lit.replace(/\\"/g, '\\\\"')) }); lit = ''; } };
    while (i < n) {
      const c = body[i];
      if (c === '\\' && i + 1 < n) { lit += c + body[i + 1]; i += 2; continue; }
      if (c === '{' && body[i + 1] === '$') {
        let depth = 0, j = i;
        for (; j < n; j++) {
          const d = body[j];
          if (d === '\\') { j++; continue; }
          if (d === "'" || d === '"') { const q = d; for (j++; j < n && body[j] !== q; j++) if (body[j] === '\\') j++; continue; }
          if (d === '{') depth++;
          else if (d === '}' && --depth === 0) break;
        }
        flush();
        parts.push({ t: 'expr', src: body.slice(i + 1, j), line: line + (body.slice(0, i).match(/\n/g) || []).length });
        i = j + 1;
        continue;
      }
      if (c === '$' && /[A-Za-z_\x80-￿]/.test(body[i + 1] || '')) {
        const m = /\$([A-Za-z_\x80-￿][A-Za-z0-9_\x80-￿]*)/y;
        m.lastIndex = i;
        const mm = m.exec(body);
        flush();
        i += mm[0].length;
        const name = mm[1];
        const at = line + (body.slice(0, i).match(/\n/g) || []).length;
        if (body[i] === '[') {
          const km = /\[(-?\d+|[A-Za-z_][A-Za-z0-9_]*|\$[A-Za-z_][A-Za-z0-9_]*)\]/y;
          km.lastIndex = i;
          const k = km.exec(body);
          if (k) {
            const raw = k[1];
            const key = raw[0] === '$' ? { k: 'var', name: raw.slice(1), line: at } : /^-?\d+$/.test(raw) ? { k: 'num', v: Number(raw), line: at } : { k: 'str', v: raw, line: at };
            parts.push({ t: 'node', node: { k: 'idx', obj: { k: 'var', name, line: at }, key, line: at } });
            i += k[0].length;
            continue;
          }
        }
        if (body[i] === '-' && body[i + 1] === '>' && /[A-Za-z_]/.test(body[i + 2] || '')) {
          const pm = /->([A-Za-z_][A-Za-z0-9_]*)/y;
          pm.lastIndex = i;
          const p = pm.exec(body);
          parts.push({ t: 'node', node: { k: 'prop', obj: { k: 'var', name, line: at }, name: { k: 'str', v: p[1] }, line: at } });
          i += p[0].length;
          continue;
        }
        parts.push({ t: 'node', node: { k: 'var', name, line: at } });
        continue;
      }
      if (c === '$' && body[i + 1] === '{') {
        const e = body.indexOf('}', i);
        flush();
        parts.push({ t: 'node', node: { k: 'var', name: body.slice(i + 2, e).trim(), line } });
        i = e + 1;
        continue;
      }
      lit += c; i++;
    }
    flush();
    return parts;
  }

  function tokenize(src, startLine, startInPhp) {
    const toks = [];
    let i = 0, line = startLine || 1, mode = startInPhp ? 'php' : 'html';
    const n = src.length;
    const push = (type, value, l, extra) => { const t = { type, value, line: l }; if (extra) Object.assign(t, extra); toks.push(t); };
    const countNl = (s) => (s.match(/\n/g) || []).length;
    while (i < n) {
      if (mode === 'html') {
        const re = /<\?(php(?=\s|$)|=)/gi;
        re.lastIndex = i;
        const m = re.exec(src);
        const end = m ? m.index : n;
        if (end > i) { push('html', src.slice(i, end), line); line += countNl(src.slice(i, end)); }
        if (!m) break;
        if (m[1] === '=') { push('id', 'echo', line, { lower: 'echo', openEcho: true }); i = m.index + 3; }
        else {
          i = m.index + 5;
          if (src[i] === '\r' && src[i + 1] === '\n') { i += 2; line++; }
          else if (src[i] === '\n') { i++; line++; }
          else if (src[i] === ' ' || src[i] === '\t') i++;
        }
        mode = 'php';
        continue;
      }
      const c = src[i];
      if (c === '\n') { line++; i++; continue; }
      if (c === ' ' || c === '\t' || c === '\r' || c === '\f' || c === '\v') { i++; continue; }
      if (c === '?' && src[i + 1] === '>') {
        push('close', '?>', line);
        i += 2;
        if (src[i] === '\r' && src[i + 1] === '\n') { i += 2; line++; } else if (src[i] === '\n') { i++; line++; }
        mode = 'html';
        continue;
      }
      if ((c === '#' && src[i + 1] !== '[') || (c === '/' && src[i + 1] === '/')) {
        while (i < n && src[i] !== '\n' && !(src[i] === '?' && src[i + 1] === '>')) i++;
        continue;
      }
      if (c === '#' && src[i + 1] === '[') { // attribute #[...]: skip it
        let depth = 0;
        for (; i < n; i++) { if (src[i] === '[') depth++; else if (src[i] === ']' && --depth === 0) { i++; break; } else if (src[i] === '\n') line++; }
        continue;
      }
      if (c === '/' && src[i + 1] === '*') {
        const e = src.indexOf('*/', i + 2);
        const end = e < 0 ? n : e + 2;
        line += countNl(src.slice(i, end));
        i = end;
        continue;
      }
      if (c === '$' && /[A-Za-z_\x80-￿]/.test(src[i + 1] || '')) {
        const re = /\$([A-Za-z_\x80-￿][A-Za-z0-9_\x80-￿]*)/y;
        re.lastIndex = i;
        const m = re.exec(src);
        push('var', m[1], line);
        i += m[0].length;
        continue;
      }
      if (ID_START.test(c)) {
        ID_RE.lastIndex = i;
        const m = ID_RE.exec(src);
        let word = m[0];
        if (word.length > 1 && word[0] === '\\') word = word.slice(1);
        if (word.includes('\\')) word = word.split('\\').pop(); // namespaces: keep the last part
        push('id', word, line, { lower: word.toLowerCase() });
        i += m[0].length;
        continue;
      }
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
        const re = /0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(?:\d[\d_]*)?\.?\d[\d_]*(?:[eE][+-]?\d+)?|\d[\d_]*\.(?![.\d])/y;
        re.lastIndex = i;
        const m = re.exec(src);
        let s = m[0];
        i += s.length;
        s = s.replace(/_/g, '');
        let v, isF = false;
        if (/^0[xX]/.test(s)) v = parseInt(s.slice(2), 16);
        else if (/^0[bB]/.test(s)) v = parseInt(s.slice(2), 2);
        else if (/^0[oO]/.test(s)) v = parseInt(s.slice(2), 8);
        else if (/^0\d+$/.test(s)) v = parseInt(s, 8);
        else if (/[.eE]/.test(s)) { v = parseFloat(s); isF = true; }
        else v = Number(s);
        if (!isF && !Number.isSafeInteger(v)) isF = true;
        push(isF ? 'float' : 'int', v, line, { raw: m[0] });
        continue;
      }
      if (c === "'") {
        let j = i + 1, s = '';
        while (j < n && src[j] !== "'") {
          if (src[j] === '\\' && (src[j + 1] === "'" || src[j + 1] === '\\')) { s += src[j + 1]; j += 2; continue; }
          s += src[j]; j++;
        }
        if (j >= n) throw new ParseError('syntax error, unexpected end of file, expecting variable or "${" or "{$"', line);
        push('str', s, line);
        line += countNl(src.slice(i, j));
        i = j + 1;
        continue;
      }
      if (c === '"') {
        let j = i + 1;
        while (j < n && src[j] !== '"') { if (src[j] === '\\') j++; j++; }
        if (j >= n) throw new ParseError('syntax error, unexpected end of file', line);
        const body = src.slice(i + 1, j);
        const parts = interpolate(body, line, '"');
        if (parts.every((p) => p.t === 'lit')) push('str', parts.map((p) => p.v).join(''), line, { dq: true });
        else push('tpl', parts, line, { raw: body });
        line += countNl(body);
        i = j + 1;
        continue;
      }
      if (c === '<' && src.startsWith('<<<', i)) {
        const hm = /<<<[ \t]*(["']?)([A-Za-z_][A-Za-z0-9_]*)\1\r?\n/y;
        hm.lastIndex = i;
        const m = hm.exec(src);
        if (m) {
          const id = m[2], nowdoc = m[1] === "'";
          const bodyStart = i + m[0].length;
          const close = new RegExp('(^|\\n)([ \\t]*)' + id + '(?![A-Za-z0-9_])', 'g');
          close.lastIndex = bodyStart - 1;
          let cm = close.exec(src);
          while (cm && cm.index + cm[1].length < bodyStart) cm = close.exec(src);
          if (!cm) throw new ParseError('syntax error, unexpected end of file', line);
          const indent = cm[2];
          let body = src.slice(bodyStart, cm.index);
          if (indent) body = body.split('\n').map((l) => (l.startsWith(indent) ? l.slice(indent.length) : l.replace(/^[ \t]+/, ''))).join('\n');
          const startLine = line + 1;
          if (nowdoc) push('str', body, line);
          else {
            const parts = interpolate(body, startLine, 'heredoc');
            if (parts.every((p) => p.t === 'lit')) push('str', parts.map((p) => p.v).join(''), line);
            else push('tpl', parts, line);
          }
          const end = cm.index + cm[0].length;
          line += countNl(src.slice(i, end));
          i = end;
          continue;
        }
      }
      if (c === '(') {
        CAST_RE.lastIndex = i;
        const m = CAST_RE.exec(src);
        if (m) { push('cast', m[1].toLowerCase(), line); i += m[0].length; continue; }
      }
      if (c === '`') throw new ParseError('syntax error, unexpected character "`" (shell commands are not available here)', line);
      const op = OPS.find((o) => src.startsWith(o, i));
      if (op) { push('op', op, line); i += op.length; continue; }
      throw new ParseError('syntax error, unexpected character "' + c + '"', line);
    }
    push('eof', null, line);
    return toks;
  }

  /* ---------- Parser ----------
     Recursive descent with PHP's operator precedence. Produces plain objects
     { k: 'kind', line, ... }. Parse errors read like PHP's: syntax error,
     unexpected token "}", expecting ";". */

  const KEYWORDS = new Set(('abstract and array as break callable case catch class clone const continue declare default do echo else ' +
    'elseif empty enddeclare endfor endforeach endif endswitch endwhile enum extends final finally fn for foreach function global goto ' +
    'if implements include include_once instanceof insteadof interface isset list match namespace new or print private protected ' +
    'public readonly require require_once return static switch throw trait try unset use var while xor yield').split(' '));
  const ASSIGN_OPS = new Set(['=', '+=', '-=', '*=', '/=', '.=', '%=', '**=', '??=', '&=', '|=', '^=', '<<=', '>>=']);
  const MAGIC = new Set(['__line__', '__file__', '__dir__', '__function__', '__class__', '__method__', '__namespace__']);

  function describe(t) {
    if (!t || t.type === 'eof') return 'end of file';
    if (t.type === 'op') return 'token "' + t.value + '"';
    if (t.type === 'close') return 'token "?>"';
    if (t.type === 'html') return 'token "?>"';
    if (t.type === 'var') return 'variable "$' + t.value + '"';
    if (t.type === 'int') return 'integer "' + t.raw + '"';
    if (t.type === 'float') return 'floating-point number "' + t.raw + '"';
    if (t.type === 'str') return (t.dq ? 'double-quoted string "' : 'single-quoted string "') + t.value + '"';
    if (t.type === 'tpl') return 'double-quoted string';
    if (t.type === 'cast') return 'token "(' + t.value + ')"';
    if (t.type === 'id') return KEYWORDS.has(t.lower) ? 'token "' + t.value + '"' : 'identifier "' + t.value + '"';
    return 'token';
  }

  function parse(src, startLine, startInPhp) {
    const toks = tokenize(src, startLine, startInPhp);
    let p = 0;
    const peek = (o) => toks[p + (o || 0)];
    const next = () => toks[p++];
    const isOp = (v, o) => { const t = peek(o); return t.type === 'op' && t.value === v; };
    const isKw = (w, o) => { const t = peek(o); return t.type === 'id' && t.lower === w; };
    const fail = (expecting) => {
      const t = peek();
      throw new ParseError('syntax error, unexpected ' + describe(t) + (expecting ? ', expecting ' + expecting : ''), t.line);
    };
    const expectOp = (v) => { if (!isOp(v)) fail('"' + v + '"'); return next(); };
    const expectKw = (w) => { if (!isKw(w)) fail('"' + w + '"'); return next(); };
    const endStmt = () => {
      if (isOp(';')) { next(); return; }
      if (peek().type === 'close') { next(); return; }
      if (peek().type === 'eof' && toks.length > 1 && startInPhp) return;
      fail('";"');
    };

    function program() {
      const body = [];
      while (peek().type !== 'eof') body.push(statement());
      return body;
    }

    function block() {
      expectOp('{');
      const body = [];
      while (!isOp('}')) { if (peek().type === 'eof') fail(); body.push(statement()); }
      next();
      return body;
    }

    // The body of if/while/for/foreach/switch: a { block }, one statement, or the
    // alternative syntax "if (...): ... endif;" when altEnds is given.
    function body(altEnds) {
      if (altEnds && isOp(':')) {
        next();
        const list = [];
        while (!(peek().type === 'id' && altEnds.includes(peek().lower))) { if (peek().type === 'eof') fail('"' + altEnds[altEnds.length - 1] + '"'); list.push(statement()); }
        return { alt: true, list };
      }
      if (isOp('{')) return { list: block() };
      return { list: [statement()] };
    }
    const altClose = (w) => { expectKw(w); endStmt(); };

    function statement() {
      const t = peek();
      const line = t.line;
      if (t.type === 'html') { next(); return { k: 'echo', args: [{ k: 'str', v: t.value, line }], line, html: true }; }
      if (t.type === 'close') { next(); return { k: 'nop', line }; }
      if (t.type === 'op') {
        if (t.value === '{') return { k: 'block', body: block(), line };
        if (t.value === ';') { next(); return { k: 'nop', line }; }
      }
      if (t.type === 'id' && !isOp('::', 1) && !(isOp(':', 1) && !KEYWORDS.has(t.lower))) {
        switch (t.lower) {
          case 'echo': {
            next();
            const args = [expr()];
            while (isOp(',')) { next(); args.push(expr()); }
            endStmt();
            return { k: 'echo', args, line };
          }
          case 'if': return ifStmt();
          case 'while': {
            next(); expectOp('('); const cond = expr(); expectOp(')');
            const b = body(['endwhile']);
            if (b.alt) altClose('endwhile');
            return { k: 'while', cond, body: b.list, line };
          }
          case 'do': {
            next();
            const b = body();
            expectKw('while'); expectOp('('); const cond = expr(); expectOp(')'); endStmt();
            return { k: 'dowhile', cond, body: b.list, line };
          }
          case 'for': {
            next(); expectOp('(');
            const list = (end) => { const a = []; while (!isOp(end)) { a.push(expr()); if (isOp(',')) next(); else break; } expectOp(end); return a; };
            const init = list(';'), cond = list(';'), step = list(')');
            const b = body(['endfor']);
            if (b.alt) altClose('endfor');
            return { k: 'for', init, cond, step, body: b.list, line };
          }
          case 'foreach': {
            next(); expectOp('(');
            const subject = expr();
            expectKw('as');
            let keyT = null, byRef = false, valT;
            const target = () => { if (isOp('&')) { next(); byRef = true; } return expr(); };
            valT = target();
            if (isOp('=>')) { next(); keyT = valT; byRef = false; valT = target(); }
            expectOp(')');
            const b = body(['endforeach']);
            if (b.alt) altClose('endforeach');
            return { k: 'foreach', subject, keyT, valT, byRef, body: b.list, line };
          }
          case 'switch': return switchStmt();
          case 'break': case 'continue': {
            next();
            let levels = 1;
            if (peek().type === 'int') levels = next().value;
            endStmt();
            return { k: t.lower, levels, line };
          }
          case 'return': {
            next();
            let e = null;
            if (!isOp(';') && peek().type !== 'close' && peek().type !== 'eof') e = expr();
            endStmt();
            return { k: 'return', e, line };
          }
          case 'function':
            if (peek(1).type === 'id' || (isOp('&', 1) && peek(2).type === 'id')) return funcDecl();
            break;
          case 'abstract': case 'final': case 'class': case 'readonly':
            if (t.lower === 'class' || isKw('class', 1) || isKw('class', 2)) return classDecl();
            break;
          case 'interface': return classDecl();
          case 'trait': return classDecl();
          case 'enum': if (peek(1).type === 'id') fail(); break;
          case 'try': return tryStmt();
          case 'throw': { next(); const e = expr(); endStmt(); return { k: 'throw', e, line }; }
          case 'global': {
            next();
            const names = [];
            do { const v = next(); if (v.type !== 'var') { p--; fail('variable'); } names.push(v.value); } while (isOp(',') && next());
            endStmt();
            return { k: 'global', names, line };
          }
          case 'static':
            if (peek(1).type === 'var') {
              next();
              const vars = [];
              do {
                const v = next();
                let init = null;
                if (isOp('=')) { next(); init = expr(); }
                vars.push({ name: v.value, init });
              } while (isOp(',') && next());
              endStmt();
              return { k: 'static', vars, line };
            }
            break;
          case 'unset': {
            next(); expectOp('(');
            const args = [];
            while (!isOp(')')) { args.push(expr()); if (isOp(',')) next(); else break; }
            expectOp(')'); endStmt();
            return { k: 'unset', args, line };
          }
          case 'const': {
            next();
            const items = [];
            do { const name = next().value; expectOp('='); items.push({ name, e: expr() }); } while (isOp(',') && next());
            endStmt();
            return { k: 'constdecl', items, line };
          }
          case 'namespace': case 'use': {
            next();
            while (!isOp(';') && peek().type !== 'eof' && !isOp('{')) next();
            if (isOp(';')) next();
            return { k: 'nop', line };
          }
          case 'declare': {
            next(); expectOp('(');
            const name = next().lower; expectOp('='); const v = expr(); expectOp(')'); endStmt();
            return { k: 'declare', name, v, line };
          }
          default:
        }
      }
      const e = expr();
      endStmt();
      return { k: 'expr', e, line };
    }

    function ifStmt() {
      const line = next().line;
      expectOp('('); const cond = expr(); expectOp(')');
      const branches = [];
      let elseBody = null;
      if (isOp(':')) {
        const b = body(['elseif', 'else', 'endif']);
        branches.push({ cond, body: b.list });
        for (;;) {
          if (isKw('elseif')) { next(); expectOp('('); const c = expr(); expectOp(')'); branches.push({ cond: c, body: body(['elseif', 'else', 'endif']).list }); continue; }
          if (isKw('else')) {
            next();
            if (isKw('if')) fail('":"');
            elseBody = body(['endif']).list;
          }
          break;
        }
        altClose('endif');
        return { k: 'if', branches, elseBody, line };
      }
      branches.push({ cond, body: body().list });
      for (;;) {
        if (isKw('elseif') || (isKw('else') && isKw('if', 1))) {
          if (isKw('else')) next();
          next(); expectOp('('); const c = expr(); expectOp(')');
          branches.push({ cond: c, body: body().list });
          continue;
        }
        if (isKw('else')) { next(); elseBody = body().list; }
        break;
      }
      return { k: 'if', branches, elseBody, line };
    }

    function switchStmt() {
      const line = next().line;
      expectOp('('); const subject = expr(); expectOp(')');
      const alt = isOp(':');
      if (alt) next(); else expectOp('{');
      const cases = [];
      const isEnd = () => (alt ? isKw('endswitch') : isOp('}'));
      while (peek().type === 'close' || peek().type === 'html' && !peek().value.trim()) next();
      while (!isEnd()) {
        if (peek().type === 'eof') fail();
        let test = null;
        if (isKw('case')) { next(); test = expr(); }
        else if (isKw('default')) next();
        else fail('"case"');
        if (isOp(':') || isOp(';')) next(); else fail('":"');
        const list = [];
        while (!isKw('case') && !isKw('default') && !isEnd()) { if (peek().type === 'eof') fail(); list.push(statement()); }
        cases.push({ test, body: list });
      }
      if (alt) altClose('endswitch'); else next();
      return { k: 'switch', subject, cases, line };
    }

    function tryStmt() {
      const line = next().line;
      const tryBody = block();
      const catches = [];
      let fin = null;
      while (isKw('catch')) {
        next(); expectOp('(');
        const types = [next().value];
        while (isOp('|')) { next(); types.push(next().value); }
        let name = null;
        if (peek().type === 'var') name = next().value;
        expectOp(')');
        catches.push({ types, name, body: block() });
      }
      if (isKw('finally')) { next(); fin = block(); }
      if (!catches.length && !fin) fail('"catch"');
      return { k: 'try', body: tryBody, catches, fin, line };
    }

    function typeDecl() {
      // ?int, int|string, Foo, array, static ... (we keep the text and the parts)
      let nullable = false;
      if (isOp('?')) { next(); nullable = true; }
      const parts = [];
      const one = () => {
        if (isOp('(')) { next(); const inner = typeDecl(); expectOp(')'); return inner.parts.join('&'); }
        const t = next();
        if (t.type !== 'id') { p--; fail('type'); }
        return t.value;
      };
      parts.push(one());
      while ((isOp('|') || (isOp('&') && peek(1).type === 'id')) ) { next(); parts.push(one()); }
      return { nullable, parts, text: (nullable ? '?' : '') + parts.join('|') };
    }
    const startsType = () => isOp('?') || (peek().type === 'id' && !isKw('function') && !isKw('fn'));

    function params() {
      expectOp('(');
      const list = [];
      while (!isOp(')')) {
        const prm = { name: null, type: null, byRef: false, variadic: false, def: null, promote: null, readonly: false };
        while (peek().type === 'id' && /^(public|private|protected|readonly)$/.test(peek().lower)) {
          const m = next().lower;
          if (m === 'readonly') prm.readonly = true; else prm.promote = m;
        }
        if (prm.readonly && !prm.promote) prm.promote = 'public';
        if (peek().type !== 'var' && !isOp('&') && !isOp('...')) prm.type = typeDecl();
        if (isOp('&')) { next(); prm.byRef = true; }
        if (isOp('...')) { next(); prm.variadic = true; }
        const v = next();
        if (v.type !== 'var') { p--; fail('variable'); }
        prm.name = v.value;
        prm.line = v.line;
        if (isOp('=')) { next(); prm.def = expr(); }
        list.push(prm);
        if (isOp(',')) next(); else break;
      }
      expectOp(')');
      return list;
    }

    function funcDecl() {
      const line = next().line;
      let byRefReturn = false;
      if (isOp('&')) { next(); byRefReturn = true; }
      const name = next().value;
      const prms = params();
      let ret = null;
      if (isOp(':')) { next(); ret = typeDecl(); }
      const b = block();
      return { k: 'funcdecl', fn: { name, params: prms, body: b, ret, byRefReturn, line, statics: null }, line };
    }

    function classDecl() {
      const line = peek().line;
      const flags = { abstract: false, final: false, readonly: false };
      while (isKw('abstract') || isKw('final') || isKw('readonly')) flags[next().lower] = true;
      const kind = next().lower; // class | interface | trait
      const nameTok = next();
      if (nameTok.type !== 'id') { p--; fail('identifier'); }
      const decl = { name: nameTok.value, kind, abstract: flags.abstract, final: flags.final, parent: null, interfaces: [], consts: [], props: [], methods: [], traits: [], line };
      if (isKw('extends')) {
        next();
        if (kind === 'interface') { decl.interfaces.push(next().value); while (isOp(',')) { next(); decl.interfaces.push(next().value); } }
        else decl.parent = next().value;
      }
      if (isKw('implements')) { next(); decl.interfaces.push(next().value); while (isOp(',')) { next(); decl.interfaces.push(next().value); } }
      expectOp('{');
      while (!isOp('}')) {
        if (peek().type === 'eof') fail();
        if (isKw('use')) { next(); decl.traits.push(next().value); while (isOp(',')) { next(); decl.traits.push(next().value); } endStmt(); continue; }
        const mods = { vis: null, static: false, abstract: false, final: false, readonly: flags.readonly };
        const mline = peek().line;
        while (peek().type === 'id' && /^(public|private|protected|static|abstract|final|var|readonly)$/.test(peek().lower)) {
          const m = next().lower;
          if (m === 'public' || m === 'private' || m === 'protected') mods.vis = m;
          else if (m === 'var') mods.vis = 'public';
          else mods[m] = true;
        }
        if (isKw('const')) {
          next();
          if (peek(1).type === 'id' && !isOp('=', 1)) next(); // typed class constant (PHP 8.3)
          do { const nm = next().value; expectOp('='); decl.consts.push({ name: nm, e: expr(), vis: mods.vis || 'public', line: mline }); } while (isOp(',') && next());
          endStmt();
          continue;
        }
        if (isKw('function')) {
          next();
          let byRefReturn = false;
          if (isOp('&')) { next(); byRefReturn = true; }
          const nt = next();
          const prms = params();
          let ret = null;
          if (isOp(':')) { next(); ret = typeDecl(); }
          let b = null;
          if (isOp(';')) next(); else b = block();
          const isAbstract = mods.abstract || kind === 'interface';
          if (!isAbstract && !b) throw new ParseError('Non-abstract method ' + decl.name + '::' + nt.value + '() must contain body', nt.line);
          decl.methods.push({ name: nt.value, params: prms, body: b, ret, byRefReturn, vis: mods.vis || 'public', static: mods.static,
            abstract: isAbstract, final: mods.final, line: mline, statics: null });
          continue;
        }
        let type = null;
        if (peek().type !== 'var') type = typeDecl();
        do {
          const v = next();
          if (v.type !== 'var') { p--; fail('variable'); }
          let def;
          if (isOp('=')) { next(); def = expr(); }
          decl.props.push({ name: v.value, def, type, vis: mods.vis || 'public', static: mods.static, readonly: mods.readonly, line: v.line });
        } while (isOp(',') && next());
        endStmt();
      }
      next();
      return { k: 'classdecl', decl, line };
    }

    /* Expressions, lowest precedence first */
    function expr() { return lowOr(); }
    function lowOr() { let a = lowXor(); while (isKw('or')) { const l = next().line; a = { k: 'or', a, b: lowXor(), line: l }; } return a; }
    function lowXor() { let a = lowAnd(); while (isKw('xor')) { const l = next().line; a = { k: 'xor', a, b: lowAnd(), line: l }; } return a; }
    function lowAnd() { let a = assignExpr(); while (isKw('and')) { const l = next().line; a = { k: 'and', a, b: assignExpr(), line: l }; } return a; }
    function assignExpr() {
      if (isKw('print')) { const l = next().line; return { k: 'print', e: assignExpr(), line: l }; }
      if (isKw('throw')) { const l = next().line; return { k: 'throwx', e: assignExpr(), line: l }; }
      if (isKw('yield')) fail();
      return ternary();
    }
    function ternary() {
      let c = coalesce();
      while (isOp('?')) {
        const l = next().line;
        if (isOp(':')) { next(); c = { k: 'elvis', a: c, b: assignExpr(), line: l }; continue; }
        const a = assignExpr();
        expectOp(':');
        const b = assignExpr();
        c = { k: 'tern', c, a, b, line: l };
      }
      return c;
    }
    function coalesce() {
      const a = orOr();
      if (isOp('??')) { const l = next().line; return { k: 'coalesce', a, b: coalesce(), line: l }; }
      return a;
    }
    const binLevel = (nextFn, ops, kind) => function lvl() {
      let a = nextFn();
      while (peek().type === 'op' && ops.includes(peek().value)) {
        const t = next();
        a = { k: kind || 'bin', op: t.value, a, b: nextFn(), line: t.line };
      }
      return a;
    };
    const mulLevel = binLevel(notExpr, ['*', '/', '%']);
    const addLevel = binLevel(mulLevel, ['+', '-']);
    const shiftLevel = binLevel(addLevel, ['<<', '>>']);
    const concatLevel = binLevel(shiftLevel, ['.']);
    const relLevel = binLevel(concatLevel, ['<', '<=', '>', '>=']);
    const eqLevel = binLevel(relLevel, ['==', '!=', '===', '!==', '<>', '<=>']);
    const bitAnd = binLevel(eqLevel, ['&']);
    const bitXor = binLevel(bitAnd, ['^']);
    const bitOr = binLevel(bitXor, ['|']);
    function andAnd() { let a = bitOr(); while (isOp('&&')) { const l = next().line; a = { k: 'and', a, b: bitOr(), line: l }; } return a; }
    function orOr() { let a = andAnd(); while (isOp('||')) { const l = next().line; a = { k: 'or', a, b: andAnd(), line: l }; } return a; }

    function notExpr() {
      if (isOp('!')) { const l = next().line; return { k: 'not', e: notExpr(), line: l }; }
      return instanceofExpr();
    }
    function instanceofExpr() {
      let a = unary();
      while (isKw('instanceof')) {
        const l = next().line;
        let cls;
        if (peek().type === 'id') cls = { k: 'name', name: next().value, line: l };
        else cls = unary();
        a = { k: 'instanceof', e: a, cls, line: l };
      }
      return a;
    }
    function unary() {
      const t = peek();
      if (t.type === 'op') {
        if (t.value === '-' || t.value === '+' || t.value === '~') { next(); return { k: 'unary', op: t.value, e: unary(), line: t.line }; }
        if (t.value === '!') { next(); return { k: 'not', e: unary(), line: t.line }; }
        if (t.value === '@') { next(); return { k: 'silence', e: unary(), line: t.line }; }
        if (t.value === '++' || t.value === '--') { next(); const target = unary(); return { k: 'preinc', op: t.value, target, line: t.line }; }
        if (t.value === '&') fail();
      }
      if (t.type === 'cast') { next(); return { k: 'cast', type: t.value, e: unary(), line: t.line }; }
      if (t.type === 'id' && (t.lower === 'new' || t.lower === 'clone' || t.lower === 'include' || t.lower === 'require' || t.lower === 'include_once' || t.lower === 'require_once' || t.lower === 'print')) {
        if (t.lower === 'clone') { next(); return { k: 'clone', e: unary(), line: t.line }; }
        if (t.lower === 'print') { next(); return { k: 'print', e: assignExpr(), line: t.line }; }
        if (t.lower !== 'new') { next(); return { k: 'include', kind: t.lower, e: assignExpr(), line: t.line }; }
      }
      return pow();
    }
    function pow() {
      const base = postfix();
      if (isOp('**')) { const l = next().line; return { k: 'bin', op: '**', a: base, b: unary(), line: l }; }
      return base;
    }

    function args() {
      expectOp('(');
      const list = [];
      while (!isOp(')')) {
        if (isOp('...')) {
          next();
          if (isOp(')')) { list.push({ firstClass: true }); break; }
          list.push({ spread: true, e: expr() });
        } else if (peek().type === 'id' && isOp(':', 1) && !isOp('::', 1)) {
          const nm = next().value; next();
          list.push({ named: nm, e: expr() });
        } else list.push({ e: expr() });
        if (isOp(',')) next(); else break;
      }
      expectOp(')');
      return list;
    }

    const isLval = (e) => ['var', 'varvar', 'idx', 'prop', 'sprop', 'array', 'list'].includes(e.k);

    function postfix() {
      let e = primary();
      for (;;) {
        const t = peek();
        if (t.type !== 'op') break;
        const v = t.value;
        if (v === '[') {
          next();
          if (isOp(']')) { next(); e = { k: 'idx', obj: e, key: null, line: t.line }; continue; }
          const key = expr();
          expectOp(']');
          e = { k: 'idx', obj: e, key, line: t.line };
          continue;
        }
        if (v === '{' && (e.k === 'var' || e.k === 'idx') && false) break;
        if (v === '->' || v === '?->') {
          next();
          const nt = peek();
          let name;
          if (nt.type === 'id') { next(); name = { k: 'str', v: nt.value, line: nt.line }; }
          else if (nt.type === 'var') { next(); name = { k: 'var', name: nt.value, line: nt.line }; }
          else if (isOp('{')) { next(); name = expr(); expectOp('}'); }
          else fail('identifier');
          if (isOp('(')) e = { k: 'mcall', obj: e, name, args: args(), nullsafe: v === '?->', line: t.line };
          else e = { k: 'prop', obj: e, name, nullsafe: v === '?->', line: t.line };
          continue;
        }
        if (v === '::') {
          next();
          const nt = peek();
          if (nt.type === 'var') { next(); e = { k: 'sprop', cls: e, name: nt.value, line: t.line }; continue; }
          if (nt.type === 'id') {
            next();
            if (isOp('(')) { e = { k: 'scall', cls: e, name: nt.value, args: args(), line: t.line }; continue; }
            if (nt.lower === 'class') { e = { k: 'classname', cls: e, line: t.line }; continue; }
            e = { k: 'cconst', cls: e, name: nt.value, line: t.line };
            continue;
          }
          fail('identifier');
        }
        if (v === '(') { e = { k: 'call', fn: e, args: args(), line: t.line }; continue; }
        if ((v === '++' || v === '--') && isLval(e)) { next(); e = { k: 'postinc', op: v, target: e, line: t.line }; continue; }
        if (ASSIGN_OPS.has(v) && isLval(e)) {
          next();
          if (v === '=' && isOp('&')) {
            next();
            const src = unary();
            e = { k: 'assignref', target: e, src, line: t.line };
            continue;
          }
          e = { k: 'assign', op: v, target: e, value: assignExpr(), line: t.line };
          continue;
        }
        break;
      }
      return e;
    }

    function arrayItems(end) {
      const items = [];
      while (!isOp(end)) {
        if (isOp(',')) { next(); items.push(null); continue; }
        if (isOp('...')) { next(); items.push({ spread: true, v: expr() }); }
        else {
          let byRef = false;
          if (isOp('&')) { next(); byRef = true; }
          let v = expr(), key = null;
          if (isOp('=>')) { next(); key = v; if (isOp('&')) { next(); byRef = true; } v = expr(); }
          items.push({ key, v, byRef });
        }
        if (isOp(',')) next(); else break;
      }
      expectOp(end);
      return items;
    }

    function closure(isStatic) {
      const t = next();
      const line = t.line;
      if (t.lower === 'fn') {
        let byRefReturn = false;
        if (isOp('&')) { next(); byRefReturn = true; }
        const prms = params();
        let ret = null;
        if (isOp(':')) { next(); ret = typeDecl(); }
        expectOp('=>');
        const body = assignExpr();
        return { k: 'closure', fn: { name: '{closure}', params: prms, arrow: true, exprBody: body, ret, byRefReturn, line, statics: null, isStatic } , line };
      }
      let byRefReturn = false;
      if (isOp('&')) { next(); byRefReturn = true; }
      const prms = params();
      const uses = [];
      if (isKw('use')) {
        next(); expectOp('(');
        while (!isOp(')')) {
          let byRef = false;
          if (isOp('&')) { next(); byRef = true; }
          uses.push({ name: next().value, byRef });
          if (isOp(',')) next(); else break;
        }
        expectOp(')');
      }
      let ret = null;
      if (isOp(':')) { next(); ret = typeDecl(); }
      const b = block();
      return { k: 'closure', fn: { name: '{closure}', params: prms, body: b, uses, ret, byRefReturn, line, statics: null, isStatic }, line };
    }

    function primary() {
      const t = peek();
      const line = t.line;
      switch (t.type) {
        case 'var': next(); return { k: 'var', name: t.value, line };
        case 'int': next(); return { k: 'num', v: t.value, line };
        case 'float': next(); return { k: 'num', v: mkFloat(t.value), line };
        case 'str': next(); return { k: 'str', v: t.value, line };
        case 'tpl': {
          next();
          const parts = t.value.map((part) => {
            if (part.t === 'lit') return part.v;
            if (part.t === 'node') return part.node;
            const sub = parse(part.src + ';', part.line, true);
            const st = sub[0];
            if (!st || st.k !== 'expr') throw new ParseError('syntax error, unexpected token "}"', part.line);
            return st.e;
          });
          return { k: 'tpl', parts, line };
        }
        case 'cast': return unary();
        case 'op':
          if (t.value === '(') { next(); const e = expr(); expectOp(')'); return e; }
          if (t.value === '[') { next(); return { k: 'array', items: arrayItems(']'), line }; }
          if (t.value === '$') {
            next();
            if (isOp('{')) { next(); const e = expr(); expectOp('}'); return { k: 'varvar', e, line }; }
            return { k: 'varvar', e: primary(), line };
          }
          if (t.value === '&') fail();
          if (t.value === '-' || t.value === '+' || t.value === '!' || t.value === '~' || t.value === '@' || t.value === '++' || t.value === '--') return unary();
          fail();
          break;
        case 'id': {
          const w = t.lower;
          if (w === 'true') { next(); return { k: 'lit', v: true, line }; }
          if (w === 'false') { next(); return { k: 'lit', v: false, line }; }
          if (w === 'null') { next(); return { k: 'lit', v: null, line }; }
          if (w === 'array' && isOp('(', 1)) { next(); next(); return { k: 'array', items: arrayItems(')'), line }; }
          if (w === 'list' && isOp('(', 1)) { next(); next(); return { k: 'array', items: arrayItems(')'), line, list: true }; }
          if (w === 'isset' && isOp('(', 1)) { next(); const a = args(); return { k: 'isset', args: a.map((x) => x.e), line }; }
          if (w === 'empty' && isOp('(', 1)) { next(); expectOp('('); const e = expr(); expectOp(')'); return { k: 'empty', e, line }; }
          if (w === 'exit' || w === 'die') {
            next();
            let e = null;
            if (isOp('(')) { next(); if (!isOp(')')) e = expr(); expectOp(')'); }
            return { k: 'exit', e, line };
          }
          if (w === 'function' || w === 'fn') return closure(false);
          if (w === 'static' && (isKw('function', 1) || isKw('fn', 1))) { next(); return closure(true); }
          if (w === 'new') {
            next();
            let cls;
            if (peek().type === 'id') cls = { k: 'name', name: next().value, line };
            else if (peek().type === 'var') { const v = next(); cls = { k: 'var', name: v.value, line }; while (isOp('->')) { next(); cls = { k: 'prop', obj: cls, name: { k: 'str', v: next().value }, line }; } }
            else if (isOp('(')) { next(); cls = expr(); expectOp(')'); }
            else fail('identifier');
            const a = isOp('(') ? args() : [];
            return { k: 'new', cls, args: a, line };
          }
          if (w === 'match') {
            next(); expectOp('('); const subject = expr(); expectOp(')'); expectOp('{');
            const arms = [];
            while (!isOp('}')) {
              let conds = null;
              if (isKw('default')) next();
              else { conds = [expr()]; while (isOp(',') && !isOp('=>', 1)) { next(); conds.push(expr()); } if (isOp(',')) next(); }
              expectOp('=>');
              arms.push({ conds, e: expr() });
              if (isOp(',')) next(); else break;
            }
            expectOp('}');
            return { k: 'match', subject, arms, line };
          }
          if (MAGIC.has(w)) { next(); return { k: 'magic', name: w, line }; }
          if (KEYWORDS.has(w) && !['self', 'parent', 'static', 'array', 'list', 'callable'].includes(w) && !isOp('(', 1) && !isOp('::', 1)) fail();
          next();
          return { k: 'name', name: t.value, line };
        }
        default:
          fail();
      }
      return null;
    }

    if (startInPhp) {
      const body = [];
      while (peek().type !== 'eof') body.push(statement());
      return body;
    }
    return program();
  }

  /* ---------- Interpreter ---------- */

  const STEP_LIMIT = 300000;
  const UNINIT = { uninit: true };          // a typed property nobody has set yet
  const SUPERGLOBALS = new Set(['_GET', '_POST', '_REQUEST', '_SERVER', '_COOKIE', '_FILES', '_ENV', '_SESSION', 'GLOBALS']);
  const escHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function typeName(v) {
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'boolean') return 'bool';
    if (isInt(v)) return 'int';
    if (isFloat(v)) return 'float';
    if (typeof v === 'string') return 'string';
    if (v instanceof PArray) return 'array';
    if (v instanceof PClosure) return 'Closure';
    if (v instanceof PObject) return v.cls.name;
    return 'mixed';
  }
  function gettype(v) {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'boolean') return 'boolean';
    if (isInt(v)) return 'integer';
    if (isFloat(v)) return 'double';
    if (typeof v === 'string') return 'string';
    if (v instanceof PArray) return 'array';
    return 'object';
  }

  // Numeric strings (PHP 8): optional whitespace, sign, digits, decimals, exponent, whitespace.
  const NUMERIC_RE = /^[ \t\n\r\v\f]*[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?[ \t\n\r\v\f]*$/;
  const LEADING_RE = /^[ \t\n\r\v\f]*[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?/;
  function numFromText(t) {
    t = t.trim();
    const n = Number(t);
    return /[.eE]/.test(t) || !Number.isSafeInteger(n) ? mkFloat(n) : n;
  }
  function numericStr(s) { return NUMERIC_RE.test(s) ? numFromText(s) : null; }
  function leadingNum(s) { const m = LEADING_RE.exec(s); return m ? numFromText(m[0]) : null; }

  // Floats as echo shows them: 14 significant digits, exponent form when very large or small.
  function fmtFloat(x, prec) {
    if (Number.isNaN(x)) return 'NAN';
    if (x === Infinity) return 'INF';
    if (x === -Infinity) return '-INF';
    if (x === 0) return Object.is(x, -0) ? '-0' : '0';
    if (prec === -1) {
      const e = Math.floor(Math.log10(Math.abs(x)));
      if (e < -4 || e >= 15) {
        const [mant, exp] = x.toExponential().split('e');
        return (mant.includes('.') ? mant : mant + '.0') + 'E' + (exp[0] === '-' ? '-' : '+') + exp.replace(/^[+-]/, '');
      }
      return String(x);
    }
    const ex = x.toExponential(prec - 1);
    const exp = parseInt(ex.split('e')[1], 10);
    if (exp < -4 || exp >= prec) {
      let mant = ex.split('e')[0].replace(/\.?0+$/, '');
      if (!mant.includes('.')) mant += '.0';
      return mant + 'E' + (exp < 0 ? '-' : '+') + Math.abs(exp);
    }
    return String(Number(x.toPrecision(prec)));
  }

  function mulberry(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // name=value pairs into a PHP array, the way PHP fills $_GET and $_POST:
  // tags[]=a&tags[]=b makes a list, user[name]=Ana makes a nested array.
  function phpArrayFromPairs(pairs) {
    const arr = new PArray();
    pairs.forEach(([name, value]) => {
      const m = /^([^[]+)((?:\[[^\]]*\])*)/.exec(name);
      if (!m) return;
      const base = m[1].replace(/[ .]/g, '_');
      const subs = Array.from(m[2].matchAll(/\[([^\]]*)\]/g), (x) => x[1]);
      const path = [base].concat(subs);
      let cur = arr;
      for (let i = 0; i < path.length - 1; i++) {
        const k = path[i];
        if (k === '') { const na = new PArray(); cur.push(na); cur = na; continue; }
        let nx = cur.get(k);
        if (!(nx instanceof PArray)) { nx = new PArray(); cur.set(k, nx); }
        cur = nx;
      }
      const last = path[path.length - 1];
      if (last === '') cur.push(value); else cur.set(last, value);
    });
    return arr;
  }
  function parsePairs(str) {
    return String(str || '').split('&').filter(Boolean).map((p) => {
      const i = p.indexOf('=');
      const dec = (s) => { try { return decodeURIComponent(s.replace(/\+/g, ' ')); } catch (e) { return s; } };
      return i < 0 ? [dec(p), ''] : [dec(p.slice(0, i)), dec(p.slice(i + 1))];
    });
  }

  function toPHP(v) {
    if (v === undefined) return null;
    if (v === null || typeof v === 'boolean' || typeof v === 'string' || typeof v === 'number') return v;
    if (v instanceof PArray || v instanceof PObject || v instanceof PFloat) return v;
    if (Array.isArray(v)) return PArray.list(v.map(toPHP));
    if (typeof v === 'object') return PArray.fromPairs(Object.keys(v).map((k) => [k, toPHP(v[k])]));
    return String(v);
  }

  class Scope {
    constructor(fn, thisObj, cls, staticCls) {
      this.vars = new Map(); this.fn = fn || null; this.thisObj = thisObj || null; this.cls = cls || null; this.staticCls = staticCls || cls || null; this.args = [];
    }
  }

  class Interp {
    constructor(opts) {
      this.opts = opts;
      this.file = opts.file || '/index.php';
      this.out = [];
      this.ob = [];
      this.headers = [];
      this.status = 200;
      this.logs = [];
      this.headersSent = false;
      this.outputStart = 0;
      this.functions = new Map();
      this.classDecls = new Map();
      this.classes = new Map();
      this.constants = new Map();
      this.globals = new Scope();
      this.topStatics = new Map();
      this.steps = 0;
      this.stepLimit = opts.stepLimit || STEP_LIMIT;
      this.t0 = Date.now();
      this.depth = 0;
      this.stack = [];
      this.silence = 0;
      this.strict = false;
      this.jsonError = 0;
      this.rng = mulberry(opts.seed != null ? opts.seed : (Date.now() ^ 0x5bd1e995));
      this.now = opts.now != null ? opts.now : Date.now();
      this.tz = opts.timezone || 'UTC';
      this.included = new Set();
      this.curLine = 0;
      this.files = opts.files || {};
      installNativeClasses(this);
      const get = opts.get instanceof PArray ? opts.get : toPHP(opts.get || {});
      const post = opts.post instanceof PArray ? opts.post : toPHP(opts.post || {});
      const cookie = opts.cookies instanceof PArray ? opts.cookies : toPHP(opts.cookies || {});
      const request = get.clone();
      post.entries().forEach(([k, v]) => request.set(k, copyVal(v)));
      const uri = opts.uri || this.file;
      const qs = uri.includes('?') ? uri.slice(uri.indexOf('?') + 1) : '';
      const server = toPHP(Object.assign({
        REQUEST_METHOD: opts.method || 'GET', REQUEST_URI: uri, QUERY_STRING: qs, SCRIPT_NAME: this.file, PHP_SELF: this.file,
        SCRIPT_FILENAME: '/var/www/html' + this.file, DOCUMENT_ROOT: '/var/www/html', HTTP_HOST: 'localhost:8000', SERVER_NAME: 'localhost',
        SERVER_PORT: '8000', SERVER_PROTOCOL: 'HTTP/1.1', SERVER_SOFTWARE: 'PHP ' + PHP_VERSION + ' Development Server', REMOTE_ADDR: '127.0.0.1',
        HTTP_USER_AGENT: 'Mozilla/5.0 (course playground)', HTTP_ACCEPT: 'text/html', REQUEST_TIME: Math.floor(this.now / 1000)
      }, opts.server || {}));
      if (opts.method === 'POST') server.set('CONTENT_TYPE', 'application/x-www-form-urlencoded');
      this.superglobals = {
        _GET: new Ref(get), _POST: new Ref(post), _REQUEST: new Ref(request), _SERVER: new Ref(server),
        _COOKIE: new Ref(cookie), _FILES: new Ref(new PArray()), _ENV: new Ref(new PArray()), _SESSION: new Ref(null)
      };
    }

    /* Output, headers and messages */
    echo(s) {
      if (s === '' || s == null) return;
      if (this.ob.length) { this.ob[this.ob.length - 1] += s; return; }
      if (!this.headersSent) { this.headersSent = true; this.outputStart = this.curLine || 1; }
      this.out.push(s);
    }
    message(kind, msg, line) {
      if (this.silence && kind !== 'Fatal error') return;
      const ln = line || this.curLine;
      this.logs.push([kind === 'Fatal error' || kind === 'Parse error' ? 'error' : 'warn', kind + ': ' + msg + ' in ' + this.file + ' on line ' + ln]);
      this.echo('<br />\n<b>' + kind + '</b>:  ' + escHtml(msg) + ' in <b>' + this.file + '</b> on line <b>' + ln + '</b><br />\n');
    }
    warn(msg, line) { this.message('Warning', msg, line); }
    deprecated(msg, line) { this.message('Deprecated', msg, line); }
    notice(msg, line) { this.message('Notice', msg, line); }
    step(line) {
      if (line) this.curLine = line;
      if (++this.steps > this.stepLimit || ((this.steps & 4095) === 0 && Date.now() - this.t0 > 4000)) {
        throw new FatalSignal('Maximum execution time exceeded. This playground stops a script after ' + this.stepLimit.toLocaleString('en-US') +
          ' steps: check that every loop\'s condition eventually becomes false', this.curLine);
      }
    }

    /* Errors PHP code can catch */
    makeThrowable(clsName, msg, line) {
      const cls = this.getClass(clsName);
      const obj = this.instantiateBare(cls, line);
      obj.props.get('message').v = msg;
      return obj;
    }
    throwError(clsName, msg, line) { throw new ThrowSignal(this.makeThrowable(clsName, msg, line || this.curLine)); }
    typeError(msg, line) { this.throwError('TypeError', msg, line); }

    /* Conversions */
    truthy(v) {
      if (v === null || v === undefined || v === false) return false;
      if (v === true) return true;
      if (isNum(v)) return fv(v) !== 0;
      if (typeof v === 'string') return v !== '' && v !== '0';
      if (v instanceof PArray) return v.size > 0;
      return true;
    }
    toStr(v, line) {
      if (typeof v === 'string') return v;
      if (v === null || v === undefined || v === false) return '';
      if (v === true) return '1';
      if (isInt(v)) return String(v);
      if (isFloat(v)) return fmtFloat(fv(v), 14);
      if (v instanceof PArray) { this.warn('Array to string conversion', line); return 'Array'; }
      if (v instanceof PObject) {
        const m = this.findMethod(v.cls, '__tostring');
        if (m) return this.toStr(this.callMethod(m, v, [], line), line);
      }
      this.throwError('Error', 'Object of class ' + typeName(v) + ' could not be converted to string', line);
      return '';
    }
    toInt(v, line) {
      if (isInt(v)) return v;
      if (isFloat(v)) { const x = fv(v); return Number.isFinite(x) ? Math.trunc(x) : 0; }
      if (typeof v === 'boolean') return v ? 1 : 0;
      if (v === null || v === undefined) return 0;
      if (typeof v === 'string') { const n = leadingNum(v); return n === null ? 0 : this.toInt(n); }
      if (v instanceof PArray) return v.size ? 1 : 0;
      return 1;
    }
    toFloat(v) {
      if (isNum(v)) return fv(v);
      if (typeof v === 'boolean') return v ? 1 : 0;
      if (v === null || v === undefined) return 0;
      if (typeof v === 'string') { const n = leadingNum(v); return n === null ? 0 : fv(n); }
      if (v instanceof PArray) return v.size ? 1 : 0;
      return 1;
    }
    // For arithmetic: { n, f } or null when the value cannot take part (arrays, objects, "abc").
    toNumber(v, line) {
      if (isInt(v)) return { n: v, f: false };
      if (isFloat(v)) return { n: fv(v), f: true };
      if (v === null || v === undefined || v === false) return { n: 0, f: false };
      if (v === true) return { n: 1, f: false };
      if (typeof v === 'string') {
        let x = numericStr(v);
        if (x === null) {
          x = leadingNum(v);
          if (x === null) return null;
          this.warn('A non-numeric value encountered', line);
        }
        return { n: fv(x), f: isFloat(x) };
      }
      return null;
    }

    /* Comparisons, PHP 8 rules */
    looseEq(a, b) {
      if (a === undefined) a = null;
      if (b === undefined) b = null;
      if (a === null && b === null) return true;
      if (a === null && typeof b === 'string') return b === '';
      if (b === null && typeof a === 'string') return a === '';
      if (typeof a === 'boolean' || typeof b === 'boolean' || a === null || b === null) return this.truthy(a) === this.truthy(b);
      if (isNum(a) && isNum(b)) return fv(a) === fv(b);
      if (typeof a === 'string' && typeof b === 'string') {
        const na = numericStr(a), nb = numericStr(b);
        if (na !== null && nb !== null) return fv(na) === fv(nb);
        return a === b;
      }
      if (isNum(a) && typeof b === 'string') { const nb = numericStr(b); return nb !== null ? fv(a) === fv(nb) : this.toStr(a) === b; }
      if (typeof a === 'string' && isNum(b)) return this.looseEq(b, a);
      if (a instanceof PArray && b instanceof PArray) {
        if (a.size !== b.size) return false;
        for (const [k, v] of a.entries()) if (!b.has(k) || !this.looseEq(v, b.get(k))) return false;
        return true;
      }
      if (a instanceof PObject && b instanceof PObject) {
        if (a === b) return true;
        if (a.cls !== b.cls || a.props.size !== b.props.size) return false;
        for (const [k, r] of a.props) { const o = b.props.get(k); if (!o || !this.looseEq(deref(r.v), deref(o.v))) return false; }
        return true;
      }
      if (a instanceof PObject && typeof b === 'string' && this.findMethod(a.cls, '__tostring')) return this.toStr(a) === b;
      if (b instanceof PObject && typeof a === 'string' && this.findMethod(b.cls, '__tostring')) return this.toStr(b) === a;
      return false;
    }
    strictEq(a, b) {
      if (a === undefined) a = null;
      if (b === undefined) b = null;
      if (isInt(a) && isInt(b)) return a === b;
      if (isFloat(a) && isFloat(b)) return fv(a) === fv(b);
      if (isNum(a) || isNum(b)) return false;
      if (a instanceof PArray && b instanceof PArray) {
        if (a.size !== b.size) return false;
        const ea = a.entries(), eb = b.entries();
        for (let i = 0; i < ea.length; i++) if (ea[i][0] !== eb[i][0] || !this.strictEq(ea[i][1], eb[i][1])) return false;
        return true;
      }
      return a === b;
    }
    cmp(a, b) {
      const sign = (x) => (x < 0 ? -1 : x > 0 ? 1 : 0);
      const scmp = (x, y) => (x < y ? -1 : x > y ? 1 : 0);
      if (a === undefined) a = null;
      if (b === undefined) b = null;
      if (typeof a === 'string' && typeof b === 'string') {
        const na = numericStr(a), nb = numericStr(b);
        if (na !== null && nb !== null) return sign(fv(na) - fv(nb));
        return scmp(a, b);
      }
      if (isNum(a) && isNum(b)) { const d = fv(a) - fv(b); return Number.isNaN(d) ? 1 : sign(d); }
      if (isNum(a) && typeof b === 'string') { const nb = numericStr(b); return nb !== null ? sign(fv(a) - fv(nb)) : scmp(this.toStr(a), b); }
      if (typeof a === 'string' && isNum(b)) return -this.cmp(b, a);
      if (a === null && typeof b === 'string') return scmp('', b);
      if (b === null && typeof a === 'string') return scmp(a, '');
      if (typeof a === 'boolean' || typeof b === 'boolean' || a === null || b === null) return sign(Number(this.truthy(a)) - Number(this.truthy(b)));
      if (a instanceof PArray && b instanceof PArray) {
        if (a.size !== b.size) return sign(a.size - b.size);
        for (const [k, v] of a.entries()) { if (!b.has(k)) return 1; const c = this.cmp(v, b.get(k)); if (c) return c; }
        return 0;
      }
      if (a instanceof PArray) return 1;
      if (b instanceof PArray) return -1;
      if (a instanceof PObject && b instanceof PObject && a.cls === b.cls) {
        for (const [k, r] of a.props) { const o = b.props.get(k); if (!o) return 1; const c = this.cmp(deref(r.v), deref(o.v)); if (c) return c; }
        return 0;
      }
      return 1;
    }

    /* Operators */
    arith(op, a, b, line) {
      if (op === '+' && a instanceof PArray && b instanceof PArray) {
        const r = a.clone();
        b.entries().forEach(([k, v]) => { if (!r.has(k)) r.set(k, copyVal(v)); });
        return r;
      }
      const x = this.toNumber(a, line), y = x ? this.toNumber(b, line) : null;
      if (!x || !y) this.typeError('Unsupported operand types: ' + typeName(a) + ' ' + op + ' ' + typeName(b), line);
      const isF = x.f || y.f;
      const out = (r, f) => (f ? mkFloat(r) : mkInt(r));
      switch (op) {
        case '+': return out(x.n + y.n, isF);
        case '-': return out(x.n - y.n, isF);
        case '*': return out(x.n * y.n, isF);
        case '/': {
          if (y.n === 0) this.throwError('DivisionByZeroError', 'Division by zero', line);
          const r = x.n / y.n;
          return out(r, isF || !Number.isInteger(r));
        }
        case '%': {
          const xi = this.toIntLossy(x, line), yi = this.toIntLossy(y, line);
          if (yi === 0) this.throwError('DivisionByZeroError', 'Modulo by zero', line);
          const r = xi % yi;
          return r === 0 ? 0 : r;
        }
        case '**': {
          if (!isF && y.n >= 0) return out(Math.pow(x.n, y.n), false);
          return mkFloat(Math.pow(x.n, y.n));
        }
      }
      return null;
    }
    toIntLossy(x, line) {
      if (!x.f) return x.n;
      if (!Number.isInteger(x.n) && Number.isFinite(x.n)) this.deprecated('Implicit conversion from float ' + fmtFloat(x.n, -1) + ' to int loses precision', line);
      return Number.isFinite(x.n) ? Math.trunc(x.n) : 0;
    }
    bitop(op, a, b, line) {
      const x = this.toNumber(a, line), y = this.toNumber(b, line);
      if (!x || !y) this.typeError('Unsupported operand types: ' + typeName(a) + ' ' + op + ' ' + typeName(b), line);
      const A = BigInt(Math.trunc(x.n)), B = BigInt(Math.trunc(y.n));
      let r;
      switch (op) {
        case '&': r = A & B; break;
        case '|': r = A | B; break;
        case '^': r = A ^ B; break;
        case '<<': r = A << B; break;
        case '>>': r = A >> B; break;
      }
      return Number(BigInt.asIntN(64, r));
    }
    binop(op, a, b, line) {
      switch (op) {
        case '.': return this.toStr(a, line) + this.toStr(b, line);
        case '+': case '-': case '*': case '/': case '%': case '**': return this.arith(op, a, b, line);
        case '==': return this.looseEq(a, b);
        case '!=': case '<>': return !this.looseEq(a, b);
        case '===': return this.strictEq(a, b);
        case '!==': return !this.strictEq(a, b);
        case '<': return this.cmp(a, b) < 0;
        case '<=': return this.cmp(a, b) <= 0;
        case '>': return this.cmp(b, a) < 0;
        case '>=': return this.cmp(b, a) <= 0;
        case '<=>': return this.cmp(a, b);
        case '&': case '|': case '^': case '<<': case '>>': return this.bitop(op, a, b, line);
      }
      throw new FatalSignal('Unknown operator ' + op, line);
    }
    incdec(v, up, line) {
      if (v === null || v === undefined) return up ? 1 : null;
      if (typeof v === 'boolean') return v;
      if (isInt(v)) return mkInt(v + (up ? 1 : -1));
      if (isFloat(v)) return mkFloat(fv(v) + (up ? 1 : -1));
      if (typeof v === 'string') {
        const n = numericStr(v);
        if (n !== null) return this.incdec(n, up, line);
        if (!up) return v;
        if (v === '') return '1';
        return strIncrement(v);
      }
      this.typeError('Cannot ' + (up ? 'increment' : 'decrement') + ' ' + typeName(v), line);
      return v;
    }

    /* Variables */
    lookupVar(scope, name) {
      if (SUPERGLOBALS.has(name)) {
        if (name === 'GLOBALS') { const a = new PArray(); this.globals.vars.forEach((r, k) => a.set(k, copyVal(r.v))); return new Ref(a); }
        return this.superglobals[name];
      }
      return scope.vars.get(name);
    }
    varRef(scope, name) {
      if (SUPERGLOBALS.has(name)) return this.lookupVar(scope, name);
      let r = scope.vars.get(name);
      if (!r) { r = new Ref(null); scope.vars.set(name, r); }
      return r;
    }
    globalRef(name) { return this.varRef(this.globals, name); }
    readVar(scope, name, line, quiet) {
      if (name === 'this') {
        if (scope.thisObj) return scope.thisObj;
        if (quiet) return null;
        this.throwError('Error', 'Using $this when not in object context', line);
      }
      const r = this.lookupVar(scope, name);
      if (!r) { if (!quiet) this.warn('Undefined variable $' + name, line); return null; }
      return r.v;
    }
    keyText(k) { return typeof k === 'number' ? String(k) : '"' + k + '"'; }

    // An assignable place: a variable, $a[key], $obj->prop, Class::$prop.
    lref(n, scope) {
      const I = this;
      switch (n.k) {
        case 'var': case 'varvar': {
          const name = n.k === 'var' ? n.name : this.toStr(this.eval(n.e, scope), n.line);
          return {
            get: (quiet) => I.readVar(scope, name, n.line, quiet),
            set: (v) => { if (name === 'this') I.throwError('Error', 'Cannot re-assign $this', n.line); I.varRef(scope, name).v = v; },
            ref: () => I.varRef(scope, name),
            bind: (r) => { scope.vars.set(name, r); },
            unset: () => { scope.vars.delete(name); }
          };
        }
        case 'idx': {
          const cont = this.lref(n.obj, scope);
          const hasKey = n.key !== null;
          const key = hasKey ? this.eval(n.key, scope) : undefined;
          const badKey = () => { if (hasKey && normKey(key) === undefined) I.typeError('Cannot access offset of type ' + typeName(key) + ' on array', n.line); };
          // The container, turned into an array if it is empty (PHP's autovivification).
          const container = () => {
            let base = cont.get(true);
            if (base === null || base === undefined) { base = new PArray(); cont.set(base); }
            else if (base === false) { I.deprecated('Automatic conversion of false to array is deprecated', n.line); base = new PArray(); cont.set(base); }
            return base;
          };
          return {
            get: (quiet) => I.readIndex(cont.get(quiet), key, hasKey, n.line, quiet),
            set: (v) => {
              const base = container();
              if (base instanceof PArray) {
                badKey();
                if (!hasKey) { if (!Number.isSafeInteger(base.next)) I.throwError('Error', 'Cannot add element to the array as the next element is already occupied', n.line); base.push(v); }
                else base.set(key, v);
              } else if (typeof base === 'string') {
                if (!hasKey) I.throwError('Error', '[] operator not supported for strings', n.line);
                const i = I.toInt(key);
                const ch = I.toStr(v, n.line).charAt(0) || ' ';
                const pos = i < 0 ? base.length + i : i;
                const padded = base.length < pos ? base + ' '.repeat(pos - base.length) : base;
                cont.set(padded.slice(0, pos) + ch + padded.slice(pos + 1));
              } else if (base instanceof PObject && I.findMethod(base.cls, 'offsetset')) {
                I.callMethod(I.findMethod(base.cls, 'offsetset'), base, [hasKey ? key : null, v], n.line);
              } else if (base instanceof PObject) I.throwError('Error', 'Cannot use object of type ' + base.cls.name + ' as array', n.line);
              else I.throwError('Error', 'Cannot use a scalar value as an array', n.line);
            },
            ref: () => {
              const base = container();
              if (!(base instanceof PArray)) I.throwError('Error', 'Cannot create references to/from string offsets', n.line);
              badKey();
              let k = key;
              if (!hasKey) { k = base.next; base.push(null); }
              const raw = base.raw(k);
              if (raw instanceof Ref) return raw;
              const r = new Ref(raw === undefined ? null : raw);
              base.setRaw(k, r);
              return r;
            },
            bind: (r) => { const base = container(); if (!hasKey) { base.setRaw(base.next, r); } else base.setRaw(key, r); },
            unset: () => {
              const base = cont.get(true);
              if (base instanceof PArray) base.delete(key);
              else if (typeof base === 'string') I.throwError('Error', 'Cannot unset string offsets', n.line);
              else if (base instanceof PObject && I.findMethod(base.cls, 'offsetunset')) I.callMethod(I.findMethod(base.cls, 'offsetunset'), base, [key], n.line);
            }
          };
        }
        case 'prop': {
          const isPlace = ['var', 'varvar', 'idx', 'prop', 'sprop'].includes(n.obj.k);
          let obj = isPlace ? this.lref(n.obj, scope).get(false) : this.eval(n.obj, scope);
          if (obj === undefined) obj = null;
          const name = n.name.k === 'str' ? n.name.v : this.toStr(this.eval(n.name, scope), n.line);
          const need = (verb) => {
            if (obj instanceof PObject) return obj;
            if (obj === null && n.nullsafe) return null;
            I.throwError('Error', 'Attempt to ' + verb + ' property "' + name + '" on ' + typeName(obj), n.line);
            return null;
          };
          return {
            get: (quiet) => {
              if (obj === null && n.nullsafe) return null;
              if (!(obj instanceof PObject)) {
                if (!quiet) I.warn('Attempt to read property "' + name + '" on ' + typeName(obj), n.line);
                return null;
              }
              return I.getProp(obj, name, scope, n.line, quiet);
            },
            set: (v) => { const o = need('assign'); if (o) I.setProp(o, name, v, scope, n.line); },
            ref: () => { const o = need('modify'); const rec = I.propRecord(o, name, scope, n.line); if (!(rec.v instanceof Ref)) rec.v = new Ref(rec.v === UNINIT ? null : rec.v); return rec.v; },
            bind: (r) => { const o = need('modify'); const rec = I.propRecord(o, name, scope, n.line); rec.v = r; },
            unset: () => { if (obj instanceof PObject) { const rec = obj.props.get(name); if (rec) { I.checkPropAccess(obj, rec, name, scope, n.line); obj.props.delete(name); } } }
          };
        }
        case 'sprop': {
          const cls = this.classRef(n.cls, scope, n.line);
          const rec = this.findStatic(cls, n.name);
          if (!rec) this.throwError('Error', 'Access to undeclared static property ' + cls.name + '::$' + n.name, n.line);
          if (!this.canAccess(rec.vis, rec.cls, scope.cls)) this.throwError('Error', 'Cannot access ' + rec.vis + ' property ' + cls.name + '::$' + n.name, n.line);
          return { get: () => rec.ref.v, set: (v) => { rec.ref.v = v; }, ref: () => rec.ref, bind: (r) => { rec.ref = r; }, unset: () => this.throwError('Error', 'Attempt to unset static property ' + cls.name + '::$' + n.name, n.line) };
        }
        default: {
          // Not a place (a function call, a literal): reading works, writing is an error.
          const v = this.eval(n, scope);
          return { get: () => v, set: () => this.throwError('Error', 'Cannot use temporary expression in write context', n.line), ref: () => new Ref(v), bind: () => {}, unset: () => {} };
        }
      }
    }
    readIndex(base, key, hasKey, line, quiet) {
      if (!hasKey) this.throwError('Error', 'Cannot use [] for reading', line);
      if (base instanceof PArray) {
        const k = normKey(key);
        if (k === undefined) this.typeError('Cannot access offset of type ' + typeName(key) + ' on array', line);
        if (base.m.has(k)) return base.get(k);
        if (!quiet) this.warn('Undefined array key ' + this.keyText(k), line);
        return null;
      }
      if (typeof base === 'string') {
        let i;
        if (isInt(key)) i = key;
        else if (typeof key === 'string' && numericStr(key) !== null && isInt(numericStr(key))) i = numericStr(key);
        else if (quiet) return null;
        else if (typeof key === 'string' && leadingNum(key) === null) this.throwError('TypeError', 'Cannot access offset of type ' + typeName(key) + ' on string', line);
        else i = this.toInt(key);
        const pos = i < 0 ? base.length + i : i;
        if (pos < 0 || pos >= base.length) { if (!quiet) this.warn('Uninitialized string offset ' + i, line); return quiet ? null : ''; }
        return base[pos];
      }
      if (base instanceof PObject) {
        const m = this.findMethod(base.cls, 'offsetget');
        if (m) {
          if (quiet) { const e = this.findMethod(base.cls, 'offsetexists'); if (e && !this.truthy(this.callMethod(e, base, [key], line))) return null; }
          return this.callMethod(m, base, [key], line);
        }
        this.throwError('Error', 'Cannot use object of type ' + base.cls.name + ' as array', line);
      }
      if (!quiet) this.warn('Trying to access array offset on value of type ' + (base === null || base === undefined ? 'null' : typeName(base)), line);
      return null;
    }

    // isset() and ?? look without warnings.
    quiet(n, scope) {
      switch (n.k) {
        case 'var': return this.readVar(scope, n.name, n.line, true);
        case 'varvar': return this.readVar(scope, this.toStr(this.eval(n.e, scope)), n.line, true);
        case 'idx': {
          const base = this.quiet(n.obj, scope);
          if (base === null || base === undefined) return null;
          if (n.key === null) return null;
          const key = this.eval(n.key, scope);
          if (base instanceof PArray) { const k = normKey(key); return k === undefined ? null : base.get(k); }
          return this.readIndex(base, key, true, n.line, true);
        }
        case 'prop': {
          const obj = this.quiet(n.obj, scope);
          if (!(obj instanceof PObject)) return null;
          const name = n.name.k === 'str' ? n.name.v : this.toStr(this.eval(n.name, scope));
          const rec = obj.props.get(name);
          if (rec && this.canAccess(rec.vis, rec.cls, scope.cls)) return rec.v === UNINIT ? null : deref(rec.v);
          const iss = this.findMethod(obj.cls, '__isset');
          if (iss && this.truthy(this.callMethod(iss, obj, [name], n.line))) return this.getProp(obj, name, scope, n.line, true);
          return null;
        }
        case 'sprop': {
          const cls = this.classRef(n.cls, scope, n.line, true);
          if (!cls) return null;
          const rec = this.findStatic(cls, n.name);
          return rec && this.canAccess(rec.vis, rec.cls, scope.cls) ? rec.ref.v : null;
        }
        default: return this.eval(n, scope);
      }
    }

    /* Statements */
    execList(list, scope) { for (let i = 0; i < list.length; i++) this.exec(list[i], scope); }
    loopBody(body, scope) {
      try { this.execList(body, scope); } catch (e) {
        if (e instanceof BreakSignal) { if (e.n > 1) { e.n--; throw e; } return true; }
        if (e instanceof ContinueSignal) { if (e.n > 1) { e.n--; throw e; } return false; }
        throw e;
      }
      return false;
    }
    exec(s, scope) {
      this.step(s.line);
      switch (s.k) {
        case 'echo':
          for (const a of s.args) this.echo(a.k === 'str' ? a.v : this.toStr(this.eval(a, scope), a.line || s.line));
          return;
        case 'expr': this.eval(s.e, scope); return;
        case 'nop': return;
        case 'block': this.execList(s.body, scope); return;
        case 'if':
          for (const b of s.branches) if (this.truthy(this.eval(b.cond, scope))) { this.execList(b.body, scope); return; }
          if (s.elseBody) this.execList(s.elseBody, scope);
          return;
        case 'while':
          while (this.truthy(this.eval(s.cond, scope))) { this.step(s.line); if (this.loopBody(s.body, scope)) break; }
          return;
        case 'dowhile':
          do { this.step(s.line); if (this.loopBody(s.body, scope)) break; } while (this.truthy(this.eval(s.cond, scope)));
          return;
        case 'for': {
          s.init.forEach((e) => this.eval(e, scope));
          for (;;) {
            let ok = true;
            s.cond.forEach((e, i) => { const v = this.eval(e, scope); if (i === s.cond.length - 1) ok = this.truthy(v); });
            if (!ok) break;
            this.step(s.line);
            if (this.loopBody(s.body, scope)) break;
            s.step.forEach((e) => this.eval(e, scope));
          }
          return;
        }
        case 'foreach': this.execForeach(s, scope); return;
        case 'switch': {
          const subj = this.eval(s.subject, scope);
          let start = -1;
          for (let i = 0; i < s.cases.length; i++) {
            if (s.cases[i].test && this.looseEq(subj, this.eval(s.cases[i].test, scope))) { start = i; break; }
          }
          if (start < 0) start = s.cases.findIndex((c) => !c.test);
          if (start < 0) return;
          try { for (let i = start; i < s.cases.length; i++) this.execList(s.cases[i].body, scope); } catch (e) {
            if (e instanceof BreakSignal || e instanceof ContinueSignal) { if (e.n > 1) { e.n--; throw e; } return; }
            throw e;
          }
          return;
        }
        case 'break': throw new BreakSignal(s.levels);
        case 'continue': throw new ContinueSignal(s.levels);
        case 'return': throw new ReturnSignal(s.e ? this.eval(s.e, scope) : null);
        case 'funcdecl': this.declareFunction(s.fn, s.line); return;
        case 'classdecl': this.declareClass(s.decl); this.getClass(s.decl.name); return;
        case 'try': this.execTry(s, scope); return;
        case 'throw': this.throwValue(this.eval(s.e, scope), s.line); return;
        case 'global': s.names.forEach((nm) => scope.vars.set(nm, this.globalRef(nm))); return;
        case 'static': {
          const owner = scope.fn || this;
          const store = owner === this ? this.topStatics : (owner.statics = owner.statics || new Map());
          s.vars.forEach((v) => {
            if (!store.has(v.name)) store.set(v.name, new Ref(v.init ? this.eval(v.init, scope) : null));
            scope.vars.set(v.name, store.get(v.name));
          });
          return;
        }
        case 'unset': s.args.forEach((a) => this.lref(a, scope).unset()); return;
        case 'constdecl': s.items.forEach((it) => this.defineConst(it.name, this.eval(it.e, scope), s.line)); return;
        case 'declare': if (s.name === 'strict_types') this.strict = this.truthy(this.eval(s.v, scope)); return;
        default: throw new FatalSignal('Unsupported statement ' + s.k, s.line);
      }
    }
    execForeach(s, scope) {
      let subject;
      if (s.byRef) {
        const place = this.lref(s.subject, scope);
        subject = place.get(false);
        if (subject instanceof PArray) {
          for (const k of subject.keys()) {
            if (!subject.m.has(k)) continue;
            this.step(s.line);
            let raw = subject.m.get(k);
            if (!(raw instanceof Ref)) { raw = new Ref(raw); subject.m.set(k, raw); }
            this.lref(s.valT, scope).bind(raw);
            if (s.keyT) this.assignTo(s.keyT, k, scope, s.line);
            if (this.loopBody(s.body, scope)) break;
          }
          return;
        }
      } else subject = this.eval(s.subject, scope);
      let entries;
      // A copy of the array is walked, but a slot that is a reference is read when it is reached
      // (that is what makes the famous foreach-by-reference surprise happen).
      if (subject instanceof PArray) entries = Array.from(subject.m.entries());
      else if (subject instanceof PObject) {
        const it = this.findMethod(subject.cls, 'getiterator');
        if (it) { const r = this.callMethod(it, subject, [], s.line); entries = r instanceof PArray ? r.entries() : []; }
        else entries = Array.from(subject.props.entries()).filter(([, r]) => this.canAccess(r.vis, r.cls, scope.cls) && r.v !== UNINIT).map(([k, r]) => [k, deref(r.v)]);
      } else {
        this.warn('foreach() argument must be of type array|object, ' + typeName(subject) + ' given', s.line);
        return;
      }
      for (const [k, v] of entries) {
        this.step(s.line);
        this.assignTo(s.valT, copyVal(deref(v)), scope, s.line);
        if (s.keyT) this.assignTo(s.keyT, k, scope, s.line);
        if (this.loopBody(s.body, scope)) break;
      }
    }
    execTry(s, scope) {
      let pending = null;
      try { this.execList(s.body, scope); } catch (e) {
        if (e instanceof ExitSignal || e instanceof FatalSignal) throw e;
        if (e instanceof ThrowSignal) {
          const c = s.catches.find((cc) => cc.types.some((t) => this.instanceOf(e.obj, t)));
          if (c) {
            try { if (c.name) this.varRef(scope, c.name).v = e.obj; this.execList(c.body, scope); } catch (e2) {
              if (e2 instanceof ExitSignal || e2 instanceof FatalSignal) throw e2;
              pending = e2;
            }
          } else pending = e;
        } else pending = e;
      }
      if (s.fin) this.execList(s.fin, scope);
      if (pending) throw pending;
    }
    throwValue(v, line) {
      if (!(v instanceof PObject) || !this.instanceOf(v, 'Throwable')) this.throwError('Error', 'Can only throw objects', line);
      throw new ThrowSignal(v);
    }
    assignTo(target, value, scope, line) {
      if (target.k === 'array') this.destructure(target, value, scope, line);
      else this.lref(target, scope).set(value);
    }
    destructure(target, value, scope, line) {
      let i = 0;
      for (const item of target.items) {
        if (item === null) { i++; continue; }
        if (item.spread) this.throwError('Error', 'Spread operator is not supported in assignments', line);
        const key = item.key ? this.eval(item.key, scope) : i++;
        let v = null;
        if (value instanceof PArray) {
          if (value.has(key)) v = value.get(key);
          else this.warn('Undefined array key ' + this.keyText(normKey(key)), line);
        }
        if (item.v.k === 'array') this.destructure(item.v, v, scope, line);
        else if (item.byRef && value instanceof PArray) {
          let raw = value.raw(key);
          if (!(raw instanceof Ref)) { raw = new Ref(raw === undefined ? null : raw); value.setRaw(key, raw); }
          this.lref(item.v, scope).bind(raw);
        } else this.lref(item.v, scope).set(copyVal(v));
      }
    }

    /* Expressions */
    eval(n, scope) {
      switch (n.k) {
        case 'num': case 'str': return n.v;
        case 'lit': return n.v;
        case 'tpl': {
          let s = '';
          for (const p of n.parts) s += typeof p === 'string' ? p : this.toStr(this.eval(p, scope), n.line);
          return s;
        }
        case 'var': return this.readVar(scope, n.name, n.line);
        case 'varvar': return this.readVar(scope, this.toStr(this.eval(n.e, scope), n.line), n.line);
        case 'array': return this.evalArray(n, scope);
        case 'idx': return this.readIndex(this.eval(n.obj, scope), n.key === null ? undefined : this.eval(n.key, scope), n.key !== null, n.line, false);
        case 'prop': case 'sprop': return this.lref(n, scope).get(false);
        case 'cconst': return this.classConst(this.classRef(n.cls, scope, n.line), n.name, scope, n.line);
        case 'classname': {
          if (n.cls.k === 'name') {
            const l = n.cls.name.toLowerCase();
            if (l === 'self' || l === 'static' || l === 'parent') return this.classRef(n.cls, scope, n.line).name;
            return n.cls.name;
          }
          const v = this.eval(n.cls, scope);
          if (v instanceof PObject) return v.cls.name;
          this.typeError('Cannot use "::class" on value of type ' + typeName(v), n.line);
          return null;
        }
        case 'name': return this.constant(n.name, n.line);
        case 'magic': return this.magic(n, scope);
        case 'call': return this.evalCall(n, scope);
        case 'mcall': return this.evalMethodCall(n, scope);
        case 'scall': return this.evalStaticCall(n, scope);
        case 'new': return this.evalNew(n, scope);
        case 'clone': {
          const o = this.eval(n.e, scope);
          if (!(o instanceof PObject)) this.throwError('Error', '__clone method called on non-object', n.line);
          const c = new PObject(o.cls);
          o.props.forEach((r, k) => c.props.set(k, Object.assign({}, r, { v: copyVal(deref(r.v)) })));
          const m = this.findMethod(o.cls, '__clone');
          if (m) this.callMethod(m, c, [], n.line);
          return c;
        }
        case 'closure': return this.makeClosure(n.fn, scope);
        case 'assign': return this.evalAssign(n, scope);
        case 'assignref': {
          const isPlace = ['var', 'varvar', 'idx', 'prop', 'sprop'].includes(n.src.k);
          if (!isPlace) { const v = copyVal(this.eval(n.src, scope)); this.lref(n.target, scope).set(v); return v; }
          const r = this.lref(n.src, scope).ref();
          this.lref(n.target, scope).bind(r);
          return r.v;
        }
        case 'preinc': case 'postinc': {
          const place = this.lref(n.target, scope);
          const cur = place.get(false);
          const nv = this.incdec(cur, n.op === '++', n.line);
          place.set(nv);
          return n.k === 'preinc' ? nv : cur;
        }
        case 'bin': {
          const a = this.eval(n.a, scope);
          return this.binop(n.op, a, this.eval(n.b, scope), n.line);
        }
        case 'and': return this.truthy(this.eval(n.a, scope)) && this.truthy(this.eval(n.b, scope));
        case 'or': return this.truthy(this.eval(n.a, scope)) || this.truthy(this.eval(n.b, scope));
        case 'xor': return this.truthy(this.eval(n.a, scope)) !== this.truthy(this.eval(n.b, scope));
        case 'not': return !this.truthy(this.eval(n.e, scope));
        case 'unary': {
          const v = this.eval(n.e, scope);
          if (n.op === '~') { const x = this.toNumber(v, n.line); if (!x) this.typeError('Cannot perform bitwise not on ' + typeName(v), n.line); return Number(BigInt.asIntN(64, ~BigInt(Math.trunc(x.n)))); }
          if (n.op === '-') { const x = this.toNumber(v, n.line); if (!x) this.typeError('Unsupported operand types: ' + typeName(v) + ' * int', n.line); return x.f ? mkFloat(-x.n) : (x.n === 0 ? 0 : mkInt(-x.n)); }
          const x = this.toNumber(v, n.line);
          if (!x) this.typeError('Unsupported operand types: ' + typeName(v) + ' * int', n.line);
          return x.f ? mkFloat(x.n) : x.n;
        }
        case 'silence': this.silence++; try { return this.eval(n.e, scope); } finally { this.silence--; }
        case 'cast': return this.cast(n.type, this.eval(n.e, scope), n.line);
        case 'tern': return this.truthy(this.eval(n.c, scope)) ? this.eval(n.a, scope) : this.eval(n.b, scope);
        case 'elvis': { const v = this.eval(n.a, scope); return this.truthy(v) ? v : this.eval(n.b, scope); }
        case 'coalesce': { const v = this.quiet(n.a, scope); return v !== null && v !== undefined ? v : this.eval(n.b, scope); }
        case 'isset': return n.args.every((a) => { const v = this.quiet(a, scope); return v !== null && v !== undefined; });
        case 'empty': { const v = this.quiet(n.e, scope); return !this.truthy(v === undefined ? null : v); }
        case 'exit': {
          if (n.e) { const v = this.eval(n.e, scope); if (typeof v === 'string') this.echo(v); }
          throw new ExitSignal();
        }
        case 'print': this.echo(this.toStr(this.eval(n.e, scope), n.line)); return 1;
        case 'instanceof': {
          const v = this.eval(n.e, scope);
          if (!(v instanceof PObject) && !(v instanceof PClosure)) return false;
          let clsName;
          if (n.cls.k === 'name') {
            const l = n.cls.name.toLowerCase();
            clsName = l === 'self' || l === 'static' || l === 'parent' ? this.classRef(n.cls, scope, n.line).name : n.cls.name;
          } else {
            const c = this.eval(n.cls, scope);
            clsName = c instanceof PObject ? c.cls.name : this.toStr(c);
          }
          return this.instanceOf(v, clsName);
        }
        case 'match': {
          const v = this.eval(n.subject, scope);
          let def = null;
          for (const arm of n.arms) {
            if (!arm.conds) { def = arm; continue; }
            for (const c of arm.conds) if (this.strictEq(v, this.eval(c, scope))) return this.eval(arm.e, scope);
          }
          if (def) return this.eval(def.e, scope);
          this.throwError('UnhandledMatchError', 'Unhandled match case ' + exportScalar(v, this), n.line);
          return null;
        }
        case 'throwx': this.throwValue(this.eval(n.e, scope), n.line); return null;
        case 'include': return this.include(n, scope);
        default: throw new FatalSignal('Cannot evaluate ' + n.k, n.line);
      }
    }
    evalArray(n, scope) {
      if (n.list) this.throwError('Error', 'Cannot use list() outside an assignment', n.line);
      const a = new PArray();
      for (const it of n.items) {
        if (it === null) throw new FatalSignal('Cannot use empty array elements in arrays', n.line);
        if (it.spread) {
          const v = this.eval(it.v, scope);
          if (!(v instanceof PArray)) this.throwError('Error', 'Only arrays and Traversables can be unpacked', n.line);
          v.entries().forEach(([k, x]) => { if (typeof k === 'string') a.set(k, copyVal(x)); else a.push(copyVal(x)); });
          continue;
        }
        if (it.byRef) {
          const r = this.lref(it.v, scope).ref();
          if (it.key) a.setRaw(this.eval(it.key, scope), r); else a.setRaw(a.next, r);
          continue;
        }
        if (it.key) {
          const k = this.eval(it.key, scope);
          if (normKey(k) === undefined) this.typeError('Illegal offset type', n.line);
          a.set(k, copyVal(this.eval(it.v, scope)));
        } else a.push(copyVal(this.eval(it.v, scope)));
      }
      return a;
    }
    evalAssign(n, scope) {
      if (n.op === '=') {
        if (n.target.k === 'array') { const v = this.eval(n.value, scope); this.destructure(n.target, v, scope, n.line); return v; }
        const place = this.lref(n.target, scope);
        const v = copyVal(this.eval(n.value, scope));
        place.set(v);
        return v;
      }
      const place = this.lref(n.target, scope);
      if (n.op === '??=') {
        const cur = place.get(true);
        if (cur !== null && cur !== undefined) return cur;
        const v = copyVal(this.eval(n.value, scope));
        place.set(v);
        return v;
      }
      const cur = place.get(false);
      const rhs = this.eval(n.value, scope);
      const res = this.binop(n.op.slice(0, -1), cur, rhs, n.line);
      place.set(res);
      return res;
    }
    cast(type, v, line) {
      switch (type) {
        case 'int': case 'integer': return this.toInt(v, line);
        case 'float': case 'double': case 'real': return mkFloat(this.toFloat(v));
        case 'string': case 'binary': return this.toStr(v, line);
        case 'bool': case 'boolean': return this.truthy(v);
        case 'array':
          if (v instanceof PArray) return v;
          if (v === null) return new PArray();
          if (v instanceof PObject) { const a = new PArray(); v.props.forEach((r, k) => { if (r.v !== UNINIT) a.set(r.vis === 'public' ? k : (r.vis === 'protected' ? '\0*\0' : '\0' + r.cls.name + '\0') + k, copyVal(deref(r.v))); }); return a; }
          return PArray.list([v]);
        case 'object': {
          if (v instanceof PObject) return v;
          const o = this.instantiateBare(this.getClass('stdClass'), line);
          if (v instanceof PArray) v.entries().forEach(([k, x]) => o.props.set(String(k), { v: copyVal(x), vis: 'public', cls: o.cls }));
          else if (v !== null) o.props.set('scalar', { v, vis: 'public', cls: o.cls });
          return o;
        }
        case 'unset': return null;
      }
      return v;
    }
    magic(n, scope) {
      switch (n.name) {
        case '__line__': return n.line;
        case '__file__': return '/var/www/html' + this.file;
        case '__dir__': return '/var/www/html';
        case '__function__': return scope.fn ? scope.fn.name : '';
        case '__class__': return scope.cls ? scope.cls.name : '';
        case '__method__': return scope.fn ? (scope.cls ? scope.cls.name + '::' : '') + scope.fn.name : '';
        default: return '';
      }
    }
    constant(name, line) {
      if (this.constants.has(name)) return this.constants.get(name);
      if (Object.prototype.hasOwnProperty.call(CONSTS, name)) return CONSTS[name];
      const up = name.toUpperCase();
      if (up === 'PHP_EOL') return '\n';
      this.throwError('Error', 'Undefined constant "' + name + '"', line);
      return null;
    }
    defineConst(name, v, line) {
      if (this.constants.has(name) || Object.prototype.hasOwnProperty.call(CONSTS, name)) { this.warn('Constant ' + name + ' already defined', line); return false; }
      this.constants.set(name, v);
      return true;
    }
    include(n, scope) {
      const name = this.toStr(this.eval(n.e, scope), n.line);
      const key = name.replace(/^(\.\/|\/var\/www\/html\/|\/)/, '');
      const once = /_once$/.test(n.kind);
      const fn = n.kind.replace(/_once$/, '');
      if (once && this.included.has(key)) return true;
      if (!Object.prototype.hasOwnProperty.call(this.files, key)) {
        if (fn === 'require') throw new FatalSignal('Uncaught Error: Failed opening required \'' + name + '\' (include_path=\'.:/usr/share/php\')', n.line);
        this.warn(n.kind + '(' + name + '): Failed to open stream: No such file or directory', n.line);
        this.warn(n.kind + '(): Failed opening \'' + name + '\' for inclusion (include_path=\'.:/usr/share/php\')', n.line);
        return false;
      }
      this.included.add(key);
      const saved = this.file;
      let ast;
      try { ast = parse(this.files[key]); } catch (e) {
        if (e instanceof ParseError) { this.file = '/' + key; throw new FatalSignal('PARSE:' + e.message, e.line); }
        throw e;
      }
      this.file = '/' + key;
      try {
        this.hoist(ast);
        this.execList(ast, scope);
      } catch (e) {
        if (e instanceof ReturnSignal) { this.file = saved; return e.v; }
        if (!(e instanceof FatalSignal)) this.file = saved;
        throw e;
      }
      this.file = saved;
      return 1;
    }

    /* Functions */
    hoist(list) {
      list.forEach((s) => { if (s.k === 'funcdecl') this.declareFunction(s.fn, s.line); });
      list.forEach((s) => { if (s.k === 'classdecl') this.declareClass(s.decl); });
      list.forEach((s) => { if (s.k === 'classdecl') this.getClass(s.decl.name); });
      list.forEach((s) => { s.hoisted = true; });
    }
    declareFunction(fn, line) {
      const l = fn.name.toLowerCase();
      if (this.functions.get(l) === fn) return;
      if (BUILTINS[l]) throw new FatalSignal('Cannot redeclare ' + fn.name + '()', line);
      if (this.functions.has(l)) throw new FatalSignal('Cannot redeclare ' + fn.name + '() (previously declared in ' + this.file + ':' + this.functions.get(l).line + ')', line);
      this.functions.set(l, fn);
    }
    makeClosure(fn, scope) {
      const bound = new Map();
      if (fn.arrow) scope.vars.forEach((r, k) => bound.set(k, { v: r.v }));
      else (fn.uses || []).forEach((u) => {
        if (u.byRef) bound.set(u.name, { ref: this.varRef(scope, u.name) });
        else bound.set(u.name, { v: copyVal(this.readVar(scope, u.name, fn.line)) });
      });
      return new PClosure(fn, bound, fn.isStatic ? null : scope.thisObj, scope.cls);
    }
    // What a callable value points at: a user function/closure/method, or a built-in.
    resolveCallable(v, line, quiet) {
      if (v instanceof PClosure) return { fn: v.decl, closure: v, thisObj: v.thisObj, cls: v.scopeCls, staticCls: v.thisObj ? v.thisObj.cls : v.scopeCls, display: '{closure}' };
      if (typeof v === 'string') {
        if (v.includes('::')) {
          const [c, m] = v.split('::');
          const cls = this.getClass(c, line, quiet);
          if (!cls) return null;
          return this.methodTarget(cls, null, m, line, quiet);
        }
        const l = v.toLowerCase().replace(/^\\/, '');
        if (this.functions.has(l)) { const fn = this.functions.get(l); return { fn, display: fn.name }; }
        if (BUILTINS[l]) return { builtin: l };
        if (quiet) return null;
        this.throwError('Error', 'Call to undefined function ' + v + '()', line);
      }
      if (v instanceof PArray && v.size === 2) {
        const [o, m] = v.values();
        if (o instanceof PObject) return this.methodTarget(o.cls, o, this.toStr(m), line, quiet);
        if (typeof o === 'string') { const cls = this.getClass(o, line, quiet); if (!cls) return null; return this.methodTarget(cls, null, this.toStr(m), line, quiet); }
      }
      if (v instanceof PObject && this.findMethod(v.cls, '__invoke')) return this.methodTarget(v.cls, v, '__invoke', line, quiet);
      if (quiet) return null;
      this.throwError('Error', 'Value not callable', line);
      return null;
    }
    methodTarget(cls, obj, name, line, quiet) {
      const m = this.findMethod(cls, name.toLowerCase());
      if (!m) { if (quiet) return null; this.throwError('Error', 'Call to undefined method ' + cls.name + '::' + name + '()', line); }
      return { fn: m, thisObj: m.static ? null : obj, cls: m.cls, staticCls: obj ? obj.cls : cls, display: m.cls.name + '::' + m.name, method: m };
    }
    // Calls any callable with plain values (used by array_map, usort, call_user_func...).
    callValue(callable, values, line) {
      const t = this.resolveCallable(callable, line);
      if (t.builtin) return this.invokeBuiltin(t.builtin, values.map((v) => ({ v })), line);
      if (t.method && t.method.native) return t.method.native.call(this, t.thisObj, values, line);
      return this.invoke(t.fn, values.map((v) => ({ v })), line, t);
    }
    evalArgs(params, argNodes, scope, line, display) {
      const out = [];
      argNodes.forEach((a) => {
        if (a.firstClass) throw new FatalSignal('First-class callable syntax is not supported in this playground', line);
        if (a.spread) {
          const v = this.eval(a.e, scope);
          if (!(v instanceof PArray)) this.typeError('Only arrays and Traversables can be unpacked', line);
          v.entries().forEach(([k, x]) => out.push(typeof k === 'string' ? { named: k, v: x } : { v: x }));
          return;
        }
        if (a.named) { out.push({ named: a.named, v: this.eval(a.e, scope) }); return; }
        const i = out.length;
        let prm = params ? params[i] : null;
        if (!prm && params && params.length && params[params.length - 1].variadic) prm = params[params.length - 1];
        if (prm && prm.byRef) {
          if (!['var', 'varvar', 'idx', 'prop', 'sprop'].includes(a.e.k)) this.throwError('Error', display + '(): Argument #' + (i + 1) + ' ($' + prm.name + ') could not be passed by reference', line);
          const r = this.lref(a.e, scope).ref();
          out.push({ v: r.v, ref: r });
        } else out.push({ v: this.eval(a.e, scope) });
      });
      return out;
    }
    evalCall(n, scope) {
      if (n.fn.k === 'name') {
        const l = n.fn.name.toLowerCase();
        const fn = this.functions.get(l);
        if (fn) return this.invoke(fn, this.evalArgs(fn.params, n.args, scope, n.line, fn.name), n.line, { display: fn.name });
        if (BUILTINS[l]) return this.callBuiltin(l, n.args, scope, n.line);
        this.throwError('Error', 'Call to undefined function ' + n.fn.name + '()', n.line);
      }
      const f = this.eval(n.fn, scope);
      const t = this.resolveCallable(f, n.line);
      if (t.builtin) return this.callBuiltin(t.builtin, n.args, scope, n.line);
      if (t.method && t.method.native) return t.method.native.call(this, t.thisObj, n.args.map((a) => this.eval(a.e, scope)), n.line);
      return this.invoke(t.fn, this.evalArgs(t.fn.params, n.args, scope, n.line, t.display), n.line, t);
    }
    callBuiltin(name, argNodes, scope, line) {
      const def = BUILTINS[name];
      this.callerScope = scope;
      const refs = def.refs || [];
      const args = [];
      const writeBack = [];
      argNodes.forEach((a, i) => {
        if (a.named) this.throwError('Error', 'Named arguments are not available for built-in functions in this playground', line);
        if (a.spread) { const v = this.eval(a.e, scope); if (v instanceof PArray) v.values().forEach((x) => args.push({ v: x })); return; }
        const pos = args.length;
        if (refs.includes(pos) || (refs.includes('rest') && pos >= (def.restFrom || 0))) {
          if (!['var', 'varvar', 'idx', 'prop', 'sprop'].includes(a.e.k)) this.throwError('Error', name + '(): Argument #' + (pos + 1) + ' could not be passed by reference', line);
          const place = this.lref(a.e, scope);
          const tmp = new Ref(place.get(true));
          args.push({ v: tmp.v, ref: tmp });
          writeBack.push([place, tmp]);
        } else args.push({ v: this.eval(a.e, scope) });
      });
      const r = this.invokeBuiltin(name, args, line);
      writeBack.forEach(([place, tmp]) => place.set(tmp.v));
      return r;
    }
    invokeBuiltin(name, args, line) {
      const def = BUILTINS[name];
      const n = args.length;
      if (n < def.min || n > def.max) {
        const exact = def.min === def.max;
        const want = n < def.min ? def.min : def.max;
        this.throwError('ArgumentCountError', name + '() expects ' + (exact ? 'exactly' : n < def.min ? 'at least' : 'at most') + ' ' + want + ' argument' + (want === 1 ? '' : 's') + ', ' + n + ' given', line);
      }
      this.step(line);
      return def.fn.call(this, args.map((a) => a.v), line, args, name);
    }
    invoke(fn, args, line, ctx) {
      ctx = ctx || {};
      const display = ctx.display || fn.name;
      if (++this.depth > 400) { this.depth = 0; throw new FatalSignal('Maximum function nesting level of \'400\' reached, aborting!', line); }
      this.stack.push({ display: ctx.thisObj ? display.replace(/::(?=[^:]+$)/, '->') : display, line, args: args.map((a) => a.v) });
      const sc = new Scope(fn, ctx.thisObj, ctx.cls, ctx.staticCls);
      try {
        if (ctx.closure) ctx.closure.bound.forEach((b, k) => sc.vars.set(k, b.ref || new Ref(copyVal(b.v))));
        const positional = args.filter((a) => !a.named);
        const named = args.filter((a) => a.named);
        const used = new Set();
        const required = fn.params.filter((p) => !p.def && !p.variadic).length;
        for (let i = 0; i < fn.params.length; i++) {
          const prm = fn.params[i];
          if (prm.variadic) {
            const rest = new PArray();
            positional.slice(i).forEach((a, j) => rest.push(prm.byRef && a.ref ? a.v : this.coerceParam(prm, copyVal(a.v), i + j, display, line)));
            named.forEach((a) => { if (!fn.params.some((pp) => pp.name === a.named)) { used.add(a.named); rest.set(a.named, copyVal(a.v)); } });
            sc.vars.set(prm.name, new Ref(rest));
            break;
          }
          let a = positional[i];
          if (!a) { a = named.find((x) => x.named === prm.name); if (a) used.add(a.named); }
          else if (named.some((x) => x.named === prm.name)) this.throwError('Error', 'Named parameter $' + prm.name + ' overwrites previous argument', line);
          if (a) {
            if (prm.byRef && a.ref) { if (prm.type) a.ref.v = this.coerceParam(prm, a.ref.v, i, display, line); sc.vars.set(prm.name, a.ref); }
            else sc.vars.set(prm.name, new Ref(this.coerceParam(prm, copyVal(a.v), i, display, line)));
          } else if (prm.def) sc.vars.set(prm.name, new Ref(this.eval(prm.def, sc)));
          else {
            const variadic = fn.params.some((pp) => pp.variadic);
            this.throwError('ArgumentCountError', 'Too few arguments to function ' + display + '(), ' + positional.length + ' passed in ' + this.file + ' on line ' + line +
              ' and ' + (required === fn.params.length && !variadic ? 'exactly' : 'at least') + ' ' + required + ' expected', line);
          }
          if (prm.promote && ctx.thisObj) {
            const rec = ctx.thisObj.props.get(prm.name);
            if (rec) rec.v = copyVal(sc.vars.get(prm.name).v);
          }
        }
        named.forEach((a) => { if (!used.has(a.named) && !fn.params.some((pp) => pp.name === a.named)) this.throwError('Error', 'Unknown named parameter $' + a.named, line); });
        sc.args = positional.map((a) => a.v);
        let result = null;
        try {
          if (fn.arrow) result = this.eval(fn.exprBody, sc);
          else this.execList(fn.body, sc);
        } catch (e) {
          if (e instanceof ReturnSignal) result = e.v;
          else throw e;
        }
        if (fn.ret) result = this.coerceReturn(fn, result, display, line);
        return result;
      } finally {
        this.depth--;
        this.stack.pop();
      }
    }
    // Type declarations in coercive mode (or strict mode after declare(strict_types=1)).
    coerceType(type, v) {
      if (v === null && type.nullable) return { ok: true, v };
      const parts = type.parts.map((p) => p.toLowerCase());
      for (const p of parts) {
        if (p === 'mixed') return { ok: true, v };
        if ((p === 'int' && isInt(v)) || (p === 'float' && isFloat(v)) || (p === 'string' && typeof v === 'string') ||
          (p === 'bool' && typeof v === 'boolean') || (p === 'false' && v === false) || (p === 'true' && v === true) ||
          (p === 'array' && v instanceof PArray) || (p === 'iterable' && v instanceof PArray) || (p === 'null' && v === null) ||
          (p === 'object' && (v instanceof PObject || v instanceof PClosure)) || (p === 'callable' && this.resolveCallable(v, 0, true))) return { ok: true, v };
        if (!['int', 'float', 'string', 'bool', 'false', 'true', 'array', 'iterable', 'null', 'object', 'callable', 'void', 'never', 'mixed'].includes(p)) {
          if ((v instanceof PObject || v instanceof PClosure) && (p === 'self' || p === 'static' || this.instanceOf(v, type.parts[parts.indexOf(p)]))) return { ok: true, v };
        }
      }
      if (v === null || v === undefined) return { ok: false };
      if (parts.includes('float') && isInt(v)) return { ok: true, v: mkFloat(v) };
      if (this.strict) return { ok: false };
      const scalar = typeof v === 'boolean' || isNum(v) || typeof v === 'string';
      for (const p of ['int', 'float', 'string', 'bool']) {
        if (!parts.includes(p)) continue;
        if (p === 'int') {
          if (isFloat(v) && Number.isFinite(fv(v))) {
            // In a union such as int|string, a float with a fraction goes to the next type instead.
            if (!Number.isInteger(fv(v)) && (parts.includes('float') || parts.includes('string'))) continue;
            if (!Number.isInteger(fv(v))) { this.deprecated('Implicit conversion from float ' + fmtFloat(fv(v), -1) + ' to int loses precision'); }
            return { ok: true, v: Math.trunc(fv(v)) };
          }
          if (typeof v === 'string') { const n = numericStr(v); if (n !== null) { if (isInt(n)) return { ok: true, v: n }; if (Number.isInteger(fv(n))) return { ok: true, v: fv(n) }; continue; } continue; }
          if (typeof v === 'boolean') return { ok: true, v: v ? 1 : 0 };
        }
        if (p === 'float') {
          if (typeof v === 'string') { const n = numericStr(v); if (n !== null) return { ok: true, v: mkFloat(fv(n)) }; continue; }
          if (typeof v === 'boolean') return { ok: true, v: mkFloat(v ? 1 : 0) };
        }
        if (p === 'string') {
          if (isNum(v) || typeof v === 'boolean') return { ok: true, v: this.toStr(v) };
          if (v instanceof PObject && this.findMethod(v.cls, '__tostring')) return { ok: true, v: this.toStr(v) };
        }
        if (p === 'bool' && scalar) return { ok: true, v: this.truthy(v) };
      }
      return { ok: false };
    }
    coerceParam(prm, v, i, display, line) {
      if (!prm.type) return v;
      if (v === null && prm.def && prm.def.k === 'lit' && prm.def.v === null) return v;
      const r = this.coerceType(prm.type, v);
      if (!r.ok) this.typeError(display + '(): Argument #' + (i + 1) + ' ($' + prm.name + ') must be of type ' + prm.type.text + ', ' + typeName(v) + ' given, called in ' + this.file + ' on line ' + line, line);
      return r.v;
    }
    coerceReturn(fn, v, display, line) {
      const t = fn.ret.text.toLowerCase();
      if (t === 'void') return null;
      if (t === 'static' || t === 'self') return v;
      const r = this.coerceType(fn.ret, v);
      if (!r.ok) this.typeError(display + '(): Return value must be of type ' + fn.ret.text + ', ' + (v === null ? 'none' : typeName(v)) + ' returned', line);
      return r.v;
    }

    /* Classes and objects */
    declareClass(decl) {
      const l = decl.name.toLowerCase();
      const cur = this.classDecls.get(l);
      if (cur === decl) return;
      if (cur || this.classes.has(l)) throw new FatalSignal('Cannot declare class ' + decl.name + ', because the name is already in use', decl.line);
      this.classDecls.set(l, decl);
    }
    getClass(name, line, quiet) {
      const l = String(name).replace(/^\\/, '').toLowerCase();
      const c = this.classes.get(l);
      if (c) return c;
      const decl = this.classDecls.get(l);
      if (!decl) { if (quiet) return null; this.throwError('Error', 'Class "' + name + '" not found', line); }
      return this.link(decl);
    }
    link(decl) {
      const kindWord = decl.kind === 'interface' ? 'Interface' : decl.kind === 'trait' ? 'Trait' : 'Class';
      const cls = { name: decl.name, lname: decl.name.toLowerCase(), decl, parent: null, interfaces: [], abstract: decl.abstract, final: decl.final,
        isInterface: decl.kind === 'interface', isTrait: decl.kind === 'trait', consts: new Map(), statics: new Map(), props: [], methods: new Map() };
      this.classes.set(cls.lname, cls);
      try {
        if (decl.parent) {
          const p = this.getClass(decl.parent, decl.line, true);
          if (!p) throw new FatalSignal('Class "' + decl.parent + '" not found', decl.line);
          if (p.isInterface) throw new FatalSignal('Class ' + decl.name + ' cannot extend interface ' + p.name, decl.line);
          if (p.final) throw new FatalSignal('Class ' + decl.name + ' cannot extend final class ' + p.name, decl.line);
          cls.parent = p;
        }
        decl.interfaces.forEach((iname) => {
          const i = this.getClass(iname, decl.line, true);
          if (!i) throw new FatalSignal('Interface "' + iname + '" not found', decl.line);
          if (!i.isInterface) throw new FatalSignal(decl.name + ' cannot implement ' + i.name + ' - it is not an interface', decl.line);
          cls.interfaces.push(i);
        });
        const addMembers = (src, owner) => {
          src.consts.forEach((c) => cls.consts.set(c.name, { node: c.e, vis: c.vis, cls: owner, value: undefined }));
          src.props.forEach((p) => {
            if (p.static) cls.statics.set(p.name, { node: p.def, vis: p.vis, cls: owner, ref: null });
            else cls.props.push(Object.assign({}, p, { cls: owner }));
          });
          src.methods.forEach((m) => {
            const mm = Object.assign({}, m, { cls: owner, statics: null });
            cls.methods.set(m.name.toLowerCase(), mm);
            if (m.name.toLowerCase() === '__construct') m.params.forEach((prm) => { if (prm.promote) cls.props.push({ name: prm.name, def: undefined, type: prm.type, vis: prm.promote, readonly: prm.readonly, cls: owner, promoted: true }); });
          });
        };
        decl.traits.forEach((tn) => {
          const t = this.getClass(tn, decl.line, true);
          if (!t || !t.isTrait) throw new FatalSignal('Trait "' + tn + '" not found', decl.line);
          addMembers(t.decl, cls);
        });
        addMembers(decl, cls);
        // Checks PHP makes when the class is declared
        cls.methods.forEach((m, l) => {
          const pm = cls.parent && this.findMethod(cls.parent, l);
          if (!pm) return;
          if (pm.final) throw new FatalSignal('Cannot override final method ' + pm.cls.name + '::' + pm.name + '()', m.line);
          const rank = { public: 0, protected: 1, private: 2 };
          if (pm.vis !== 'private' && rank[m.vis] > rank[pm.vis]) throw new FatalSignal('Access level to ' + cls.name + '::' + m.name + '() must be ' + pm.vis + ' (as in class ' + pm.cls.name + ')' + (pm.vis === 'protected' ? ' or weaker' : ''), m.line);
        });
        if (!cls.abstract && !cls.isInterface && !cls.isTrait) {
          const missing = [];
          const seen = new Set();
          const want = (m, owner) => { const l = m.name.toLowerCase(); if (seen.has(l)) return; seen.add(l); const impl = this.findMethod(cls, l); if (!impl || impl.abstract) missing.push(owner.name + '::' + m.name); };
          for (let c = cls; c; c = c.parent) c.methods.forEach((m) => { if (m.abstract) want(m, c); });
          const ifaces = (c) => { let out = []; for (let k = c; k; k = k.parent) k.interfaces.forEach((i) => { out.push(i); out = out.concat(ifaces(i)); }); return out; };
          ifaces(cls).forEach((i) => i.methods.forEach((m) => want(m, i)));
          if (missing.length) {
            throw new FatalSignal(kindWord + ' ' + cls.name + ' contains ' + missing.length + ' abstract method' + (missing.length > 1 ? 's' : '') +
              ' and must therefore be declared abstract or implement the remaining methods (' + missing.slice(0, 3).join(', ') + (missing.length > 3 ? ', ...' : '') + ')', decl.line);
          }
        }
      } catch (e) {
        this.classes.delete(cls.lname);
        throw e;
      }
      return cls;
    }
    findMethod(cls, l) {
      for (let c = cls; c; c = c.parent) { const m = c.methods.get(l); if (m) return m; }
      return null;
    }
    findStatic(cls, name) {
      for (let c = cls; c; c = c.parent) {
        const rec = c.statics.get(name);
        if (rec) {
          if (!rec.ref) { rec.ref = new Ref(null); if (rec.node) rec.ref.v = this.eval(rec.node, new Scope(null, null, rec.cls)); }
          return rec;
        }
      }
      return null;
    }
    classConst(cls, name, scope, line) {
      const look = (c) => {
        for (let k = c; k; k = k.parent) {
          if (k.consts.has(name)) return k.consts.get(name);
          for (const i of k.interfaces) { const r = look(i); if (r) return r; }
        }
        return null;
      };
      const rec = look(cls);
      if (!rec) { this.throwError('Error', 'Undefined constant ' + cls.name + '::' + name, line); }
      if (!this.canAccess(rec.vis, rec.cls, scope.cls)) this.throwError('Error', 'Cannot access ' + rec.vis + ' constant ' + cls.name + '::' + name, line);
      if (rec.value === undefined) rec.value = this.eval(rec.node, new Scope(null, null, rec.cls));
      return rec.value;
    }
    isSubclass(a, b) { for (let c = a; c; c = c.parent) if (c === b) return true; return false; }
    canAccess(vis, declCls, scopeCls) {
      if (vis === 'public' || !vis) return true;
      if (!scopeCls) return false;
      if (vis === 'private') return scopeCls === declCls;
      return this.isSubclass(scopeCls, declCls) || this.isSubclass(declCls, scopeCls);
    }
    instanceOf(v, name) {
      if (v instanceof PClosure) return String(name).toLowerCase() === 'closure';
      if (!(v instanceof PObject)) return false;
      const l = String(name).replace(/^\\/, '').toLowerCase();
      const check = (c) => {
        for (let k = c; k; k = k.parent) {
          if (k.lname === l) return true;
          if (k.interfaces.some((i) => check(i))) return true;
        }
        return false;
      };
      return check(v.cls);
    }
    classRef(node, scope, line, quiet) {
      if (node.k === 'name') {
        const l = node.name.toLowerCase();
        if (l === 'self') { if (!scope.cls) this.throwError('Error', 'Cannot use "self" when no class scope is active', line); return scope.cls; }
        if (l === 'static') { if (!scope.staticCls) this.throwError('Error', 'Cannot use "static" when no class scope is active', line); return scope.staticCls; }
        if (l === 'parent') {
          if (!scope.cls) this.throwError('Error', 'Cannot use "parent" when no class scope is active', line);
          if (!scope.cls.parent) this.throwError('Error', 'Cannot use "parent" when current class scope has no parent', line);
          return scope.cls.parent;
        }
        return this.getClass(node.name, line, quiet);
      }
      const v = this.eval(node, scope);
      if (v instanceof PObject) return v.cls;
      if (typeof v === 'string') return this.getClass(v, line, quiet);
      if (quiet) return null;
      this.throwError('Error', 'Cannot use value of type ' + typeName(v) + ' as class name', line);
      return null;
    }
    instantiateBare(cls, line) {
      const obj = new PObject(cls);
      const chain = [];
      for (let c = cls; c; c = c.parent) chain.unshift(c);
      chain.forEach((c) => {
        if (c.nativeProps) c.nativeProps.forEach((p) => obj.props.set(p.name, { v: typeof p.v === 'function' ? p.v.call(this, line) : p.v, vis: p.vis, cls: c }));
        c.props.forEach((p) => {
          if (p.cls !== c) return;
          let v = p.def !== undefined ? copyVal(this.eval(p.def, new Scope(null, null, c))) : (p.type ? UNINIT : null);
          obj.props.set(p.name, { v, vis: p.vis, cls: c, readonly: p.readonly, type: p.type });
        });
      });
      if (this.instanceOf(obj, 'Throwable')) obj.trace = this.traceText(this.stack);
      return obj;
    }
    evalNew(n, scope) {
      let cls;
      if (n.cls.k === 'name') cls = this.classRef(n.cls, scope, n.line);
      else {
        const v = this.eval(n.cls, scope);
        cls = v instanceof PObject ? v.cls : this.getClass(this.toStr(v), n.line);
      }
      if (cls.isInterface) this.throwError('Error', 'Cannot instantiate interface ' + cls.name, n.line);
      if (cls.isTrait) this.throwError('Error', 'Cannot instantiate trait ' + cls.name, n.line);
      if (cls.abstract) this.throwError('Error', 'Cannot instantiate abstract class ' + cls.name, n.line);
      const obj = this.instantiateBare(cls, n.line);
      const ctor = this.findMethod(cls, '__construct');
      if (ctor) {
        if (!this.canAccess(ctor.vis, ctor.cls, scope.cls)) this.throwError('Error', 'Call to ' + ctor.vis + ' ' + cls.name + '::__construct() from ' + (scope.cls ? 'scope ' + scope.cls.name : 'global scope'), n.line);
        if (ctor.native) ctor.native.call(this, obj, n.args.map((a) => this.eval(a.e, scope)), n.line);
        else this.invoke(ctor, this.evalArgs(ctor.params, n.args, scope, n.line, cls.name + '::__construct'), n.line, { thisObj: obj, cls: ctor.cls, staticCls: cls, display: ctor.cls.name + '::__construct' });
      }
      return obj;
    }
    checkPropAccess(obj, rec, name, scope, line) {
      if (!this.canAccess(rec.vis, rec.cls, scope.cls)) this.throwError('Error', 'Cannot access ' + rec.vis + ' property ' + obj.cls.name + '::$' + name, line);
    }
    getProp(obj, name, scope, line, quiet) {
      const rec = obj.props.get(name);
      if (rec && (this.canAccess(rec.vis, rec.cls, scope.cls))) {
        if (rec.v === UNINIT) { if (quiet) return null; this.throwError('Error', 'Typed property ' + rec.cls.name + '::$' + name + ' must not be accessed before initialization', line); }
        return deref(rec.v);
      }
      const g = this.findMethod(obj.cls, '__get');
      if (g) return this.callMethod(g, obj, [name], line);
      if (rec) {
        if (rec.vis === 'private' && scope.cls && this.isSubclass(scope.cls, rec.cls) && scope.cls !== rec.cls) { if (!quiet) this.warn('Undefined property: ' + obj.cls.name + '::$' + name, line); return null; }
        this.checkPropAccess(obj, rec, name, scope, line);
      }
      if (!quiet) this.warn('Undefined property: ' + obj.cls.name + '::$' + name, line);
      return null;
    }
    propRecord(obj, name, scope, line) {
      let rec = obj.props.get(name);
      if (rec) { this.checkPropAccess(obj, rec, name, scope, line); return rec; }
      if (obj.cls.lname !== 'stdclass') this.deprecated('Creation of dynamic property ' + obj.cls.name + '::$' + name + ' is deprecated', line);
      rec = { v: null, vis: 'public', cls: obj.cls };
      obj.props.set(name, rec);
      return rec;
    }
    setProp(obj, name, v, scope, line) {
      const rec = obj.props.get(name);
      if (rec) {
        if (!this.canAccess(rec.vis, rec.cls, scope.cls)) {
          const s = this.findMethod(obj.cls, '__set');
          if (s) { this.callMethod(s, obj, [name, v], line); return; }
          this.checkPropAccess(obj, rec, name, scope, line);
        }
        if (rec.readonly && (rec.v !== UNINIT || scope.cls !== rec.cls)) this.throwError('Error', 'Cannot modify readonly property ' + obj.cls.name + '::$' + name, line);
        if (rec.type) {
          const r = this.coerceType(rec.type, v);
          if (!r.ok) this.typeError('Cannot assign ' + typeName(v) + ' to property ' + obj.cls.name + '::$' + name + ' of type ' + rec.type.text, line);
          v = r.v;
        }
        if (rec.v instanceof Ref) rec.v.v = v; else rec.v = v;
        return;
      }
      const s = this.findMethod(obj.cls, '__set');
      if (s) { this.callMethod(s, obj, [name, v], line); return; }
      this.propRecord(obj, name, scope, line).v = v;
    }
    // Calls a method with plain values (no by-reference arguments).
    callMethod(m, obj, values, line) {
      if (m.native) return m.native.call(this, obj, values, line);
      return this.invoke(m, values.map((v) => ({ v })), line, { thisObj: m.static ? null : obj, cls: m.cls, staticCls: obj ? obj.cls : m.cls, display: m.cls.name + '::' + m.name });
    }
    evalMethodCall(n, scope) {
      const obj = this.eval(n.obj, scope);
      if ((obj === null || obj === undefined) && n.nullsafe) return null;
      const name = n.name.k === 'str' ? n.name.v : this.eval(n.name, scope);
      if (obj instanceof PClosure && typeof name === 'string' && /^(__invoke|call)$/i.test(name)) {
        const t = this.resolveCallable(obj, n.line);
        return this.invoke(t.fn, this.evalArgs(t.fn.params, n.args, scope, n.line, '{closure}'), n.line, t);
      }
      if (!(obj instanceof PObject)) this.throwError('Error', 'Call to a member function ' + this.toStr(name) + '() on ' + typeName(obj), n.line);
      if (name instanceof PClosure) return this.invoke(name.decl, this.evalArgs(name.decl.params, n.args, scope, n.line, '{closure}'), n.line, this.resolveCallable(name, n.line));
      const m = this.findMethod(obj.cls, String(name).toLowerCase());
      if (!m) {
        const call = this.findMethod(obj.cls, '__call');
        if (call) return this.callMethod(call, obj, [String(name), PArray.list(n.args.map((a) => this.eval(a.e, scope)))], n.line);
        this.throwError('Error', 'Call to undefined method ' + obj.cls.name + '::' + name + '()', n.line);
      }
      if (!this.canAccess(m.vis, m.cls, scope.cls)) this.throwError('Error', 'Call to ' + m.vis + ' method ' + m.cls.name + '::' + m.name + '() from ' + (scope.cls ? 'scope ' + scope.cls.name : 'global scope'), n.line);
      if (m.abstract) this.throwError('Error', 'Cannot call abstract method ' + m.cls.name + '::' + m.name + '()', n.line);
      if (m.native) return m.native.call(this, obj, n.args.map((a) => this.eval(a.e, scope)), n.line);
      return this.invoke(m, this.evalArgs(m.params, n.args, scope, n.line, m.cls.name + '::' + m.name), n.line,
        { thisObj: m.static ? null : obj, cls: m.cls, staticCls: obj.cls, display: m.cls.name + '::' + m.name });
    }
    evalStaticCall(n, scope) {
      const kw = n.cls.k === 'name' ? n.cls.name.toLowerCase() : '';
      const cls = this.classRef(n.cls, scope, n.line);
      const m = this.findMethod(cls, n.name.toLowerCase());
      if (!m) {
        const cs = this.findMethod(cls, '__callstatic');
        if (cs) return this.callMethod(cs, null, [n.name, PArray.list(n.args.map((a) => this.eval(a.e, scope)))], n.line);
        this.throwError('Error', 'Call to undefined method ' + cls.name + '::' + n.name + '()', n.line);
      }
      if (!this.canAccess(m.vis, m.cls, scope.cls)) this.throwError('Error', 'Call to ' + m.vis + ' method ' + m.cls.name + '::' + m.name + '() from ' + (scope.cls ? 'scope ' + scope.cls.name : 'global scope'), n.line);
      let thisObj = null, staticCls = (kw === 'parent' || kw === 'self') && scope.staticCls ? scope.staticCls : cls;
      if (!m.static) {
        if (scope.thisObj && this.instanceOf(scope.thisObj, cls.name)) { thisObj = scope.thisObj; staticCls = scope.thisObj.cls; }
        else this.throwError('Error', 'Non-static method ' + m.cls.name + '::' + m.name + '() cannot be called statically', n.line);
      }
      if (m.abstract) this.throwError('Error', 'Cannot call abstract method ' + m.cls.name + '::' + m.name + '()', n.line);
      if (m.native) return m.native.call(this, thisObj, n.args.map((a) => this.eval(a.e, scope)), n.line);
      return this.invoke(m, this.evalArgs(m.params, n.args, scope, n.line, m.cls.name + '::' + m.name), n.line,
        { thisObj, cls: m.cls, staticCls, display: m.cls.name + '::' + m.name });
    }

    /* Running a whole script */
    traceText(frames) {
      const arg = (v) => {
        if (v === null || v === undefined) return 'NULL';
        if (typeof v === 'boolean') return v ? 'true' : 'false';
        if (isNum(v)) return this.toStr(v);
        if (typeof v === 'string') return "'" + (v.length > 15 ? v.slice(0, 15) + "...'" : v + "'");
        if (v instanceof PArray) return 'Array';
        return 'Object(' + typeName(v) + ')';
      };
      const lines = frames.slice().reverse().map((f, i) => '#' + i + ' ' + this.file + '(' + f.line + '): ' + f.display + '(' + f.args.map(arg).join(', ') + ')');
      lines.push('#' + lines.length + ' {main}');
      return lines.join('\n');
    }
    uncaught(obj) {
      const p = (k) => { const r = obj.props.get(k); return r ? deref(r.v) : null; };
      const msg = this.toStr(p('message'));
      const line = p('line');
      return { msg: 'Uncaught ' + obj.cls.name + (msg ? ': ' + msg : '') + ' in ' + this.file + ':' + line + '\nStack trace:\n' + (obj.trace || '#0 {main}') + '\n  thrown', line };
    }
    fatal(kind, msg, line) {
      this.silence = 0;
      this.message(kind, msg, line);
    }
    result() {
      while (this.ob.length) { const s = this.ob.pop(); this.echo(s); }
      const headers = this.headers.slice();
      const has = (n) => headers.some((h) => h[0].toLowerCase() === n);
      if (!has('content-type')) headers.unshift(['Content-Type', 'text/html; charset=UTF-8']);
      headers.unshift(['X-Powered-By', 'PHP/' + PHP_VERSION]);
      let status = this.status;
      if (has('location') && status === 200) status = 302;
      return { output: this.out.join(''), status, headers, logs: this.logs };
    }
  }

  const deref = (v) => (v instanceof Ref ? v.v : v);

  // "Az" -> "Ba", "a9" -> "b0", "zz" -> "aaa": PHP's increment for letters and digits.
  function strIncrement(s) {
    const chars = s.split('');
    let i = chars.length - 1;
    for (; i >= 0; i--) {
      const c = chars[i];
      if (c === 'z') { chars[i] = 'a'; continue; }
      if (c === 'Z') { chars[i] = 'A'; continue; }
      if (c === '9') { chars[i] = '0'; continue; }
      if (/[a-yA-Y0-8]/.test(c)) { chars[i] = String.fromCharCode(c.charCodeAt(0) + 1); return chars.join(''); }
      return chars.join('');
    }
    const f = s[0];
    return (/[a-z]/.test(f) ? 'a' : /[A-Z]/.test(f) ? 'A' : '1') + chars.join('');
  }

  function exportScalar(v, I) {
    if (typeof v === 'string') return "'" + v.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
    if (v === null) return 'NULL';
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (isFloat(v)) { const s = fmtFloat(fv(v), -1); return /[.EN]/.test(s) ? s : s + '.0'; }
    if (isNum(v)) return String(v);
    return 'of type ' + typeName(v);
  }

  /* ---------- Built-in classes ---------- */

  function installNativeClasses(I) {
    const mk = (name, parentName, opts) => {
      opts = opts || {};
      const cls = { name, lname: name.toLowerCase(), decl: null, parent: parentName ? I.classes.get(parentName.toLowerCase()) : null,
        interfaces: (opts.interfaces || []).map((n) => I.classes.get(n.toLowerCase())), abstract: false, final: false,
        isInterface: !!opts.isInterface, isTrait: false, consts: new Map(), statics: new Map(), props: [], methods: new Map(), nativeProps: opts.props || null, native: true };
      (opts.methods || []).forEach(([m, fn]) => cls.methods.set(m.toLowerCase(), { name: m, params: [], vis: 'public', static: false, abstract: false, cls, native: fn }));
      I.classes.set(cls.lname, cls);
      return cls;
    };
    ['Traversable', 'Countable', 'ArrayAccess', 'JsonSerializable', 'Stringable', 'Throwable', 'UnitEnum'].forEach((n) => mk(n, null, { isInterface: true }));
    mk('Iterator', null, { isInterface: true, interfaces: ['Traversable'] });
    mk('IteratorAggregate', null, { isInterface: true, interfaces: ['Traversable'] });
    mk('stdClass', null);
    const prop = (obj, k) => { const r = obj.props.get(k); return r ? deref(r.v) : null; };
    const throwableProps = [
      { name: 'message', v: '', vis: 'protected' },
      { name: 'code', v: 0, vis: 'protected' },
      { name: 'file', v: function () { return this.file; }, vis: 'protected' },
      { name: 'line', v: function (line) { return line || this.curLine; }, vis: 'protected' },
      { name: 'previous', v: null, vis: 'private' }
    ];
    const methods = [
      ['__construct', function (obj, a) {
        if (a.length > 0) obj.props.get('message').v = this.toStr(a[0]);
        if (a.length > 1) obj.props.get('code').v = this.toInt(a[1]);
        if (a.length > 2) obj.props.get('previous').v = a[2];
        return null;
      }],
      ['getMessage', (obj) => prop(obj, 'message')],
      ['getCode', (obj) => prop(obj, 'code')],
      ['getPrevious', (obj) => prop(obj, 'previous')],
      ['getFile', (obj) => prop(obj, 'file')],
      ['getLine', (obj) => prop(obj, 'line')],
      ['getTrace', () => new PArray()],
      ['getTraceAsString', (obj) => obj.trace || '#0 {main}'],
      ['__toString', function (obj) {
        const m = this.toStr(prop(obj, 'message'));
        return obj.cls.name + (m ? ': ' + m : '') + ' in ' + prop(obj, 'file') + ':' + prop(obj, 'line') + '\nStack trace:\n' + (obj.trace || '#0 {main}');
      }]
    ];
    mk('Exception', null, { interfaces: ['Throwable', 'Stringable'], props: throwableProps, methods });
    mk('Error', null, { interfaces: ['Throwable', 'Stringable'], props: throwableProps, methods });
    [['ErrorException', 'Exception'], ['LogicException', 'Exception'], ['RuntimeException', 'Exception'], ['JsonException', 'Exception'],
      ['BadFunctionCallException', 'LogicException'], ['BadMethodCallException', 'BadFunctionCallException'], ['DomainException', 'LogicException'],
      ['InvalidArgumentException', 'LogicException'], ['LengthException', 'LogicException'], ['OutOfRangeException', 'LogicException'],
      ['OutOfBoundsException', 'RuntimeException'], ['OverflowException', 'RuntimeException'], ['RangeException', 'RuntimeException'],
      ['UnderflowException', 'RuntimeException'], ['UnexpectedValueException', 'RuntimeException'],
      ['TypeError', 'Error'], ['ValueError', 'Error'], ['ArithmeticError', 'Error'], ['DivisionByZeroError', 'ArithmeticError'],
      ['ArgumentCountError', 'TypeError'], ['UnhandledMatchError', 'Error']].forEach(([n, p]) => mk(n, p));
  }

  /* ---------- Built-in constants ---------- */

  const CONSTS = {
    PHP_VERSION, PHP_MAJOR_VERSION: 8, PHP_MINOR_VERSION: 3, PHP_OS: 'Linux', PHP_OS_FAMILY: 'Linux', PHP_INT_SIZE: 8,
    PHP_INT_MAX: Number.MAX_SAFE_INTEGER, PHP_INT_MIN: Number.MIN_SAFE_INTEGER, PHP_FLOAT_EPSILON: Number.EPSILON, PHP_FLOAT_MAX: Number.MAX_VALUE,
    PHP_FLOAT_MIN: 2.2250738585072014e-308, NAN: NaN, INF: Infinity, M_PI: Math.PI, M_E: Math.E, M_SQRT2: Math.SQRT2,
    E_ERROR: 1, E_WARNING: 2, E_PARSE: 4, E_NOTICE: 8, E_USER_ERROR: 256, E_USER_WARNING: 512, E_USER_NOTICE: 1024, E_DEPRECATED: 8192,
    E_USER_DEPRECATED: 16384, E_ALL: 32767, E_STRICT: 2048,
    SORT_REGULAR: 0, SORT_NUMERIC: 1, SORT_STRING: 2, SORT_NATURAL: 6, SORT_FLAG_CASE: 8, SORT_ASC: 4, SORT_DESC: 3,
    COUNT_NORMAL: 0, COUNT_RECURSIVE: 1, ARRAY_FILTER_USE_BOTH: 1, ARRAY_FILTER_USE_KEY: 2,
    JSON_HEX_TAG: 1, JSON_HEX_AMP: 2, JSON_HEX_APOS: 4, JSON_HEX_QUOT: 8, JSON_FORCE_OBJECT: 16, JSON_NUMERIC_CHECK: 32,
    JSON_UNESCAPED_SLASHES: 64, JSON_PRETTY_PRINT: 128, JSON_UNESCAPED_UNICODE: 256, JSON_PARTIAL_OUTPUT_ON_ERROR: 512,
    JSON_PRESERVE_ZERO_FRACTION: 1024, JSON_THROW_ON_ERROR: 4194304, JSON_OBJECT_AS_ARRAY: 1, JSON_ERROR_NONE: 0, JSON_ERROR_SYNTAX: 4,
    ENT_COMPAT: 2, ENT_QUOTES: 3, ENT_NOQUOTES: 0, ENT_HTML401: 0, ENT_XML1: 16, ENT_XHTML: 32, ENT_HTML5: 48, ENT_SUBSTITUTE: 8, ENT_IGNORE: 4,
    STR_PAD_LEFT: 0, STR_PAD_RIGHT: 1, STR_PAD_BOTH: 2, PHP_ROUND_HALF_UP: 1, PHP_ROUND_HALF_DOWN: 2, PHP_ROUND_HALF_EVEN: 3, PHP_ROUND_HALF_ODD: 4,
    INPUT_POST: 0, INPUT_GET: 1, INPUT_COOKIE: 2, INPUT_ENV: 4, INPUT_SERVER: 5,
    FILTER_VALIDATE_INT: 257, FILTER_VALIDATE_BOOLEAN: 258, FILTER_VALIDATE_BOOL: 258, FILTER_VALIDATE_FLOAT: 259, FILTER_VALIDATE_REGEXP: 272,
    FILTER_VALIDATE_DOMAIN: 277, FILTER_VALIDATE_URL: 273, FILTER_VALIDATE_EMAIL: 274, FILTER_VALIDATE_IP: 275, FILTER_DEFAULT: 516,
    FILTER_UNSAFE_RAW: 516, FILTER_SANITIZE_STRING: 513, FILTER_SANITIZE_ENCODED: 514, FILTER_SANITIZE_SPECIAL_CHARS: 515, FILTER_SANITIZE_EMAIL: 517,
    FILTER_SANITIZE_URL: 518, FILTER_SANITIZE_NUMBER_INT: 519, FILTER_SANITIZE_NUMBER_FLOAT: 520, FILTER_SANITIZE_FULL_SPECIAL_CHARS: 522,
    FILTER_SANITIZE_ADD_SLASHES: 523, FILTER_FLAG_ALLOW_FRACTION: 4096, FILTER_FLAG_ALLOW_THOUSAND: 8192, FILTER_NULL_ON_FAILURE: 134217728,
    FILTER_REQUIRE_ARRAY: 16777216, FILTER_FORCE_ARRAY: 67108864,
    PREG_PATTERN_ORDER: 1, PREG_SET_ORDER: 2, PREG_OFFSET_CAPTURE: 256, PREG_SPLIT_NO_EMPTY: 1, PREG_SPLIT_DELIM_CAPTURE: 2,
    LC_ALL: 6, DATE_ATOM: 'Y-m-d\\TH:i:sP', DATE_RFC2822: 'D, d M Y H:i:s O', DATE_ISO8601: 'Y-m-d\\TH:i:sO', DATE_COOKIE: 'l, d-M-Y H:i:s T',
    DIRECTORY_SEPARATOR: '/', PASSWORD_DEFAULT: '2y', PASSWORD_BCRYPT: '2y', PHP_EOL: '\n'
  };

  /* ---------- Built-in functions ----------
     Each one runs with `this` set to the interpreter and receives plain PHP values.
     refs lists the arguments passed by reference (sort($a) changes $a). */

  const BUILTINS = Object.create(null);
  function def(names, min, max, fn, opts) {
    names.split(' ').forEach((n) => { BUILTINS[n] = Object.assign({ fn, min, max: max < 0 ? Infinity : max }, opts || {}); });
  }

  // Arguments of internal functions are type-checked like PHP's (coercive mode).
  function sArg(I, v, fn, i, name, line) {
    if (typeof v === 'string') return v;
    if (v === null || v === undefined) { I.deprecated(fn + '(): Passing null to parameter #' + i + ' ($' + name + ') of type string is deprecated', line); return ''; }
    if (v instanceof PArray || (v instanceof PObject && !I.findMethod(v.cls, '__tostring')) || v instanceof PClosure) {
      I.typeError(fn + '(): Argument #' + i + ' ($' + name + ') must be of type string, ' + typeName(v) + ' given', line);
    }
    return I.toStr(v, line);
  }
  function aArg(I, v, fn, i, name, line, type) {
    if (!(v instanceof PArray)) I.typeError(fn + '(): Argument #' + i + ' ($' + name + ') must be of type ' + (type || 'array') + ', ' + typeName(v) + ' given', line);
    return v;
  }
  function nArg(I, v, fn, i, name, line) {
    if (isNum(v)) return { n: fv(v), f: isFloat(v) };
    if (typeof v === 'boolean') return { n: v ? 1 : 0, f: false };
    if (v === null || v === undefined) { I.deprecated(fn + '(): Passing null to parameter #' + i + ' ($' + name + ') of type int|float is deprecated', line); return { n: 0, f: false }; }
    if (typeof v === 'string') { const x = numericStr(v); if (x !== null) return { n: fv(x), f: isFloat(x) }; }
    I.typeError(fn + '(): Argument #' + i + ' ($' + name + ') must be of type int|float, ' + typeName(v) + ' given', line);
    return null;
  }
  function iArg(I, v, fn, i, name, line) {
    if (isInt(v)) return v;
    if (isFloat(v) && Number.isFinite(fv(v))) {
      if (!Number.isInteger(fv(v))) I.deprecated('Implicit conversion from float ' + fmtFloat(fv(v), -1) + ' to int loses precision', line);
      return Math.trunc(fv(v));
    }
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (v === null || v === undefined) { I.deprecated(fn + '(): Passing null to parameter #' + i + ' ($' + name + ') of type int is deprecated', line); return 0; }
    if (typeof v === 'string') { const x = numericStr(v); if (x !== null) return iArg(I, x, fn, i, name, line); }
    I.typeError(fn + '(): Argument #' + i + ' ($' + name + ') must be of type int, ' + typeName(v) + ' given', line);
    return 0;
  }
  const opt = (a, i, d) => (a.length > i ? a[i] : d);
  const bool = (I, v) => I.truthy(v);
  const utf8len = (s) => { let n = 0; for (const ch of s) { const c = ch.codePointAt(0); n += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4; } return n; };

  // round() in PHP: half away from zero, after "pre-rounding" away binary noise (1.005 -> 1.01).
  function phpRound(x, p) {
    if (!Number.isFinite(x)) return x;
    p = p || 0;
    const f = Math.pow(10, Math.abs(p));
    let t = p >= 0 ? x * f : x / f;
    t = Number(t.toPrecision(15));
    const r = Math.sign(t) * Math.round(Math.abs(t));
    return p >= 0 ? r / f : r * f;
  }
  function numberFormat(x, dec, dp, ts) {
    const r = phpRound(x, dec);
    let s = Math.abs(r).toFixed(Math.max(0, dec));
    let [ip, fp] = s.split('.');
    ip = ip.replace(/\B(?=(\d{3})+(?!\d))/g, ts);
    s = ip + (dec > 0 ? dp + fp : '');
    return (r < 0 && Number(Math.abs(r).toFixed(Math.max(0, dec))) !== 0 ? '-' : '') + s;
  }

  function sprintfImpl(I, fn, format, args, line) {
    let next = 0;
    return format.replace(/%(?:(\d+)\$)?((?:[-+ 0]|'.)*)(\d+)?(?:\.(\d+))?([bcdeEfFgGosuxX%])/g, (m, argnum, flags, width, prec, conv) => {
      if (conv === '%') return '%';
      let k;
      if (argnum) k = Number(argnum) - 1; else k = next++;
      if (k >= args.length) I.throwError('ArgumentCountError', (k + 2) + ' arguments are required, ' + (args.length + 1) + ' given', line);
      const v = args[k];
      let left = false, plus = false, pad = ' ';
      for (let i = 0; i < flags.length; i++) {
        const c = flags[i];
        if (c === '-') left = true; else if (c === '+') plus = true; else if (c === '0') pad = '0'; else if (c === ' ') pad = ' ';
        else if (c === "'") { pad = flags[i + 1]; i++; }
      }
      const p = prec !== undefined ? Number(prec) : null;
      let s = '', sign = '';
      switch (conv) {
        case 'd': { const n = I.toInt(v); sign = n < 0 ? '-' : plus ? '+' : ''; s = String(Math.abs(n)); break; }
        case 'u': { const n = I.toInt(v); s = n < 0 ? BigInt.asUintN(64, BigInt(n)).toString() : String(n); break; }
        case 'f': case 'F': { const x = I.toFloat(v); sign = x < 0 ? '-' : plus ? '+' : ''; s = Math.abs(phpRound(x, p === null ? 6 : p)).toFixed(p === null ? 6 : p); break; }
        case 'e': case 'E': { const x = I.toFloat(v); sign = x < 0 ? '-' : plus ? '+' : ''; s = Math.abs(x).toExponential(p === null ? 6 : p); if (conv === 'E') s = s.toUpperCase(); break; }
        case 'g': case 'G': { const x = I.toFloat(v); sign = x < 0 ? '-' : plus ? '+' : ''; s = String(Number(Math.abs(x).toPrecision(p === null ? 6 : (p || 1)))); if (conv === 'G') s = s.toUpperCase(); break; }
        case 's': { s = I.toStr(v, line); if (p !== null) s = s.slice(0, p); break; }
        case 'x': case 'X': case 'o': case 'b': {
          const n = BigInt.asUintN(64, BigInt(I.toInt(v)));
          s = n.toString(conv === 'o' ? 8 : conv === 'b' ? 2 : 16);
          if (conv === 'X') s = s.toUpperCase();
          break;
        }
        case 'c': return String.fromCharCode(I.toInt(v) & 255);
      }
      const w = width ? Number(width) : 0;
      const body = sign + s;
      if (body.length >= w) return body;
      if (left) return body + (pad === '0' ? '0' : pad).repeat(w - body.length);
      if (pad === '0' && /[dfFeEgG]/.test(conv)) return sign + '0'.repeat(w - body.length) + s;
      return pad.repeat(w - body.length) + body;
    });
  }

  // print_r, var_dump and var_export, formatted exactly like PHP's.
  function propLabel(k, r, style) {
    if (style === 'print_r') return r.vis === 'public' ? k : r.vis === 'protected' ? k + ':protected' : k + ':' + r.cls.name + ':private';
    return r.vis === 'public' ? '"' + k + '"' : r.vis === 'protected' ? '"' + k + '":protected' : '"' + k + '":"' + r.cls.name + '":private';
  }
  function printR(I, v, indent, seen) {
    if (v instanceof PArray || v instanceof PObject) {
      seen = seen || new Set();
      if (v instanceof PObject && seen.has(v)) return v.cls.name + ' Object\n *RECURSION*';
      const pad = ' '.repeat(indent);
      let s = (v instanceof PArray ? 'Array' : v.cls.name + ' Object') + '\n' + pad + '(\n';
      const items = v instanceof PArray ? v.entries().map(([k, x]) => [k, x])
        : Array.from(v.props.entries()).filter(([, r]) => r.v !== UNINIT).map(([k, r]) => [propLabel(k, r, 'print_r'), deref(r.v)]);
      if (v instanceof PObject) seen.add(v);
      items.forEach(([k, x]) => { s += pad + '    [' + k + '] => ' + printR(I, x, indent + 8, seen) + '\n'; });
      if (v instanceof PObject) seen.delete(v);
      return s + pad + ')\n';
    }
    if (v instanceof PClosure) return 'Closure Object\n' + ' '.repeat(indent) + '(\n' + ' '.repeat(indent) + ')\n';
    return I.toStr(v);
  }
  function varDump(I, v, indent) {
    const pad = ' '.repeat(indent);
    if (v === null || v === undefined) return pad + 'NULL\n';
    if (typeof v === 'boolean') return pad + 'bool(' + v + ')\n';
    if (isInt(v)) return pad + 'int(' + v + ')\n';
    if (isFloat(v)) return pad + 'float(' + fmtFloat(fv(v), -1) + ')\n';
    if (typeof v === 'string') return pad + 'string(' + utf8len(v) + ') "' + v + '"\n';
    if (v instanceof PArray) {
      let s = pad + 'array(' + v.size + ') {\n';
      v.entries().forEach(([k, x]) => { s += pad + '  [' + (typeof k === 'number' ? k : '"' + k + '"') + ']=>\n' + varDump(I, x, indent + 2); });
      return s + pad + '}\n';
    }
    if (v instanceof PClosure) return pad + 'object(Closure)#' + v.id + ' (0) {\n' + pad + '}\n';
    let s = pad + 'object(' + v.cls.name + ')#' + v.id + ' (' + v.props.size + ') {\n';
    v.props.forEach((r, k) => {
      s += pad + '  [' + propLabel(k, r, 'var_dump') + ']=>\n';
      s += r.v === UNINIT ? pad + '  uninitialized(' + (r.type ? r.type.text : 'mixed') + ')\n' : varDump(I, deref(r.v), indent + 2);
    });
    return s + pad + '}\n';
  }
  function varExport(I, v, indent) {
    const pad = ' '.repeat(indent);
    if (v instanceof PArray) {
      let s = 'array (\n';
      v.entries().forEach(([k, x]) => {
        const nested = x instanceof PArray || x instanceof PObject;
        s += pad + '  ' + (typeof k === 'number' ? k : exportScalar(k)) + ' => ' + (nested ? '\n' + pad + '  ' : '') + varExport(I, x, indent + 2) + ',\n';
      });
      return s + pad + ')';
    }
    if (v instanceof PObject) {
      let s = (v.cls.lname === 'stdclass' ? '(object) array(\n' : '\\' + v.cls.name + '::__set_state(array(\n');
      v.props.forEach((r, k) => { s += pad + '   ' + exportScalar(k) + ' => ' + varExport(I, deref(r.v), indent + 2) + ',\n'; });
      return s + pad + (v.cls.lname === 'stdclass' ? ')' : '))');
    }
    return exportScalar(v === undefined ? null : v);
  }

  // JSON the way json_encode writes it: "\/" for slashes and é for accents unless told otherwise.
  function jsonStr(s, flags) {
    let out = '"';
    for (const ch of s) {
      const c = ch.codePointAt(0);
      if (ch === '"') out += '\\"';
      else if (ch === '\\') out += '\\\\';
      else if (ch === '/') out += flags & 64 ? '/' : '\\/';
      else if (ch === '\n') out += '\\n';
      else if (ch === '\r') out += '\\r';
      else if (ch === '\t') out += '\\t';
      else if (ch === '\b') out += '\\b';
      else if (ch === '\f') out += '\\f';
      else if (c < 0x20) out += '\\u' + c.toString(16).padStart(4, '0');
      else if ((flags & 1) && (ch === '<' || ch === '>')) out += ch === '<' ? '\\u003C' : '\\u003E';
      else if (c > 0x7f && !(flags & 256)) { for (let i = 0; i < ch.length; i++) out += '\\u' + ch.charCodeAt(i).toString(16).padStart(4, '0'); }
      else out += ch;
    }
    return out + '"';
  }
  function jsonEncode(I, v, flags, depth) {
    const pretty = flags & 128;
    const ind = (d) => (pretty ? '\n' + '    '.repeat(d) : '');
    const sep = pretty ? ': ' : ':';
    if (depth > 512) { I.jsonError = 1; return null; }
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'boolean') return String(v);
    if (isInt(v)) return String(v);
    if (isFloat(v)) {
      const x = fv(v);
      if (!Number.isFinite(x)) { I.jsonError = 7; return null; }
      let s = fmtFloat(x, -1).replace('E', 'e');
      if (!/[.e]/.test(s)) s += '.0';
      return s;
    }
    if (typeof v === 'string') {
      if ((flags & 32) && numericStr(v) !== null) return jsonEncode(I, numericStr(v), flags, depth);
      return jsonStr(v, flags);
    }
    let pairs, list;
    if (v instanceof PArray) { list = !(flags & 16) && v.isList(); pairs = v.entries(); }
    else if (v instanceof PObject) {
      const js = I.findMethod(v.cls, 'jsonserialize');
      if (js) return jsonEncode(I, I.callMethod(js, v, [], I.curLine), flags, depth + 1);
      list = false;
      pairs = Array.from(v.props.entries()).filter(([, r]) => r.vis === 'public' && r.v !== UNINIT).map(([k, r]) => [k, deref(r.v)]);
    } else return '{}';
    if (!pairs.length) return list ? '[]' : '{}';
    const parts = [];
    for (const [k, x] of pairs) {
      const e = jsonEncode(I, x, flags, depth + 1);
      if (e === null) return null;
      parts.push(list ? e : jsonStr(String(k), flags) + sep + e);
    }
    return (list ? '[' : '{') + parts.map((p) => ind(depth + 1) + p).join(',') + ind(depth) + (list ? ']' : '}');
  }
  function jsonDecode(I, s, assoc) {
    let i = 0;
    const n = s.length;
    const fail = () => { throw new Error('json'); };
    const ws = () => { while (i < n && ' \t\n\r'.includes(s[i])) i++; };
    const value = () => {
      ws();
      const c = s[i];
      if (c === '{') {
        i++;
        const obj = assoc ? new PArray() : I.instantiateBare(I.getClass('stdClass'), I.curLine);
        ws();
        if (s[i] === '}') { i++; return obj; }
        for (;;) {
          ws();
          if (s[i] !== '"') fail();
          const k = str();
          ws();
          if (s[i] !== ':') fail();
          i++;
          const v = value();
          if (assoc) obj.set(k, v); else obj.props.set(k, { v, vis: 'public', cls: obj.cls });
          ws();
          if (s[i] === ',') { i++; continue; }
          if (s[i] === '}') { i++; return obj; }
          fail();
        }
      }
      if (c === '[') {
        i++;
        const a = new PArray();
        ws();
        if (s[i] === ']') { i++; return a; }
        for (;;) {
          a.push(value());
          ws();
          if (s[i] === ',') { i++; continue; }
          if (s[i] === ']') { i++; return a; }
          fail();
        }
      }
      if (c === '"') return str();
      const m = /-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/y;
      m.lastIndex = i;
      const nm = m.exec(s);
      if (nm && nm[0]) { i += nm[0].length; const x = Number(nm[0]); return nm[2] || nm[3] || !Number.isSafeInteger(x) ? mkFloat(x) : x; }
      for (const [w, v] of [['true', true], ['false', false], ['null', null]]) if (s.startsWith(w, i)) { i += w.length; return v; }
      fail();
      return null;
    };
    const str = () => {
      i++;
      let out = '';
      while (i < n && s[i] !== '"') {
        if (s[i] === '\\') {
          const e = s[i + 1];
          if (e === 'u') { out += String.fromCharCode(parseInt(s.slice(i + 2, i + 6), 16)); i += 6; continue; }
          const map = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '/': '/', '\\': '\\', '"': '"' };
          if (!(e in map)) fail();
          out += map[e]; i += 2; continue;
        }
        if (s.charCodeAt(i) < 0x20) fail();
        out += s[i++];
      }
      if (i >= n) fail();
      i++;
      return out;
    };
    const v = value();
    ws();
    if (i < n) fail();
    return v;
  }

  // PHP regular expressions (PCRE) turned into JavaScript ones: /pattern/flags or #pattern#i.
  function pcre(I, fn, pattern, line, extraFlags) {
    pattern = String(pattern);
    const d = pattern[0];
    if (!d) { I.warn(fn + '(): Empty regular expression', line); return null; }
    if (/[A-Za-z0-9\\\s]/.test(d)) { I.warn(fn + '(): Delimiter must not be alphanumeric, backslash, or NUL', line); return null; }
    const close = { '(': ')', '{': '}', '[': ']', '<': '>' }[d] || d;
    const end = pattern.lastIndexOf(close);
    if (end <= 0) { I.warn(fn + '(): No ending delimiter \'' + close + '\' found', line); return null; }
    let body = pattern.slice(1, end);
    const mods = pattern.slice(end + 1);
    let flags = 'u' + (extraFlags || '');
    for (const c of mods) {
      if (c === 'i' || c === 'm' || c === 's') { if (!flags.includes(c)) flags += c; }
      else if (c === 'x') body = body.replace(/\\#/g, '\u0000').replace(/#[^\n]*/g, '').replace(/\s+/g, '').replace(/\u0000/g, '\\#');
      else if (c === 'u' || c === 'D' || c === 'U' || c === 'A' || c === 'S' || c === 'X' || c === 'J' || c === '\n' || c === '\r') { /* close enough */ }
      else { I.warn(fn + '(): Unknown modifier \'' + c + '\'', line); return null; }
    }
    body = body.replace(/\(\?P</g, '(?<').replace(/\(\?P=(\w+)\)/g, '\\k<$1>').replace(/\\A/g, '^').replace(/\\[zZ]/g, '$').replace(/\\h/g, '[ \\t]');
    if (close !== '/' && d !== '/') body = body.replace(/(^|[^\\])\//g, '$1\\/');
    try { return new RegExp(body, flags); } catch (e) {
      try { return new RegExp(body, flags.replace('u', '')); } catch (e2) {
        I.warn(fn + '(): Compilation failed: ' + e.message.replace(/^Invalid regular expression: /, ''), line);
        return null;
      }
    }
  }
  // Group names in the order PHP lists them: [0, 'year', 1, 'month', 2] for named groups.
  function groupNames(re) {
    const names = [];
    const src = re.source;
    let inClass = false, idx = 0;
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      if (c === '\\') { i++; continue; }
      if (inClass) { if (c === ']') inClass = false; continue; }
      if (c === '[') { inClass = true; continue; }
      if (c !== '(') continue;
      if (src[i + 1] !== '?') { names[++idx] = null; continue; }
      const m = /^\?<([A-Za-z_]\w*)>/.exec(src.slice(i + 1));
      if (m) names[++idx] = m[1];
    }
    return names;
  }
  function matchArray(m, offsetCapture, re) {
    const a = new PArray();
    const names = re ? groupNames(re) : [];
    let last = m.length - 1;
    while (last > 0 && m[last] === undefined) last--;
    const put = (k, v) => a.set(k, offsetCapture ? PArray.list([v === undefined ? '' : v, -1]) : (v === undefined ? '' : v));
    for (let k = 0; k <= last; k++) {
      if (names[k]) put(names[k], m[k]);
      put(k, m[k]);
    }
    if (offsetCapture) a.get(0).set(1, m.index);
    return a;
  }
  function replacementFn(rep) {
    return (...args) => {
      const groups = typeof args[args.length - 1] === 'object' ? args.pop() : null;
      args.pop(); args.pop();
      return rep.replace(/\\\\|\$\{(\d+)\}|\$(\d{1,2})|\\(\d{1,2})/g, (m, a, b, c) => {
        if (m === '\\\\') return '\\';
        const k = Number(a || b || c);
        return args[k] === undefined ? '' : args[k];
      });
    };
  }

  // date() format characters. Times use the time zone set with date_default_timezone_set (UTC by default).
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function tzParts(ms, tz) {
    if (tz === 'UTC') {
      const d = new Date(ms);
      return { Y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), H: d.getUTCHours(), i: d.getUTCMinutes(), s: d.getUTCSeconds(), w: d.getUTCDay(), off: 0, abbr: 'UTC' };
    }
    const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', weekday: 'short', timeZoneName: 'short' });
    const p = {};
    f.formatToParts(new Date(ms)).forEach((x) => { p[x.type] = x.value; });
    const Y = +p.year, m = +p.month, d = +p.day, H = +p.hour % 24, i = +p.minute, s = +p.second;
    const off = Math.round((Date.UTC(Y, m - 1, d, H, i, s) - Math.floor(ms / 1000) * 1000) / 60000);
    return { Y, m, d, H, i, s, w: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday), off, abbr: p.timeZoneName };
  }
  function phpDate(fmt, ts, tz) {
    const P = tzParts(ts * 1000, tz);
    const pad = (x, n) => String(x).padStart(n || 2, '0');
    const leap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    const dim = [31, leap(P.Y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const doy = dim.slice(0, P.m - 1).reduce((a, b) => a + b, 0) + P.d - 1;
    const offStr = (colon) => { const o = Math.abs(P.off); return (P.off < 0 ? '-' : '+') + pad(Math.floor(o / 60)) + (colon ? ':' : '') + pad(o % 60); };
    const iso = () => {
      const dt = new Date(Date.UTC(P.Y, P.m - 1, P.d));
      const day = (P.w + 6) % 7;
      dt.setUTCDate(dt.getUTCDate() - day + 3);
      const y = dt.getUTCFullYear();
      const jan4 = new Date(Date.UTC(y, 0, 4));
      return { y, w: 1 + Math.round(((dt - jan4) / 86400000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7) };
    };
    let out = '';
    for (let k = 0; k < fmt.length; k++) {
      const c = fmt[k];
      switch (c) {
        case 'd': out += pad(P.d); break;
        case 'D': out += DAYS[P.w].slice(0, 3); break;
        case 'j': out += P.d; break;
        case 'l': out += DAYS[P.w]; break;
        case 'N': out += P.w === 0 ? 7 : P.w; break;
        case 'S': out += P.d % 10 === 1 && P.d !== 11 ? 'st' : P.d % 10 === 2 && P.d !== 12 ? 'nd' : P.d % 10 === 3 && P.d !== 13 ? 'rd' : 'th'; break;
        case 'w': out += P.w; break;
        case 'z': out += doy; break;
        case 'W': out += pad(iso().w); break;
        case 'F': out += MONTHS[P.m - 1]; break;
        case 'm': out += pad(P.m); break;
        case 'M': out += MONTHS[P.m - 1].slice(0, 3); break;
        case 'n': out += P.m; break;
        case 't': out += dim[P.m - 1]; break;
        case 'L': out += leap(P.Y) ? 1 : 0; break;
        case 'o': out += iso().y; break;
        case 'Y': out += P.Y; break;
        case 'y': out += pad(P.Y % 100); break;
        case 'a': out += P.H < 12 ? 'am' : 'pm'; break;
        case 'A': out += P.H < 12 ? 'AM' : 'PM'; break;
        case 'g': out += P.H % 12 || 12; break;
        case 'G': out += P.H; break;
        case 'h': out += pad(P.H % 12 || 12); break;
        case 'H': out += pad(P.H); break;
        case 'i': out += pad(P.i); break;
        case 's': out += pad(P.s); break;
        case 'u': out += '000000'; break;
        case 'v': out += '000'; break;
        case 'e': out += tz; break;
        case 'I': out += '0'; break;
        case 'O': out += offStr(false); break;
        case 'P': out += offStr(true); break;
        case 'p': out += P.off === 0 ? 'Z' : offStr(true); break;
        case 'T': out += P.abbr; break;
        case 'Z': out += P.off * 60; break;
        case 'c': out += phpDate('Y-m-d\\TH:i:sP', ts, tz); break;
        case 'r': out += phpDate('D, d M Y H:i:s O', ts, tz); break;
        case 'U': out += ts; break;
        case '\\': k++; if (k < fmt.length) out += fmt[k]; break;
        default: out += c;
      }
    }
    return out;
  }
  function localToTs(I, Y, m, d, H, i, s) {
    let t = Date.UTC(Y, m - 1, d, H, i, s) / 1000;
    const off1 = tzParts(t * 1000, I.tz).off;
    t -= off1 * 60;
    const off2 = tzParts(t * 1000, I.tz).off;
    if (off2 !== off1) t += (off1 - off2) * 60;
    return Math.floor(t);
  }
  function strtotime(I, str, base) {
    str = String(str).trim().toLowerCase();
    if (!str) return false;
    const P = tzParts(base * 1000, I.tz);
    let Y = P.Y, m = P.m, d = P.d, H = P.H, i = P.i, s = P.s;
    let rest = str, m2;
    if ((m2 = /^@(-?\d+)$/.exec(rest))) return Number(m2[1]);
    const monthIdx = (w) => MONTHS.findIndex((x) => x.toLowerCase().startsWith(w.slice(0, 3))) + 1;
    if ((m2 = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[t ](\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(rest))) {
      Y = +m2[1]; m = +m2[2]; d = +m2[3]; H = m2[4] ? +m2[4] : 0; i = m2[5] ? +m2[5] : 0; s = m2[6] ? +m2[6] : 0;
      rest = rest.slice(m2[0].length).trim();
    } else if ((m2 = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(rest))) {
      m = +m2[1]; d = +m2[2]; Y = +m2[3]; H = i = s = 0; rest = rest.slice(m2[0].length).trim();
    } else if ((m2 = /^([a-z]{3,9})\.? (\d{1,2})(?:st|nd|rd|th)?,? (\d{4})/.exec(rest)) && monthIdx(m2[1])) {
      m = monthIdx(m2[1]); d = +m2[2]; Y = +m2[3]; H = i = s = 0; rest = rest.slice(m2[0].length).trim();
    } else if ((m2 = /^(\d{1,2}) ([a-z]{3,9})\.? (\d{4})/.exec(rest)) && monthIdx(m2[2])) {
      d = +m2[1]; m = monthIdx(m2[2]); Y = +m2[3]; H = i = s = 0; rest = rest.slice(m2[0].length).trim();
    }
    const words = { now: () => {}, today: () => { H = i = s = 0; }, midnight: () => { H = i = s = 0; }, noon: () => { H = 12; i = s = 0; },
      tomorrow: () => { d += 1; H = i = s = 0; }, yesterday: () => { d -= 1; H = i = s = 0; } };
    let guard = 0;
    while (rest && guard++ < 20) {
      if ((m2 = /^(now|today|midnight|noon|tomorrow|yesterday)\b\s*/.exec(rest))) { words[m2[1]](); rest = rest.slice(m2[0].length); continue; }
      if ((m2 = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?\s*/.exec(rest))) {
        H = +m2[1]; i = +m2[2]; s = m2[3] ? +m2[3] : 0;
        if (m2[4] === 'pm' && H < 12) H += 12;
        if (m2[4] === 'am' && H === 12) H = 0;
        rest = rest.slice(m2[0].length); continue;
      }
      if ((m2 = /^([+-]?\s*\d+|next|last|a|an)\s*(sec|second|min|minute|hour|day|week|fortnight|month|year)s?\b\s*(ago)?\s*/.exec(rest))) {
        let k = m2[1] === 'next' || m2[1] === 'a' || m2[1] === 'an' ? 1 : m2[1] === 'last' ? -1 : Number(m2[1].replace(/\s/g, ''));
        if (m2[3]) k = -k;
        const u = m2[2];
        if (u.startsWith('sec')) s += k; else if (u.startsWith('min')) i += k; else if (u === 'hour') H += k;
        else if (u === 'day') d += k; else if (u === 'week') d += 7 * k; else if (u === 'fortnight') d += 14 * k;
        else if (u === 'month') m += k; else if (u === 'year') Y += k;
        rest = rest.slice(m2[0].length); continue;
      }
      if ((m2 = /^(next|last|this)?\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s*/.exec(rest))) {
        const want = DAYS.findIndex((x) => x.toLowerCase() === m2[2]);
        const cur = new Date(Date.UTC(Y, m - 1, d)).getUTCDay();
        let diff = (want - cur + 7) % 7;
        if (m2[1] === 'next' && diff === 0) diff = 7;
        if (m2[1] === 'last') diff = diff === 0 ? -7 : diff - 7;
        d += diff; H = i = s = 0;
        rest = rest.slice(m2[0].length); continue;
      }
      return false;
    }
    const norm = new Date(Date.UTC(Y, m - 1, d, H, i, s));
    return localToTs(I, norm.getUTCFullYear(), norm.getUTCMonth() + 1, norm.getUTCDate(), norm.getUTCHours(), norm.getUTCMinutes(), norm.getUTCSeconds());
  }

  function htmlspecialchars(s, flags, double) {
    if (flags === undefined) flags = 3 | 8;
    const quotes = flags & 3;
    let r = s;
    r = double === false ? r.replace(/&(?!(?:[A-Za-z][A-Za-z0-9]*|#\d+|#x[0-9A-Fa-f]+);)/g, '&amp;') : r.replace(/&/g, '&amp;');
    r = r.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (quotes & 2) r = r.replace(/"/g, '&quot;');
    if ((quotes & 3) === 3) r = r.replace(/'/g, (flags & 48) ? '&apos;' : '&#039;');
    return r;
  }
  const ENTITY_DECODE = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', copy: '©', reg: '®', eacute: 'é', hellip: '…', mdash: '—', ndash: '–' };
  function htmlDecode(s) {
    return s.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e) => {
      if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
      return Object.prototype.hasOwnProperty.call(ENTITY_DECODE, e) ? ENTITY_DECODE[e] : m;
    });
  }
  const trimChars = (chars) => {
    const set = chars.replace(/(.)\.\.(.)/g, (m, a, b) => { let o = ''; for (let c = a.charCodeAt(0); c <= b.charCodeAt(0); c++) o += String.fromCharCode(c); return o; });
    return (s, left, right) => {
      let a = 0, b = s.length;
      if (left) while (a < b && set.includes(s[a])) a++;
      if (right) while (b > a && set.includes(s[b - 1])) b--;
      return s.slice(a, b);
    };
  };
  const WS = ' \n\r\t\v\0';
  function urlencode(s, raw) {
    return Array.from(new TextEncoder().encode(s), (b) => {
      const c = String.fromCharCode(b);
      if (/[A-Za-z0-9_.-]/.test(c) || (raw && c === '~')) return c;
      if (c === ' ' && !raw) return '+';
      return '%' + b.toString(16).toUpperCase().padStart(2, '0');
    }).join('');
  }
  function natCmp(a, b, ci) {
    if (ci) { a = a.toLowerCase(); b = b.toLowerCase(); }
    const re = /(\d+|\D+)/g;
    const A = a.match(re) || [], B = b.match(re) || [];
    for (let i = 0; i < Math.min(A.length, B.length); i++) {
      const x = A[i], y = B[i];
      if (/^\d/.test(x) && /^\d/.test(y)) { const d = Number(x) - Number(y); if (d) return d < 0 ? -1 : 1; }
      else if (x !== y) return x < y ? -1 : 1;
    }
    return A.length === B.length ? 0 : A.length < B.length ? -1 : 1;
  }
  // Sorting comparators for sort(), asort(), ksort() and their flags.
  function sorter(I, flags) {
    const f = I.toInt(flags || 0);
    const base = f & ~8;
    if (base === 2) return (a, b) => { let x = I.toStr(a), y = I.toStr(b); if (f & 8) { x = x.toLowerCase(); y = y.toLowerCase(); } return x < y ? -1 : x > y ? 1 : 0; };
    if (base === 1) return (a, b) => { const d = I.toFloat(a) - I.toFloat(b); return d < 0 ? -1 : d > 0 ? 1 : 0; };
    if (base === 6) return (a, b) => natCmp(I.toStr(a), I.toStr(b), !!(f & 8));
    return (a, b) => I.cmp(a, b);
  }
  function userCmp(I, cb, line, name) {
    let warned = false;
    return (a, b) => {
      const r = I.callValue(cb, [a, b], line);
      if (typeof r === 'boolean') {
        if (!warned) { warned = true; I.deprecated(name + '(): Returning bool from comparison function is deprecated, return an integer less than, equal to, or greater than zero', line); }
        return r ? 1 : 0;
      }
      const x = I.toFloat(r);
      return x < 0 ? -1 : x > 0 ? 1 : 0;
    };
  }
  function filterVar(I, v, filter, options, line) {
    let flags = 0, opts = null;
    if (options instanceof PArray) {
      if (options.has('flags')) flags = I.toInt(options.get('flags'));
      if (options.get('options') instanceof PArray) opts = options.get('options');
    } else flags = I.toInt(options || 0);
    const fail = () => (flags & 134217728 ? null : false);
    const optv = (k) => (opts && opts.has(k) ? opts.get(k) : undefined);
    if (v instanceof PArray || v instanceof PObject) return fail();
    const s = v === null ? '' : typeof v === 'boolean' ? (v ? '1' : '') : I.toStr(v);
    switch (filter) {
      case 257: {
        const t = s.trim();
        if (!/^[+-]?(0|[1-9]\d*)$/.test(t)) { const d = optv('default'); return d !== undefined ? d : fail(); }
        const n = Number(t);
        const min = optv('min_range'), max = optv('max_range');
        if ((min !== undefined && n < I.toFloat(min)) || (max !== undefined && n > I.toFloat(max))) { const d = optv('default'); return d !== undefined ? d : fail(); }
        return n;
      }
      case 259: {
        const t = (flags & 8192 ? s.replace(/,/g, '') : s).trim();
        if (!/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(t)) return fail();
        return mkFloat(Number(t));
      }
      case 258: {
        const t = s.trim().toLowerCase();
        if (['1', 'true', 'on', 'yes'].includes(t)) return true;
        if (['0', 'false', 'off', 'no', ''].includes(t)) return false;
        return flags & 134217728 ? null : false;
      }
      case 274: return /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(s) && !/\.\./.test(s) && !/^\.|\.@/.test(s) ? s : fail();
      case 273: return /^[a-z][a-z0-9+.-]*:\/\/[^\s/?#]+[^\s]*$/i.test(s) ? s : fail();
      case 275: return /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(s) || /^[0-9a-f:]+$/i.test(s) && s.includes(':') ? s : fail();
      case 277: return /^[A-Za-z0-9.-]+$/.test(s) ? s : fail();
      case 272: { const re = optv('regexp'); const rx = re ? pcre(I, 'filter_var', I.toStr(re), line) : null; return rx && rx.test(s) ? s : fail(); }
      case 515: return s.replace(/[&<>"'\x00-\x1f]/g, (c) => '&#' + c.charCodeAt(0) + ';');
      case 522: return htmlspecialchars(s, 3);
      case 519: return s.replace(/[^0-9+-]/g, '');
      case 520: return s.replace(flags & 4096 ? /[^0-9+.-]/g : /[^0-9+-]/g, '');
      case 517: return s.replace(/[^A-Za-z0-9.!#$%&'*+/=?^_`{|}~@[\]-]/g, '');
      case 518: return s.replace(/[^A-Za-z0-9$\-_.+!*'(),{}|\\^~[\]`<>#%";/?:@&=]/g, '');
      case 513: I.deprecated('Constant FILTER_SANITIZE_STRING is deprecated', line); return s.replace(/<[^>]*>?/g, '').replace(/['"]/g, (c) => '&#' + c.charCodeAt(0) + ';');
      case 523: return s.replace(/['"\\\0]/g, (c) => '\\' + c);
      default: return s;
    }
  }

  // md5 (RFC 1321), so md5() works; the chapter explains why it must never store passwords.
  function md5(str) {
    const bytes = Array.from(new TextEncoder().encode(str));
    const K = [], S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
    for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0;
    const len = bytes.length;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    const bits = len * 8;
    for (let i = 0; i < 8; i++) bytes.push(i < 4 ? (bits >>> (8 * i)) & 255 : Math.floor(bits / 4294967296) >>> (8 * (i - 4)) & 255);
    let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
    for (let o = 0; o < bytes.length; o += 64) {
      const M = [];
      for (let i = 0; i < 16; i++) M[i] = bytes[o + 4 * i] | (bytes[o + 4 * i + 1] << 8) | (bytes[o + 4 * i + 2] << 16) | (bytes[o + 4 * i + 3] << 24);
      let A = a0, B = b0, C = c0, D = d0;
      for (let i = 0; i < 64; i++) {
        let F, g;
        if (i < 16) { F = (B & C) | (~B & D); g = i; }
        else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
        else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
        else { F = C ^ (B | ~D); g = (7 * i) % 16; }
        F = (F + A + K[i] + M[g]) >>> 0;
        A = D; D = C; C = B;
        const sh = S[(i >> 4) * 4 + (i % 4)];
        B = (B + ((F << sh) | (F >>> (32 - sh)))) >>> 0;
      }
      a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
    }
    return [a0, b0, c0, d0].map((x) => { let h = ''; for (let i = 0; i < 4; i++) h += ((x >>> (8 * i)) & 255).toString(16).padStart(2, '0'); return h; }).join('');
  }

  const SESSIONS = new Map(); // session id -> saved $_SESSION, kept while the page stays open

  /* Output and type information */
  def('var_dump', 1, -1, function (a) { a.forEach((v) => this.echo(varDump(this, v, 0))); return null; });
  def('print_r', 1, 2, function (a) { const s = printR(this, a[0], 0); if (bool(this, opt(a, 1, false))) return s; this.echo(s); return true; });
  def('var_export', 1, 2, function (a) { const s = varExport(this, a[0], 0); if (bool(this, opt(a, 1, false))) return s; this.echo(s); return null; });
  def('printf', 1, -1, function (a, line) { const s = sprintfImpl(this, 'printf', sArg(this, a[0], 'printf', 1, 'format', line), a.slice(1), line); this.echo(s); return utf8len(s); });
  def('sprintf', 1, -1, function (a, line) { return sprintfImpl(this, 'sprintf', sArg(this, a[0], 'sprintf', 1, 'format', line), a.slice(1), line); });
  def('vsprintf', 2, 2, function (a, line) { return sprintfImpl(this, 'vsprintf', sArg(this, a[0], 'vsprintf', 1, 'format', line), aArg(this, a[1], 'vsprintf', 2, 'values', line).values(), line); });
  def('vprintf', 2, 2, function (a, line) { const s = sprintfImpl(this, 'vprintf', this.toStr(a[0]), aArg(this, a[1], 'vprintf', 2, 'values', line).values(), line); this.echo(s); return s.length; });
  def('number_format', 1, 4, function (a, line) {
    const x = nArg(this, a[0], 'number_format', 1, 'num', line).n;
    return numberFormat(x, iArg(this, opt(a, 1, 0), 'number_format', 2, 'decimals', line), a.length > 2 ? this.toStr(a[2]) : '.', a.length > 3 ? this.toStr(a[3]) : ',');
  });
  def('gettype', 1, 1, function (a) { return gettype(a[0]); });
  def('get_debug_type', 1, 1, function (a) { return typeName(a[0]); });
  def('is_int is_integer is_long', 1, 1, function (a) { return isInt(a[0]); });
  def('is_float is_double', 1, 1, function (a) { return isFloat(a[0]); });
  def('is_string', 1, 1, function (a) { return typeof a[0] === 'string'; });
  def('is_bool', 1, 1, function (a) { return typeof a[0] === 'boolean'; });
  def('is_array', 1, 1, function (a) { return a[0] instanceof PArray; });
  def('is_object', 1, 1, function (a) { return a[0] instanceof PObject || a[0] instanceof PClosure; });
  def('is_null', 1, 1, function (a) { return a[0] === null || a[0] === undefined; });
  def('is_numeric', 1, 1, function (a) { return isNum(a[0]) ? !Number.isNaN(fv(a[0])) : typeof a[0] === 'string' && numericStr(a[0]) !== null; });
  def('is_scalar', 1, 1, function (a) { return isNum(a[0]) || typeof a[0] === 'string' || typeof a[0] === 'boolean'; });
  def('is_iterable is_countable', 1, 1, function (a) { return a[0] instanceof PArray; });
  def('is_callable', 1, 3, function (a) { return !!this.resolveCallable(a[0], 0, true); });
  def('intval', 1, 2, function (a) {
    const base = this.toInt(opt(a, 1, 10));
    if (typeof a[0] === 'string' && base !== 10) { const n = parseInt(a[0].trim().replace(/^0[xob]/i, ''), base === 0 ? 10 : base); return Number.isNaN(n) ? 0 : n; }
    return this.toInt(a[0]);
  });
  def('floatval doubleval', 1, 1, function (a) { return mkFloat(this.toFloat(a[0])); });
  def('boolval', 1, 1, function (a) { return this.truthy(a[0]); });
  def('strval', 1, 1, function (a, line) { return this.toStr(a[0], line); });
  def('settype', 2, 2, function (a, line, raw) {
    const t = this.toStr(a[1]).toLowerCase();
    const map = { int: 'int', integer: 'int', float: 'float', double: 'float', string: 'string', bool: 'bool', boolean: 'bool', array: 'array', null: 'unset' };
    if (!map[t]) { this.throwError('ValueError', 'settype(): Argument #2 ($type) must be a valid type', line); }
    raw[0].ref.v = this.cast(map[t], a[0], line);
    return true;
  }, { refs: [0] });

  /* Strings */
  def('strlen', 1, 1, function (a, line) { return utf8len(sArg(this, a[0], 'strlen', 1, 'string', line)); });
  def('mb_strlen', 1, 2, function (a, line) { return Array.from(sArg(this, a[0], 'mb_strlen', 1, 'string', line)).length; });
  def('strtoupper', 1, 1, function (a, line) { return sArg(this, a[0], 'strtoupper', 1, 'string', line).replace(/[a-z]+/g, (m) => m.toUpperCase()); });
  def('strtolower', 1, 1, function (a, line) { return sArg(this, a[0], 'strtolower', 1, 'string', line).replace(/[A-Z]+/g, (m) => m.toLowerCase()); });
  def('mb_strtoupper', 1, 2, function (a, line) { return sArg(this, a[0], 'mb_strtoupper', 1, 'string', line).toUpperCase(); });
  def('mb_strtolower', 1, 2, function (a, line) { return sArg(this, a[0], 'mb_strtolower', 1, 'string', line).toLowerCase(); });
  def('ucfirst', 1, 1, function (a, line) { const s = sArg(this, a[0], 'ucfirst', 1, 'string', line); return s.charAt(0).replace(/[a-z]/, (c) => c.toUpperCase()) + s.slice(1); });
  def('lcfirst', 1, 1, function (a, line) { const s = sArg(this, a[0], 'lcfirst', 1, 'string', line); return s.charAt(0).replace(/[A-Z]/, (c) => c.toLowerCase()) + s.slice(1); });
  def('ucwords', 1, 2, function (a, line) {
    const s = sArg(this, a[0], 'ucwords', 1, 'string', line), delims = a.length > 1 ? this.toStr(a[1]) : ' \t\r\n\f\v';
    let out = '', up = true;
    for (const c of s) { out += up ? c.replace(/[a-z]/, (x) => x.toUpperCase()) : c; up = delims.includes(c); }
    return out;
  });
  def('trim', 1, 2, function (a, line) { return trimChars(a.length > 1 ? this.toStr(a[1]) : WS)(sArg(this, a[0], 'trim', 1, 'string', line), true, true); });
  def('ltrim', 1, 2, function (a, line) { return trimChars(a.length > 1 ? this.toStr(a[1]) : WS)(sArg(this, a[0], 'ltrim', 1, 'string', line), true, false); });
  def('rtrim chop', 1, 2, function (a, line) { return trimChars(a.length > 1 ? this.toStr(a[1]) : WS)(sArg(this, a[0], 'rtrim', 1, 'string', line), false, true); });
  def('str_repeat', 2, 2, function (a, line) {
    const n = iArg(this, a[1], 'str_repeat', 2, 'times', line);
    if (n < 0) this.throwError('ValueError', 'str_repeat(): Argument #2 ($times) must be greater than or equal to 0', line);
    return sArg(this, a[0], 'str_repeat', 1, 'string', line).repeat(n);
  });
  function strReplace(I, search, replace, subject, ci, countRef) {
    let count = 0;
    const one = (s) => {
      const searches = search instanceof PArray ? search.values().map((x) => I.toStr(x)) : [I.toStr(search)];
      const reps = replace instanceof PArray ? replace.values().map((x) => I.toStr(x)) : null;
      searches.forEach((sv, k) => {
        if (sv === '') return;
        const rep = reps ? (k < reps.length ? reps[k] : '') : I.toStr(replace);
        const re = new RegExp(sv.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), ci ? 'gi' : 'g');
        s = s.replace(re, () => { count++; return rep; });
      });
      return s;
    };
    const out = subject instanceof PArray ? PArray.fromPairs(subject.entries().map(([k, v]) => [k, one(I.toStr(v))])) : one(I.toStr(subject));
    if (countRef) countRef.v = count;
    return out;
  }
  def('str_replace', 3, 4, function (a, line, raw) { return strReplace(this, a[0], a[1], a[2], false, raw[3] && raw[3].ref); }, { refs: [3] });
  def('str_ireplace', 3, 4, function (a, line, raw) { return strReplace(this, a[0], a[1], a[2], true, raw[3] && raw[3].ref); }, { refs: [3] });
  def('substr mb_substr', 2, 4, function (a, line, raw, name) {
    const s = sArg(this, a[0], name, 1, 'string', line);
    const chars = name === 'mb_substr' ? Array.from(s) : s.split('');
    let start = iArg(this, a[1], name, 2, 'offset', line);
    const len = a.length > 2 && a[2] !== null ? iArg(this, a[2], name, 3, 'length', line) : null;
    if (start < 0) start = Math.max(0, chars.length + start);
    if (start > chars.length) return '';
    let end = len === null ? chars.length : len < 0 ? chars.length + len : start + len;
    if (end < start) return '';
    return chars.slice(start, end).join('');
  });
  const findPos = (fn, ci, rev) => function (a, line) {
    let h = sArg(this, a[0], fn, 1, 'haystack', line), n = sArg(this, a[1], fn, 2, 'needle', line);
    let off = a.length > 2 ? iArg(this, a[2], fn, 3, 'offset', line) : 0;
    if (Math.abs(off) > h.length) this.throwError('ValueError', fn + '(): Argument #3 ($offset) must be contained in argument #1 ($haystack)', line);
    if (ci) { h = h.toLowerCase(); n = n.toLowerCase(); }
    let r;
    if (rev) r = off >= 0 ? (h.lastIndexOf(n) >= off ? h.lastIndexOf(n) : -1) : h.lastIndexOf(n, h.length + off);
    else r = h.indexOf(n, off < 0 ? h.length + off : off);
    return r < 0 ? false : r;
  };
  def('strpos mb_strpos', 2, 3, findPos('strpos', false, false));
  def('stripos', 2, 3, findPos('stripos', true, false));
  def('strrpos', 2, 3, findPos('strrpos', false, true));
  def('strripos', 2, 3, findPos('strripos', true, true));
  def('str_contains', 2, 2, function (a, line) { return sArg(this, a[0], 'str_contains', 1, 'haystack', line).includes(sArg(this, a[1], 'str_contains', 2, 'needle', line)); });
  def('str_starts_with', 2, 2, function (a, line) { return sArg(this, a[0], 'str_starts_with', 1, 'haystack', line).startsWith(sArg(this, a[1], 'str_starts_with', 2, 'needle', line)); });
  def('str_ends_with', 2, 2, function (a, line) { return sArg(this, a[0], 'str_ends_with', 1, 'haystack', line).endsWith(sArg(this, a[1], 'str_ends_with', 2, 'needle', line)); });
  def('strstr stristr', 2, 3, function (a, line, raw, name) {
    const h = sArg(this, a[0], name, 1, 'haystack', line), n = sArg(this, a[1], name, 2, 'needle', line);
    const i = name === 'stristr' ? h.toLowerCase().indexOf(n.toLowerCase()) : h.indexOf(n);
    if (i < 0) return false;
    return bool(this, opt(a, 2, false)) ? h.slice(0, i) : h.slice(i);
  });
  def('strrchr', 2, 2, function (a) { const h = this.toStr(a[0]); const i = h.lastIndexOf(this.toStr(a[1]).charAt(0)); return i < 0 ? false : h.slice(i); });
  def('substr_count', 2, 2, function (a, line) { const h = this.toStr(a[0]), n = sArg(this, a[1], 'substr_count', 2, 'needle', line); if (!n) this.throwError('ValueError', 'substr_count(): Argument #2 ($needle) cannot be empty', line); return h.split(n).length - 1; });
  def('str_pad', 2, 4, function (a, line) {
    const s = sArg(this, a[0], 'str_pad', 1, 'string', line), len = iArg(this, a[1], 'str_pad', 2, 'length', line);
    const p = a.length > 2 ? this.toStr(a[2]) : ' ', type = a.length > 3 ? this.toInt(a[3]) : 1;
    if (p === '') this.throwError('ValueError', 'str_pad(): Argument #3 ($pad_string) must be a non-empty string', line);
    const total = len - s.length;
    if (total <= 0) return s;
    const mk = (n) => p.repeat(Math.ceil(n / p.length)).slice(0, n);
    if (type === 0) return mk(total) + s;
    if (type === 2) return mk(Math.floor(total / 2)) + s + mk(Math.ceil(total / 2));
    return s + mk(total);
  });
  def('str_split mb_str_split', 1, 2, function (a, line, raw, name) {
    const s = sArg(this, a[0], name, 1, 'string', line), n = a.length > 1 ? iArg(this, a[1], name, 2, 'length', line) : 1;
    if (n < 1) this.throwError('ValueError', name + '(): Argument #2 ($length) must be greater than 0', line);
    const chars = Array.from(s), out = [];
    for (let i = 0; i < chars.length; i += n) out.push(chars.slice(i, i + n).join(''));
    return PArray.list(out.length ? out : (name === 'str_split' ? [''] : []));
  });
  def('strrev', 1, 1, function (a, line) { return sArg(this, a[0], 'strrev', 1, 'string', line).split('').reverse().join(''); });
  def('str_word_count', 1, 2, function (a) {
    const words = this.toStr(a[0]).match(/[A-Za-z'-]+/g) || [];
    const f = this.toInt(opt(a, 1, 0));
    return f === 0 ? words.length : PArray.list(words);
  });
  def('wordwrap', 1, 4, function (a) {
    const s = this.toStr(a[0]), w = this.toInt(opt(a, 1, 75)), br = a.length > 2 ? this.toStr(a[2]) : '\n', cut = bool(this, opt(a, 3, false));
    return s.split('\n').map((para) => {
      const words = para.split(' ');
      const lines = [];
      let cur = '';
      words.forEach((word) => {
        while (cut && word.length > w) { if (cur) { lines.push(cur); cur = ''; } lines.push(word.slice(0, w)); word = word.slice(w); }
        if (!cur) cur = word; else if ((cur + ' ' + word).length <= w) cur += ' ' + word; else { lines.push(cur); cur = word; }
      });
      lines.push(cur);
      return lines.join(br);
    }).join('\n');
  });
  def('nl2br', 1, 2, function (a, line) { return sArg(this, a[0], 'nl2br', 1, 'string', line).replace(/(\r\n|\n\r|\n|\r)/g, '<br />$1'); });
  def('strip_tags', 1, 2, function (a, line) {
    let allowed = a.length > 1 ? a[1] : null;
    if (allowed instanceof PArray) allowed = allowed.values().map((x) => this.toStr(x).toLowerCase());
    else if (allowed) allowed = (this.toStr(allowed).match(/<([a-z0-9]+)>/gi) || []).map((x) => x.slice(1, -1).toLowerCase());
    return sArg(this, a[0], 'strip_tags', 1, 'string', line).replace(/<!--[\s\S]*?-->/g, '').replace(/<\/?([a-z0-9]+)[^>]*>/gi, (m, t) => (allowed && allowed.includes(t.toLowerCase()) ? m : ''));
  });
  def('addslashes', 1, 1, function (a) { return this.toStr(a[0]).replace(/['"\\\0]/g, (c) => '\\' + c); });
  def('stripslashes', 1, 1, function (a) { return this.toStr(a[0]).replace(/\\(.?)/g, '$1'); });
  def('htmlspecialchars htmlentities', 1, 4, function (a, line, raw, name) {
    return htmlspecialchars(sArg(this, a[0], name, 1, 'string', line), a.length > 1 ? this.toInt(a[1]) : 11, a.length > 3 ? bool(this, a[3]) : true);
  });
  def('htmlspecialchars_decode html_entity_decode', 1, 3, function (a) { return htmlDecode(this.toStr(a[0])); });
  def('strcmp strcasecmp strncmp strncasecmp strnatcmp strnatcasecmp', 2, 3, function (a, line, raw, name) {
    let x = this.toStr(a[0]), y = this.toStr(a[1]);
    if (/n(case)?cmp$/.test(name) && !/nat/.test(name)) { const n = this.toInt(a[2]); x = x.slice(0, n); y = y.slice(0, n); }
    if (/case/.test(name)) { x = x.toLowerCase(); y = y.toLowerCase(); }
    if (/nat/.test(name)) return natCmp(x, y, false);
    return x < y ? -1 : x > y ? 1 : 0;
  });
  def('implode join', 1, 2, function (a, line, raw, name) {
    let sep = a[0], arr = a[1];
    if (a.length === 1) { arr = a[0]; sep = ''; }
    if (sep instanceof PArray && typeof arr === 'string') { const t = sep; sep = arr; arr = t; }
    aArg(this, arr, name, a.length === 1 ? 1 : 2, a.length === 1 ? 'array' : 'array', line, '?array');
    return arr.values().map((v) => this.toStr(v, line)).join(this.toStr(sep));
  });
  def('explode', 2, 3, function (a, line) {
    const sep = sArg(this, a[0], 'explode', 1, 'separator', line), s = sArg(this, a[1], 'explode', 2, 'string', line);
    if (sep === '') this.throwError('ValueError', 'explode(): Argument #1 ($separator) cannot be empty', line);
    let parts = s.split(sep);
    if (a.length > 2) {
      const lim = this.toInt(a[2]);
      if (lim > 0 && parts.length > lim) parts = parts.slice(0, lim - 1).concat(parts.slice(lim - 1).join(sep));
      else if (lim < 0) parts = parts.slice(0, lim);
      else if (lim === 0 && parts.length > 1) parts = [parts.join(sep)];
    }
    return PArray.list(parts);
  });
  def('chr', 1, 1, function (a) { return String.fromCharCode(((this.toInt(a[0]) % 256) + 256) % 256); });
  def('ord', 1, 1, function (a) { const s = this.toStr(a[0]); return s ? new TextEncoder().encode(s)[0] : 0; });
  def('lcg_value', 0, 0, function () { return this.rng(); });
  def('strtr', 2, 3, function (a) {
    const s = this.toStr(a[0]);
    if (a.length === 3) { const f = this.toStr(a[1]), t = this.toStr(a[2]); const n = Math.min(f.length, t.length); return s.replace(/[\s\S]/g, (c) => { const i = f.slice(0, n).indexOf(c); return i < 0 ? c : t[i]; }); }
    const map = a[1] instanceof PArray ? a[1].entries().map(([k, v]) => [String(k), this.toStr(v)]).filter(([k]) => k).sort((x, y) => y[0].length - x[0].length) : [];
    let out = '';
    for (let i = 0; i < s.length;) {
      const hit = map.find(([k]) => s.startsWith(k, i));
      if (hit) { out += hit[1]; i += hit[0].length; } else out += s[i++];
    }
    return out;
  });
  def('substr_replace', 3, 4, function (a) {
    const s = this.toStr(a[0]), r = this.toStr(a[1]);
    let st = this.toInt(a[2]);
    if (st < 0) st = Math.max(0, s.length + st);
    const len = a.length > 3 && a[3] !== null ? this.toInt(a[3]) : s.length;
    const end = len < 0 ? Math.max(st, s.length + len) : Math.min(s.length, st + len);
    return s.slice(0, st) + r + s.slice(end);
  });
  def('similar_text', 2, 3, function (a) {
    const sim = (x, y) => {
      if (!x.length || !y.length) return 0;
      let max = 0, px = 0, py = 0;
      for (let i = 0; i < x.length; i++) for (let j = 0; j < y.length; j++) { let k = 0; while (i + k < x.length && j + k < y.length && x[i + k] === y[j + k]) k++; if (k > max) { max = k; px = i; py = j; } }
      return max ? max + sim(x.slice(0, px), y.slice(0, py)) + sim(x.slice(px + max), y.slice(py + max)) : 0;
    };
    return sim(this.toStr(a[0]), this.toStr(a[1]));
  });
  def('levenshtein', 2, 2, function (a) {
    const s = this.toStr(a[0]), t = this.toStr(a[1]);
    const d = Array.from({ length: s.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= t.length; j++) d[0][j] = j;
    for (let i = 1; i <= s.length; i++) for (let j = 1; j <= t.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (s[i - 1] === t[j - 1] ? 0 : 1));
    return d[s.length][t.length];
  });
  def('ctype_digit ctype_alpha ctype_alnum ctype_upper ctype_lower ctype_space ctype_punct ctype_xdigit', 1, 1, function (a, line, raw, name) {
    const s = a[0];
    if (typeof s !== 'string' || s === '') return false;
    const re = { ctype_digit: /^\d+$/, ctype_alpha: /^[A-Za-z]+$/, ctype_alnum: /^[A-Za-z0-9]+$/, ctype_upper: /^[A-Z]+$/, ctype_lower: /^[a-z]+$/,
      ctype_space: /^\s+$/, ctype_punct: /^[!-/:-@[-`{-~]+$/, ctype_xdigit: /^[0-9A-Fa-f]+$/ }[name];
    return re.test(s);
  });
  def('urlencode', 1, 1, function (a) { return urlencode(this.toStr(a[0]), false); });
  def('rawurlencode', 1, 1, function (a) { return urlencode(this.toStr(a[0]), true); });
  def('urldecode rawurldecode', 1, 1, function (a, line, raw, name) { const s = this.toStr(a[0]); try { return decodeURIComponent(name === 'urldecode' ? s.replace(/\+/g, ' ') : s); } catch (e) { return s; } });
  def('http_build_query', 1, 4, function (a) {
    const out = [];
    const walk = (arr, prefix) => arr.entries().forEach(([k, v]) => {
      const name = prefix ? prefix + '[' + k + ']' : String(k);
      if (v instanceof PArray) walk(v, name);
      else if (v !== null) out.push(urlencode(name, false) + '=' + urlencode(typeof v === 'boolean' ? (v ? '1' : '0') : this.toStr(v), false));
    });
    walk(a[0] instanceof PArray ? a[0] : new PArray(), '');
    return out.join('&');
  });
  def('parse_str', 2, 2, function (a, line, raw) { raw[1].ref.v = phpArrayFromPairs(parsePairs(this.toStr(a[0]))); return null; }, { refs: [1] });
  def('parse_url', 1, 2, function (a) {
    const s = this.toStr(a[0]);
    const m = /^(?:([a-z][a-z0-9+.-]*):)?(?:\/\/(?:([^:@/]*)(?::([^@/]*))?@)?([^:/?#]*)(?::(\d+))?)?([^?#]*)(?:\?([^#]*))?(?:#(.*))?$/i.exec(s);
    if (!m) return false;
    const keys = ['scheme', 'user', 'pass', 'host', 'port', 'path', 'query', 'fragment'];
    const arr = new PArray();
    keys.forEach((k, i) => { const v = m[i + 1]; if (v !== undefined && v !== '') arr.set(k, k === 'port' ? Number(v) : v); });
    if (a.length > 1) { const comp = [ 'scheme', 'host', 'port', 'user', 'pass', 'path', 'query', 'fragment'][this.toInt(a[1])]; return arr.has(comp) ? arr.get(comp) : null; }
    return arr;
  });
  def('base64_encode', 1, 1, function (a) { const b = new TextEncoder().encode(this.toStr(a[0])); let s = ''; b.forEach((x) => { s += String.fromCharCode(x); }); return btoaSafe(s); });
  def('base64_decode', 1, 2, function (a) { try { const s = atobSafe(this.toStr(a[0])); return new TextDecoder().decode(Uint8Array.from(s, (c) => c.charCodeAt(0))); } catch (e) { return false; } });
  def('bin2hex', 1, 1, function (a) { return Array.from(new TextEncoder().encode(this.toStr(a[0])), (b) => b.toString(16).padStart(2, '0')).join(''); });
  def('md5', 1, 2, function (a) { return md5(this.toStr(a[0])); });
  def('uniqid', 0, 2, function (a) { const t = this.now; return this.toStr(opt(a, 0, '')) + Math.floor(t / 1000).toString(16) + Math.floor((t % 1000) * 1000 + this.rng() * 1000).toString(16).padStart(5, '0').slice(0, 5); });
  def('random_bytes', 1, 1, function (a) { let s = ''; for (let i = 0; i < this.toInt(a[0]); i++) s += String.fromCharCode(Math.floor(this.rng() * 256)); return s; });
  def('str_shuffle', 1, 1, function (a) { const c = this.toStr(a[0]).split(''); for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(this.rng() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c.join(''); });
  // password_hash() gives a bcrypt-shaped string with a random salt; password_verify() checks it.
  const pwDigest = (salt, pw) => { let h = md5(salt + pw); for (let i = 0; i < 64; i++) h = md5(h + salt + pw); return h; };
  const B64 = './ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  def('password_hash', 2, 3, function (a) {
    let salt = '';
    for (let i = 0; i < 22; i++) salt += B64[Math.floor(this.rng() * 64)];
    const d = pwDigest(salt, this.toStr(a[0])) + pwDigest(salt + '!', this.toStr(a[0]));
    let tail = '';
    for (let i = 0; i < 31; i++) tail += B64[parseInt(d.slice(i * 2, i * 2 + 2), 16) % 64];
    return '$2y$10$' + salt + tail;
  });
  def('password_verify', 2, 2, function (a) {
    const h = this.toStr(a[1]);
    if (!/^\$2y\$10\$/.test(h) || h.length !== 60) return false;
    const salt = h.slice(7, 29);
    const d = pwDigest(salt, this.toStr(a[0])) + pwDigest(salt + '!', this.toStr(a[0]));
    let tail = '';
    for (let i = 0; i < 31; i++) tail += B64[parseInt(d.slice(i * 2, i * 2 + 2), 16) % 64];
    return h.slice(29) === tail;
  });

  /* Arrays */
  def('count sizeof', 1, 2, function (a, line, raw, name) {
    const v = a[0];
    if (v instanceof PObject && this.findMethod(v.cls, 'count')) return this.toInt(this.callMethod(this.findMethod(v.cls, 'count'), v, [], line));
    aArg(this, v, name, 1, 'value', line, 'Countable|array');
    if (this.toInt(opt(a, 1, 0)) === 1) { let n = 0; const walk = (x) => x.values().forEach((y) => { n++; if (y instanceof PArray) walk(y); }); walk(v); return n; }
    return v.size;
  });
  def('array_push', 1, -1, function (a, line, raw) { const arr = aArg(this, a[0], 'array_push', 1, 'array', line); a.slice(1).forEach((v) => arr.push(copyVal(v))); return arr.size; }, { refs: [0] });
  def('array_pop', 1, 1, function (a, line) {
    const arr = aArg(this, a[0], 'array_pop', 1, 'array', line);
    if (!arr.size) return null;
    const k = arr.keys().pop(), v = arr.get(k);
    arr.delete(k);
    arr.next = 0; arr.keys().forEach((x) => { if (typeof x === 'number' && x >= arr.next) arr.next = x + 1; });
    return v;
  }, { refs: [0] });
  const reindex = (arr, entries) => { arr.m.clear(); arr.next = 0; entries.forEach(([k, v]) => { if (typeof k === 'number') arr.setRaw(arr.next, v); else arr.setRaw(k, v); }); };
  def('array_shift', 1, 1, function (a, line) {
    const arr = aArg(this, a[0], 'array_shift', 1, 'array', line);
    if (!arr.size) return null;
    const raw = Array.from(arr.m.entries());
    const first = raw.shift();
    reindex(arr, raw);
    return deref(first[1]);
  }, { refs: [0] });
  def('array_unshift', 1, -1, function (a, line) {
    const arr = aArg(this, a[0], 'array_unshift', 1, 'array', line);
    const raw = a.slice(1).map((v) => [0, copyVal(v)]).concat(Array.from(arr.m.entries()));
    reindex(arr, raw);
    return arr.size;
  }, { refs: [0] });
  def('array_keys', 1, 3, function (a, line) {
    const arr = aArg(this, a[0], 'array_keys', 1, 'array', line);
    if (a.length > 1) { const strict = bool(this, opt(a, 2, false)); return PArray.list(arr.entries().filter(([, v]) => (strict ? this.strictEq(v, a[1]) : this.looseEq(v, a[1]))).map(([k]) => k)); }
    return PArray.list(arr.keys());
  });
  def('array_values', 1, 1, function (a, line) { return PArray.list(aArg(this, a[0], 'array_values', 1, 'array', line).values().map(copyVal)); });
  def('array_merge', 0, -1, function (a, line) {
    const out = new PArray();
    a.forEach((arr, i) => aArg(this, arr, 'array_merge', i + 1, 'arrays', line).entries().forEach(([k, v]) => { if (typeof k === 'number') out.push(copyVal(v)); else out.set(k, copyVal(v)); }));
    return out;
  });
  def('array_merge_recursive', 0, -1, function (a) {
    const merge = (dst, src) => src.entries().forEach(([k, v]) => {
      if (typeof k === 'number') dst.push(copyVal(v));
      else if (dst.has(k)) { const cur = dst.get(k); const na = cur instanceof PArray ? cur : PArray.list([cur]); if (v instanceof PArray) merge(na, v); else na.push(v); dst.set(k, na); }
      else dst.set(k, copyVal(v));
    });
    const out = new PArray();
    a.forEach((arr) => merge(out, arr));
    return out;
  });
  def('array_combine', 2, 2, function (a, line) {
    const k = aArg(this, a[0], 'array_combine', 1, 'keys', line).values(), v = aArg(this, a[1], 'array_combine', 2, 'values', line).values();
    if (k.length !== v.length) this.throwError('ValueError', 'array_combine(): Argument #1 ($keys) and argument #2 ($values) must have the same number of elements', line);
    return PArray.fromPairs(k.map((x, i) => [this.toStr(x), copyVal(v[i])]));
  });
  def('array_flip', 1, 1, function (a, line) { return PArray.fromPairs(aArg(this, a[0], 'array_flip', 1, 'array', line).entries().map(([k, v]) => [v, k])); });
  def('array_slice', 2, 4, function (a, line) {
    const arr = aArg(this, a[0], 'array_slice', 1, 'array', line), e = arr.entries();
    let off = this.toInt(a[1]);
    if (off < 0) off = Math.max(0, e.length + off);
    const len = a.length > 2 && a[2] !== null ? this.toInt(a[2]) : e.length;
    const end = len < 0 ? e.length + len : off + len;
    const keep = bool(this, opt(a, 3, false));
    const out = new PArray();
    e.slice(off, end).forEach(([k, v]) => { if (typeof k === 'number' && !keep) out.push(copyVal(v)); else out.set(k, copyVal(v)); });
    return out;
  });
  def('array_splice', 2, 4, function (a, line) {
    const arr = aArg(this, a[0], 'array_splice', 1, 'array', line), e = Array.from(arr.m.entries());
    let off = this.toInt(a[1]);
    if (off < 0) off = Math.max(0, e.length + off);
    off = Math.min(off, e.length);
    const len = a.length > 2 && a[2] !== null ? this.toInt(a[2]) : e.length;
    const end = len < 0 ? Math.max(off, e.length + len) : Math.min(e.length, off + len);
    const rep = a.length > 3 ? (a[3] instanceof PArray ? a[3].values() : [a[3]]) : [];
    const removed = e.slice(off, end);
    reindex(arr, e.slice(0, off).concat(rep.map((v) => [0, copyVal(v)]), e.slice(end)));
    return PArray.list(removed.map(([, v]) => deref(v)));
  }, { refs: [0] });
  def('array_map', 2, -1, function (a, line) {
    const cb = a[0];
    const arrs = a.slice(1).map((x, i) => aArg(this, x, 'array_map', i + 2, i ? 'arrays' : 'array', line));
    if (arrs.length === 1) {
      const out = new PArray();
      const list = arrs[0].isList();
      arrs[0].entries().forEach(([k, v]) => { const r = cb === null ? v : this.callValue(cb, [v], line); if (list) out.push(r); else out.set(k, r); });
      return out;
    }
    const vals = arrs.map((x) => x.values());
    const n = Math.max(...vals.map((x) => x.length));
    const out = new PArray();
    for (let i = 0; i < n; i++) { const args = vals.map((x) => (i < x.length ? x[i] : null)); out.push(cb === null ? PArray.list(args) : this.callValue(cb, args, line)); }
    return out;
  });
  def('array_filter', 1, 3, function (a, line) {
    const arr = aArg(this, a[0], 'array_filter', 1, 'array', line), cb = opt(a, 1, null), mode = this.toInt(opt(a, 2, 0));
    const out = new PArray();
    arr.entries().forEach(([k, v]) => {
      const keep = cb === null ? this.truthy(v) : this.truthy(this.callValue(cb, mode === 2 ? [k] : mode === 1 ? [v, k] : [v], line));
      if (keep) out.set(k, copyVal(v));
    });
    return out;
  });
  def('array_reduce', 2, 3, function (a, line) {
    let acc = opt(a, 2, null);
    aArg(this, a[0], 'array_reduce', 1, 'array', line).values().forEach((v) => { acc = this.callValue(a[1], [acc, v], line); });
    return acc;
  });
  def('array_walk', 2, 3, function (a, line, raw) {
    const arr = aArg(this, a[0], 'array_walk', 1, 'array', line);
    const t = this.resolveCallable(a[1], line);
    arr.keys().forEach((k) => {
      let r = arr.raw(k);
      if (!(r instanceof Ref)) { r = new Ref(r); arr.setRaw(k, r); }
      const args = [{ v: r.v, ref: r }, { v: k }];
      if (a.length > 2) args.push({ v: a[2] });
      if (t.builtin) this.invokeBuiltin(t.builtin, args, line); else this.invoke(t.fn, args, line, t);
      arr.setRaw(k, r.v);
    });
    return true;
  }, { refs: [0] });
  def('array_sum', 1, 1, function (a, line) {
    let s = 0, f = false;
    aArg(this, a[0], 'array_sum', 1, 'array', line).values().forEach((v) => { const x = this.toNumber(v, line); if (x) { s += x.n; f = f || x.f; } else this.warn('array_sum(): Addition is not supported on type ' + typeName(v), line); });
    return f ? mkFloat(s) : mkInt(s);
  });
  def('array_product', 1, 1, function (a, line) {
    let s = 1, f = false;
    aArg(this, a[0], 'array_product', 1, 'array', line).values().forEach((v) => { const x = this.toNumber(v, line); if (x) { s *= x.n; f = f || x.f; } });
    return f ? mkFloat(s) : mkInt(s);
  });
  def('array_search', 2, 3, function (a, line) {
    const strict = bool(this, opt(a, 2, false));
    for (const [k, v] of aArg(this, a[1], 'array_search', 2, 'haystack', line).entries()) if (strict ? this.strictEq(v, a[0]) : this.looseEq(v, a[0])) return k;
    return false;
  });
  def('in_array', 2, 3, function (a, line) {
    const strict = bool(this, opt(a, 2, false));
    return aArg(this, a[1], 'in_array', 2, 'haystack', line).values().some((v) => (strict ? this.strictEq(v, a[0]) : this.looseEq(v, a[0])));
  });
  def('array_key_exists key_exists', 2, 2, function (a, line) {
    const arr = a[1];
    if (arr instanceof PObject) return arr.props.has(this.toStr(a[0]));
    return aArg(this, arr, 'array_key_exists', 2, 'array', line).has(a[0] === null ? '' : a[0]);
  });
  def('array_key_first', 1, 1, function (a, line) { const k = aArg(this, a[0], 'array_key_first', 1, 'array', line).keys(); return k.length ? k[0] : null; });
  def('array_key_last', 1, 1, function (a, line) { const k = aArg(this, a[0], 'array_key_last', 1, 'array', line).keys(); return k.length ? k[k.length - 1] : null; });
  def('array_reverse', 1, 2, function (a, line) {
    const keep = bool(this, opt(a, 1, false)), out = new PArray();
    aArg(this, a[0], 'array_reverse', 1, 'array', line).entries().reverse().forEach(([k, v]) => { if (typeof k === 'number' && !keep) out.push(copyVal(v)); else out.set(k, copyVal(v)); });
    return out;
  });
  def('array_unique', 1, 2, function (a, line) {
    const out = new PArray(), seen = [];
    aArg(this, a[0], 'array_unique', 1, 'array', line).entries().forEach(([k, v]) => { const s = this.toStr(v, line); if (!seen.includes(s)) { seen.push(s); out.set(k, copyVal(v)); } });
    return out;
  });
  def('array_count_values', 1, 1, function (a, line) {
    const out = new PArray();
    aArg(this, a[0], 'array_count_values', 1, 'array', line).values().forEach((v) => { if (typeof v === 'string' || isInt(v)) out.set(v, (out.get(v) || 0) + 1); else this.warn('array_count_values(): Can only count string and integer values, entry skipped', line); });
    return out;
  });
  def('array_fill', 3, 3, function (a) { const out = new PArray(); const s = this.toInt(a[0]); for (let i = 0; i < this.toInt(a[1]); i++) out.set(s + i, copyVal(a[2])); return out; });
  def('array_fill_keys', 2, 2, function (a) { return PArray.fromPairs(a[0].values().map((k) => [k, copyVal(a[1])])); });
  def('array_pad', 3, 3, function (a) {
    const v = a[0].values(), n = this.toInt(a[1]);
    if (Math.abs(n) <= v.length) return a[0].clone();
    const fill = Array(Math.abs(n) - v.length).fill(a[2]);
    return PArray.list(n > 0 ? v.concat(fill) : fill.concat(v));
  });
  def('array_chunk', 2, 3, function (a, line) {
    const size = this.toInt(a[1]), keep = bool(this, opt(a, 2, false));
    if (size < 1) this.throwError('ValueError', 'array_chunk(): Argument #2 ($length) must be greater than 0', line);
    const out = new PArray();
    let cur = null;
    a[0].entries().forEach(([k, v], i) => { if (i % size === 0) { cur = new PArray(); out.push(cur); } if (keep) cur.set(k, copyVal(v)); else cur.push(copyVal(v)); });
    return out;
  });
  def('array_column', 2, 3, function (a) {
    const out = new PArray();
    a[0].values().forEach((row) => {
      const get = (k) => (row instanceof PArray ? (row.has(k) ? row.get(k) : undefined) : row instanceof PObject && row.props.has(this.toStr(k)) ? deref(row.props.get(this.toStr(k)).v) : undefined);
      const v = a[1] === null ? row : get(a[1]);
      if (v === undefined) return;
      if (a.length > 2 && a[2] !== null && get(a[2]) !== undefined) out.set(get(a[2]), copyVal(v)); else out.push(copyVal(v));
    });
    return out;
  });
  const setOp = (keep) => function (a, line, raw, name) {
    const first = aArg(this, a[0], name, 1, 'array', line), others = a.slice(1).map((x, i) => aArg(this, x, name, i + 2, 'arrays', line));
    const out = new PArray();
    first.entries().forEach(([k, v]) => {
      const byKey = /_key$/.test(name);
      const inOther = (o) => (byKey ? o.has(k) : o.values().some((x) => this.toStr(x) === this.toStr(v)));
      if (keep(others.map(inOther))) out.set(k, copyVal(v));
    });
    return out;
  };
  def('array_diff array_diff_key', 1, -1, setOp((hits) => !hits.some(Boolean)));
  def('array_intersect array_intersect_key', 1, -1, setOp((hits) => hits.every(Boolean)));
  def('array_is_list', 1, 1, function (a, line) { return aArg(this, a[0], 'array_is_list', 1, 'array', line).isList(); });
  def('array_rand', 1, 2, function (a, line) {
    const keys = aArg(this, a[0], 'array_rand', 1, 'array', line).keys(), n = this.toInt(opt(a, 1, 1));
    if (!keys.length) this.throwError('ValueError', 'array_rand(): Argument #1 ($array) cannot be empty', line);
    if (n === 1) return keys[Math.floor(this.rng() * keys.length)];
    const pick = keys.map((k) => [this.rng(), k]).sort((x, y) => x[0] - y[0]).slice(0, n).map((x) => x[1]);
    return PArray.list(keys.filter((k) => pick.includes(k)));
  });
  def('shuffle', 1, 1, function (a, line) {
    const v = aArg(this, a[0], 'shuffle', 1, 'array', line).values();
    for (let i = v.length - 1; i > 0; i--) { const j = Math.floor(this.rng() * (i + 1)); [v[i], v[j]] = [v[j], v[i]]; }
    reindex(a[0], v.map((x) => [0, x]));
    return true;
  }, { refs: [0] });
  def('range', 2, 3, function (a, line) {
    let s = a[0], e = a[1];
    const step = a.length > 2 ? Math.abs(this.toFloat(a[2])) : 1;
    if (step === 0) this.throwError('ValueError', 'range(): Argument #3 ($step) cannot be 0', line);
    const out = [];
    if (typeof s === 'string' && typeof e === 'string' && s.length === 1 && e.length === 1 && !/\d/.test(s + e)) {
      const x = s.charCodeAt(0), y = e.charCodeAt(0);
      for (let c = x; x <= y ? c <= y : c >= y; c += x <= y ? step : -step) out.push(String.fromCharCode(c));
      return PArray.list(out);
    }
    const fl = isFloat(s) || isFloat(e) || !Number.isInteger(step) || (typeof s === 'string' && /[.eE]/.test(s));
    s = this.toFloat(s); e = this.toFloat(e);
    if (Math.abs(e - s) / step > 1e6) this.throwError('ValueError', 'range(): The supplied range exceeds the maximum array size', line);
    for (let x = s, i = 0; s <= e ? x <= e + 1e-9 : x >= e - 1e-9; i++, x = s + (s <= e ? 1 : -1) * step * i) out.push(fl ? mkFloat(Number(x.toPrecision(15))) : x);
    return PArray.list(out);
  });
  def('compact', 1, -1, function (a) {
    const out = new PArray(), scope = this.callerScope;
    const add = (n) => { if (n instanceof PArray) n.values().forEach(add); else { const nm = this.toStr(n); const r = scope.vars.get(nm); if (r) out.set(nm, copyVal(r.v)); else this.warn('compact(): Undefined variable $' + nm, this.curLine); } };
    a.forEach(add);
    return out;
  });
  def('extract', 1, 2, function (a) { const scope = this.callerScope; let n = 0; a[0].entries().forEach(([k, v]) => { if (typeof k === 'string' && /^[A-Za-z_]\w*$/.test(k)) { this.varRef(scope, k).v = copyVal(v); n++; } }); return n; });
  const sortFns = {
    sort: [false, false, false], rsort: [false, false, true], asort: [true, false, false], arsort: [true, false, true],
    ksort: [true, true, false], krsort: [true, true, true], usort: [false, false, false, true], uasort: [true, false, false, true], uksort: [true, true, false, true]
  };
  Object.keys(sortFns).forEach((name) => {
    const [keepKeys, byKey, desc, user] = sortFns[name];
    def(name, 1, 2, function (a, line) {
      const arr = aArg(this, a[0], name, 1, 'array', line);
      const cmp = user ? userCmp(this, a[1], line, name) : sorter(this, opt(a, 1, 0));
      const e = Array.from(arr.m.entries());
      e.sort((x, y) => { const r = byKey ? cmp(x[0], y[0]) : cmp(deref(x[1]), deref(y[1])); return desc ? -r : r; });
      if (keepKeys) { arr.m.clear(); e.forEach(([k, v]) => arr.m.set(k, v)); }
      else reindex(arr, e.map(([, v]) => [0, v]));
      return true;
    }, { refs: [0], min: user ? 2 : 1 });
    BUILTINS[name].min = user ? 2 : 1;
  });
  def('natsort natcasesort', 1, 1, function (a, line, raw, name) {
    const arr = a[0], e = Array.from(arr.m.entries());
    e.sort((x, y) => natCmp(this.toStr(deref(x[1])), this.toStr(deref(y[1])), name === 'natcasesort'));
    arr.m.clear(); e.forEach(([k, v]) => arr.m.set(k, v));
    return true;
  }, { refs: [0] });
  def('array_multisort', 1, -1, function () { return true; }, { refs: [0] });
  def('min max', 1, -1, function (a, line, raw, name) {
    let vals = a;
    if (a.length === 1) { aArg(this, a[0], name, 1, 'value', line); vals = a[0].values(); if (!vals.length) this.throwError('ValueError', name + '(): Argument #1 ($value) must contain at least one element', line); }
    return vals.reduce((m, v) => { const c = this.cmp(v, m); return (name === 'min' ? c < 0 : c > 0) ? v : m; });
  });
  def('current pos', 1, 1, function (a) { const k = a[0].keys(); return a[0].pos < k.length ? a[0].get(k[a[0].pos]) : false; });
  def('key', 1, 1, function (a) { const k = a[0].keys(); return a[0].pos < k.length ? k[a[0].pos] : null; });
  def('next', 1, 1, function (a) { a[0].pos++; const k = a[0].keys(); return a[0].pos < k.length ? a[0].get(k[a[0].pos]) : false; }, { refs: [0] });
  def('prev', 1, 1, function (a) { a[0].pos--; const k = a[0].keys(); return a[0].pos >= 0 && a[0].pos < k.length ? a[0].get(k[a[0].pos]) : false; }, { refs: [0] });
  def('reset', 1, 1, function (a) { a[0].pos = 0; const k = a[0].keys(); return k.length ? a[0].get(k[0]) : false; }, { refs: [0] });
  def('end', 1, 1, function (a) { const k = a[0].keys(); a[0].pos = Math.max(0, k.length - 1); return k.length ? a[0].get(k[k.length - 1]) : false; }, { refs: [0] });
  def('iterator_to_array', 1, 2, function (a) { return a[0] instanceof PArray ? a[0].clone() : new PArray(); });

  /* Math */
  const num1 = (name, f, keepInt) => def(name, 1, 1, function (a, line) { const x = nArg(this, a[0], name, 1, 'num', line); const r = f(x.n); return keepInt && !x.f ? mkInt(r) : mkFloat(r); });
  num1('abs', Math.abs, true);
  num1('ceil', Math.ceil);
  num1('floor', Math.floor);
  num1('sqrt', Math.sqrt);
  num1('exp', Math.exp);
  num1('log10', Math.log10);
  num1('log2', Math.log2);
  ['sin', 'cos', 'tan', 'asin', 'acos', 'atan'].forEach((f) => num1(f, Math[f]));
  num1('deg2rad', (x) => (x * Math.PI) / 180);
  num1('rad2deg', (x) => (x * 180) / Math.PI);
  def('log', 1, 2, function (a, line) { const x = nArg(this, a[0], 'log', 1, 'num', line).n; return mkFloat(a.length > 1 ? Math.log(x) / Math.log(this.toFloat(a[1])) : Math.log(x)); });
  def('round', 1, 3, function (a, line) { const x = nArg(this, a[0], 'round', 1, 'num', line); return mkFloat(phpRound(x.n, a.length > 1 ? this.toInt(a[1]) : 0)); });
  def('pow', 2, 2, function (a, line) { return this.arith('**', a[0], a[1], line); });
  def('intdiv', 2, 2, function (a, line) {
    const x = iArg(this, a[0], 'intdiv', 1, 'num1', line), y = iArg(this, a[1], 'intdiv', 2, 'num2', line);
    if (y === 0) this.throwError('DivisionByZeroError', 'Division by zero', line);
    return Math.trunc(x / y);
  });
  def('fmod', 2, 2, function (a) { return mkFloat(this.toFloat(a[0]) % this.toFloat(a[1])); });
  def('fdiv', 2, 2, function (a) { return mkFloat(this.toFloat(a[0]) / this.toFloat(a[1])); });
  def('pi', 0, 0, function () { return Math.PI; });
  def('is_nan', 1, 1, function (a) { return Number.isNaN(this.toFloat(a[0])); });
  def('is_infinite', 1, 1, function (a) { const x = this.toFloat(a[0]); return x === Infinity || x === -Infinity; });
  def('is_finite', 1, 1, function (a) { return Number.isFinite(this.toFloat(a[0])); });
  def('rand mt_rand random_int', 0, 2, function (a, line, raw, name) {
    if (a.length === 1) this.throwError('ArgumentCountError', name + '() expects exactly 2 arguments, 1 given', line);
    if (!a.length) return Math.floor(this.rng() * 2147483648);
    const lo = this.toInt(a[0]), hi = this.toInt(a[1]);
    if (hi < lo) { if (name === 'rand') return hi + Math.floor(this.rng() * (lo - hi + 1)); this.throwError('ValueError', name + '(): Argument #2 ($max) must be greater than or equal to argument #1 ($min)', line); }
    return lo + Math.floor(this.rng() * (hi - lo + 1));
  });
  def('mt_srand srand', 0, 2, function (a) { this.rng = mulberry(a.length ? this.toInt(a[0]) : Date.now()); return null; });
  def('mt_getrandmax getrandmax', 0, 0, function () { return 2147483647; });
  def('base_convert', 3, 3, function (a) { return parseInt(this.toStr(a[0]).toLowerCase(), this.toInt(a[1])).toString(this.toInt(a[2])); });
  def('bindec', 1, 1, function (a) { return parseInt(this.toStr(a[0]).replace(/[^01]/g, '') || '0', 2); });
  def('hexdec', 1, 1, function (a) { return parseInt(this.toStr(a[0]).replace(/[^0-9a-f]/gi, '') || '0', 16); });
  def('octdec', 1, 1, function (a) { return parseInt(this.toStr(a[0]).replace(/[^0-7]/g, '') || '0', 8); });
  def('decbin', 1, 1, function (a) { return BigInt.asUintN(64, BigInt(this.toInt(a[0]))).toString(2); });
  def('dechex', 1, 1, function (a) { return BigInt.asUintN(64, BigInt(this.toInt(a[0]))).toString(16); });
  def('decoct', 1, 1, function (a) { return BigInt.asUintN(64, BigInt(this.toInt(a[0]))).toString(8); });

  /* Functions, classes, constants */
  def('define', 2, 3, function (a, line) { return this.defineConst(this.toStr(a[0]), a[1], line); });
  def('defined', 1, 1, function (a) { const n = this.toStr(a[0]); return this.constants.has(n) || Object.prototype.hasOwnProperty.call(CONSTS, n); });
  def('constant', 1, 1, function (a, line) {
    const n = this.toStr(a[0]);
    if (n.includes('::')) { const [c, k] = n.split('::'); return this.classConst(this.getClass(c, line), k, this.callerScope, line); }
    return this.constant(n, line);
  });
  def('function_exists', 1, 1, function (a) { const l = this.toStr(a[0]).toLowerCase(); return this.functions.has(l) || !!BUILTINS[l]; });
  def('class_exists interface_exists', 1, 2, function (a, line, raw, name) { const c = this.getClass(this.toStr(a[0]), line, true); return !!c && (name === 'interface_exists' ? c.isInterface : !c.isInterface); });
  def('method_exists', 2, 2, function (a) { const c = a[0] instanceof PObject ? a[0].cls : this.getClass(this.toStr(a[0]), 0, true); return !!c && !!this.findMethod(c, this.toStr(a[1]).toLowerCase()); });
  def('property_exists', 2, 2, function (a) {
    const n = this.toStr(a[1]);
    if (a[0] instanceof PObject) return a[0].props.has(n);
    const c = this.getClass(this.toStr(a[0]), 0, true);
    for (let k = c; k; k = k.parent) if (k.props.some((p) => p.name === n) || k.statics.has(n)) return true;
    return false;
  });
  def('get_class', 0, 1, function (a, line) {
    if (!a.length) { if (!this.callerScope.cls) this.throwError('Error', 'get_class() without arguments must be called from within a class', line); return this.callerScope.cls.name; }
    if (!(a[0] instanceof PObject)) this.typeError('get_class(): Argument #1 ($object) must be of type object, ' + typeName(a[0]) + ' given', line);
    return a[0].cls.name;
  });
  def('get_parent_class', 0, 1, function (a) {
    const c = !a.length ? this.callerScope.cls : a[0] instanceof PObject ? a[0].cls : this.getClass(this.toStr(a[0]), 0, true);
    return c && c.parent ? c.parent.name : false;
  });
  def('get_object_vars', 1, 1, function (a) {
    const out = new PArray();
    a[0].props.forEach((r, k) => { if (r.v !== UNINIT && this.canAccess(r.vis, r.cls, this.callerScope.cls)) out.set(k, copyVal(deref(r.v))); });
    return out;
  });
  def('get_class_methods', 1, 1, function (a) {
    const c = a[0] instanceof PObject ? a[0].cls : this.getClass(this.toStr(a[0]));
    const out = [], seen = new Set();
    for (let k = c; k; k = k.parent) k.methods.forEach((m, l) => { if (!seen.has(l) && this.canAccess(m.vis, m.cls, this.callerScope.cls)) { seen.add(l); out.push(m.name); } });
    return PArray.list(out);
  });
  def('is_a is_subclass_of', 2, 3, function (a, line, raw, name) {
    const v = a[0], cn = this.toStr(a[1]);
    let obj = v;
    if (typeof v === 'string' && bool(this, opt(a, 2, name === 'is_subclass_of'))) { const c = this.getClass(v, line, true); if (!c) return false; obj = new PObject(c); }
    if (!(obj instanceof PObject)) return false;
    if (name === 'is_subclass_of' && obj.cls.lname === cn.toLowerCase()) return false;
    return this.instanceOf(obj, cn);
  });
  def('spl_object_id', 1, 1, function (a) { return a[0].id; });
  def('spl_object_hash', 1, 1, function (a) { return a[0].id.toString(16).padStart(32, '0'); });
  def('call_user_func', 1, -1, function (a, line) { return this.callValue(a[0], a.slice(1), line); });
  def('call_user_func_array', 2, 2, function (a, line) {
    const t = this.resolveCallable(a[0], line);
    const args = aArg(this, a[1], 'call_user_func_array', 2, 'args', line).entries().map(([k, v]) => (typeof k === 'string' ? { named: k, v } : { v }));
    if (t.builtin) return this.invokeBuiltin(t.builtin, args, line);
    if (t.method && t.method.native) return t.method.native.call(this, t.thisObj, args.map((x) => x.v), line);
    return this.invoke(t.fn, args, line, t);
  });
  def('func_get_args', 0, 0, function () { return PArray.list(this.callerScope.args.map(copyVal)); });
  def('func_num_args', 0, 0, function () { return this.callerScope.args.length; });

  /* Output buffering, errors, settings */
  def('ob_start', 0, 3, function () { this.ob.push(''); return true; });
  def('ob_get_clean', 0, 0, function () { return this.ob.length ? this.ob.pop() : false; });
  def('ob_get_contents', 0, 0, function () { return this.ob.length ? this.ob[this.ob.length - 1] : false; });
  def('ob_end_clean', 0, 0, function () { if (!this.ob.length) return false; this.ob.pop(); return true; });
  def('ob_end_flush ob_get_flush', 0, 0, function (a, line, raw, name) { if (!this.ob.length) return false; const s = this.ob.pop(); this.echo(s); return name === 'ob_get_flush' ? s : true; });
  def('ob_get_level', 0, 0, function () { return this.ob.length; });
  def('flush ob_flush', 0, 0, function () { return null; });
  def('error_reporting', 0, 1, function () { return 32767; });
  def('ini_set', 2, 2, function () { return false; });
  def('ini_get', 1, 1, function (a) { return { display_errors: '1', 'date.timezone': this.tz, output_buffering: '0' }[this.toStr(a[0])] || false; });
  def('set_error_handler set_exception_handler', 1, 2, function () { return null; });
  def('error_log', 1, 4, function (a) { this.logs.push(['info', '[error_log] ' + this.toStr(a[0])]); return true; });
  def('trigger_error user_error', 1, 2, function (a, line) {
    const lvl = this.toInt(opt(a, 1, 1024));
    const kind = lvl === 256 ? 'Fatal error' : lvl === 512 ? 'Warning' : lvl === 16384 ? 'Deprecated' : 'Notice';
    if (kind === 'Fatal error') throw new FatalSignal(this.toStr(a[0]), line);
    this.message(kind, this.toStr(a[0]), line);
    return true;
  });
  def('assert', 1, 2, function () { return true; });
  def('phpversion', 0, 1, function () { return PHP_VERSION; });
  def('php_sapi_name', 0, 0, function () { return 'cli-server'; });
  def('php_uname', 0, 1, function () { return 'Linux'; });
  def('memory_get_usage memory_get_peak_usage', 0, 1, function () { return 2097152; });
  def('gc_collect_cycles', 0, 0, function () { return 0; });
  def('sleep usleep', 1, 1, function () { return 0; });
  def('set_time_limit', 1, 1, function () { return true; });
  def('headers_list', 0, 0, function () { return PArray.list(this.headers.map((h) => h[0] + ': ' + h[1])); });

  /* HTTP: headers, status codes, cookies, sessions */
  const sentWarning = (I, fn, line) => I.warn((fn ? fn + '(): ' : '') + 'Cannot modify header information - headers already sent by (output started at ' + I.file + ':' + I.outputStart + ')', line);
  def('header', 1, 3, function (a, line) {
    const s = sArg(this, a[0], 'header', 1, 'header', line).trim();
    if (this.headersSent) { sentWarning(this, '', line); return null; }
    if (/[\r\n]/.test(s)) { this.warn('Header may not contain more than a single header, new line detected', line); return null; }
    const sm = /^HTTP\/[\d.]+\s+(\d{3})/i.exec(s);
    if (sm) { this.status = Number(sm[1]); return null; }
    const i = s.indexOf(':');
    if (i < 0) { this.warn('Header must contain a colon', line); return null; }
    const name = s.slice(0, i).trim(), value = s.slice(i + 1).trim();
    const replace = a.length > 1 ? bool(this, a[1]) : true;
    if (replace) this.headers = this.headers.filter((h) => h[0].toLowerCase() !== name.toLowerCase());
    this.headers.push([name, value]);
    const code = a.length > 2 ? this.toInt(a[2]) : 0;
    if (code) this.status = code;
    else if (name.toLowerCase() === 'location' && this.status !== 201 && !(this.status >= 300 && this.status < 400)) this.status = 302;
    return null;
  });
  def('header_remove', 0, 1, function (a) {
    if (this.headersSent) return null;
    if (!a.length) this.headers = []; else { const n = this.toStr(a[0]).toLowerCase(); this.headers = this.headers.filter((h) => h[0].toLowerCase() !== n); }
    return null;
  });
  def('headers_sent', 0, 2, function () { return this.headersSent; });
  def('http_response_code', 0, 1, function (a, line) {
    if (!a.length || a[0] === null) return this.status;
    if (this.headersSent) { this.warn('http_response_code(): Cannot set response code - headers already sent (output started at ' + this.file + ':' + this.outputStart + ')', line); return false; }
    const prev = this.status;
    this.status = this.toInt(a[0]);
    return prev;
  });
  def('setcookie', 1, 7, function (a, line) {
    const name = sArg(this, a[0], 'setcookie', 1, 'name', line);
    if (!name) this.throwError('ValueError', 'setcookie(): Argument #1 ($name) cannot be empty', line);
    if (this.headersSent) { sentWarning(this, 'setcookie', line); return false; }
    let value = a.length > 1 ? this.toStr(a[1]) : '', expires = 0, path = '', domain = '', secure = false, httponly = false, samesite = '';
    if (a[2] instanceof PArray) {
      const o = a[2];
      expires = o.has('expires') ? this.toInt(o.get('expires')) : 0; path = o.has('path') ? this.toStr(o.get('path')) : '';
      domain = o.has('domain') ? this.toStr(o.get('domain')) : ''; secure = this.truthy(o.get('secure')); httponly = this.truthy(o.get('httponly'));
      samesite = o.has('samesite') ? this.toStr(o.get('samesite')) : '';
    } else {
      expires = this.toInt(opt(a, 2, 0)); path = this.toStr(opt(a, 3, '')); domain = this.toStr(opt(a, 4, ''));
      secure = bool(this, opt(a, 5, false)); httponly = bool(this, opt(a, 6, false));
    }
    const nowS = Math.floor(this.now / 1000);
    const gmt = (t) => phpDate('D, d M Y H:i:s', t, 'UTC') + ' GMT';
    let h;
    if (value === '') h = name + '=deleted; expires=Thu, 01 Jan 1970 00:00:01 GMT; Max-Age=0';
    else {
      h = name + '=' + urlencode(value, true);
      if (expires) h += '; expires=' + gmt(expires) + '; Max-Age=' + Math.max(0, expires - nowS);
    }
    if (path) h += '; path=' + path;
    if (domain) h += '; domain=' + domain;
    if (secure) h += '; secure';
    if (httponly) h += '; HttpOnly';
    if (samesite) h += '; SameSite=' + samesite;
    this.headers.push(['Set-Cookie', h]);
    return true;
  });
  def('session_start', 0, 1, function (a, line) {
    if (this.sessionId) return true;
    if (this.headersSent) { this.warn('session_start(): Session cannot be started after headers have already been sent', line); return false; }
    const cookies = this.superglobals._COOKIE.v;
    let id = cookies instanceof PArray && cookies.has('PHPSESSID') ? this.toStr(cookies.get('PHPSESSID')) : '';
    if (!id || !SESSIONS.has(id)) {
      if (!id) { id = ''; for (let i = 0; i < 26; i++) id += '0123456789abcdefghijklmnopqrstuv'[Math.floor(this.rng() * 32)]; }
      SESSIONS.set(id, new PArray());
      this.headers.push(['Set-Cookie', 'PHPSESSID=' + id + '; path=/']);
    }
    this.sessionId = id;
    this.superglobals._SESSION.v = SESSIONS.get(id).clone();
    return true;
  });
  def('session_id', 0, 1, function () { return this.sessionId || ''; });
  def('session_status', 0, 0, function () { return this.sessionId ? 2 : 1; });
  def('session_unset', 0, 0, function () { if (this.sessionId) this.superglobals._SESSION.v = new PArray(); return true; });
  def('session_destroy', 0, 0, function () { if (!this.sessionId) return false; SESSIONS.delete(this.sessionId); this.sessionDestroyed = true; return true; });
  def('session_regenerate_id', 0, 1, function () {
    if (!this.sessionId) return false;
    let id = ''; for (let i = 0; i < 26; i++) id += '0123456789abcdefghijklmnopqrstuv'[Math.floor(this.rng() * 32)];
    SESSIONS.set(id, SESSIONS.get(this.sessionId) || new PArray());
    SESSIONS.delete(this.sessionId);
    this.sessionId = id;
    this.headers.push(['Set-Cookie', 'PHPSESSID=' + id + '; path=/']);
    return true;
  });
  def('session_write_close', 0, 0, function () { return true; });

  /* Dates and times */
  def('time', 0, 0, function () { return Math.floor(this.now / 1000); });
  def('microtime', 0, 1, function (a) { const t = this.now / 1000; return bool(this, opt(a, 0, false)) ? mkFloat(t) : (t % 1).toFixed(8) + ' ' + Math.floor(t); });
  def('hrtime', 0, 1, function () { return PArray.list([Math.floor(this.now / 1000), (this.now % 1000) * 1e6]); });
  def('date gmdate', 1, 2, function (a, line, raw, name) {
    const ts = a.length > 1 && a[1] !== null ? iArg(this, a[1], name, 2, 'timestamp', line) : Math.floor(this.now / 1000);
    return phpDate(sArg(this, a[0], name, 1, 'format', line), ts, name === 'gmdate' ? 'UTC' : this.tz);
  });
  def('mktime', 0, 6, function (a) {
    const P = tzParts(this.now, this.tz);
    const g = (i, d) => (a.length > i && a[i] !== null ? this.toInt(a[i]) : d);
    const norm = new Date(Date.UTC(g(5, P.Y), g(3, P.m) - 1, g(4, P.d), g(0, P.H), g(1, P.i), g(2, P.s)));
    return localToTs(this, norm.getUTCFullYear(), norm.getUTCMonth() + 1, norm.getUTCDate(), norm.getUTCHours(), norm.getUTCMinutes(), norm.getUTCSeconds());
  });
  def('strtotime', 1, 2, function (a) { return strtotime(this, this.toStr(a[0]), a.length > 1 && a[1] !== null ? this.toInt(a[1]) : Math.floor(this.now / 1000)); });
  def('checkdate', 3, 3, function (a) { const m = this.toInt(a[0]), d = this.toInt(a[1]), y = this.toInt(a[2]); if (m < 1 || m > 12 || d < 1 || y < 1) return false; return d <= new Date(Date.UTC(y, m, 0)).getUTCDate(); });
  def('date_default_timezone_set', 1, 1, function (a, line) {
    const tz = this.toStr(a[0]);
    try { if (tz !== 'UTC') new Intl.DateTimeFormat('en-US', { timeZone: tz }); this.tz = tz; return true; } catch (e) { this.notice('date_default_timezone_set(): Timezone ID \'' + tz + '\' is invalid', line); return false; }
  });
  def('date_default_timezone_get', 0, 0, function () { return this.tz; });

  /* JSON */
  def('json_encode', 1, 3, function (a, line) {
    this.jsonError = 0;
    const flags = this.toInt(opt(a, 1, 0));
    const r = jsonEncode(this, a[0], flags, 0);
    if (r === null) { if (flags & 4194304) this.throwError('JsonException', this.jsonError === 7 ? 'Inf and NaN cannot be JSON encoded' : 'Maximum stack depth exceeded', line); return false; }
    return r;
  });
  def('json_decode', 1, 4, function (a, line) {
    this.jsonError = 0;
    const flags = this.toInt(opt(a, 3, 0));
    const assoc = a.length > 1 && a[1] !== null ? bool(this, a[1]) : !!(flags & 1);
    const s = sArg(this, a[0], 'json_decode', 1, 'json', line);
    try { return jsonDecode(this, s, assoc); } catch (e) {
      this.jsonError = 4;
      if (flags & 4194304) this.throwError('JsonException', 'Syntax error', line);
      return null;
    }
  });
  def('json_last_error', 0, 0, function () { return this.jsonError; });
  def('json_last_error_msg', 0, 0, function () { return { 0: 'No error', 1: 'Maximum stack depth exceeded', 4: 'Syntax error', 7: 'Inf and NaN cannot be JSON encoded' }[this.jsonError] || 'Unknown error'; });
  def('json_validate', 1, 3, function (a) { try { jsonDecode(this, this.toStr(a[0]), true); return true; } catch (e) { return false; } });

  /* Regular expressions */
  def('preg_match', 2, 5, function (a, line, raw) {
    const re = pcre(this, 'preg_match', this.toStr(a[0]), line);
    if (!re) return false;
    const s = this.toStr(a[1]);
    const off = this.toInt(opt(a, 4, 0));
    const m = re.exec(s.slice(off));
    if (m) m.index += off;
    if (raw[2]) raw[2].ref.v = m ? matchArray(m, this.toInt(opt(a, 3, 0)) & 256, re) : new PArray();
    return m ? 1 : 0;
  }, { refs: [2] });
  def('preg_match_all', 2, 5, function (a, line, raw) {
    const re = pcre(this, 'preg_match_all', this.toStr(a[0]), line, 'g');
    if (!re) return false;
    const all = Array.from(this.toStr(a[1]).matchAll(re));
    if (raw[2]) {
      const flags = this.toInt(opt(a, 3, 1));
      if (flags & 2) raw[2].ref.v = PArray.list(all.map((m) => matchArray(m, flags & 256, re)));
      else {
        const out = new PArray();
        const groups = all.length ? all[0].length : re.source.split('(').length;
        for (let g = 0; g < Math.max(1, groups); g++) out.set(g, PArray.list(all.map((m) => (m[g] === undefined ? '' : m[g]))));
        if (all[0] && all[0].groups) Object.keys(all[0].groups).forEach((nm) => out.set(nm, PArray.list(all.map((m) => m.groups[nm] || ''))));
        raw[2].ref.v = out;
      }
    }
    return all.length;
  }, { refs: [2] });
  def('preg_replace preg_replace_callback', 3, 5, function (a, line, raw, name) {
    const subjects = a[2] instanceof PArray ? a[2] : null;
    const pats = a[0] instanceof PArray ? a[0].values() : [a[0]];
    const reps = name === 'preg_replace' && a[1] instanceof PArray ? a[1].values() : null;
    const limit = this.toInt(opt(a, 3, -1));
    let count = 0;
    const one = (s) => {
      for (let i = 0; i < pats.length; i++) {
        const re = pcre(this, name, this.toStr(pats[i]), line, 'g');
        if (!re) return null;
        let n = 0;
        s = s.replace(re, (...m) => {
          if (limit >= 0 && n >= limit) return m[0];
          n++; count++;
          if (name === 'preg_replace_callback') { const arr = new PArray(); const groups = typeof m[m.length - 1] === 'object' ? m[m.length - 1] : null; const pieces = m.slice(0, groups ? -3 : -2); pieces.forEach((x, k) => arr.set(k, x === undefined ? '' : x)); if (groups) Object.keys(groups).forEach((g) => arr.set(g, groups[g] || '')); return this.toStr(this.callValue(a[1], [arr], line)); }
          return replacementFn(reps ? (i < reps.length ? this.toStr(reps[i]) : '') : this.toStr(a[1]))(...m);
        });
      }
      return s;
    };
    const out = subjects ? PArray.fromPairs(subjects.entries().map(([k, v]) => [k, one(this.toStr(v))])) : one(this.toStr(a[2]));
    if (raw[4]) raw[4].ref.v = count;
    return out;
  }, { refs: [4] });
  def('preg_split', 2, 4, function (a, line) {
    const re = pcre(this, 'preg_split', this.toStr(a[0]), line, 'g');
    if (!re) return false;
    const flags = this.toInt(opt(a, 3, 0));
    let parts = this.toStr(a[1]).split(re);
    if (!(flags & 2)) { const groups = (new RegExp(re.source + '|').exec('') || []).length - 1; if (groups > 0) parts = parts.filter((p, i) => i % (groups + 1) === 0); }
    parts = parts.map((p) => (p === undefined ? '' : p));
    if (flags & 1) parts = parts.filter((p) => p !== '');
    const lim = this.toInt(opt(a, 2, -1));
    if (lim > 0 && parts.length > lim) parts = parts.slice(0, lim);
    return PArray.list(parts);
  });
  def('preg_quote', 1, 2, function (a) { const d = a.length > 1 && a[1] !== null ? this.toStr(a[1]) : ''; return this.toStr(a[0]).replace(/[.\\+*?[^\]$(){}=!<>|:\-#/]/g, (c) => (c === '/' && d !== '/' ? c : '\\' + c)); });
  def('preg_grep', 2, 3, function (a, line) {
    const re = pcre(this, 'preg_grep', this.toStr(a[0]), line);
    if (!re) return false;
    return PArray.fromPairs(a[1].entries().filter(([, v]) => re.test(this.toStr(v))));
  });

  /* Filters */
  def('filter_var', 1, 3, function (a, line) { return filterVar(this, a[0], this.toInt(opt(a, 1, 516)), opt(a, 2, 0), line); });
  def('filter_input', 2, 4, function (a, line) {
    const src = { 0: '_POST', 1: '_GET', 2: '_COOKIE', 5: '_SERVER' }[this.toInt(a[0])];
    const arr = src ? this.superglobals[src].v : null;
    const k = this.toStr(a[1]);
    if (!(arr instanceof PArray) || !arr.has(k)) return null;
    return filterVar(this, arr.get(k), this.toInt(opt(a, 2, 516)), opt(a, 3, 0), line);
  });
  def('filter_has_var', 2, 2, function (a) { const src = { 0: '_POST', 1: '_GET', 2: '_COOKIE', 5: '_SERVER' }[this.toInt(a[0])]; const arr = src ? this.superglobals[src].v : null; return arr instanceof PArray && arr.has(this.toStr(a[1])); });

  /* Files: there is no file system here, so these explain themselves */
  def('file_get_contents file_put_contents fopen file unlink mkdir scandir is_dir is_file file_exists move_uploaded_file mail', 1, -1, function (a, line, raw, name) {
    if (name === 'file_exists' || name === 'is_file' || name === 'is_dir') return Object.prototype.hasOwnProperty.call(this.files, this.toStr(a[0]).replace(/^\.?\//, ''));
    if (name === 'file_get_contents') {
      const k = this.toStr(a[0]).replace(/^\.?\//, '');
      if (Object.prototype.hasOwnProperty.call(this.files, k)) return this.files[k];
    }
    this.warn(name + '(' + this.toStr(a[0]) + '): Failed to open stream: this playground has no file system', line);
    return false;
  });

  const btoaSafe = (s) => (typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'binary').toString('base64'));
  const atobSafe = (s) => (typeof atob === 'function' ? atob(s) : Buffer.from(s, 'base64').toString('binary'));

  /* ---------- Running a script ---------- */

  function handleTop(I, e) {
    if (e instanceof ExitSignal || e instanceof ReturnSignal) return;
    if (e instanceof ThrowSignal) { const u = I.uncaught(e.obj); I.fatal('Fatal error', u.msg, u.line); return; }
    if (e instanceof FatalSignal) {
      if (String(e.msg).startsWith('PARSE:')) I.fatal('Parse error', e.msg.slice(6), e.line);
      else I.fatal('Fatal error', e.msg, e.line);
      return;
    }
    if (e instanceof BreakSignal || e instanceof ContinueSignal) {
      I.fatal('Fatal error', '\'' + (e instanceof BreakSignal ? 'break' : 'continue') + '\' not in the \'loop\' or \'switch\' context', I.curLine);
      return;
    }
    if (e instanceof ParseError) { I.fatal('Parse error', e.message, e.line); return; }
    if (e instanceof RangeError && /call stack/i.test(e.message)) {
      I.fatal('Fatal error', 'Maximum function nesting level reached, aborting! (a function keeps calling itself)', I.curLine);
      return;
    }
    I.fatal('Fatal error', 'This playground could not run that line (' + (e && e.message ? e.message : e) + ')', I.curLine);
  }

  /**
   * Runs PHP source (a whole .php file: HTML with <?php ?> blocks) and returns
   * { output, status, headers: [[name, value]], logs: [[type, text]] }.
   * options: method, uri, file ('/index.php'), get / post / cookies (plain objects
   * or PArrays), files ({ 'header.php': '...' } for include), now (ms), seed, timezone.
   */
  function run(source, options) {
    const opts = options || {};
    objIds = 0; // object numbers (#1, #2 in var_dump) start again for every request
    const I = new Interp(opts);
    I.callerScope = I.globals;
    let ast;
    try { ast = parse(String(source == null ? '' : source)); } catch (e) {
      if (e instanceof ParseError) { I.fatal('Parse error', e.message, e.line); return I.result(); }
      throw e;
    }
    try {
      I.hoist(ast);
      I.execList(ast, I.globals);
    } catch (e) { handleTop(I, e); }
    if (I.sessionId && !I.sessionDestroyed) {
      const s = I.superglobals._SESSION.v;
      SESSIONS.set(I.sessionId, s instanceof PArray ? s.clone() : new PArray());
    }
    return I.result();
  }

  // date() uses the visitor's own time zone, like a server configured for where you live.
  function localZone() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; }
  }

  // The playground runtime: every request runs the PHP tab, the way PHP's built-in
  // server (php -S localhost:8000) would run index.php.
  const runtime = {
    label: 'Browser',
    request: { method: 'GET', url: '/index.php' },
    render(code, request) {
      const req = request || { method: 'GET', url: '/index.php', path: '/index.php', query: '', body: '', cookies: {} };
      const path = req.path || '/index.php';
      const file = /\.php$/i.test(path) ? path : (path.replace(/\/+$/, '') || '') + '/index.php';
      const cookies = req.cookies || {};
      const res = run(code.php || '', {
        file, method: req.method, uri: req.url, timezone: localZone(),
        get: phpArrayFromPairs(parsePairs(req.query)),
        post: req.method === 'POST' ? phpArrayFromPairs(parsePairs(req.body)) : new PArray(),
        cookies: PArray.fromPairs(Object.keys(cookies).map((k) => [k, cookies[k]]))
      });
      res.logs.push(['info', '127.0.0.1 [' + res.status + ']: ' + req.method + ' ' + req.url]);
      return { html: res.output, status: res.status, headers: res.headers, logs: res.logs };
    }
  };

  return {
    version: PHP_VERSION, run, runtime, parse, tokenize, phpArrayFromPairs, parsePairs, localZone,
    PArray, PObject, PFloat, Ref, sessions: SESSIONS
  };
});
