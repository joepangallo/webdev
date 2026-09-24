/* ==========================================================================
   Web Development I: course runtime
   Load this in <head> WITHOUT defer. It exposes window.WD1 immediately and
   builds the page shell + interactive components on DOMContentLoaded.
   Page scripts should wrap their code in WD1.ready(() => { ... }).
   See docs/AUTHORING.md for every component's markup.
   ========================================================================== */
(function () {
  'use strict';

  const WD1 = (window.WD1 = window.WD1 || {});

  /* ---------- Paths ---------- */

  const scriptEl = document.currentScript;
  const BASE = scriptEl && scriptEl.src
    ? scriptEl.src.replace(/assets\/js\/course\.js(?:[?#].*)?$/, '')
    : './';
  WD1.base = BASE;
  WD1.url = (p) => BASE + p;

  /* ---------- Course manifest (single source of truth) ---------- */

  WD1.OBJECTIVES = [
    'Identify the technologies and protocols used in hosting and developing applications on the web',
    'Build appropriately structured and valid web pages using HTML',
    'Implement CSS syntax to layout and format HTML elements and style web pages',
    'Examine the box and document object models used to structure and layout web page elements',
    'Discuss responsive web design principles and how they are used to build cross-platform applications',
    'Design responsive web pages that incorporate images, tables, forms, and navigation menus',
    'Code interactive web pages that respond to user input and events using JavaScript',
    'Distinguish between various frameworks and third-party tools used to enhance the web development process'
  ];

  WD1.MODULES = [
    {
      id: 'ch2', num: '2', label: 'Chapter 2', title: 'How the Web Works', href: 'ch2/index.html', page: 42,
      blurb: 'Protocols, DNS, URLs, HTTP, browsers and servers: what happens between typing an address and seeing a page.',
      sections: [
        { id: 's2-1', num: '2.1', title: 'Internet Protocols', page: 43, obj: [1] },
        { id: 's2-2', num: '2.2', title: 'Domain Name System', page: 49, obj: [1] },
        { id: 's2-3', num: '2.3', title: 'Uniform Resource Locators', page: 58, obj: [1] },
        { id: 's2-4', num: '2.4', title: 'Hypertext Transfer Protocol', page: 60, obj: [1] },
        { id: 's2-5', num: '2.5', title: 'Web Browsers', page: 64, obj: [1, 4] },
        { id: 's2-6', num: '2.6', title: 'Web Servers', page: 69, obj: [1] },
        { id: 's2-review', num: 'R', title: 'Chapter 2 Review', obj: [1] }
      ]
    },
    {
      id: 'ch3', num: '3', label: 'Chapter 3', title: 'HTML 1: Introduction', href: 'ch3/index.html', page: 73,
      blurb: 'Elements, attributes, nesting and semantic structure: writing HTML that means what it says.',
      sections: [
        { id: 's3-1', num: '3.1', title: 'What Is HTML and Where Did It Come From?', page: 74, obj: [2] },
        { id: 's3-2', num: '3.2', title: 'HTML Syntax', page: 79, obj: [2] },
        { id: 's3-3', num: '3.3', title: 'Semantic Markup', page: 81, obj: [2] },
        { id: 's3-4', num: '3.4', title: 'Structure of HTML Documents', page: 84, obj: [2, 4] },
        { id: 's3-5', num: '3.5', title: 'Quick Tour of HTML Elements', page: 87, obj: [2, 6] },
        { id: 's3-6', num: '3.6', title: 'HTML5 Semantic Structure Elements', page: 102, obj: [2, 6] },
        { id: 's3-review', num: 'R', title: 'Chapter 3 Review', obj: [2] }
      ]
    },
    {
      id: 'ch4', num: '4', label: 'Chapter 4', title: 'CSS 1: Selectors and Basic Styling', href: 'ch4/index.html', page: 122,
      blurb: 'Rules, selectors, the cascade, the box model and typography: turning structure into design.',
      sections: [
        { id: 's4-1', num: '4.1', title: 'What Is CSS?', page: 123, obj: [3] },
        { id: 's4-2', num: '4.2', title: 'CSS Syntax', page: 125, obj: [3] },
        { id: 's4-3', num: '4.3', title: 'Location of Styles', page: 130, obj: [3] },
        { id: 's4-4', num: '4.4', title: 'Selectors', page: 132, obj: [3] },
        { id: 's4-5', num: '4.5', title: 'The Cascade: How Styles Interact', page: 142, obj: [3] },
        { id: 's4-6', num: '4.6', title: 'The Box Model', page: 149, obj: [3, 4] },
        { id: 's4-7', num: '4.7', title: 'CSS Text Styling', page: 165, obj: [3] },
        { id: 's4-8', num: '4.8', title: 'CSS Frameworks and Variables', page: 174, obj: [3, 8] },
        { id: 's4-review', num: 'R', title: 'Chapter 4 Review', obj: [3, 4] }
      ]
    },
    {
      id: 'ch5', num: '5', label: 'Chapter 5', title: 'HTML 2: Tables and Forms', href: 'ch5/index.html', page: 189,
      blurb: 'Tabular data, form controls, accessibility and validation: pages that collect and present information.',
      sections: [
        { id: 's5-1', num: '5.1', title: 'HTML Tables', page: 190, obj: [2, 6] },
        { id: 's5-2', num: '5.2', title: 'Styling Tables', page: 195, obj: [3, 6] },
        { id: 's5-3', num: '5.3', title: 'Introducing Forms', page: 199, obj: [1, 2, 6] },
        { id: 's5-4', num: '5.4', title: 'Form Control Elements', page: 204, obj: [2, 6] },
        { id: 's5-5', num: '5.5', title: 'Table and Form Accessibility', page: 215, obj: [2, 6] },
        { id: 's5-6', num: '5.6', title: 'Styling and Designing Forms', page: 218, obj: [3, 6] },
        { id: 's5-7', num: '5.7', title: 'Validating User Input', page: 222, obj: [6, 7] },
        { id: 's5-review', num: 'R', title: 'Chapter 5 Review', obj: [2, 6] }
      ]
    },
    {
      id: 'levelup', num: 'L', label: 'Level Up', title: 'Responsive Layout & JavaScript', href: 'levelup/index.html', page: null,
      blurb: 'Flexbox, Grid, media queries, JavaScript, the DOM and the tooling ecosystem: the objectives that go past Chapter 5.',
      sections: [
        { id: 'sl-1', num: 'L.1', title: 'Flexbox Layout', obj: [3, 5, 6] },
        { id: 'sl-2', num: 'L.2', title: 'CSS Grid', obj: [3, 5, 6] },
        { id: 'sl-3', num: 'L.3', title: 'Responsive Design', obj: [5, 6] },
        { id: 'sl-4', num: 'L.4', title: 'JavaScript Fundamentals', obj: [7] },
        { id: 'sl-5', num: 'L.5', title: 'The DOM and Events', obj: [4, 7] },
        { id: 'sl-6', num: 'L.6', title: 'Frameworks and Developer Tools', obj: [1, 8] },
        { id: 'sl-review', num: 'R', title: 'Level Up Review', obj: [5, 7, 8] }
      ]
    }
  ];

  WD1.module = (id) => WD1.MODULES.find((m) => m.id === id) || null;
  WD1.section = (id) => {
    for (const m of WD1.MODULES) {
      const s = m.sections.find((x) => x.id === id);
      if (s) return Object.assign({ module: m }, s);
    }
    return null;
  };

  /* ---------- Storage (safe: works when localStorage is blocked) ---------- */

  const KEY = 'wd1:v1';
  const blank = () => ({ done: {}, quiz: {}, pg: {}, challenge: {}, custom: {}, last: null, prefs: {} });
  let state = blank();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = Object.assign(blank(), JSON.parse(raw));
  } catch (e) { /* storage unavailable: keep in-memory state */ }

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  WD1.store = {
    get(ns, id) { return state[ns] ? state[ns][id] : undefined; },
    set(ns, id, value) {
      if (!state[ns] || typeof state[ns] !== 'object') state[ns] = {};
      if (value === undefined) delete state[ns][id]; else state[ns][id] = value;
      persist();
    },
    all() { return state; },
    exportJSON() { return JSON.stringify(state, null, 2); },
    importJSON(text) {
      const data = JSON.parse(text);
      if (!data || typeof data !== 'object' || !data.done) throw new Error('That file is not a course progress export.');
      state = Object.assign(blank(), data);
      persist();
      refreshProgressUI();
    },
    reset() { state = blank(); persist(); refreshProgressUI(); }
  };

  /* ---------- Theme (applied immediately to avoid a flash) ---------- */

  function applyTheme(t) {
    const root = document.documentElement;
    if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t);
    else root.removeAttribute('data-theme');
  }
  applyTheme(state.prefs.theme);
  function effectiveTheme() {
    const t = document.documentElement.getAttribute('data-theme');
    if (t) return t;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  WD1.toggleTheme = function () {
    const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    state.prefs.theme = next; persist(); applyTheme(next); updateThemeButton();
  };

  /* ---------- Fonts (pages may also link them directly) ---------- */

  (function ensureFonts() {
    if (document.querySelector('link[href*="fonts.googleapis.com"]')) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=JetBrains+Mono:wght@400;700&display=swap';
    document.head.appendChild(l);
  })();

  /* ---------- DOM helpers ---------- */

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  WD1.$ = $; WD1.$$ = $$;

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);
  WD1.esc = esc;

  /* Mini-markdown for JSON-driven text: `code`, **bold**, [text](url), newline -> <br>.
     Everything else is escaped, so "<p>" inside backticks shows literally. */
  WD1.fmt = function (s) {
    return String(s == null ? '' : s)
      .split(/(`[^`]+`)/g)
      .map((part) => {
        if (/^`[^`]+`$/.test(part)) return '<code>' + esc(part.slice(1, -1)) + '</code>';
        return esc(part)
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|[\w./#-]+)\)/g, '<a href="$2">$1</a>')
          .replace(/\n/g, '<br>');
      })
      .join('');
  };

  function h(tag, attrs) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k of Object.keys(attrs)) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'dataset') Object.assign(el.dataset, v);
        else if (k === 'style' && typeof v === 'object') {
          Object.keys(v).forEach((p) => { if (p.startsWith('--')) el.style.setProperty(p, v[p]); else el.style[p] = v[p]; });
        }
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, v);
      }
    }
    for (let i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, kid) {
    if (kid == null || kid === false) return;
    if (Array.isArray(kid)) { kid.forEach((k) => append(el, k)); return; }
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  WD1.h = h;

  WD1.shuffle = function (arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  function dedent(str) {
    const lines = String(str).replace(/\r\n?/g, '\n').replace(/\t/g, '  ').split('\n');
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    let min = Infinity;
    lines.forEach((l) => { if (l.trim()) min = Math.min(min, l.match(/^ */)[0].length); });
    if (!isFinite(min)) min = 0;
    return lines.map((l) => l.slice(min)).join('\n');
  }
  WD1.dedent = dedent;

  function readJSON(el) {
    const s = el.querySelector(':scope > script[type="application/json"]');
    if (!s) return null;
    try { return JSON.parse(s.textContent); } catch (e) {
      el.innerHTML = '<div class="feedback bad">This activity has a JSON error: ' + esc(e.message) + '</div>';
      console.error('[WD1] JSON error in', el, e);
      return null;
    }
  }
  WD1.readJSON = readJSON;

  const idCounters = {};
  function autoId(el, kind) {
    if (el.dataset.id) return el.dataset.id;
    const sec = el.closest('section[id]');
    const base = (sec ? sec.id : (document.body.dataset.module || 'page')) + '-' + kind;
    idCounters[base] = (idCounters[base] || 0) + 1;
    el.dataset.id = base + '-' + idCounters[base];
    return el.dataset.id;
  }

  const ICON = {
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
    open: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3h7v7"/><path d="M10 14L21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    circle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5l12 7-12 7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
    shuffle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>'
  };
  WD1.ICON = ICON;
  const iconBtn = (icon, label, cls, onclick) =>
    h('button', { type: 'button', class: 'btn small ' + (cls || ''), 'aria-label': label, title: label, html: ICON[icon] + '<span>' + esc(label) + '</span>', onclick });

  /* ---------- Toasts and announcements ---------- */

  let toastWrap = null;
  WD1.toast = function (msg, kind) {
    if (!toastWrap) {
      toastWrap = h('div', { class: 'toast-wrap', role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(toastWrap);
    }
    const t = h('div', { class: 'toast ' + (kind || ''), text: msg });
    toastWrap.appendChild(t);
    setTimeout(() => t.remove(), 2800);
  };

  WD1.copy = function (text, btn) {
    const done = () => {
      if (!btn) return;
      const old = btn.innerHTML;
      btn.innerHTML = ICON.check + '<span>Copied</span>';
      setTimeout(() => { btn.innerHTML = old; }, 1400);
    };
    try {
      navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
    } catch (e) { fallbackCopy(text, done); }
  };
  function fallbackCopy(text, done) {
    const ta = h('textarea', { style: { position: 'fixed', top: '-1000px', opacity: '0' } });
    ta.value = text; document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    if (ok) done(); else WD1.toast('Copy is blocked here. Select the code and press Ctrl/Cmd + C.');
  }

  /* ---------- Progress ---------- */

  WD1.progress = {
    isDone: (id) => !!state.done[id],
    setDone(id, on, quiet) {
      if (on) state.done[id] = Date.now(); else delete state.done[id];
      persist();
      refreshProgressUI();
      document.dispatchEvent(new CustomEvent('wd1:progress', { detail: { id, done: !!on } }));
      if (on && !quiet) {
        const s = WD1.section(id);
        if (s) {
          const st = WD1.progress.moduleStats(s.module.id);
          WD1.toast((s.num === 'R' ? s.title : s.num + ' ' + s.title) + ' complete · ' + st.done + ' of ' + st.total + ' in this module', 'visited');
        }
      }
    },
    moduleStats(modId) {
      const m = WD1.module(modId);
      if (!m) return { done: 0, total: 0, pct: 0 };
      const done = m.sections.filter((s) => state.done[s.id]).length;
      return { done, total: m.sections.length, pct: Math.round((done / m.sections.length) * 100) };
    },
    overall() {
      let done = 0, total = 0;
      WD1.MODULES.forEach((m) => m.sections.forEach((s) => { total++; if (state.done[s.id]) done++; }));
      return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
    },
    last: () => state.last
  };

  function refreshProgressUI() {
    const all = WD1.progress.overall();
    $$('.progress-pill').forEach((p) => {
      $('.bar > span', p).style.width = all.pct + '%';
      $('.pct', p).textContent = all.pct + '%';
      p.title = all.done + ' of ' + all.total + ' sections complete';
    });
    $$('[data-mod-pct]').forEach((el) => { el.textContent = WD1.progress.moduleStats(el.dataset.modPct).pct + '%'; });
    $$('[data-mod-bar]').forEach((el) => { el.style.width = WD1.progress.moduleStats(el.dataset.modBar).pct + '%'; });
    $$('[data-mod-count]').forEach((el) => {
      const st = WD1.progress.moduleStats(el.dataset.modCount);
      el.textContent = st.done + ' of ' + st.total + ' sections complete';
    });
    $$('.toc a[data-sec]').forEach((a) => {
      const done = !!state.done[a.dataset.sec];
      a.classList.toggle('done', done);
      const sr = $('.sr-only', a);
      if (sr) sr.textContent = done ? ' (complete)' : '';
    });
    $$('.btn.complete[data-sec]').forEach(updateCompleteBtn);
    $$('.section-eyebrow[data-sec] .s-done').forEach((el) => {
      el.hidden = !state.done[el.parentNode.dataset.sec];
    });
    document.dispatchEvent(new CustomEvent('wd1:refresh'));
  }
  WD1.refreshProgressUI = refreshProgressUI;

  function updateCompleteBtn(btn) {
    const done = !!state.done[btn.dataset.sec];
    btn.setAttribute('aria-pressed', String(done));
    btn.innerHTML = (done ? ICON.check : ICON.circle) + '<span>' + (done ? 'Section complete' : 'Mark section complete') + '</span>';
  }

  /* ---------- Page shell ---------- */

  function buildShell() {
    const body = document.body;
    const modId = body.dataset.module || null;
    const mod = modId ? WD1.module(modId) : null;
    const pageKind = body.dataset.page || (mod ? 'module' : 'other');
    const main = $('main');
    if (!main) return;
    if (!main.id) main.id = 'main';

    // Skip link
    body.insertBefore(h('a', { class: 'skip-link', href: '#' + main.id, text: 'Skip to content' }), body.firstChild);

    // Top bar
    const menu = h('div', { class: 'menu', role: 'list' },
      WD1.MODULES.map((m) => h('a', { href: WD1.url(m.href), role: 'listitem', 'aria-current': m.id === modId ? 'page' : null },
        h('span', { class: 'm-num', text: m.num === 'L' ? 'Lvl' : 'Ch ' + m.num }),
        h('span', { text: m.title }),
        h('span', { class: 'm-pct', dataset: { modPct: m.id } }))),
      h('hr', { style: { margin: '6px 0' } }),
      h('a', { href: WD1.url('index.html'), role: 'listitem' }, h('span', { class: 'm-num', text: 'Home' }), h('span', { text: 'Course dashboard' }), h('span')),
      h('a', { href: WD1.url('project/index.html'), role: 'listitem' }, h('span', { class: 'm-num', text: 'Proj' }), h('span', { text: 'Course project' }), h('span')),
      h('a', { href: WD1.url('tools/playground.html'), role: 'listitem' }, h('span', { class: 'm-num', text: 'Code' }), h('span', { text: 'Code playground' }), h('span')),
      h('a', { href: WD1.url('glossary.html'), role: 'listitem' }, h('span', { class: 'm-num', text: 'A–Z' }), h('span', { text: 'Glossary' }), h('span'))
    );
    const details = h('details', { class: 'nav-menu' }, h('summary', { text: 'Modules ▾' }), menu);
    const navLink = (href, text, kind) => h('a', { class: 'nav-extra', href: WD1.url(href), text, 'aria-current': pageKind === kind ? 'page' : null });

    const tocBtn = mod ? h('button', {
      type: 'button', class: 'icon-btn toc-toggle', 'aria-label': 'Show sections', 'aria-controls': 'sidebar', 'aria-expanded': 'false',
      html: ICON.menu,
      onclick: (e) => { e.stopPropagation(); setToc(!body.classList.contains('toc-open')); }
    }) : null;

    const topbar = h('header', { class: 'topbar' },
      h('div', { class: 'topbar-inner' },
        tocBtn,
        h('a', { class: 'brand', href: WD1.url('index.html') },
          h('span', { class: 'brand-mark', 'aria-hidden': 'true', text: '</>' }),
          h('span', { class: 'brand-text', text: 'Web Development I' })),
        h('nav', { class: 'topnav', 'aria-label': 'Course' },
          details,
          navLink('project/index.html', 'Project', 'project'),
          navLink('tools/playground.html', 'Playground', 'playground'),
          navLink('glossary.html', 'Glossary', 'glossary')),
        h('div', { class: 'topbar-right' },
          h('span', { class: 'progress-pill' },
            h('span', { class: 'label', text: 'Course' }),
            h('span', { class: 'bar' }, h('span')),
            h('span', { class: 'pct', text: '0%' })),
          h('button', { type: 'button', class: 'icon-btn theme-toggle', onclick: WD1.toggleTheme }))));
    body.insertBefore(topbar, main);

    document.addEventListener('click', (e) => {
      if (details.open && !details.contains(e.target)) details.open = false;
      if (body.classList.contains('toc-open') && !e.target.closest('.sidebar')) setToc(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { details.open = false; setToc(false); }
    });

    // Layout grid
    const page = h('div', { class: 'page' + (mod ? '' : ' no-sidebar') });
    main.parentNode.insertBefore(page, main);
    if (mod) page.appendChild(buildSidebar(mod));
    page.appendChild(main);

    if (mod) decorateModule(mod, main);

    // Footer
    const footer = h('footer', { class: 'site-footer' },
      h('div', { class: 'inner' },
        h('span', { text: 'Web Development I · Interactive course companion' }),
        h('span', { text: 'Section numbers and page references follow Fundamentals of Web Development, 3rd ed. (Connolly & Hoar).' })));
    page.after(footer);

    updateThemeButton();
    refreshProgressUI();
  }

  function setToc(open) {
    document.body.classList.toggle('toc-open', open);
    const b = $('.toc-toggle');
    if (b) b.setAttribute('aria-expanded', String(open));
  }

  function updateThemeButton() {
    const b = $('.theme-toggle');
    if (!b) return;
    const dark = effectiveTheme() === 'dark';
    b.innerHTML = dark ? ICON.sun : ICON.moon;
    b.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    b.title = b.getAttribute('aria-label');
  }
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', updateThemeButton);
  }

  function buildSidebar(mod) {
    return h('aside', { class: 'sidebar', id: 'sidebar', 'aria-label': 'Sections in this module' },
      h('span', { class: 'sidebar-title', text: mod.label + (mod.page ? ' · p. ' + mod.page : '') }),
      h('a', { class: 'sidebar-module', href: '#top', text: mod.title }),
      h('ol', { class: 'toc' },
        mod.sections.map((s) => h('li', null,
          h('a', { href: '#' + s.id, dataset: { sec: s.id }, onclick: () => setToc(false) },
            h('span', { class: 't-num', text: s.num === 'R' ? '✓' : s.num }),
            h('span', null, s.title, h('span', { class: 'sr-only' })),
            h('span', { class: 't-check', 'aria-hidden': 'true' }))))),
      h('div', { class: 'sidebar-foot' },
        h('div', { class: 'mod-progress' }, h('span', { dataset: { modBar: mod.id } })),
        h('span', { class: 'muted', dataset: { modCount: mod.id } }),
        h('a', { href: WD1.url('project/index.html'), text: 'Course project →' })));
  }

  function objText(list) {
    return list.map((n) => h('span', { class: 'chip', title: WD1.OBJECTIVES[n - 1] }, h('b', { text: 'Obj ' + n }), WD1.OBJECTIVES[n - 1].split(' ').slice(0, 4).join(' ') + '…'));
  }

  function decorateModule(mod, main) {
    // Hero
    const hero = $('.module-hero', main);
    if (hero) {
      hero.id = hero.id || 'top';
      const h1 = $('h1', hero);
      const eyebrow = h('p', { class: 'eyebrow' },
        h('span', { class: 'tag', text: mod.label }),
        mod.page ? h('span', { text: 'Textbook starts p. ' + mod.page }) : h('span', { text: 'Beyond the Chapter 2–5 readings' }),
        h('span', { text: mod.sections.length + ' sections' }));
      if (h1) hero.insertBefore(eyebrow, h1);
      else { hero.prepend(h('h1', { text: mod.title })); hero.prepend(eyebrow); }
      const objs = Array.from(new Set(mod.sections.flatMap((s) => s.obj))).sort();
      hero.appendChild(h('div', { class: 'hero-meta' },
        h('div', { class: 'hero-progress' },
          h('span', { class: 'bar' }, h('span', { dataset: { modBar: mod.id } })),
          h('span', { dataset: { modCount: mod.id } })),
        h('div', { class: 'obj-chips', 'aria-label': 'Course objectives covered' }, objText(objs))));
    }

    // Sections
    const secs = $$('section.lesson[id]', main);
    secs.forEach((sec, idx) => {
      const s = mod.sections.find((x) => x.id === sec.id);
      if (!s) return;
      let h2 = $(':scope > h2', sec);
      if (!h2) { h2 = h('h2', { text: s.title }); sec.prepend(h2); }
      sec.setAttribute('aria-labelledby', sec.id + '-h');
      h2.id = h2.id || sec.id + '-h';
      const eb = h('p', { class: 'section-eyebrow', dataset: { sec: s.id } },
        h('span', { class: 's-num', text: s.num === 'R' ? 'Review' : s.num }),
        s.page ? h('span', { text: 'Textbook p. ' + s.page }) : null,
        h('span', { text: 'Objective' + (s.obj.length > 1 ? 's ' : ' ') + s.obj.join(', '), title: s.obj.map((n) => n + '. ' + WD1.OBJECTIVES[n - 1]).join('\n') }),
        h('span', { class: 's-done', text: '✓ Complete', hidden: true }));
      sec.insertBefore(eb, h2);

      const nextSec = secs[idx + 1];
      const nextInfo = nextSec ? mod.sections.find((x) => x.id === nextSec.id) : null;
      const btn = h('button', { type: 'button', class: 'btn complete', dataset: { sec: s.id }, 'aria-pressed': 'false',
        onclick: () => WD1.progress.setDone(s.id, !WD1.progress.isDone(s.id)) });
      updateCompleteBtn(btn);
      const foot = h('div', { class: 'section-foot' }, btn,
        nextInfo ? h('a', { class: 'next-link', href: '#' + nextInfo.id, text: 'Next: ' + (nextInfo.num === 'R' ? '' : nextInfo.num + ' ') + nextInfo.title + ' →' }) : null);
      sec.appendChild(foot);
    });

    // Module prev/next
    const i = WD1.MODULES.indexOf(mod);
    const prev = WD1.MODULES[i - 1], next = WD1.MODULES[i + 1];
    main.appendChild(h('nav', { class: 'module-foot', 'aria-label': 'Modules' },
      prev ? h('a', { class: 'prev', href: WD1.url(prev.href) }, h('span', { class: 'dir', text: '← Previous' }), h('span', { class: 'ttl', text: prev.title }))
        : h('a', { class: 'prev', href: WD1.url('index.html') }, h('span', { class: 'dir', text: '← Back' }), h('span', { class: 'ttl', text: 'Course dashboard' })),
      next ? h('a', { class: 'next', href: WD1.url(next.href) }, h('span', { class: 'dir', text: 'Next →' }), h('span', { class: 'ttl', text: next.title }))
        : h('a', { class: 'next', href: WD1.url('project/index.html') }, h('span', { class: 'dir', text: 'Next →' }), h('span', { class: 'ttl', text: 'Course project' }))));

    // Scrollspy + "continue where you left off"
    if ('IntersectionObserver' in window && secs.length) {
      const links = new Map($$('.toc a[data-sec]').map((a) => [a.dataset.sec, a]));
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          links.forEach((a) => a.classList.remove('current'));
          const a = links.get(en.target.id);
          if (a) { a.classList.add('current'); a.setAttribute('aria-current', 'location'); }
          links.forEach((x) => { if (x !== a) x.removeAttribute('aria-current'); });
          state.last = { module: mod.id, section: en.target.id, t: Date.now() };
          persist();
        });
      }, { rootMargin: '-25% 0px -65% 0px' });
      secs.forEach((s) => io.observe(s));
    }
  }

  /* ---------- Syntax highlighting (HTML, CSS, JS) ---------- */

  const span = (cls, text) => (text ? '<span class="tk-' + cls + '">' + esc(text) + '</span>' : '');

  function hlHTML(src) {
    let out = '', i = 0;
    const n = src.length;
    const at = (re) => { re.lastIndex = i; const m = re.exec(src); return m ? m[0] : null; };
    const reWs = /\s+/y, reAttr = /[^\s=>\/"']+/y, reVal = /"[^"]*"?|'[^']*'?|[^\s>]+/y;
    const reTag = /<(\/?)([A-Za-z][^\s\/>]*)/y, reEnt = /&#?[A-Za-z0-9]+;/y, reText = /[^<&]+/y;
    while (i < n) {
      if (src.startsWith('<!--', i)) {
        let e = src.indexOf('-->', i + 4); e = e < 0 ? n : e + 3;
        out += span('com', src.slice(i, e)); i = e; continue;
      }
      if (src.startsWith('<!', i)) {
        let e = src.indexOf('>', i); e = e < 0 ? n : e + 1;
        out += span('doc', src.slice(i, e)); i = e; continue;
      }
      reTag.lastIndex = i;
      const m = reTag.exec(src);
      if (m) {
        const name = m[2];
        out += span('punct', '<' + m[1]) + span('tag', name);
        i += m[0].length;
        let t;
        while (i < n) {
          if ((t = at(reWs))) { out += esc(t); i += t.length; continue; }
          if (src.startsWith('/>', i)) { out += span('punct', '/>'); i += 2; break; }
          if (src[i] === '>') { out += span('punct', '>'); i++; break; }
          if (src[i] === '<') break;
          if (src[i] === '=') {
            out += span('punct', '='); i++;
            if ((t = at(reWs))) { out += esc(t); i += t.length; }
            if ((t = at(reVal))) { out += span('str', t); i += t.length; }
            continue;
          }
          if (src[i] === '/') { out += span('punct', '/'); i++; continue; }
          if ((t = at(reAttr))) { out += span('attr', t); i += t.length; continue; }
          out += esc(src[i]); i++;
        }
        if (!m[1] && /^(style|script)$/i.test(name)) {
          const endRe = new RegExp('</' + name, 'ig');
          endRe.lastIndex = i;
          const em = endRe.exec(src);
          const end = em ? em.index : n;
          const inner = src.slice(i, end);
          out += name.toLowerCase() === 'style' ? hlCSS(inner) : hlJS(inner);
          i = end;
        }
        continue;
      }
      let t;
      if ((t = at(reEnt))) { out += span('ent', t); i += t.length; continue; }
      if ((t = at(reText))) { out += esc(t); i += t.length; continue; }
      out += esc(src[i]); i++;
    }
    return out;
  }

  function hlCSS(src) {
    let out = '', i = 0, mode = 'sel', prelude = '';
    const n = src.length, stack = [];
    const at = (re) => { re.lastIndex = i; const m = re.exec(src); return m ? m[0] : null; };
    const reCom = /\/\*[\s\S]*?(?:\*\/|$)/y, reWs = /\s+/y, reAt = /@[\w-]+/y;
    const reStr = /"(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?/y;
    const reSel = /[^{}"'\/;]+|[\/;]/y, reIdent = /-{0,2}[A-Za-z_][\w-]*/y;
    const reNum = /-?(?:\d+\.?\d*|\.\d+)(?:[a-z%]+)?/iy, reHex = /#[0-9a-fA-F]{3,8}\b/y;
    while (i < n) {
      let t;
      if ((t = at(reCom))) { out += span('com', t); i += t.length; continue; }
      if ((t = at(reWs))) { out += esc(t); if (mode === 'sel') prelude += t; i += t.length; continue; }
      const c = src[i];
      if (c === '{') {
        const kind = mode === 'sel' && /^\s*@(media|supports|container|layer|document|scope|starting-style)/i.test(prelude) ? 'rules' : 'decl';
        stack.push(kind); mode = kind === 'rules' ? 'sel' : 'prop'; prelude = '';
        out += span('punct', '{'); i++; continue;
      }
      if (c === '}') {
        stack.pop();
        const top = stack[stack.length - 1];
        mode = !top || top === 'rules' ? 'sel' : 'prop'; prelude = '';
        out += span('punct', '}'); i++; continue;
      }
      if (mode === 'sel') {
        if ((t = at(reAt))) { out += span('at', t); prelude += t; i += t.length; continue; }
        if ((t = at(reStr))) { out += span('str', t); prelude += t; i += t.length; continue; }
        t = at(reSel) || c;
        out += span(prelude.trim().charAt(0) === '@' ? 'val' : 'sel', t);
        prelude += t; i += t.length; continue;
      }
      if (mode === 'prop') {
        if (c === ':') { out += span('punct', ':'); mode = 'val'; i++; continue; }
        if (c === ';') { out += span('punct', ';'); i++; continue; }
        if ((t = at(reIdent))) { out += span('prop', t); i += t.length; continue; }
        out += esc(c); i++; continue;
      }
      // value
      if (c === ';') { out += span('punct', ';'); mode = 'prop'; i++; continue; }
      if ((t = at(reStr))) { out += span('str', t); i += t.length; continue; }
      if ((t = at(reHex))) { out += span('num', t); i += t.length; continue; }
      if (src.startsWith('!important', i)) { out += span('kw', '!important'); i += 10; continue; }
      if ((t = at(reIdent))) { out += span(src[i + t.length] === '(' ? 'fn' : 'val', t); i += t.length; continue; }
      if ((t = at(reNum))) { out += span('num', t); i += t.length; continue; }
      out += span('punct', c); i++;
    }
    return out;
  }

  const JS_KW = new Set(('const let var function return if else for while do switch case break continue new this class extends ' +
    'import export from default try catch finally throw typeof instanceof in of async await null undefined true false yield delete void super static').split(' '));
  function hlJS(src) {
    let out = '', i = 0, prevSig = '';
    const n = src.length;
    const at = (re) => { re.lastIndex = i; const m = re.exec(src); return m ? m[0] : null; };
    const reCom = /\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/y, reWs = /\s+/y;
    const reStr = /"(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?|`(?:[^`\\]|\\[\s\S])*`?/y;
    const reRegex = /\/(?![*\/])(?:[^\/\\\n\[]|\\.|\[(?:[^\]\\\n]|\\.)*\])+\/[gimsuyd]*/y;
    const reNum = /(?:0[xX][0-9a-fA-F]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b/y, reId = /[A-Za-z_$][\w$]*/y;
    while (i < n) {
      let t;
      if ((t = at(reWs))) { out += esc(t); i += t.length; continue; }
      if ((t = at(reCom))) { out += span('com', t); i += t.length; continue; }
      if ((t = at(reStr))) { out += span('str', t); i += t.length; prevSig = 'x'; continue; }
      if (src[i] === '/' && (!prevSig || /[(,=:[!&|?{};+\-*%<>~^]/.test(prevSig)) && (t = at(reRegex))) {
        out += span('str', t); i += t.length; prevSig = 'x'; continue;
      }
      if ((t = at(reNum))) { out += span('num', t); i += t.length; prevSig = 'x'; continue; }
      if ((t = at(reId))) {
        let j = i + t.length;
        while (j < n && (src[j] === ' ' || src[j] === '\t')) j++;
        const cls = JS_KW.has(t) && prevSig !== '.' ? 'kw' : src[j] === '(' ? 'fn' : '';
        out += cls ? span(cls, t) : esc(t);
        i += t.length; prevSig = JS_KW.has(t) && t !== 'this' ? '(' : 'x'; continue;
      }
      prevSig = src[i];
      out += span('punct', src[i]); i++;
    }
    return out;
  }

  WD1.highlight = function (code, lang) {
    lang = (lang || 'html').toLowerCase();
    if (lang === 'css') return hlCSS(code);
    if (lang === 'js' || lang === 'javascript' || lang === 'json') return hlJS(code);
    if (lang === 'html' || lang === 'xml' || lang === 'svg') return hlHTML(code);
    return esc(code);
  };

  /* ---------- Code blocks ---------- */

  function codeBlock(code, lang, title) {
    const pre = h('pre', null, h('code', { html: WD1.highlight(code, lang) }));
    const copyBtn = iconBtn('copy', 'Copy', 'ghost copy-btn');
    copyBtn.addEventListener('click', () => WD1.copy(code, copyBtn));
    return h('div', { class: 'code-block' },
      lang || title ? h('span', { class: 'code-lang', text: title || lang }) : null,
      pre, copyBtn);
  }
  WD1.codeBlock = codeBlock;

  // A <script type="text/plain"> cannot contain a literal </script>, so authors write <\/script>.
  const unescapeScript = (t) => t.replace(/<\\\/script/gi, '</script');

  function mountCode(root) {
    $$('script[type="text/plain"].code', root).forEach((s) => {
      const code = dedent(unescapeScript(s.textContent));
      s.replaceWith(codeBlock(code, s.dataset.lang || 'html', s.dataset.title));
    });
    $$('pre > code[class*="lang-"]', root).forEach((c) => {
      const pre = c.parentNode;
      if (pre.closest('.code-block')) return;
      const lang = (c.className.match(/lang-(\w+)/) || [])[1];
      pre.replaceWith(codeBlock(dedent(c.textContent), lang, pre.dataset.title));
    });
  }

  /* ---------- Widget frame ---------- */

  function frame(el, kind, title, actions) {
    el.classList.add('widget');
    const head = h('div', { class: 'widget-head' },
      h('span', { class: 'widget-kind', text: el.dataset.kind || kind }),
      title ? h('h3', { class: 'widget-title', html: WD1.fmt(title) }) : null,
      actions && actions.length ? h('div', { class: 'widget-actions' }, actions) : null);
    el.prepend(head);
    return head;
  }
  WD1.frame = frame;

  function mountGenericWidget(el) {
    if ($(':scope > .widget-head', el)) return;
    const body = $(':scope > .widget-body', el) || (() => {
      const b = h('div', { class: 'widget-body' });
      while (el.firstChild) b.appendChild(el.firstChild);
      el.appendChild(b);
      return b;
    })();
    if (el.dataset.title || el.dataset.kind) frame(el, el.dataset.kind || 'Interactive', el.dataset.title || '');
    return body;
  }

  /* ---------- Quiz ---------- */

  function mountQuiz(el) {
    const data = readJSON(el);
    if (!data) return;
    const qs = Array.isArray(data) ? data : data.questions || [];
    const id = autoId(el, 'quiz');
    const title = el.dataset.title || 'Check your understanding';
    const passAt = parseFloat(el.dataset.pass || '0.7');

    function build() {
      el.innerHTML = '';
      el.classList.add('widget', 'quiz');
      frame(el, 'Quiz', title);
      const results = new Array(qs.length).fill(null);
      const scoreEl = h('span', { class: 'quiz-score' });
      const bestEl = h('span', { class: 'muted small' });
      const retry = iconBtn('reset', 'Retry quiz', '', build);
      const summary = h('div', { class: 'quiz-summary' }, h('div', { class: 'cluster' }, scoreEl, bestEl), retry);

      const update = () => {
        const answered = results.filter((r) => r !== null).length;
        const correct = results.filter((r) => r === true).length;
        scoreEl.textContent = answered < qs.length
          ? correct + ' correct · ' + answered + ' of ' + qs.length + ' answered'
          : 'Score: ' + correct + ' / ' + qs.length;
        const prev = WD1.store.get('quiz', id);
        bestEl.textContent = prev ? 'Best: ' + prev.best + ' / ' + prev.total : '';
      };

      const record = (i, ok) => {
        if (results[i] !== null) return;
        results[i] = ok;
        update();
        if (results.every((r) => r !== null)) finish();
      };

      const finish = () => {
        const correct = results.filter(Boolean).length;
        const prev = WD1.store.get('quiz', id);
        const best = Math.max(correct, prev ? prev.best : 0);
        WD1.store.set('quiz', id, { best, last: correct, total: qs.length, at: Date.now() });
        update();
        summary.classList.add('pop');
        const sec = el.closest('section.lesson[id]');
        if (correct / qs.length >= passAt) {
          if (sec && WD1.section(sec.id) && !WD1.progress.isDone(sec.id)) WD1.progress.setDone(sec.id, true);
          else WD1.toast('Nice work: ' + correct + ' / ' + qs.length);
        } else {
          WD1.toast(correct + ' / ' + qs.length + '. Review the explanations, then retry.');
        }
        el.dispatchEvent(new CustomEvent('quizdone', { detail: { correct, total: qs.length }, bubbles: true }));
      };

      qs.forEach((q, i) => el.appendChild(renderQuestion(q, i, (ok) => record(i, ok))));
      el.appendChild(summary);
      update();
    }
    build();
  }

  function renderQuestion(q, i, done) {
    let type = q.type || (typeof q.answer === 'boolean' ? 'tf' : Array.isArray(q.answer) && q.choices ? 'multi' : q.choices ? 'mc' : 'text');
    const wrap = h('div', { class: 'quiz-q' });
    const qText = h('p', { class: 'q-text' }, h('span', { class: 'q-num', text: (i + 1) + '.' }),
      h('span', null, h('span', { html: WD1.fmt(q.q) }),
        type === 'multi' ? h('span', { class: 'q-hint', text: ' (select all that apply)' }) : null));
    wrap.appendChild(qText);
    if (q.code) wrap.appendChild(codeBlock(dedent(q.code), q.lang || 'html'));
    const fb = h('div', { class: 'feedback', hidden: true, 'aria-live': 'polite' });
    const showFb = (ok, extra) => {
      fb.hidden = false;
      fb.className = 'feedback ' + (ok ? 'good' : 'bad');
      fb.innerHTML = '<strong>' + (ok ? 'Correct.' : 'Not quite.') + '</strong>' + (extra ? ' ' + extra : '') +
        (q.explain ? '<span class="explain">' + WD1.fmt(q.explain) + '</span>' : '');
    };

    if (type === 'tf') {
      q = Object.assign({}, q, { choices: ['True', 'False'], answer: q.answer ? 0 : 1 });
      type = 'mc';
    }

    if (type === 'mc' || type === 'multi') {
      const multi = type === 'multi';
      const answers = multi ? q.answer : [q.answer];
      let order = q.choices.map((_, k) => k);
      if (q.shuffle) order = WD1.shuffle(order);
      const box = h('div', { class: 'choices', role: 'group', 'aria-label': 'Choices' });
      const btns = order.map((k, pos) => {
        const b = h('button', { type: 'button', class: 'choice', 'aria-pressed': 'false', dataset: { k } },
          h('span', { class: 'c-key', text: String.fromCharCode(65 + pos) }),
          h('span', { html: WD1.fmt(q.choices[k]) }));
        box.appendChild(b);
        return b;
      });
      wrap.appendChild(box);
      const lock = () => btns.forEach((b) => { b.disabled = true; });
      if (!multi) {
        btns.forEach((b) => b.addEventListener('click', () => {
          const k = +b.dataset.k, ok = answers.includes(k);
          lock();
          b.classList.add(ok ? 'correct' : 'wrong');
          if (!ok) btns.forEach((x) => { if (answers.includes(+x.dataset.k)) x.classList.add('correct'); });
          showFb(ok);
          done(ok);
        }));
      } else {
        btns.forEach((b) => b.addEventListener('click', () => b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true')));
        const check = h('button', { type: 'button', class: 'btn small primary', text: 'Check answer', style: { marginTop: '10px' } });
        check.addEventListener('click', () => {
          const picked = btns.filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => +b.dataset.k);
          if (!picked.length) { WD1.toast('Select at least one choice.'); return; }
          const ok = picked.length === answers.length && picked.every((k) => answers.includes(k));
          lock(); check.disabled = true;
          btns.forEach((b) => {
            const k = +b.dataset.k, sel = picked.includes(k), right = answers.includes(k);
            if (right) b.classList.add('correct');
            else if (sel) b.classList.add('wrong');
          });
          showFb(ok, ok ? '' : 'The highlighted choices are the full correct set.');
          done(ok);
        });
        wrap.appendChild(check);
      }
    } else {
      const accepted = [].concat(q.answer).map(String);
      const norm = (s) => {
        s = String(s).trim().replace(/\s+/g, ' ');
        return q.caseSensitive ? s : s.toLowerCase();
      };
      const input = h('input', { type: 'text', class: 'mono', 'aria-label': 'Your answer', placeholder: q.placeholder || 'Type your answer', autocomplete: 'off', spellcheck: 'false' });
      const check = h('button', { type: 'button', class: 'btn small primary', text: 'Check' });
      const go = () => {
        if (!input.value.trim()) { input.focus(); return; }
        let ok = accepted.some((a) => norm(a) === norm(input.value));
        if (!ok && q.pattern) { try { ok = new RegExp(q.pattern, q.caseSensitive ? '' : 'i').test(input.value.trim()); } catch (e) { /* bad pattern */ } }
        input.disabled = true; check.disabled = true;
        input.style.borderColor = ok ? 'var(--good)' : 'var(--bad)';
        showFb(ok, ok ? '' : 'Expected: <code>' + esc(accepted[0]) + '</code>');
        done(ok);
      };
      check.addEventListener('click', go);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
      wrap.appendChild(h('div', { class: 'q-text-answer' }, input, check));
    }
    wrap.appendChild(fb);
    return wrap;
  }

  /* ---------- Flashcards ---------- */

  function mountFlashcards(el, cardsArg) {
    const data = cardsArg || readJSON(el);
    if (!data) return;
    const cards = Array.isArray(data) ? data : data.cards || [];
    const title = el.dataset.title || 'Flashcards';
    let order = cards.map((_, k) => k), i = 0, flipped = false;
    const known = new Set();

    el.innerHTML = '';
    el.classList.add('widget', 'flashcards');
    const front = h('div', { class: 'fc-face fc-front' }, h('span', { class: 'fc-label', text: el.dataset.front || 'Term' }), h('div', { class: 'fc-text' }));
    const back = h('div', { class: 'fc-face fc-back' }, h('span', { class: 'fc-label', text: el.dataset.back || 'Definition' }), h('div', { class: 'fc-text' }));
    const card = h('button', { type: 'button', class: 'fc-card', 'aria-live': 'polite' }, front, back);
    const count = h('span', { class: 'fc-count' });
    const knownEl = h('span', { class: 'fc-count' });
    frame(el, 'Flashcards', title, [
      iconBtn('shuffle', 'Shuffle', 'ghost', () => { order = WD1.shuffle(order); i = 0; show(); }),
      iconBtn('reset', 'Restart', 'ghost', () => { order = cards.map((_, k) => k); known.clear(); i = 0; show(); })
    ]);
    const prevB = h('button', { type: 'button', class: 'btn small', text: '← Prev', onclick: () => go(-1) });
    const nextB = h('button', { type: 'button', class: 'btn small', text: 'Next →', onclick: () => go(1) });
    const gotB = h('button', { type: 'button', class: 'btn small', text: 'I knew it', onclick: () => { known.add(order[i]); go(1); } });
    const againB = h('button', { type: 'button', class: 'btn small ghost', text: 'Study again', onclick: () => { known.delete(order[i]); go(1); } });
    el.appendChild(h('div', { class: 'fc-stage' }, card));
    el.appendChild(h('div', { class: 'fc-controls' },
      h('div', { class: 'btn-row' }, prevB, nextB),
      h('div', { class: 'cluster' }, count, knownEl),
      h('div', { class: 'btn-row' }, againB, gotB)));

    card.addEventListener('click', () => { flipped = !flipped; card.classList.toggle('flipped', flipped); card.setAttribute('aria-label', flipped ? 'Showing definition. Press to show term.' : 'Showing term. Press to reveal definition.'); });
    el.addEventListener('keydown', (e) => {
      if (e.target.matches('input, textarea')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });

    function go(d) { i = (i + d + order.length) % order.length; show(); }
    function show() {
      if (!cards.length) return;
      const c = cards[order[i]];
      flipped = false; card.classList.remove('flipped');
      $('.fc-text', front).innerHTML = WD1.fmt(c.front);
      $('.fc-text', back).innerHTML = WD1.fmt(c.back);
      count.textContent = 'Card ' + (i + 1) + ' / ' + order.length;
      knownEl.textContent = '· Known ' + known.size + ' / ' + cards.length;
      card.setAttribute('aria-label', 'Showing term. Press to reveal definition.');
      requestAnimationFrame(fit);
    }
    function fit() {
      card.style.height = 'auto';
      const need = Math.max(200, front.scrollHeight, back.scrollHeight);
      card.style.height = need + 'px';
    }
    window.addEventListener('resize', fit);
    show();
  }
  WD1.flashcards = mountFlashcards;

  /* ---------- Code editor (textarea with highlighted overlay) ---------- */

  WD1.editor = function (container, opts) {
    opts = opts || {};
    const lang = opts.lang || 'html';
    const pre = h('pre', { 'aria-hidden': 'true' });
    const ta = h('textarea', {
      spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', wrap: 'off',
      'aria-label': opts.label || (lang.toUpperCase() + ' code editor. Press Escape then Tab to leave.')
    });
    ta.value = opts.value || '';
    const box = h('div', { class: 'code-editor' }, pre, ta);
    if (opts.height) box.style.minHeight = opts.height + 'px';
    container.appendChild(box);

    const paint = () => { pre.innerHTML = WD1.highlight(ta.value, lang) + '\n '; sync(); };
    const sync = () => { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; };
    let escaped = false;

    const insert = (text) => {
      ta.focus();
      let ok = false;
      try { ok = document.execCommand('insertText', false, text); } catch (e) { ok = false; }
      if (!ok) { ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input')); }
    };

    ta.addEventListener('input', () => { paint(); if (opts.onInput) opts.onInput(ta.value); });
    ta.addEventListener('scroll', sync);
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { escaped = true; return; }
      if (e.key === 'Tab' && !escaped && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const s = ta.selectionStart, v = ta.value;
        if (e.shiftKey) {
          const ls = v.lastIndexOf('\n', s - 1) + 1;
          if (v.slice(ls, ls + 2) === '  ') {
            ta.setSelectionRange(ls, ls + 2); insert('');
            ta.setSelectionRange(Math.max(ls, s - 2), Math.max(ls, s - 2));
          }
        } else insert('  ');
        return;
      }
      escaped = false;
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const s = ta.selectionStart, v = ta.value;
        const ls = v.lastIndexOf('\n', s - 1) + 1;
        const indent = v.slice(ls, s).match(/^\s*/)[0];
        const before = v.slice(0, s).trimEnd(), after = v.slice(ta.selectionEnd);
        let extra = '';
        if (/[{(\[]$/.test(before) || (/<([a-zA-Z][\w-]*)[^>]*>$/.test(before) && !/<\/[^>]+>$/.test(before) &&
          !/<(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)\b[^>]*>$/i.test(before))) extra = '  ';
        e.preventDefault();
        const closer = /^\s*[}\])]|^\s*<\//.test(after);
        if (extra && closer) {
          insert('\n' + indent + extra + '\n' + indent);
          const pos = ta.selectionStart - (1 + indent.length);
          ta.setSelectionRange(pos, pos);
        } else insert('\n' + indent + extra);
      }
    });
    paint();
    return {
      el: box, textarea: ta,
      get: () => ta.value,
      set: (v) => { ta.value = v; paint(); if (opts.onInput) opts.onInput(v); },
      focus: () => ta.focus()
    };
  };

  /* ---------- Playground ---------- */

  const pgRegistry = new Map();
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || typeof d !== 'object' || !d.wd1pg) return;
    const pg = pgRegistry.get(d.wd1pg);
    if (pg) pg.log(d.type, d.args || []);
  });

  // Runs INSIDE the preview iframe. Must stay ES5-safe and self-contained.
  function previewHelper(pgId) {
    var send = function (type, args) { try { parent.postMessage({ wd1pg: pgId, type: type, args: args }, '*'); } catch (e) { /* ignore */ } };
    var fmt = function (v) {
      try {
        if (typeof v === 'string') return v;
        if (v === undefined) return 'undefined';
        if (typeof v === 'function') return 'ƒ ' + (v.name || 'anonymous') + '()';
        if (typeof Element !== 'undefined' && v instanceof Element) {
          return '<' + v.tagName.toLowerCase() + (v.id ? '#' + v.id : '') +
            (typeof v.className === 'string' && v.className.trim() ? '.' + v.className.trim().split(/\s+/).join('.') : '') + '>';
        }
        if (typeof NodeList !== 'undefined' && (v instanceof NodeList || v instanceof HTMLCollection)) {
          return (v instanceof NodeList ? 'NodeList' : 'HTMLCollection') + '(' + v.length + ') [' + Array.prototype.map.call(v, fmt).join(', ') + ']';
        }
        if (v instanceof Error) return v.name + ': ' + v.message;
        if (typeof Event !== 'undefined' && v instanceof Event) return v.constructor.name + ' { type: "' + v.type + '" }';
        return JSON.stringify(v, null, 1).replace(/\n\s*/g, ' ');
      } catch (e) { return String(v); }
    };
    ['log', 'info', 'warn', 'error'].forEach(function (k) {
      var orig = console[k];
      console[k] = function () {
        send(k, Array.prototype.map.call(arguments, fmt));
        if (orig) orig.apply(console, arguments);
      };
    });
    window.addEventListener('error', function (e) { send('error', [e.message + (e.lineno ? ' (line ' + e.lineno + ')' : '')]); });

    var panel = null;
    function note(html) {
      if (!document.body) return;
      if (!panel || !panel.isConnected) {
        panel = document.createElement('wd1-preview-note');
        panel.style.cssText = 'all:initial;position:fixed;left:8px;right:8px;bottom:8px;z-index:2147483647;display:block;';
        var root = panel.attachShadow ? panel.attachShadow({ mode: 'open' }) : panel;
        root.innerHTML = '<style>.n{font:13px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;color:#F3F5F8;background:#161A23;border-radius:10px;padding:10px 38px 10px 12px;box-shadow:0 8px 24px rgba(0,0,0,.35);position:relative;max-height:60vh;overflow:auto}' +
          '.n b{color:#fff}.n code{font:12px ui-monospace,Menlo,Consolas,monospace;background:#2A3140;padding:1px 5px;border-radius:4px;color:#FFD89B;word-break:break-all}' +
          '.n table{border-collapse:collapse;margin-top:6px;width:100%}.n td,.n th{text-align:left;border-top:1px solid #2F3747;padding:3px 6px;font-size:12px;vertical-align:top}' +
          '.n th{color:#9AA3B5;font-weight:600}.n .w{color:#F2B457;margin-top:6px}.x{position:absolute;top:6px;right:6px;border:0;background:#2A3140;color:#fff;border-radius:6px;width:26px;height:26px;cursor:pointer;font-size:14px}</style>' +
          '<div class="n"><button class="x" aria-label="Close">×</button><div class="c"></div></div>';
        root.querySelector('.x').addEventListener('click', function () { panel.remove(); });
        document.body.appendChild(panel);
      }
      (panel.shadowRoot || panel).querySelector('.c').innerHTML = html;
    }
    var escH = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a || e.defaultPrevented) return;
      var href = a.getAttribute('href');
      if (href.charAt(0) === '#') {
        e.preventDefault();
        var t = href.length > 1 ? document.getElementById(decodeURIComponent(href.slice(1))) : null;
        if (t) t.scrollIntoView({ behavior: 'smooth' }); else window.scrollTo(0, 0);
        return;
      }
      if (/^javascript:/i.test(href)) return;
      e.preventDefault();
      note('<b>Link clicked:</b> <code>' + escH(href) + '</code><br>Links don\'t navigate inside this preview' +
        (a.target === '_blank' ? ' (it would open in a new tab).' : '.'));
      send('info', ['Link clicked → ' + href]);
    });

    window.addEventListener('submit', function (e) {
      if (e.defaultPrevented) return;
      e.preventDefault();
      var f = e.target, fd;
      try { fd = new FormData(f, e.submitter || undefined); } catch (err) { fd = new FormData(f); }
      var method = (f.getAttribute('method') || 'get').toUpperCase();
      var action = f.getAttribute('action') || '(same page)';
      var pairs = [];
      fd.forEach(function (v, k) { pairs.push([k, typeof v === 'string' ? v : (v && v.name ? v.name : '(no file)')]); });
      var enc = pairs.map(function (p) { return encodeURIComponent(p[0]) + '=' + encodeURIComponent(p[1]).replace(/%20/g, '+'); }).join('&');
      var unnamed = Array.prototype.filter.call(f.querySelectorAll('input, select, textarea'), function (c) {
        return !c.name && !/^(submit|button|reset|image)$/i.test(c.type);
      }).length;
      var html = '<b>Form submitted</b> · <code>' + method + '</code> → <code>' + escH(action) + '</code>';
      if (method === 'GET') html += '<br>Browser would request: <code>' + escH((action === '(same page)' ? '' : action) + '?' + enc) + '</code>';
      else html += '<br>Request body: <code>' + escH(enc || '(empty)') + '</code>';
      if (pairs.length) {
        html += '<table><tr><th>name</th><th>value</th></tr>' + pairs.map(function (p) { return '<tr><td><code>' + escH(p[0]) + '</code></td><td>' + escH(p[1]) + '</td></tr>'; }).join('') + '</table>';
      } else html += '<div class="w">No data was sent. Give each control a <code>name</code> attribute.</div>';
      if (unnamed) html += '<div class="w">' + unnamed + ' field' + (unnamed > 1 ? 's have' : ' has') + ' no <code>name</code>, so ' + (unnamed > 1 ? 'they were' : 'it was') + ' not sent.</div>';
      note(html);
      send('info', ['Form submitted: ' + method + ' ' + action + (enc ? ' · ' + enc : '')]);
    });
  }

  WD1.buildPreviewDoc = function (code, pgId) {
    const html = code.html || '', css = code.css || '', js = code.js || '';
    const helper = '<script>(' + previewHelper.toString() + ')(' + JSON.stringify(pgId || 'x') + ');<\/script>';
    const style = css ? '<style>\n' + css + '\n</style>' : '';
    const script = js ? '<script>\n' + js.replace(/<\/script/gi, '<\\/script') + '\n<\/script>' : '';
    if (/<html[\s>]|<!doctype/i.test(html)) {
      let doc = html;
      const inject = helper + style;
      if (/<head[^>]*>/i.test(doc)) doc = doc.replace(/<head[^>]*>/i, (m) => m + inject);
      else if (/<html[^>]*>/i.test(doc)) doc = doc.replace(/<html[^>]*>/i, (m) => m + '<head>' + inject + '</head>');
      else if (/<!doctype[^>]*>/i.test(doc)) doc = doc.replace(/<!doctype[^>]*>/i, (m) => m + inject);
      else doc = inject + doc;
      if (script) doc = /<\/body>/i.test(doc) ? doc.replace(/<\/body>/i, () => script + '</body>') : doc + script;
      return doc;
    }
    return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
      helper + style + '</head><body>\n' + html + '\n' + script + '</body></html>';
  };

  const LANG_LABEL = { html: 'HTML', css: 'CSS', js: 'JS' };

  function mountPlayground(el) {
    const id = autoId(el, 'pg');
    const areas = $$(':scope > textarea[data-lang]', el);
    const orig = {};
    areas.forEach((t) => { orig[t.dataset.lang] = dedent(t.value); });
    if (!areas.length) orig.html = '';
    const langs = ['html', 'css', 'js'].filter((l) => l in orig);
    const saved = WD1.store.get('pg', id);
    const code = Object.assign({}, orig, saved && typeof saved === 'object' ? saved : {});
    const checksEl = $(':scope > script.checks', el);
    let checks = null;
    if (checksEl) { try { checks = JSON.parse(checksEl.textContent); } catch (e) { console.error('[WD1] checks JSON', e); } }
    const height = parseInt(el.dataset.height, 10) || 300;
    const wantConsole = el.dataset.console === 'true' || (el.dataset.console !== 'false' && langs.includes('js'));
    const title = el.dataset.title || 'Try it';

    el.innerHTML = '';
    el.classList.add('widget', 'playground');
    if (el.dataset.layout === 'stacked') el.classList.add('stacked');
    if (el.dataset.preview === 'false') el.classList.add('console-only');

    const resetB = iconBtn('reset', 'Reset', 'ghost', () => {
      Object.assign(code, orig);
      editors.forEach((ed, l) => ed.set(orig[l]));
      WD1.store.set('pg', id, undefined);
      run();
    });
    const openB = iconBtn('open', 'Open in playground', 'ghost', () => {
      try { localStorage.setItem('wd1:handoff', JSON.stringify({ html: code.html || '', css: code.css || '', js: code.js || '', title })); } catch (e) { /* ignore */ }
      window.open(WD1.url('tools/playground.html#handoff'), '_blank');
    });
    frame(el, 'Playground', title, [resetB, openB]);

    const tabs = h('div', { class: 'pg-tabs', role: 'tablist' });
    const edCol = h('div', { class: 'pg-editor-col' }, tabs);
    const editors = new Map();
    let active = langs[0];
    langs.forEach((l) => {
      const tab = h('button', { type: 'button', class: 'pg-tab', role: 'tab', 'aria-selected': String(l === active), text: LANG_LABEL[l],
        onclick: () => select(l) });
      tabs.appendChild(tab);
      const holder = h('div', { style: { display: 'flex', flexDirection: 'column', flex: '1' }, hidden: l !== active });
      edCol.appendChild(holder);
      const ed = WD1.editor(holder, { value: code[l], lang: l, height, onInput: (v) => { code[l] = v; schedule(); saveSoon(); } });
      ed.holder = holder; ed.tab = tab;
      editors.set(l, ed);
    });
    function select(l) {
      active = l;
      editors.forEach((ed, k) => { ed.holder.hidden = k !== l; ed.tab.setAttribute('aria-selected', String(k === l)); });
    }

    const iframe = h('iframe', { title: title + ' preview', loading: 'lazy' });
    iframe.style.minHeight = height + 'px';
    const consoleEl = wantConsole ? h('div', { class: 'pg-console', 'aria-live': 'polite', 'aria-label': 'Console output' }) : null;
    const prevCol = h('div', { class: 'pg-preview-col' },
      h('div', { class: 'pg-label' }, h('span', { text: 'Preview' }), h('span', { class: 'pg-status', text: 'live' })),
      iframe,
      consoleEl ? h('div', { class: 'pg-label' }, h('span', { text: 'Console' }),
        h('button', { type: 'button', class: 'btn small ghost', text: 'Clear', onclick: () => clearConsole() })) : null,
      consoleEl);
    el.appendChild(h('div', { class: 'pg-panes' }, edCol, prevCol));

    let checksBox = null, checkList = null, checkHead = null;
    if (checks && checks.length) {
      checkHead = h('h4', null, h('span', { class: 'widget-kind', text: 'Challenge' }), h('span', { text: el.dataset.challenge || 'Make every check pass' }));
      checkList = h('ul');
      checksBox = h('div', { class: 'pg-checks' }, checkHead, checkList);
      el.appendChild(checksBox);
    }

    function clearConsole() {
      if (!consoleEl) return;
      consoleEl.innerHTML = '';
      consoleEl.appendChild(h('div', { class: 'empty', text: 'console.log() output appears here.' }));
    }
    function log(type, args) {
      if (!consoleEl) return;
      const empty = $('.empty', consoleEl);
      if (empty) empty.remove();
      consoleEl.appendChild(h('div', { class: 'log-line ' + (type === 'log' ? '' : type), text: (type === 'error' ? '✖ ' : type === 'warn' ? '⚠ ' : type === 'info' ? '› ' : '') + args.join(' ') }));
      consoleEl.scrollTop = consoleEl.scrollHeight;
    }
    pgRegistry.set(id, { log });

    let timer = null, saveTimer = null;
    function schedule() { clearTimeout(timer); timer = setTimeout(run, 350); }
    function saveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(() => WD1.store.set('pg', id, { html: code.html, css: code.css, js: code.js }), 600); }

    function run() {
      clearConsole();
      iframe.srcdoc = WD1.buildPreviewDoc(code, id);
    }
    iframe.addEventListener('load', () => { if (checks) setTimeout(runChecks, 60); });

    function runChecks() {
      let doc, win;
      try { doc = iframe.contentDocument; win = iframe.contentWindow; } catch (e) { return; }
      if (!doc) return;
      const q = (s) => doc.querySelector(s);
      const qa = (s) => Array.from(doc.querySelectorAll(s));
      const style = (s, p) => { const n = typeof s === 'string' ? q(s) : s; return n ? win.getComputedStyle(n).getPropertyValue(p).trim() : ''; };
      let passed = 0;
      checkList.innerHTML = '';
      checks.forEach((c) => {
        let ok = false;
        try { ok = !!new Function('doc', 'win', '$', '$$', 'style', 'code', c.test)(doc, win, q, qa, style, code); } catch (e) { ok = false; }
        if (ok) passed++;
        checkList.appendChild(h('li', { class: ok ? 'pass' : 'fail' }, h('span', { class: 'ck', text: ok ? '✓' : '' }), h('span', { html: WD1.fmt(c.label) })));
      });
      const all = passed === checks.length;
      const prevDone = WD1.store.get('challenge', id);
      $$('.all-pass', checksBox).forEach((x) => x.remove());
      if (all) {
        checksBox.appendChild(h('p', { class: 'all-pass', text: '✓ Challenge complete. Every check passes.', style: { margin: '8px 0 0' } }));
        if (!prevDone) { WD1.store.set('challenge', id, Date.now()); WD1.toast('Challenge complete!', 'visited'); }
      }
      el.dispatchEvent(new CustomEvent('checks', { detail: { passed, total: checks.length }, bubbles: true }));
    }

    run();
    el.wd1 = { run, get: () => Object.assign({}, code), set: (l, v) => { const ed = editors.get(l); if (ed) ed.set(v); } };
  }

  /* ---------- Match ---------- */

  function mountMatch(el) {
    const data = readJSON(el);
    if (!data) return;
    const pairs = data.pairs || data;
    const title = el.dataset.title || 'Match the pairs';
    function build() {
      el.innerHTML = '';
      el.classList.add('widget', 'match');
      const status = h('span', { class: 'muted small' });
      frame(el, 'Match', title, [iconBtn('reset', 'Reset', 'ghost', build)]);
      const left = h('div', { class: 'match-col' }, h('span', { class: 'match-col-title', text: data.leftTitle || 'Term' }));
      const right = h('div', { class: 'match-col' }, h('span', { class: 'match-col-title', text: data.rightTitle || 'Matches' }));
      let sel = null, matched = 0, misses = 0;
      const mk = (text, k, side) => h('button', { type: 'button', class: 'match-item ' + (side === 'L' ? 'term' : ''), dataset: { k, side } },
        h('span', { class: 'm-badge', text: side === 'L' ? String(k + 1) : '·' }), h('span', { html: WD1.fmt(text) }));
      const L = pairs.map((p, k) => mk(p[0], k, 'L'));
      const R = WD1.shuffle(pairs.map((p, k) => mk(p[1], k, 'R')));
      if (!data.monoLeft && data.monoLeft !== undefined) L.forEach((b) => b.classList.remove('term'));
      L.forEach((b) => left.appendChild(b));
      R.forEach((b) => right.appendChild(b));
      const onClick = (b) => {
        if (b.classList.contains('matched')) return;
        if (!sel || sel.dataset.side === b.dataset.side) {
          if (sel) sel.classList.remove('selected');
          sel = sel === b ? null : b;
          if (sel) sel.classList.add('selected');
          return;
        }
        const a = sel; sel = null; a.classList.remove('selected');
        if (a.dataset.k === b.dataset.k) {
          matched++;
          [a, b].forEach((x) => { x.classList.add('matched', 'pop'); x.disabled = true; $('.m-badge', x).textContent = String(+x.dataset.k + 1); });
          if (matched === pairs.length) {
            status.textContent = 'All matched · ' + misses + ' miss' + (misses === 1 ? '' : 'es');
            status.className = 'pill ' + (misses ? 'info' : 'good');
            WD1.toast(misses ? 'All matched with ' + misses + ' miss' + (misses === 1 ? '' : 'es') : 'Perfect match!');
          } else status.textContent = matched + ' of ' + pairs.length + ' matched';
        } else {
          misses++;
          [a, b].forEach((x) => { x.classList.remove('shake'); void x.offsetWidth; x.classList.add('shake'); });
          status.textContent = matched + ' of ' + pairs.length + ' matched · ' + misses + ' miss' + (misses === 1 ? '' : 'es');
        }
      };
      [...L, ...R].forEach((b) => b.addEventListener('click', () => onClick(b)));
      el.appendChild(h('div', { class: 'widget-body', style: { paddingBottom: '0' } },
        h('p', { class: 'small muted', style: { margin: 0 }, text: 'Pick an item on the left, then its match on the right.' })));
      el.appendChild(h('div', { class: 'match-grid' }, left, right));
      el.appendChild(h('div', { class: 'widget-foot' }, status));
      status.textContent = '0 of ' + pairs.length + ' matched';
    }
    build();
  }

  /* ---------- Order ---------- */

  function mountOrder(el) {
    const data = readJSON(el);
    if (!data) return;
    const items = data.items || data;
    const mono = !!data.code;
    const title = el.dataset.title || 'Put these in order';
    function build() {
      el.innerHTML = '';
      el.classList.add('widget', 'order');
      frame(el, 'Order', title);
      if (data.prompt) el.appendChild(h('div', { class: 'widget-body', style: { paddingBottom: 0 } }, h('p', { html: WD1.fmt(data.prompt), style: { margin: 0 } })));
      const list = h('ol', { class: 'order-list' });
      let idxs = items.map((_, k) => k);
      do { idxs = WD1.shuffle(idxs); } while (items.length > 1 && idxs.every((v, k) => v === k));
      let dragEl = null;
      const clearMarks = () => $$('.order-item', list).forEach((x) => x.classList.remove('drop-before', 'drop-after', 'right', 'wrong'));
      idxs.forEach((k) => {
        const li = h('li', { class: 'order-item', draggable: 'true', dataset: { k } },
          h('span', { class: 'o-text' + (mono ? ' mono' : ''), html: mono ? esc(items[k]) : WD1.fmt(items[k]) }),
          h('span', { class: 'o-btns' },
            h('button', { type: 'button', 'aria-label': 'Move up', text: '↑', onclick: () => { const p = li.previousElementSibling; if (p) { list.insertBefore(li, p); clearMarks(); li.querySelector('button').focus(); } } }),
            h('button', { type: 'button', 'aria-label': 'Move down', text: '↓', onclick: () => { const nx = li.nextElementSibling; if (nx) { list.insertBefore(nx, li); clearMarks(); li.querySelectorAll('button')[1].focus(); } } })));
        li.addEventListener('dragstart', (e) => { dragEl = li; li.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', ''); } catch (err) { /* ignore */ } });
        li.addEventListener('dragend', () => { li.classList.remove('dragging'); dragEl = null; $$('.order-item', list).forEach((x) => x.classList.remove('drop-before', 'drop-after')); });
        li.addEventListener('dragover', (e) => {
          if (!dragEl || dragEl === li) return;
          e.preventDefault();
          const r = li.getBoundingClientRect(), before = e.clientY < r.top + r.height / 2;
          li.classList.toggle('drop-before', before); li.classList.toggle('drop-after', !before);
        });
        li.addEventListener('dragleave', () => li.classList.remove('drop-before', 'drop-after'));
        li.addEventListener('drop', (e) => {
          e.preventDefault();
          if (!dragEl || dragEl === li) return;
          const before = li.classList.contains('drop-before');
          list.insertBefore(dragEl, before ? li : li.nextSibling);
          clearMarks();
        });
        list.appendChild(li);
      });
      el.appendChild(list);
      const status = h('span', { class: 'small muted', text: 'Drag items, or use the arrow buttons.' });
      el.appendChild(h('div', { class: 'fill-actions' },
        h('button', { type: 'button', class: 'btn small primary', text: 'Check order', onclick: () => {
          const lis = $$('.order-item', list);
          let right = 0;
          lis.forEach((li, pos) => { const ok = +li.dataset.k === pos; li.classList.toggle('right', ok); li.classList.toggle('wrong', !ok); if (ok) right++; });
          status.textContent = right === lis.length ? '✓ Perfect order!' : right + ' of ' + lis.length + ' in the right spot.';
          status.className = 'pill ' + (right === lis.length ? 'good' : 'warn');
          if (right === lis.length) WD1.toast('Correct order!');
        } }),
        h('button', { type: 'button', class: 'btn small ghost', text: 'Show answer', onclick: () => {
          const lis = $$('.order-item', list).sort((a, b) => a.dataset.k - b.dataset.k);
          lis.forEach((li) => { list.appendChild(li); li.classList.remove('wrong'); li.classList.add('right'); });
          status.textContent = 'Here is the correct order.'; status.className = 'small muted';
        } }),
        h('button', { type: 'button', class: 'btn small ghost', text: 'Shuffle', onclick: build }),
        status));
      if (data.explain) el.appendChild(h('div', { class: 'widget-foot', html: WD1.fmt(data.explain) }));
    }
    build();
  }

  /* ---------- Buckets (categorize) ---------- */

  function mountBuckets(el) {
    const data = readJSON(el);
    if (!data) return;
    const buckets = data.buckets;
    const items = data.items;
    const mono = !!data.code;
    const title = el.dataset.title || 'Sort into categories';
    function build() {
      el.innerHTML = '';
      el.classList.add('widget', 'buckets');
      frame(el, 'Sort', title, [iconBtn('reset', 'Reset', 'ghost', build)]);
      el.appendChild(h('div', { class: 'widget-body', style: { paddingBottom: 0 } },
        h('p', { class: 'small muted', style: { margin: 0 }, text: data.prompt || 'Select an item, then select the category it belongs in. You can also drag.' })));
      const pool = h('div', { class: 'bk-pool', 'aria-label': 'Unsorted items' });
      let armed = null, dragChip = null;
      const zones = [];
      const arm = (chip) => {
        if (armed) armed.classList.remove('selected');
        armed = armed === chip ? null : chip;
        if (armed) armed.classList.add('selected');
        zones.forEach((z) => z.classList.toggle('armed', !!armed));
      };
      const place = (chip, zone) => {
        chip.classList.remove('selected', 'right', 'wrong');
        (zone ? $('.bk-bucket-items', zone) : pool).appendChild(chip);
        armed = null; zones.forEach((z) => z.classList.remove('armed'));
      };
      WD1.shuffle(items.map((it, k) => k)).forEach((k) => {
        const chip = h('button', { type: 'button', class: 'bk-chip' + (mono ? ' mono' : ''), draggable: 'true', dataset: { k },
          html: mono ? esc(items[k][0]) : WD1.fmt(items[k][0]) });
        chip.addEventListener('click', (e) => { e.stopPropagation(); arm(chip); });
        chip.addEventListener('dragstart', (e) => { dragChip = chip; try { e.dataTransfer.setData('text/plain', ''); } catch (err) { /* ignore */ } });
        chip.addEventListener('dragend', () => { dragChip = null; zones.forEach((z) => z.classList.remove('over')); });
        pool.appendChild(chip);
      });
      pool.addEventListener('click', () => { if (armed && armed.parentNode !== pool) place(armed, null); });
      pool.addEventListener('dragover', (e) => { if (dragChip) e.preventDefault(); });
      pool.addEventListener('drop', (e) => { e.preventDefault(); if (dragChip) place(dragChip, null); });
      const grid = h('div', { class: 'bk-grid' });
      buckets.forEach((name) => {
        const zone = h('div', { class: 'bk-bucket', role: 'button', tabindex: '0', dataset: { bucket: name }, 'aria-label': 'Place selected item in ' + name },
          h('span', { class: 'bk-bucket-title', html: WD1.fmt(name) }), h('div', { class: 'bk-bucket-items' }));
        zone.addEventListener('click', () => { if (armed) place(armed, zone); });
        zone.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && armed) { e.preventDefault(); place(armed, zone); } });
        zone.addEventListener('dragover', (e) => { if (dragChip) { e.preventDefault(); zone.classList.add('over'); } });
        zone.addEventListener('dragleave', () => zone.classList.remove('over'));
        zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('over'); if (dragChip) place(dragChip, zone); });
        zones.push(zone); grid.appendChild(zone);
      });
      el.appendChild(pool);
      el.appendChild(grid);
      const status = h('span', { class: 'small muted' });
      el.appendChild(h('div', { class: 'fill-actions' },
        h('button', { type: 'button', class: 'btn small primary', text: 'Check', onclick: () => {
          if ($$('.bk-chip', pool).length) { status.textContent = 'Place every item first (' + $$('.bk-chip', pool).length + ' left).'; status.className = 'pill warn'; return; }
          let right = 0;
          zones.forEach((z) => $$('.bk-chip', z).forEach((c) => {
            const ok = items[c.dataset.k][1] === z.dataset.bucket;
            c.classList.toggle('right', ok); c.classList.toggle('wrong', !ok); if (ok) right++;
          }));
          status.textContent = right === items.length ? '✓ All ' + right + ' sorted correctly!' : right + ' of ' + items.length + ' correct. Move the red ones.';
          status.className = 'pill ' + (right === items.length ? 'good' : 'warn');
          if (right === items.length) WD1.toast('All sorted!');
        } }),
        h('button', { type: 'button', class: 'btn small ghost', text: 'Show answers', onclick: () => {
          $$('.bk-chip', el).forEach((c) => {
            const z = zones.find((x) => x.dataset.bucket === items[c.dataset.k][1]);
            if (z) { $('.bk-bucket-items', z).appendChild(c); c.classList.remove('wrong', 'selected'); c.classList.add('right'); }
          });
          status.textContent = 'Answers shown.'; status.className = 'small muted';
        } }),
        status));
      if (data.explain) el.appendChild(h('div', { class: 'widget-foot', html: WD1.fmt(data.explain) }));
    }
    build();
  }

  /* ---------- Stepper (walkthroughs and animated diagrams) ---------- */

  function parseSpec(spec) {
    const set = new Set();
    String(spec).split(',').forEach((part) => {
      const m = part.trim().match(/^(\d+)(?:-(\d+))?$/);
      if (!m) return;
      const a = +m[1], b = m[2] ? +m[2] : a;
      for (let k = a; k <= b; k++) set.add(k);
    });
    return set;
  }

  function mountStepper(el) {
    const stage = $(':scope > .stepper-stage', el);
    const list = $(':scope > .steps', el) || $(':scope > ol', el);
    if (!list) return;
    list.classList.add('steps');
    const steps = $$(':scope > li', list);
    steps.forEach((li, k) => {
      li.dataset.n = String(k + 1); // hidden items don't advance CSS counters, so number them explicitly
      const body = h('div', { class: 'step-body' });
      while (li.firstChild) body.appendChild(li.firstChild);
      li.appendChild(body);
    });
    el.classList.add('widget', 'stepper');
    const title = el.dataset.title || 'Step by step';
    const counter = h('span', { class: 'small muted num' });
    const dots = h('div', { class: 'stepper-dots' });
    let i = 0, timer = null;
    const playB = h('button', { type: 'button', class: 'btn small', html: ICON.play + '<span>Play</span>', onclick: () => (timer ? stop() : play()) });
    const prevB = h('button', { type: 'button', class: 'btn small', text: '← Back', onclick: () => { stop(); go(i - 1); } });
    const nextB = h('button', { type: 'button', class: 'btn small primary', text: 'Next →', onclick: () => { stop(); go(i + 1); } });
    const allB = h('button', { type: 'button', class: 'btn small ghost', text: 'Show all steps', 'aria-pressed': 'false',
      onclick: () => { const on = el.classList.toggle('show-all'); allB.setAttribute('aria-pressed', String(on)); allB.textContent = on ? 'One step at a time' : 'Show all steps'; } });
    frame(el, 'Walkthrough', title);
    steps.forEach((_, k) => dots.appendChild(h('button', { type: 'button', 'aria-label': 'Go to step ' + (k + 1), onclick: () => { stop(); go(k); } })));
    el.appendChild(h('div', { class: 'stepper-controls' }, prevB, nextB, steps.length > 2 ? playB : null, allB, counter, dots));
    list.setAttribute('aria-live', 'polite');

    const onEls = stage ? $$('[data-on]', stage).map((n) => [n, parseSpec(n.dataset.on)]) : [];
    const actEls = stage ? $$('[data-active]', stage).map((n) => [n, parseSpec(n.dataset.active)]) : [];

    function go(k) {
      i = Math.max(0, Math.min(steps.length - 1, k));
      steps.forEach((li, j) => li.classList.toggle('current', j === i));
      $$('button', dots).forEach((d, j) => (j === i ? d.setAttribute('aria-current', 'step') : d.removeAttribute('aria-current')));
      counter.textContent = 'Step ' + (i + 1) + ' of ' + steps.length;
      prevB.disabled = i === 0; nextB.disabled = i === steps.length - 1;
      onEls.forEach(([n, set]) => n.classList.toggle('on', set.has(i + 1)));
      actEls.forEach(([n, set]) => n.classList.toggle('active', set.has(i + 1)));
      el.dataset.step = String(i + 1);
      el.dispatchEvent(new CustomEvent('stepchange', { detail: { index: i, step: i + 1, count: steps.length } }));
    }
    function play() {
      if (i >= steps.length - 1) go(0);
      playB.innerHTML = ICON.pause + '<span>Pause</span>';
      timer = setInterval(() => { if (i >= steps.length - 1) stop(); else go(i + 1); }, parseInt(el.dataset.autoplay, 10) || 3200);
    }
    function stop() { clearInterval(timer); timer = null; playB.innerHTML = ICON.play + '<span>Play</span>'; }
    el.tabIndex = el.tabIndex >= 0 ? el.tabIndex : -1;
    el.addEventListener('keydown', (e) => {
      if (e.target.matches('input, textarea, select')) return;
      if (e.key === 'ArrowRight') { stop(); go(i + 1); }
      if (e.key === 'ArrowLeft') { stop(); go(i - 1); }
    });
    go(0);
    el.wd1 = { go, get step() { return i + 1; } };
  }

  /* ---------- Fill in the blanks ---------- */

  function mountFill(el) {
    const src = $(':scope > script[type="text/plain"]', el) || $(':scope > pre', el);
    if (!src) return;
    const raw = dedent(unescapeScript(src.textContent));
    const isText = el.dataset.mode === 'text';
    const caseSensitive = el.dataset.case === 'sensitive';
    const title = el.dataset.title || 'Fill in the blanks';
    const blanks = [];
    el.innerHTML = '';
    el.classList.add('widget', 'fill');
    frame(el, 'Fill in', title);
    const box = h(isText ? 'div' : 'pre', { class: isText ? 'fill-text' : 'fill-code' });
    const re = /\[\[(.+?)\]\]/g;
    let last = 0, m;
    while ((m = re.exec(raw))) {
      if (m.index > last) box.appendChild(isText ? h('span', { html: WD1.fmt(raw.slice(last, m.index)) }) : document.createTextNode(raw.slice(last, m.index)));
      const answers = m[1].split('|');
      const width = Math.max(3, ...answers.map((a) => a.length)) + 1;
      const inp = h('input', { type: 'text', 'aria-label': 'Blank ' + (blanks.length + 1), autocomplete: 'off', spellcheck: 'false', autocapitalize: 'off', style: { width: width + 'ch' } });
      inp.addEventListener('input', () => inp.classList.remove('right', 'wrong'));
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); check(); } });
      blanks.push({ inp, answers });
      box.appendChild(inp);
      last = re.lastIndex;
    }
    if (last < raw.length) box.appendChild(isText ? h('span', { html: WD1.fmt(raw.slice(last)) }) : document.createTextNode(raw.slice(last)));
    el.appendChild(isText ? box : h('div', { style: { overflowX: 'auto' } }, box));
    const norm = (s) => { s = s.trim().replace(/\s+/g, ' '); return caseSensitive ? s : s.toLowerCase(); };
    const status = h('span', { class: 'small muted' });
    function check() {
      let right = 0;
      blanks.forEach((b) => {
        const ok = b.answers.some((a) => norm(a) === norm(b.inp.value));
        b.inp.classList.toggle('right', ok); b.inp.classList.toggle('wrong', !ok); if (ok) right++;
      });
      status.textContent = right === blanks.length ? '✓ All blanks correct!' : right + ' of ' + blanks.length + ' correct.';
      status.className = 'pill ' + (right === blanks.length ? 'good' : 'warn');
      if (right === blanks.length) WD1.toast('All blanks correct!');
    }
    el.appendChild(h('div', { class: 'fill-actions' },
      h('button', { type: 'button', class: 'btn small primary', text: 'Check', onclick: check }),
      h('button', { type: 'button', class: 'btn small ghost', text: 'Show answers', onclick: () => {
        blanks.forEach((b) => { b.inp.value = b.answers[0]; b.inp.classList.remove('wrong'); b.inp.classList.add('right'); });
        status.textContent = 'Answers filled in.'; status.className = 'small muted';
      } }),
      h('button', { type: 'button', class: 'btn small ghost', text: 'Clear', onclick: () => {
        blanks.forEach((b) => { b.inp.value = ''; b.inp.classList.remove('right', 'wrong'); });
        status.textContent = '';
      } }),
      status));
    if (el.dataset.explain) el.appendChild(h('div', { class: 'widget-foot', html: WD1.fmt(el.dataset.explain) }));
  }

  /* ---------- Tabs ---------- */

  function mountTabs(el) {
    const panels = $$(':scope > [data-tab]', el);
    if (!panels.length) return;
    const list = h('div', { class: 'tab-list', role: 'tablist' });
    const uid = 't' + Math.random().toString(36).slice(2, 8);
    const btns = panels.map((p, k) => {
      p.classList.add('tab-panel');
      p.setAttribute('role', 'tabpanel');
      p.id = p.id || uid + '-p' + k;
      const b = h('button', { type: 'button', class: 'tab-btn', role: 'tab', id: uid + '-t' + k, 'aria-controls': p.id, text: p.dataset.tab });
      p.setAttribute('aria-labelledby', b.id);
      b.addEventListener('click', () => sel(k));
      b.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); sel((k + 1) % panels.length, true); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); sel((k - 1 + panels.length) % panels.length, true); }
      });
      list.appendChild(b);
      return b;
    });
    el.prepend(list);
    function sel(k, focus) {
      panels.forEach((p, j) => { p.hidden = j !== k; });
      btns.forEach((b, j) => { b.setAttribute('aria-selected', String(j === k)); b.tabIndex = j === k ? 0 : -1; });
      if (focus) btns[k].focus();
      el.dispatchEvent(new CustomEvent('tabchange', { detail: { index: k } }));
    }
    sel(0);
  }

  /* ---------- Component registry ---------- */

  const COMPONENTS = [
    ['.quiz', mountQuiz],
    ['.flashcards', (el) => mountFlashcards(el)],
    ['.playground', mountPlayground],
    ['.match', mountMatch],
    ['.order', mountOrder],
    ['.buckets', mountBuckets],
    ['.stepper', mountStepper],
    ['.fill', mountFill],
    ['.tabs', mountTabs]
  ];

  WD1.init = function (root) {
    root = root || document;
    mountCode(root);
    COMPONENTS.forEach(([sel, fn]) => {
      $$(sel, root).forEach((el) => {
        if (el.dataset.mounted) return;
        el.dataset.mounted = '1';
        try { fn(el); } catch (e) {
          console.error('[WD1] Failed to mount', sel, el, e);
          el.appendChild(h('div', { class: 'feedback bad', text: 'This activity failed to load: ' + e.message }));
        }
      });
    });
    $$('.widget[data-title], .widget[data-kind]', root).forEach((el) => {
      if (el.dataset.mounted) return;
      el.dataset.mounted = '1';
      mountGenericWidget(el);
    });
  };

  /* ---------- Boot ---------- */

  const readyQueue = [];
  let booted = false;
  WD1.ready = function (fn) {
    if (booted) setTimeout(fn, 0); else readyQueue.push(fn);
  };

  function boot() {
    try { buildShell(); } catch (e) { console.error('[WD1] shell', e); }
    WD1.init(document);
    booted = true;
    readyQueue.splice(0).forEach((fn) => { try { fn(); } catch (e) { console.error('[WD1] ready()', e); } });
    refreshProgressUI();
    if (location.hash && location.hash.length > 1) {
      let target = null;
      try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch (e) { target = null; }
      if (target) requestAnimationFrame(() => target.scrollIntoView());
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
