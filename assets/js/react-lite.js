/* ==========================================================================
   React lite: an offline stand-in for React, used by the Chapter 11 pages.
   Load it AFTER course.js. It registers WD1.runtimes.react, so a playground
   with data-runtime="react" gets:

   - preview: a small React (createElement, function and class components,
     hooks, context, keyed updates that patch the real DOM) installed in the
     preview as window.React and window.ReactDOM;
   - transform: a JSX compiler that turns <tags> in the JS tab into
     React.createElement() calls, keeping every line where it was so error
     line numbers still match what the student typed.

   Real projects install the real React with npm (Section 11.4). This file
   covers what the chapter teaches and prints React's own warnings (missing
   keys, hooks in the wrong order, controlled inputs) so mistakes look the
   same as they would in a real app.

   In Node (the tests in tests/), module.exports is { preview, transform }.
   ========================================================================== */
(function (root) {
  'use strict';

  /* ---------- The runtime ----------
     Installs React and ReactDOM on g (the window by default). The playground
     turns this function into text and calls it inside the preview, so it must
     never use a variable from outside itself. A page can also call it with its
     own object, reactLite(obj), to run React demos on the page itself. */
  function reactLite(g) {
    g = g || window;
    var doc = (g && g.document) || document;
    // Warnings go to g.console when it has one, so a page demo can show them in its own panel.
    var con = (g && g.console) || console;
    var SVG_NS = 'http://www.w3.org/2000/svg';
    var ELEMENT = Symbol.for('react.element');
    var FRAGMENT = Symbol.for('react.fragment');
    var STRICT = Symbol.for('react.strict_mode');
    var SUSPENSE = Symbol.for('react.suspense');
    var TEXT = Symbol.for('react-lite.text');
    var hasOwn = Object.prototype.hasOwnProperty;

    /* ---------- Warnings, worded like React's ---------- */
    var warned = {};
    function warnOnce(key, msg) {
      if (warned[key]) return;
      warned[key] = true;
      con.error('Warning: ' + msg);
    }
    function nameOf(type) {
      if (typeof type === 'string') return type;
      if (!type) return 'Unknown';
      if (type === FRAGMENT) return 'Fragment';
      if (type.$$memo) return 'Memo(' + nameOf(type.type) + ')';
      if (type.$$forward) return 'ForwardRef(' + nameOf(type.$$forward) + ')';
      if (type.$$provider) return (type.$$provider.displayName || 'Context') + '.Provider';
      if (type.$$consumer) return (type.$$consumer.displayName || 'Context') + '.Consumer';
      return type.displayName || type.name || 'Anonymous';
    }

    /* ---------- Elements ---------- */
    var rendering = null;   // the component instance whose render is running
    var hooksInst = null;   // the function component whose hooks are being called
    var hookIdx = 0;

    function isValidElement(x) { return !!x && typeof x === 'object' && x.$$typeof === ELEMENT; }

    // A list passed as a child (the result of map) needs a key on every element.
    function validateKeys(list) {
      var owner = rendering ? nameOf(rendering.type) : null;
      var seen = {};
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if (Array.isArray(c)) { validateKeys(c); continue; }
        if (!isValidElement(c)) continue;
        if (c.key == null) {
          warnOnce('key:' + owner, 'Each child in a list should have a unique "key" prop.' +
            (owner ? ' Check the render method of `' + owner + '`.' : '') +
            ' Give each element a key that identifies it, such as key={item.id}.');
        } else if (seen[c.key]) {
          warnOnce('dupkey:' + owner + ':' + c.key, 'Encountered two children with the same key, `' + c.key + '`. Keys should be unique so that components keep their identity across updates.');
        } else seen[c.key] = true;
      }
    }

    function createElement(type, config) {
      var props = {}, key = null, ref = null, k;
      if (config != null) {
        if (config.key !== undefined) key = String(config.key);
        if (config.ref !== undefined) ref = config.ref;
        for (k in config) if (hasOwn.call(config, k) && k !== 'key' && k !== 'ref') props[k] = config[k];
      }
      var n = arguments.length - 2;
      if (n === 1) props.children = arguments[2];
      else if (n > 1) props.children = Array.prototype.slice.call(arguments, 2);
      for (var i = 2; i < arguments.length; i++) if (Array.isArray(arguments[i])) validateKeys(arguments[i]);
      if (type && type.defaultProps) for (k in type.defaultProps) if (props[k] === undefined) props[k] = type.defaultProps[k];
      if (type == null || (typeof type !== 'string' && typeof type !== 'function' && typeof type !== 'symbol' && typeof type !== 'object')) {
        con.error('Warning: React.createElement: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: ' +
          (type === undefined ? 'undefined. You likely forgot to define or export your component, or misspelled its name.' : String(type)) + '.');
      }
      return { $$typeof: ELEMENT, type: type, key: key, ref: ref, props: props };
    }

    function cloneElement(el, config) {
      var props = Object.assign({}, el.props), key = el.key, ref = el.ref;
      if (config) {
        if (config.key !== undefined) key = String(config.key);
        if (config.ref !== undefined) ref = config.ref;
        for (var k in config) if (hasOwn.call(config, k) && k !== 'key' && k !== 'ref') props[k] = config[k];
      }
      var n = arguments.length - 2;
      if (n === 1) props.children = arguments[2];
      else if (n > 1) props.children = Array.prototype.slice.call(arguments, 2);
      return { $$typeof: ELEMENT, type: el.type, key: key, ref: ref, props: props };
    }

    // Turns children (elements, strings, numbers, arrays, null, booleans) into a flat list of
    // { v: element, mk: matchKey }. The match key is how an update finds "the same child" again:
    // its key if it has one, otherwise its position, scoped to the array it came from (like React).
    function flatten(children, out, prefix) {
      if (Array.isArray(children)) for (var i = 0; i < children.length; i++) item(children[i], i);
      else item(children, 0);
      function item(c, i) {
        if (c == null || typeof c === 'boolean') return;
        if (Array.isArray(c)) { flatten(c, out, prefix + i + '/'); return; }
        if (typeof c === 'string' || typeof c === 'number' || typeof c === 'bigint') {
          out.push({ v: { $$typeof: ELEMENT, type: TEXT, key: null, props: { nodeValue: String(c) } }, mk: prefix + '.' + i });
          return;
        }
        if (isValidElement(c)) { out.push({ v: c, mk: c.key != null ? prefix + '$' + c.key : prefix + '.' + i }); return; }
        if (typeof c === 'function') {
          warnOnce('fnchild', 'Functions are not valid as a React child. This may happen if you return a Component instead of <Component /> from render, or wrote {myFunction} where you meant {myFunction()}.');
          return;
        }
        if (typeof c === 'object') {
          var desc = typeof c.then === 'function' ? '[object Promise]' : 'object with keys {' + Object.keys(c).join(', ') + '}';
          throw new Error('Objects are not valid as a React child (found: ' + desc + '). If you meant to render a collection of children, use an array instead.');
        }
      }
      return out;
    }

    /* ---------- Scheduling ----------
       Updates made inside a React event handler are batched and drawn as soon as the
       handler returns. Updates from anywhere else (timers, promises) are drawn in a
       microtask. Effects run right after each update is drawn. */
    var dirty = new Set(), commitQueue = [], batchDepth = 0, flushing = false, flushQueued = false;

    function requestRender(inst) {
      if (!inst || !inst.mounted) return;
      if (rendering === inst) { inst.again = true; return; }
      if (rendering && rendering !== inst) {
        warnOnce('cross:' + nameOf(rendering.type), 'Cannot update a component (`' + nameOf(inst.type) + '`) while rendering a different component (`' +
          nameOf(rendering.type) + '`). Move the state update into an event handler or a useEffect.');
      }
      inst.dirty = true;
      dirty.add(inst);
      if (batchDepth === 0 && !flushing && !flushQueued) {
        flushQueued = true;
        Promise.resolve().then(function () { flushQueued = false; flush(); });
      }
    }

    function batchedUpdates(fn, a) {
      batchDepth++;
      var ok = false;
      try { var r = fn(a); ok = true; return r; }
      finally {
        batchDepth--;
        if (batchDepth === 0) { if (ok) flush(); else { dirty.clear(); commitQueue.length = 0; } }
      }
    }

    function saveFocus() {
      var a = doc.activeElement;
      if (!a || a === doc.body) return null;
      var sel = null;
      try { if (typeof a.selectionStart === 'number') sel = [a.selectionStart, a.selectionEnd, a.selectionDirection]; } catch (e) { sel = null; }
      return { el: a, sel: sel };
    }
    function restoreFocus(f) {
      if (!f || !f.el.isConnected || doc.activeElement === f.el) return;
      try { f.el.focus({ preventScroll: true }); if (f.sel) f.el.setSelectionRange(f.sel[0], f.sel[1], f.sel[2]); } catch (e) { /* ignore */ }
    }

    function runCommit() {
      while (commitQueue.length) {
        var job = commitQueue.shift();
        job();
      }
    }

    function flush() {
      if (flushing) return;
      flushing = true;
      var focus = saveFocus(), loops = 0;
      try {
        runCommit();
        while (dirty.size) {
          if (++loops > 50) {
            dirty.clear();
            throw new Error('Maximum update depth exceeded. This can happen when a component sets state inside useEffect without a dependency array (or with a dependency that changes on every render), or calls setState in componentDidUpdate every time. React limits the number of nested updates to prevent infinite loops.');
          }
          var list = Array.from(dirty).sort(function (a, b) { return a.depth - b.depth; });
          dirty.clear();
          for (var i = 0; i < list.length; i++) if (list[i].dirty && list[i].mounted) rerender(list[i]);
          runCommit();
        }
      } catch (e) {
        dirty.clear();
        commitQueue.length = 0;
        crash(e);
        throw e;
      } finally {
        flushing = false;
        restoreFocus(focus);
      }
    }

    // An error thrown while rendering unmounts the whole app, as in React 18 without an error boundary.
    function crash(e) {
      if (!e || typeof e !== 'object' || e.__rlDone || !e.__rlInst) return;
      e.__rlDone = true;
      var r = e.__rlInst.root;
      con.error('An error was thrown while rendering <' + nameOf(e.__rlInst.type) + '>. React removed the whole app from the page, because nothing caught the error.');
      if (!r) return;
      r.children.forEach(function (c) { teardown(c); });
      r.children = [];
      try { r.dom.textContent = ''; } catch (x) { /* ignore */ }
    }

    /* ---------- Instances ----------
       Every element on the page has an instance that remembers its DOM node (for tags and
       text), its hooks or class object (for components) and its child instances. */
    function makeInst(v, parent, mk) {
      return {
        kind: '', type: v.type, vnode: v, props: v.props, key: v.key, mk: mk, parent: parent,
        depth: parent.depth + 1, root: parent.root, ns: parent.ns, children: [], dom: null, mounted: true,
        dirty: false, hooks: null, comp: null, again: false, pendingEffects: [], callbacks: []
      };
    }

    function nearestHost(inst) {
      var p = inst.parent;
      while (p && !(p.kind === 'host' || p.kind === 'root')) p = p.parent;
      return p;
    }

    function domNodes(inst, out) {
      out = out || [];
      if (inst.kind === 'host' || inst.kind === 'text') out.push(inst.dom);
      else for (var i = 0; i < inst.children.length; i++) domNodes(inst.children[i], out);
      return out;
    }

    // Puts the DOM nodes of a host's children in order, moving only nodes that are out of place.
    function syncDom(parentDom, kids) {
      var want = [];
      for (var i = 0; i < kids.length; i++) domNodes(kids[i], want);
      var cur = parentDom.firstChild;
      for (var j = 0; j < want.length; j++) {
        var node = want[j];
        if (node === cur) { cur = cur.nextSibling; continue; }
        parentDom.insertBefore(node, cur);
      }
    }

    function mount(v, parent, mk) {
      var inst = makeInst(v, parent, mk), t = v.type;
      if (t === TEXT) {
        inst.kind = 'text';
        inst.dom = doc.createTextNode(v.props.nodeValue);
      } else if (typeof t === 'string') {
        mountHost(inst);
      } else if (t === FRAGMENT || t === STRICT || t === SUSPENSE) {
        inst.kind = 'frag';
        reconcile(inst, flatten(v.props.children, [], ''));
      } else if (t && t.$$provider) {
        inst.kind = 'provider';
        inst.subs = new Set();
        reconcile(inst, flatten(v.props.children, [], ''));
      } else if (t && t.$$consumer) {
        inst.kind = 'consumer';
        reconcile(inst, renderConsumer(inst));
      } else if (t && t.$$memo) {
        inst.kind = 'memo';
        reconcile(inst, [{ v: createElement(t.type, Object.assign({ ref: v.ref }, v.props)), mk: '.0' }]);
      } else if (t && t.$$forward) {
        inst.kind = 'fn';
        inst.hooks = []; inst.firstRender = true;
        reconcile(inst, renderFn(inst));
        queueEffects(inst);
      } else if (typeof t === 'function' && t.prototype && t.prototype.isReactComponent) {
        inst.kind = 'class';
        mountClass(inst);
      } else if (typeof t === 'function') {
        inst.kind = 'fn';
        inst.hooks = []; inst.firstRender = true;
        reconcile(inst, renderFn(inst));
        queueEffects(inst);
      } else {
        throw new Error('Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: ' +
          (t === undefined ? 'undefined' : typeof t) + '. Check that the component is defined and spelled correctly.');
      }
      return inst;
    }

    function update(inst, v) {
      var prev = inst.props;
      inst.vnode = v;
      inst.props = v.props;
      switch (inst.kind) {
        case 'text':
          if (prev.nodeValue !== v.props.nodeValue) inst.dom.nodeValue = v.props.nodeValue;
          break;
        case 'host':
          updateHost(inst, prev, v);
          break;
        case 'frag':
          reconcile(inst, flatten(v.props.children, [], ''));
          break;
        case 'provider':
          if (!Object.is(prev.value, v.props.value)) inst.subs.forEach(function (s) { requestRender(s); });
          reconcile(inst, flatten(v.props.children, [], ''));
          break;
        case 'consumer':
          reconcile(inst, renderConsumer(inst));
          break;
        case 'memo': {
          var cmp = inst.type.compare || shallowEqual;
          if (inst.dirty || !cmp(prev, v.props)) reconcile(inst, [{ v: createElement(inst.type.type, Object.assign({ ref: v.ref }, v.props)), mk: '.0' }]);
          break;
        }
        case 'class':
          updateClass(inst, prev);
          break;
        case 'fn':
          reconcile(inst, renderFn(inst));
          queueEffects(inst);
          break;
      }
      inst.dirty = false;
    }

    // A component whose own state changed draws itself again, then its host puts the DOM in order.
    function rerender(inst) {
      if (inst.kind === 'class') updateClass(inst, inst.props);
      else if (inst.kind === 'fn') { reconcile(inst, renderFn(inst)); queueEffects(inst); }
      else if (inst.kind === 'consumer') reconcile(inst, renderConsumer(inst));
      else if (inst.kind === 'memo') reconcile(inst, [{ v: createElement(inst.type.type, Object.assign({ ref: inst.vnode.ref }, inst.props)), mk: '.0' }]);
      inst.dirty = false;
      var host = nearestHost(inst);
      if (host) syncDom(host.dom, host.children);
    }

    // Matches new children to old ones by match key and type: same key and type = update in place,
    // otherwise mount a new one. Old children left over are unmounted.
    function reconcile(parent, items) {
      var old = new Map();
      parent.children.forEach(function (c) { old.set(c.mk, c); });
      var next = [], used = {};
      for (var i = 0; i < items.length; i++) {
        var it = items[i], mk = it.mk;
        if (used[mk]) { var n = 2; while (used[mk + '#' + n]) n++; mk = mk + '#' + n; }
        used[mk] = true;
        var prev = old.get(mk);
        if (prev && prev.type === it.v.type) { old.delete(mk); update(prev, it.v); next.push(prev); }
        else next.push(mount(it.v, parent, mk));
      }
      old.forEach(function (c) { unmount(c); });
      parent.children = next;
    }

    function unmount(inst) {
      var nodes = domNodes(inst, []);
      teardown(inst);
      nodes.forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
    }

    function teardown(inst) {
      if (!inst.mounted) return;
      inst.mounted = false;
      inst.dirty = false;
      if (inst.kind === 'class' && inst.comp && typeof inst.comp.componentWillUnmount === 'function') {
        try { inst.comp.componentWillUnmount(); } catch (e) { con.error(e); }
      }
      if (inst.hooks) inst.hooks.forEach(function (h) {
        h.dead = true;
        if (typeof h.cleanup === 'function') { try { h.cleanup(); } catch (e) { con.error(e); } }
        h.cleanup = null;
      });
      if (inst.subscribedTo) inst.subscribedTo.forEach(function (p) { p.subs.delete(inst); });
      if (inst.kind === 'host' && inst.vnode.ref) setRef(inst.vnode.ref, null);
      if (inst.kind === 'class' && inst.vnode.ref) setRef(inst.vnode.ref, null);
      inst.children.forEach(teardown);
    }

    function setRef(ref, value) {
      if (!ref) return;
      if (typeof ref === 'function') ref(value);
      else if (typeof ref === 'object') ref.current = value;
      else warnOnce('strref', 'String refs such as ref="' + ref + '" are no longer supported. Use useRef() and ref={myRef} instead.');
    }

    function shallowEqual(a, b) {
      if (Object.is(a, b)) return true;
      if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
      var ka = Object.keys(a), kb = Object.keys(b);
      if (ka.length !== kb.length) return false;
      for (var i = 0; i < ka.length; i++) if (!hasOwn.call(b, ka[i]) || !Object.is(a[ka[i]], b[ka[i]])) return false;
      return true;
    }

    /* ---------- Function components and hooks ---------- */
    function renderFn(inst) {
      var t = inst.type, out, count = 0;
      var prevR = rendering, prevH = hooksInst, prevI = hookIdx;
      try {
        do {
          if (++count > 25) throw new Error('Too many re-renders. React limits the number of renders to prevent an infinite loop. A state setter is probably being called during render, for example onClick={setCount(count + 1)} instead of onClick={() => setCount(count + 1)}.');
          inst.again = false;
          inst.pendingEffects = [];
          rendering = inst; hooksInst = inst; hookIdx = 0;
          out = t.$$forward ? t.$$forward(inst.props, inst.vnode.ref) : t(inst.props);
          if (!inst.firstRender && hookIdx < inst.hooks.length) {
            throw new Error('Rendered fewer hooks than expected. This may be caused by an accidental early return statement, or a Hook called inside a condition.');
          }
          inst.firstRender = false;
        } while (inst.again);
        if (out !== undefined && out !== null && typeof out === 'object' && typeof out.then === 'function') {
          throw new Error(nameOf(t) + ' returned a Promise. Components cannot be async functions: load data in a useEffect and keep it in state.');
        }
        if (Array.isArray(out)) validateKeys(out);
        return flatten(out, [], '');
      } catch (e) {
        if (e && typeof e === 'object' && !e.__rlInst) e.__rlInst = inst;
        throw e;
      } finally {
        rendering = prevR; hooksInst = prevH; hookIdx = prevI;
      }
    }

    function hookSlot(kind) {
      var inst = hooksInst;
      if (!inst) {
        throw new Error('Invalid hook call. Hooks can only be called inside the body of a function component (not in a class component, a regular function, a loop or an event handler).');
      }
      var i = hookIdx++;
      if (inst.firstRender) { inst.hooks.push({ kind: kind }); return inst.hooks[i]; }
      if (i >= inst.hooks.length) throw new Error('Rendered more hooks than during the previous render. Hooks must be called in the same order on every render.');
      if (inst.hooks[i].kind !== kind) {
        warnOnce('order:' + nameOf(inst.type), 'React has detected a change in the order of Hooks called by ' + nameOf(inst.type) +
          '. Previous render: ' + inst.hooks[i].kind + ', this render: ' + kind + '. Hooks must be called in the same order every time: never inside a condition, a loop or after an early return.');
      }
      return inst.hooks[i];
    }

    function depsChanged(a, b) {
      if (!a || !b) return true;
      if (a.length !== b.length) return true;
      for (var i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return true;
      return false;
    }

    function useState(init) {
      var h = hookSlot('useState'), inst = hooksInst;
      if (!h.init) {
        h.init = true;
        h.state = typeof init === 'function' ? init() : init;
        h.set = function (action) {
          if (h.dead) return;
          var next = typeof action === 'function' ? action(h.state) : action;
          if (Object.is(next, h.state)) return;
          h.state = next;
          requestRender(inst);
        };
      }
      return [h.state, h.set];
    }

    function useReducer(reducer, initArg, init) {
      var h = hookSlot('useReducer'), inst = hooksInst;
      h.reducer = reducer;
      if (!h.init) {
        h.init = true;
        h.state = init ? init(initArg) : initArg;
        h.dispatch = function (action) {
          if (h.dead) return;
          var next = h.reducer(h.state, action);
          if (Object.is(next, h.state)) return;
          h.state = next;
          requestRender(inst);
        };
      }
      return [h.state, h.dispatch];
    }

    function effectHook(kind, fn, deps) {
      var h = hookSlot(kind), inst = hooksInst;
      if (deps !== undefined && deps !== null && !Array.isArray(deps)) {
        warnOnce('deps:' + nameOf(inst.type), kind + ' received a final argument that is not an array (instead, received `' + typeof deps + '`). When specified, the final argument must be an array.');
      }
      if (!h.ran || deps == null || depsChanged(deps, h.deps)) {
        h.next = fn;
        h.nextDeps = deps;
        inst.pendingEffects.push(h);
      }
    }
    function useEffect(fn, deps) { effectHook('useEffect', fn, deps); }
    function useLayoutEffect(fn, deps) { effectHook('useLayoutEffect', fn, deps); }

    // After a function component's DOM is in place, run its effects (cleanup of the old run first).
    function queueEffects(inst) {
      if (!inst.pendingEffects.length) return;
      var list = inst.pendingEffects;
      inst.pendingEffects = [];
      commitQueue.push(function () {
        list.forEach(function (h) {
          if (h.dead) return;
          if (typeof h.cleanup === 'function') h.cleanup();
          h.cleanup = null;
          var r = h.next();
          if (r !== undefined && typeof r !== 'function') {
            warnOnce('effret:' + nameOf(inst.type), 'An effect function must not return anything besides a function, which is used for clean-up.' +
              (r && typeof r.then === 'function' ? ' It looks like you wrote useEffect(async () => ...) or returned a Promise. Instead, write the async function inside your effect and call it immediately.' : ''));
          } else h.cleanup = r || null;
          h.deps = h.nextDeps;
          h.ran = true;
        });
      });
    }

    function useRef(init) {
      var h = hookSlot('useRef');
      if (!h.ref) h.ref = { current: init };
      return h.ref;
    }
    function memoHook(kind, fn, deps) {
      var h = hookSlot(kind);
      if (!h.has || deps == null || depsChanged(deps, h.deps)) { h.value = fn(); h.deps = deps; h.has = true; }
      return h.value;
    }
    function useMemo(fn, deps) { return memoHook('useMemo', fn, deps); }
    function useCallback(fn, deps) { return memoHook('useCallback', function () { return fn; }, deps); }
    var idCount = 0;
    function useId() {
      var h = hookSlot('useId');
      if (!h.id) h.id = ':r' + (idCount++).toString(32) + ':';
      return h.id;
    }
    function useTransition() { hookSlot('useTransition'); return [false, function (fn) { fn(); }]; }
    function useDeferredValue(v) { hookSlot('useDeferredValue'); return v; }
    function useDebugValue() { /* only used by DevTools */ }

    /* ---------- Context ---------- */
    function createContext(defaultValue) {
      var ctx = { _default: defaultValue, displayName: undefined };
      ctx.Provider = { $$provider: ctx };
      ctx.Consumer = { $$consumer: ctx };
      return ctx;
    }
    function readContext(inst, ctx) {
      if (!ctx || !ctx.Provider) throw new Error('useContext() needs a context object created by React.createContext(), for example useContext(ThemeContext).');
      for (var p = inst.parent; p; p = p.parent) {
        if (p.kind === 'provider' && p.type.$$provider === ctx) {
          if (!p.subs.has(inst)) { p.subs.add(inst); (inst.subscribedTo = inst.subscribedTo || new Set()).add(p); }
          return p.props.value;
        }
      }
      return ctx._default;
    }
    function useContext(ctx) {
      hookSlot('useContext');
      return readContext(hooksInst, ctx);
    }
    function renderConsumer(inst) {
      var fn = inst.props.children;
      if (typeof fn !== 'function') throw new Error('A <Context.Consumer> expects a function as its only child, such as {value => <p>{value}</p>}.');
      var prevR = rendering;
      rendering = inst;
      try { return flatten(fn(readContext(inst, inst.type.$$consumer)), [], ''); }
      catch (e) { if (e && typeof e === 'object' && !e.__rlInst) e.__rlInst = inst; throw e; }
      finally { rendering = prevR; }
    }

    /* ---------- Class components ---------- */
    function Component(props, context) {
      this.props = props;
      this.context = context;
    }
    Component.prototype.isReactComponent = {};
    Component.prototype.setState = function (partial, cb) {
      var inst = this._rl;
      if (!inst) {
        warnOnce('ctor-setState:' + nameOf(this.constructor), 'Can\'t call setState on a component that is not yet mounted. In the constructor, assign to this.state directly instead: this.state = { ... }.');
        return;
      }
      if (!inst.mounted) return;
      if (rendering === inst) warnOnce('render-setState', 'Cannot update during an existing state transition (such as within `render`). Render methods should be a pure function of props and state.');
      var base = this._pending || this.state;
      var patch = typeof partial === 'function' ? partial(base, this.props) : partial;
      if (patch == null) return;
      this._pending = Object.assign({}, base, patch);
      if (typeof cb === 'function') inst.callbacks.push(cb);
      requestRender(inst);
    };
    Component.prototype.forceUpdate = function (cb) {
      var inst = this._rl;
      if (!inst || !inst.mounted) return;
      this._force = true;
      if (typeof cb === 'function') inst.callbacks.push(cb);
      requestRender(inst);
    };
    function PureComponent(props, context) { Component.call(this, props, context); }
    PureComponent.prototype = Object.create(Component.prototype);
    PureComponent.prototype.constructor = PureComponent;
    PureComponent.prototype.isPureReactComponent = true;

    function renderClass(inst) {
      var c = inst.comp, prevR = rendering, prevH = hooksInst;
      rendering = inst; hooksInst = null;
      try {
        if (typeof c.render !== 'function') throw new Error(nameOf(inst.type) + ': No `render` method found on the class. Did you forget to define render() { return ... }?');
        return flatten(c.render(), [], '');
      } catch (e) {
        if (e && typeof e === 'object' && !e.__rlInst) e.__rlInst = inst;
        throw e;
      } finally { rendering = prevR; hooksInst = prevH; }
    }

    function mountClass(inst) {
      var t = inst.type, ctx = t.contextType ? readContext(inst, t.contextType) : undefined, c;
      var prevR = rendering;
      rendering = inst;
      try { c = new t(inst.props, ctx); }
      catch (e) { if (e && typeof e === 'object' && !e.__rlInst) e.__rlInst = inst; throw e; }
      finally { rendering = prevR; }
      c.props = inst.props;
      c.context = ctx;
      if (c.state === undefined) c.state = null;
      c._rl = inst;
      inst.comp = c;
      if (typeof t.getDerivedStateFromProps === 'function') {
        var d = t.getDerivedStateFromProps(c.props, c.state);
        if (d) c.state = Object.assign({}, c.state, d);
      }
      reconcile(inst, renderClass(inst));
      if (inst.vnode.ref) commitQueue.push(function () { setRef(inst.vnode.ref, c); });
      if (typeof c.componentDidMount === 'function') commitQueue.push(function () { if (inst.mounted) c.componentDidMount(); });
    }

    function updateClass(inst, prevProps) {
      var c = inst.comp, t = inst.type;
      var nextProps = inst.props, prevState = c.state;
      var nextState = c._pending || c.state;
      c._pending = null;
      if (typeof t.getDerivedStateFromProps === 'function') {
        var d = t.getDerivedStateFromProps(nextProps, nextState);
        if (d) nextState = Object.assign({}, nextState, d);
      }
      if (t.contextType) c.context = readContext(inst, t.contextType);
      var force = c._force;
      c._force = false;
      var skip = !force && (typeof c.shouldComponentUpdate === 'function' ? c.shouldComponentUpdate(nextProps, nextState) === false
        : c.isPureReactComponent && shallowEqual(prevProps, nextProps) && shallowEqual(prevState, nextState));
      c.props = nextProps;
      c.state = nextState;
      var cbs = inst.callbacks;
      inst.callbacks = [];
      if (!skip) {
        reconcile(inst, renderClass(inst));
        if (typeof c.componentDidUpdate === 'function') commitQueue.push(function () { if (inst.mounted) c.componentDidUpdate(prevProps, prevState); });
      }
      if (cbs.length) commitQueue.push(function () { cbs.forEach(function (cb) { cb.call(c); }); });
    }

    /* ---------- Host elements (real tags) ---------- */
    var ATTR = {
      className: 'class', htmlFor: 'for', tabIndex: 'tabindex', readOnly: 'readonly', maxLength: 'maxlength', minLength: 'minlength',
      colSpan: 'colspan', rowSpan: 'rowspan', autoComplete: 'autocomplete', contentEditable: 'contenteditable', spellCheck: 'spellcheck',
      srcSet: 'srcset', crossOrigin: 'crossorigin', encType: 'enctype', acceptCharset: 'accept-charset', httpEquiv: 'http-equiv',
      noValidate: 'novalidate', formAction: 'formaction', formNoValidate: 'formnovalidate', inputMode: 'inputmode', enterKeyHint: 'enterkeyhint',
      dateTime: 'datetime', autoPlay: 'autoplay', playsInline: 'playsinline', referrerPolicy: 'referrerpolicy', allowFullScreen: 'allowfullscreen',
      hrefLang: 'hreflang', charSet: 'charset', useMap: 'usemap', frameBorder: 'frameborder', cellPadding: 'cellpadding', cellSpacing: 'cellspacing',
      accessKey: 'accesskey', xlinkHref: 'xlink:href', fetchPriority: 'fetchpriority'
    };
    var BOOL_ATTR = /^(disabled|hidden|required|readonly|multiple|autoplay|controls|loop|open|novalidate|formnovalidate|async|defer|reversed|allowfullscreen|itemscope|playsinline|default|inert|nomodule|disablepictureinpicture)$/;
    var SVG_KEEP = /^(viewBox|preserveAspectRatio|gradientTransform|gradientUnits|patternUnits|patternContentUnits|patternTransform|markerWidth|markerHeight|markerUnits|refX|refY|textLength|lengthAdjust|stdDeviation|clipPathUnits|maskUnits|maskContentUnits|pathLength|baseFrequency|numOctaves|filterUnits|primitiveUnits|spreadMethod|startOffset|tableValues|kernelMatrix|surfaceScale|specularExponent|diffuseConstant|edgeMode|xChannelSelector|yChannelSelector|attributeName|repeatCount|keyTimes|keySplines|calcMode)$/;
    var UNITLESS = /^(opacity|zIndex|fontWeight|lineHeight|flex|flexGrow|flexShrink|order|zoom|gridRow|gridColumn|gridArea|gridRowStart|gridRowEnd|gridColumnStart|gridColumnEnd|columnCount|columns|fillOpacity|strokeOpacity|strokeMiterlimit|animationIterationCount|aspectRatio|tabSize|orphans|widows|scale|flexOrder|lineClamp|WebkitLineClamp)$/;
    var FORM_TAG = /^(INPUT|TEXTAREA|SELECT)$/;

    function eventInfo(name) {
      var m = /^on([A-Z][A-Za-z]*?)(Capture)?$/.exec(name);
      if (!m) return null;
      var base = m[1];
      var alias = { DoubleClick: 'dblclick', Focus: 'focusin', Blur: 'focusout' }[base];
      return { type: alias || base.toLowerCase(), capture: !!m[2] };
    }

    function trackValue(dom) {
      if (dom.type === 'checkbox' || dom.type === 'radio') return String(dom.checked);
      if (dom.tagName === 'SELECT' && dom.multiple) return Array.prototype.filter.call(dom.options, function (o) { return o.selected; }).map(function (o) { return o.value; }).join('\u0000');
      return dom.value;
    }

    // One listener per element and event type; it reads the element's latest props when it fires.
    function listen(dom, type, capture) {
      var key = type + (capture ? ':c' : '');
      var l = dom.__rlL || (dom.__rlL = {});
      if (l[key]) return;
      l[key] = true;
      dom.addEventListener(type, function (e) { dispatch(dom, e, type, capture); }, capture);
    }

    function dispatch(dom, e, type, capture) {
      var props = dom.__rlP;
      if (!props) return;
      var handlers = [], form = FORM_TAG.test(dom.tagName) && !capture;
      for (var name in props) {
        if (name.charCodeAt(0) !== 111 || name.charCodeAt(1) !== 110 || name === 'onChange' || name === 'onChangeCapture') continue;
        var info = eventInfo(name);
        if (info && info.type === type && info.capture === capture && typeof props[name] === 'function') handlers.push(props[name]);
      }
      // onChange fires whenever the value really changed (on input, change or click), like React.
      if (form && (type === 'input' || type === 'change' || type === 'click')) {
        var v = trackValue(dom);
        if (v !== dom.__rlT) {
          dom.__rlT = v;
          if (typeof props.onChange === 'function') handlers.push(props.onChange);
        }
      }
      if (!handlers.length && !form) return;
      try { if (!('nativeEvent' in e)) { e.nativeEvent = e; e.persist = function () {}; } } catch (x) { /* ignore */ }
      batchedUpdates(function () { handlers.forEach(function (fn) { fn.call(undefined, e); }); });
      if (form) restoreControlled(dom);
    }

    // A controlled field shows exactly what state says, even if the handler did not update it.
    function restoreControlled(dom) {
      var p = dom.__rlP;
      if (!p) return;
      if (p.value != null && dom.tagName !== 'SELECT' && dom.type !== 'checkbox' && dom.type !== 'radio' && dom.value !== String(p.value)) dom.value = String(p.value);
      if (p.value != null && dom.tagName === 'SELECT') setSelectValue(dom, p.value);
      if (p.checked != null && dom.checked !== !!p.checked) dom.checked = !!p.checked;
      dom.__rlT = trackValue(dom);
    }

    function setSelectValue(dom, value) {
      if (dom.multiple) {
        var want = (Array.isArray(value) ? value : [value]).map(String);
        Array.prototype.forEach.call(dom.options, function (o) { o.selected = want.indexOf(o.value) >= 0; });
      } else if (dom.value !== String(value)) dom.value = String(value);
    }

    function setStyle(dom, k, v) {
      if (v == null || typeof v === 'boolean') v = '';
      else if (typeof v === 'number' && v !== 0 && !UNITLESS.test(k) && k.indexOf('--') !== 0) v = v + 'px';
      if (k.indexOf('-') >= 0) {
        if (k.indexOf('--') !== 0) warnOnce('style-' + k, 'Unsupported style property ' + k + '. Did you mean ' + k.replace(/-([a-z])/g, function (m, c) { return c.toUpperCase(); }) + '?');
        dom.style.setProperty(k, String(v));
      } else dom.style[k] = String(v);
    }
    function patchStyle(dom, prev, next) {
      if (typeof next === 'string') throw new Error('The `style` prop expects a mapping from style properties to values, not a string. For example, style={{ marginRight: spacing + \'em\' }} when using JSX.');
      prev = prev && typeof prev === 'object' ? prev : {};
      next = next || {};
      var k;
      for (k in prev) if (!(k in next)) setStyle(dom, k, '');
      for (k in next) if (next[k] !== prev[k]) setStyle(dom, k, next[k]);
    }

    function setProp(inst, dom, name, value, prev, first) {
      if (name === 'children' || name === 'key' || name === 'ref' || name === '__self' || name === '__source' || name === 'suppressHydrationWarning' || name === 'suppressContentEditableWarning') return;
      if (name === 'style') { patchStyle(dom, prev, value); return; }
      if (name === 'dangerouslySetInnerHTML') {
        var html = value && value.__html != null ? String(value.__html) : '';
        if (first || !prev || prev.__html !== html) dom.innerHTML = html;
        return;
      }
      if (name.length > 2 && name.charCodeAt(0) === 111 && name.charCodeAt(1) === 110) {
        if (/^on[A-Z]/.test(name)) {
          if (value != null && typeof value !== 'function') {
            warnOnce('fn:' + name, 'Expected `' + name + '` listener to be a function, instead got a value of `' + typeof value + '` type. Pass the function itself, ' +
              name + '={handleClick}, or wrap a call in an arrow function, ' + name + '={() => handleClick(id)}.');
          }
          var info = eventInfo(name);
          if (info && name !== 'onChange' && name !== 'onChangeCapture') listen(dom, info.type, info.capture);
          return;
        }
        warnOnce('lc:' + name, 'Invalid event handler property `' + name + '`. Did you mean `on' + name.charAt(2).toUpperCase() + name.slice(3) + '`?');
        return;
      }
      // On form controls, value and checked are set after the children exist (see formProps).
      // Anywhere else (<option value>, <li value>, <progress value>) value is an ordinary attribute.
      if (name === 'autoFocus') return;
      if ((name === 'value' || name === 'defaultValue' || name === 'checked' || name === 'defaultChecked') && FORM_TAG.test(dom.tagName)) return;
      if (name === 'defaultValue' || name === 'defaultChecked') return;
      if (name === 'selected' || name === 'muted' || name === 'indeterminate') { dom[name] = !!value; return; }
      if (name === 'class') warnOnce('class', 'Invalid DOM property `class`. Did you mean `className`?');
      if (name === 'for') warnOnce('for', 'Invalid DOM property `for`. Did you mean `htmlFor`?');
      var attr = ATTR[name] || name;
      if (inst.ns === SVG_NS && !ATTR[name] && !SVG_KEEP.test(name) && /[A-Z]/.test(name) && !/^(aria|data)/.test(name)) {
        attr = name.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); });
      }
      if (value == null) { dom.removeAttribute(attr); return; }
      if (typeof value === 'function' || typeof value === 'symbol') {
        warnOnce('badval:' + name, 'Invalid value for prop `' + name + '` on <' + inst.type + '> tag. Either remove it from the element, or pass a string or number value.');
        dom.removeAttribute(attr);
        return;
      }
      if (typeof value === 'boolean') {
        if (/^(aria-|data-)/.test(attr) || /^(draggable|spellcheck|contenteditable)$/.test(attr)) dom.setAttribute(attr, String(value));
        else if (BOOL_ATTR.test(attr.toLowerCase())) { if (value) dom.setAttribute(attr, ''); else dom.removeAttribute(attr); }
        else {
          warnOnce('bool:' + name, 'Received `' + value + '` for a non-boolean attribute `' + name + '`. If you want to write it to the DOM, pass a string instead: ' + name + '="' + value + '" or ' + name + '={value.toString()}.');
          dom.removeAttribute(attr);
        }
        return;
      }
      if (attr === 'xlink:href') dom.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', String(value));
      else dom.setAttribute(attr, String(value));
    }

    function patchProps(inst, prev, next, first) {
      var dom = inst.dom, k;
      dom.__rlP = next;
      if ('type' in next && (first || prev.type !== next.type)) setProp(inst, dom, 'type', next.type, prev.type, first);
      for (k in prev) if (!(k in next) && k !== 'type') setProp(inst, dom, k, null, prev[k], first);
      for (k in next) if (k !== 'type' && (first || next[k] !== prev[k])) setProp(inst, dom, k, next[k], prev[k], first);
      if (FORM_TAG.test(dom.tagName)) { listen(dom, 'input', false); listen(dom, 'change', false); listen(dom, 'click', false); }
    }

    // value and checked are set after the children exist, so a <select> already has its options.
    function formProps(inst, prev, next, first) {
      var dom = inst.dom, tag = dom.tagName;
      if (!FORM_TAG.test(tag)) return;
      var controlled = next.value !== undefined || next.checked !== undefined;
      if (first && controlled && typeof next.onChange !== 'function' && !next.readOnly && !next.disabled) {
        warnOnce('ro:' + tag, 'You provided a `' + (next.value !== undefined ? 'value' : 'checked') + '` prop to a form field without an `onChange` handler. This will render a read-only field. If the field should be mutable use `' +
          (next.value !== undefined ? 'defaultValue' : 'defaultChecked') + '`. Otherwise, set either `onChange` or `readOnly`.');
      }
      if (!first && prev.value === undefined && next.value !== undefined && next.type !== 'checkbox' && next.type !== 'radio') {
        warnOnce('u2c', 'A component is changing an uncontrolled input to be controlled. This is likely caused by the value changing from undefined to a defined value, which should not happen. Start the state with a value, such as useState(\'\').');
      }
      if (!first && prev.value !== undefined && next.value === undefined && next.type !== 'checkbox' && next.type !== 'radio') {
        warnOnce('c2u', 'A component is changing a controlled input to be uncontrolled. This is likely caused by the value changing from a defined value to undefined, which should not happen.');
      }
      if (next.value === null) warnOnce('nullval', '`value` prop on `' + tag.toLowerCase() + '` should not be null. Consider using an empty string to clear the component.');
      if (next.value != null) {
        if (tag === 'SELECT') setSelectValue(dom, next.value);
        else if (next.type === 'checkbox' || next.type === 'radio') { if (dom.value !== String(next.value)) dom.value = String(next.value); }
        else if (dom.value !== String(next.value)) dom.value = String(next.value);
      } else if (first && next.defaultValue != null) {
        if (tag === 'SELECT') setSelectValue(dom, next.defaultValue); else dom.value = String(next.defaultValue);
      }
      if (next.checked != null) { if (dom.checked !== !!next.checked) dom.checked = !!next.checked; }
      else if (first && next.defaultChecked != null) dom.checked = !!next.defaultChecked;
      dom.__rlT = trackValue(dom);
    }

    function hostChildren(inst, props) {
      if (props.dangerouslySetInnerHTML) return [];
      if (inst.type === 'textarea') {
        if (props.children != null) warnOnce('tachild', 'Use the `defaultValue` or `value` props instead of setting children on <textarea>.');
        return [];
      }
      try { return flatten(props.children, [], ''); }
      catch (e) {
        // Blame the component that drew this tag, which is the one the student has to fix.
        var owner = inst;
        while (owner.parent && owner.kind !== 'fn' && owner.kind !== 'class') owner = owner.parent;
        if (e && typeof e === 'object' && !e.__rlInst) e.__rlInst = owner.kind === 'root' ? inst : owner;
        throw e;
      }
    }

    function mountHost(inst) {
      var t = inst.type, p = inst.props;
      inst.kind = 'host';
      if (t === 'svg') inst.ns = SVG_NS;
      else if (inst.parent.ns === SVG_NS && inst.parent.type === 'foreignObject') inst.ns = null;
      var dom = inst.ns ? doc.createElementNS(inst.ns, t) : doc.createElement(t);
      inst.dom = dom;
      if (t === 'foreignObject') inst.ns = SVG_NS;
      patchProps(inst, {}, p, true);
      if (t === 'textarea' && p.value == null && p.defaultValue == null && p.children != null) dom.value = String(p.children);
      reconcile(inst, hostChildren(inst, p));
      for (var i = 0; i < inst.children.length; i++) domNodes(inst.children[i]).forEach(function (n) { dom.appendChild(n); });
      formProps(inst, {}, p, true);
      inst.vnodeRef = inst.vnode.ref;
      if (inst.vnode.ref) commitQueue.push(function () { if (inst.mounted) setRef(inst.vnode.ref, dom); });
      if (p.autoFocus) commitQueue.push(function () { if (inst.mounted) try { dom.focus(); } catch (e) { /* ignore */ } });
    }

    function updateHost(inst, prev, v) {
      var oldRef = inst.vnodeRef, next = v.props;
      patchProps(inst, prev, next, false);
      reconcile(inst, hostChildren(inst, next));
      syncDom(inst.dom, inst.children);
      formProps(inst, prev, next, false);
      inst.vnodeRef = v.ref;
      if (oldRef !== v.ref) {
        setRef(oldRef, null);
        commitQueue.push(function () { setRef(v.ref, inst.dom); });
      }
    }

    /* ---------- Roots ---------- */
    function makeRoot(container) {
      if (!container || (container.nodeType !== 1 && container.nodeType !== 11)) {
        throw new Error('Target container is not a DOM element. Check that the element exists, for example that document.getElementById(\'root\') matches an id in your HTML.');
      }
      var r = { kind: 'root', type: 'root', dom: container, children: [], depth: 0, mounted: true, parent: null, started: false,
        ns: container.namespaceURI === SVG_NS ? SVG_NS : null };
      r.root = r;
      return r;
    }
    function renderRoot(r, el) {
      if (!r.started) { r.started = true; r.dom.textContent = ''; }
      try {
        batchedUpdates(function () {
          reconcile(r, flatten(el, [], ''));
          syncDom(r.dom, r.children);
        });
      } catch (e) { crash(e); throw e; }
    }
    function createRoot(container) {
      var r = makeRoot(container);
      if (container.__rlRoot) {
        warnOnce('dbl-root', 'You are calling createRoot() on a container that has already been passed to createRoot() before. Instead, call root.render() on the existing root if you want to update it.');
      }
      container.__rlRoot = r;
      return {
        render: function (el) {
          if (arguments.length > 1) warnOnce('render-cb', 'root.render() takes only one argument: the element to draw, such as root.render(<App />).');
          renderRoot(r, el);
        },
        unmount: function () {
          batchedUpdates(function () { r.children.forEach(unmount); r.children = []; });
        }
      };
    }
    function legacyRender(el, container, cb) {
      warnOnce('legacy', 'ReactDOM.render is no longer supported in React 18. Use createRoot instead: ReactDOM.createRoot(container).render(element). Until you switch to the new API, your app behaves as if it is running React 17.');
      var r = container && container.__rlLegacy;
      if (!r) { r = makeRoot(container); container.__rlLegacy = r; }
      renderRoot(r, el);
      if (typeof cb === 'function') cb();
    }

    /* ---------- Small extras ---------- */
    function forEachChild(children, fn) {
      var i = 0;
      (function walk(c) {
        if (c == null || typeof c === 'boolean') return;
        if (Array.isArray(c)) { c.forEach(walk); return; }
        fn(c, i++);
      })(children);
    }
    var Children = {
      map: function (children, fn) { var out = []; forEachChild(children, function (c, i) { var r = fn(c, i); if (r != null) out.push(r); }); return out; },
      forEach: function (children, fn) { forEachChild(children, fn); },
      count: function (children) { var n = 0; forEachChild(children, function () { n++; }); return n; },
      toArray: function (children) { var out = []; forEachChild(children, function (c) { out.push(c); }); return out; },
      only: function (children) {
        if (!isValidElement(children)) throw new Error('React.Children.only expected to receive a single React element child.');
        return children;
      }
    };
    function memo(type, compare) { return { $$memo: true, type: type, compare: compare || null }; }
    function forwardRef(render) { return { $$forward: render }; }

    var React = {
      version: '18.3.1-lite',
      createElement: createElement, cloneElement: cloneElement, isValidElement: isValidElement,
      Fragment: FRAGMENT, StrictMode: STRICT, Suspense: SUSPENSE, Children: Children,
      Component: Component, PureComponent: PureComponent, createContext: createContext,
      memo: memo, forwardRef: forwardRef, createRef: function () { return { current: null }; },
      useState: useState, useReducer: useReducer, useEffect: useEffect, useLayoutEffect: useLayoutEffect,
      useRef: useRef, useMemo: useMemo, useCallback: useCallback, useContext: useContext, useId: useId,
      useTransition: useTransition, useDeferredValue: useDeferredValue, useDebugValue: useDebugValue
    };
    var ReactDOM = {
      version: React.version, createRoot: createRoot, render: legacyRender,
      flushSync: function (fn) { return batchedUpdates(fn); },
      unstable_batchedUpdates: batchedUpdates
    };
    g.React = React;
    g.ReactDOM = ReactDOM;

    // localStorage needs no handling here: course.js gives every playground preview its own
    // corner of storage, so a student's localStorage.clear() never wipes the course progress.
    return { React: React, ReactDOM: ReactDOM };
  }

  /* ---------- JSX compiler ----------
     Turns JSX into React.createElement(...) calls. Line breaks stay where they were (each one
     is written just before the next piece of output), so a runtime error on line 12 of the
     student's code is still reported as line 12. import/export lines become plain code,
     because a playground is a single classic script. */
  var ENTITIES = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', copy: '©', reg: '®', trade: '™', hellip: '…', mdash: '—',
    ndash: '–', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', bull: '•', middot: '·', times: '×', divide: '÷', deg: '°',
    euro: '€', pound: '£', yen: '¥', cent: '¢', larr: '←', rarr: '→', uarr: '↑', darr: '↓', hearts: '♥', star: '☆', laquo: '«', raquo: '»'
  };
  function decodeEntities(s) {
    return s.replace(/&(#x[0-9a-fA-F]+|#\d+|[A-Za-z]+);/g, function (m, e) {
      if (e.charAt(0) === '#') {
        var cp = e.charAt(1).toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        try { return String.fromCodePoint(cp); } catch (x) { return m; }
      }
      return hasOwnProp(ENTITIES, e) ? ENTITIES[e] : m;
    });
  }
  function hasOwnProp(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function countLines(s) { var m = s.match(/\r\n|\r|\n/g); return m ? m.length : 0; }

  // JSX text rules (as in Babel): lines are trimmed, blank lines dropped, and the remaining
  // lines joined with one space. Text that sits on a single line keeps its spaces.
  function jsxText(raw) {
    var lines = raw.split(/\r\n|\n|\r/), last = 0, out = '';
    for (var i = 0; i < lines.length; i++) if (/[^ \t]/.test(lines[i])) last = i;
    for (var j = 0; j < lines.length; j++) {
      var t = lines[j].replace(/\t/g, ' ');
      if (j !== 0) t = t.replace(/^ +/, '');
      if (j !== lines.length - 1) t = t.replace(/ +$/, '');
      if (t) { if (j !== last) t += ' '; out += t; }
    }
    return out;
  }

  function importCode(what, from) {
    var lib = from === 'react' ? 'React' : (from === 'react-dom' || from === 'react-dom/client') ? 'ReactDOM' : null;
    if (!lib) return '/* import from "' + from.replace(/\*\//g, '') + '" skipped: a playground is one file */';
    var parts = [], m;
    var named = /\{([^}]*)\}/.exec(what);
    var rest = what.replace(/\{[^}]*\}/, '').replace(/,/g, ' ').trim();
    if ((m = /^\*\s+as\s+([A-Za-z_$][\w$]*)$/.exec(rest))) { if (m[1] !== lib) parts.push('const ' + m[1] + ' = ' + lib + ';'); }
    else if (rest && rest !== lib) parts.push('const ' + rest + ' = ' + lib + ';');
    if (named) {
      var names = named[1].split(',').map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) {
        var a = /^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/.exec(s);
        return a ? a[1] + ': ' + a[2] : s;
      });
      if (names.length) parts.push('const { ' + names.join(', ') + ' } = ' + lib + ';');
    }
    return parts.join(' ');
  }

  function rewriteModules(src) {
    var pad = function (m, code) { return code + '\n'.repeat(countLines(m)); };
    // Side-effect imports first: import './App.css';
    src = src.replace(/^([ \t]*)import\s*(['"])([^'"\n]+)\2[ \t]*;?/gm, function (m, ind, q, from) {
      return pad(m, ind + '/* import "' + from.replace(/\*\//g, '') + '" skipped: a playground is one file */');
    });
    src = src.replace(/^([ \t]*)import\s+([^;'"]*?)\s*from\s*(['"])([^'"\n]+)\3[ \t]*;?/gm, function (m, ind, what, q, from) {
      return pad(m, ind + importCode(what.trim(), from));
    });
    src = src.replace(/^([ \t]*)export\s+default\s+(?=(?:async\s+)?function\b|class\b)/gm, '$1');
    src = src.replace(/^([ \t]*)export\s+default\s+/gm, '$1var __defaultExport = ');
    src = src.replace(/^([ \t]*)export\s+(?=(?:const|let|var|function|class|async)\b)/gm, '$1');
    src = src.replace(/^([ \t]*)export\s*\{[^}]*\}(?:\s*from\s*(['"])[^'"\n]*\2)?[ \t]*;?/gm, function (m, ind) {
      return pad(m, ind + '/* export list skipped */');
    });
    return src;
  }

  var KW_BEFORE_EXPR = /^(return|case|yield|await|else|do|in|of|typeof|void|delete|throw|new|default|instanceof|extends)$/;

  function compileJSX(src) {
    var n = src.length;
    function lineAt(i) { return countLines(src.slice(0, Math.max(0, i))) + 1; }
    function fail(msg, i) { var e = new SyntaxError(msg); e.line = lineAt(i); throw e; }

    // Copies JavaScript from i, compiling any JSX inside it. With untilBrace, it stops at the }
    // that closes a {expression} opened at openAt, and returns that brace's index as end.
    function js(i, untilBrace, openAt) {
      var out = '', depth = 0, prev = '';
      while (i < n) {
        var c = src[i];
        if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { out += c; i++; continue; }
        if (c === '/' && src[i + 1] === '/') { var e1 = src.indexOf('\n', i); if (e1 < 0) e1 = n; out += src.slice(i, e1); i = e1; continue; }
        if (c === '/' && src[i + 1] === '*') { var e2 = src.indexOf('*/', i + 2); e2 = e2 < 0 ? n : e2 + 2; out += src.slice(i, e2); i = e2; continue; }
        if (c === '"' || c === "'") {
          var j = i + 1;
          while (j < n && src[j] !== c && src[j] !== '\n') { if (src[j] === '\\') j++; j++; }
          j = Math.min(n, j + 1);
          out += src.slice(i, j); i = j; prev = 'x'; continue;
        }
        if (c === '`') {
          out += '`'; i++;
          while (i < n && src[i] !== '`') {
            if (src[i] === '\\') { out += src.slice(i, i + 2); i += 2; continue; }
            if (src[i] === '$' && src[i + 1] === '{') { var r = js(i + 2, true, i + 1); out += '${' + r.out + '}'; i = r.end + 1; continue; }
            out += src[i]; i++;
          }
          if (i < n) { out += '`'; i++; }
          prev = 'x'; continue;
        }
        if (c === '/' && (prev === '' || /[(,=:[!&|?{};+\-*%<>~^]/.test(prev))) {
          var re = /\/(?![*\/])(?:[^\/\\\n\[]|\\.|\[(?:[^\]\\\n]|\\.)*\])+\/[a-z]*/y;
          re.lastIndex = i;
          var rm = re.exec(src);
          if (rm) { out += rm[0]; i += rm[0].length; prev = 'x'; continue; }
        }
        if (/[A-Za-z_$]/.test(c)) {
          var idr = /[A-Za-z_$][\w$]*/y; idr.lastIndex = i;
          var w = idr.exec(src)[0];
          out += w; i += w.length;
          prev = KW_BEFORE_EXPR.test(w) && prev !== '.' ? '(' : 'x';
          continue;
        }
        if (/[0-9]/.test(c)) {
          var nr = /(?:0[xXbBoO][0-9a-fA-F_]+|\d[\d_]*(?:\.\d*)?(?:[eE][+-]?\d+)?n?)/y; nr.lastIndex = i;
          var num = nr.exec(src)[0];
          out += num; i += num.length; prev = 'x'; continue;
        }
        if (c === '<' && /[A-Za-z_$>]/.test(src[i + 1] || '') && (prev === '' || /[(,=:?[{};&|!>]/.test(prev))) {
          var el = element(i);
          out += el.out; i = el.end; prev = 'x';
          // Two elements side by side (<h1/> <p/>) cannot both be returned: JSX needs one root.
          var peek = i;
          while (peek < n) {
            if (/\s/.test(src[peek])) { peek++; continue; }
            if (src[peek] === '/' && src[peek + 1] === '/') { var nlAt = src.indexOf('\n', peek); peek = nlAt < 0 ? n : nlAt; continue; }
            if (src[peek] === '/' && src[peek + 1] === '*') { var ce = src.indexOf('*/', peek + 2); peek = ce < 0 ? n : ce + 2; continue; }
            break;
          }
          if (src[peek] === '<' && /[A-Za-z_$>]/.test(src[peek + 1] || '')) {
            fail('Adjacent JSX elements must be wrapped in an enclosing tag. Did you want a JSX fragment <>...</>?', peek);
          }
          continue;
        }
        if (c === '{') depth++;
        else if (c === '}') {
          if (untilBrace && depth === 0) return { out: out, end: i };
          depth--;
        }
        out += c; i++; prev = c;
      }
      if (untilBrace) fail('A JSX {expression} was opened but never closed with }.', openAt);
      return { out: out, end: i };
    }

    var reName = /[A-Za-z_$][\w$]*(?:[.:-][A-Za-z_$][\w$]*)*/y;
    var reAttr = /[A-Za-z_$][\w$]*(?:[:-][\w$]+)*/y;
    function read(re, i) { re.lastIndex = i; var m = re.exec(src); return m ? m[0] : ''; }
    function tagCode(name) {
      if (name.indexOf('.') >= 0) return name;
      return /^[a-z]/.test(name) || /[-:]/.test(name) ? JSON.stringify(name) : name;
    }

    function element(start) {
      var i = start + 1, pending = 0;
      var ws = function () { var s = i; while (i < n && /\s/.test(src[i])) i++; pending += countLines(src.slice(s, i)); };
      var piece = function (code) { var p = '\n'.repeat(pending) + code; pending = 0; return p; };
      ws();
      var name = '';
      if (src[i] !== '>') {
        name = read(reName, i);
        if (!name) fail('Expected a tag name after <.', start);
        i += name.length;
      }
      var label = name ? '<' + name + '>' : 'fragment <>';
      var attrs = [], selfClosing = false;
      for (;;) {
        ws();
        if (i >= n) fail('The tag ' + label + ' is never finished with > or />.', start);
        if (src[i] === '/' && src[i + 1] === '>') { i += 2; selfClosing = true; break; }
        if (src[i] === '>') { i++; break; }
        if (!name) fail('A fragment <> cannot have attributes. Use <React.Fragment key={...}> if you need a key.', i);
        if (src[i] === '{') {
          var j = i + 1;
          while (j < n && /\s/.test(src[j])) j++;
          if (src.slice(j, j + 3) !== '...') fail('Inside a tag, {braces} must hold a spread like {...props}. Attributes are written name={value}.', i);
          var sp = js(j + 3, true, i);
          attrs.push(piece('...' + sp.out));
          i = sp.end + 1;
          continue;
        }
        var an = read(reAttr, i);
        if (!an) fail('Unexpected character "' + src[i] + '" inside the ' + label + ' tag.', i);
        i += an.length;
        var key = /^[A-Za-z_$][\w$]*$/.test(an) ? an : JSON.stringify(an);
        var k = i;
        while (k < n && /\s/.test(src[k])) k++;
        if (src[k] !== '=') { attrs.push(piece(key + ': true')); continue; }
        ws(); i++; ws();
        var q = src[i];
        if (q === '"' || q === "'") {
          var e = src.indexOf(q, i + 1);
          if (e < 0) fail('The value of ' + an + ' starts with a quote that is never closed.', i);
          var raw = src.slice(i + 1, e);
          attrs.push(piece(key + ': ' + JSON.stringify(decodeEntities(raw))));
          pending += countLines(raw);
          i = e + 1;
        } else if (q === '{') {
          var ex = js(i + 1, true, i);
          if (!ex.out.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '').trim()) fail('JSX attributes must only be assigned a non-empty {expression}.', i);
          attrs.push(piece(key + ': ' + ex.out));
          i = ex.end + 1;
        } else if (q === '<') {
          var inner = element(i);
          attrs.push(piece(key + ': ' + inner.out));
          i = inner.end;
        } else fail('The value of ' + an + ' must be in quotes ("text") or braces ({expression}).', i);
      }
      var code = 'React.createElement(' + (name ? tagCode(name) : 'React.Fragment') + ', ' + (attrs.length ? '{' + attrs.join(', ') + '}' : 'null');
      if (selfClosing) return { out: code + piece(')'), end: i };
      var kids = [];
      for (;;) {
        if (i >= n) fail('Unterminated JSX contents: ' + label + ' was opened here but never closed' + (name ? ' with </' + name + '>.' : ' with </>.'), start);
        var c = src[i];
        if (c === '<' && src[i + 1] === '/') {
          var at = i;
          i += 2; ws();
          var cn = read(reName, i);
          i += cn.length; ws();
          if (src[i] !== '>') fail('Expected > to finish the closing tag </' + cn + '.', at);
          i++;
          if (cn !== name) {
            fail(name ? 'Expected corresponding JSX closing tag for <' + name + '>' + (cn ? ', but found </' + cn + '>.' : ', but found </>.') :
              'Expected </> to close the fragment, but found </' + cn + '>.', at);
          }
          break;
        }
        if (c === '<') { var ch = element(i); kids.push(piece(ch.out)); i = ch.end; continue; }
        if (c === '{') {
          var x = js(i + 1, true, i);
          if (x.out.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '').trim()) kids.push(piece(x.out));
          else pending += countLines(x.out);
          i = x.end + 1;
          continue;
        }
        var s = i;
        while (i < n && src[i] !== '<' && src[i] !== '{') i++;
        var text = src.slice(s, i), t = jsxText(text);
        if (t) kids.push(piece(JSON.stringify(decodeEntities(t))));
        pending += countLines(text);
      }
      return { out: code + (kids.length ? ', ' + kids.join(', ') : '') + piece(')'), end: i };
    }

    return js(0, false, 0).out;
  }

  function transform(src) {
    return compileJSX(rewriteModules(String(src == null ? '' : src)));
  }

  var api = { label: 'Preview', preview: reactLite, transform: transform };
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (root && root.WD1) {
    root.WD1.runtimes = root.WD1.runtimes || {};
    root.WD1.runtimes.react = api;
  }
})(typeof window !== 'undefined' ? window : this);
