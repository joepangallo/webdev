# Authoring guide

Everything in this course is plain HTML, CSS and JavaScript. There is no build step: open any page in a browser and it works, from a local folder or from GitHub Pages.

Two shared files do the heavy lifting:

| File | What it does |
|------|--------------|
| `assets/css/course.css` | Design tokens (light + dark), page shell, and the styles for every component |
| `assets/js/course.js` | Course manifest, progress storage, page shell (top bar, sidebar, section footers), syntax highlighter, and the interactive components |

Open [`docs/components.html`](components.html) in a browser to see every component live.

---

## 1. Page skeleton

A lesson page lives in its own folder (`ch2/index.html`, etc.) and looks like this:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>How the Web Works · Web Dev I</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=JetBrains+Mono:wght@400;700&display=swap">
  <link rel="stylesheet" href="../assets/css/course.css">
  <script src="../assets/js/course.js"></script>   <!-- NOT deferred -->
  <style>
    /* page-specific styles only; use the tokens (var(--surface), var(--mod), ...) */
  </style>
</head>
<body data-module="ch2">
<main id="main">
  <header class="module-hero">
    <h1>How the Web Works</h1>
    <p class="lede">One or two sentences that set up the chapter.</p>
  </header>

  <section class="lesson" id="s2-1">
    <h2>Internet Protocols</h2>
    <p>…</p>
  </section>

  <!-- one <section class="lesson"> per manifest entry, including the review -->
</main>
<script>
  WD1.ready(() => {
    // page-specific widget code
  });
</script>
</body>
</html>
```

What `course.js` adds automatically, so **do not** write these yourself:

- the top bar, the sidebar table of contents, the site footer
- the chapter eyebrow above the `<h1>`, the progress bar and objective chips below the lede
- the section eyebrow above each `<h2>` (number, textbook page, objectives)
- the "Mark section complete" button and "Next" link at the end of each section
- previous/next module links at the bottom

`<body data-module>` must be one of `ch2`, `ch3`, `ch4`, `ch5`, `levelup`. Each section `id` must match the manifest in `course.js` (`s2-1` … `s2-6`, `s2-review`; `s3-1` … and so on; Level Up uses `sl-1` … `sl-6`, `sl-review`). Adding a section means adding it to `WD1.MODULES` too.

---

## 2. Content helpers (CSS only)

| Markup | Result |
|--------|--------|
| `<p class="lede">` | Larger intro paragraph |
| `<aside class="callout">` (+ `tip`, `warn`, `try`, `book`, `project`) | Callout box. Start with `<strong>Title</strong>` |
| `<details class="reveal"><summary>…</summary>…</details>` | Collapsible answer / aside |
| `<div class="grid-2">`, `<div class="grid-3">` | Responsive columns |
| `<div class="cards">` + `<div class="card">` | Auto-fill card grid |
| `<div class="table-wrap"><table class="data-table">` | Styled, horizontally scrollable table |
| `<span class="pill good|bad|warn|info|visited">` | Status pill |
| `<div class="output">` | Monospace output panel |
| `<div class="seg"><button aria-pressed="true">` | Segmented control |
| `<div class="range-row"><label/><input type=range/><output/></div>` | Slider row |
| `.btn`, `.btn.primary`, `.btn.ghost`, `.btn.small`, `.btn-row` | Buttons |
| `.bm-margin`, `.bm-border`, `.bm-padding`, `.bm-content` | DevTools box-model colors |

Useful tokens: `--surface`, `--surface-2`, `--ink`, `--ink-2`, `--ink-3`, `--line`, `--accent`, `--mod` (the current chapter's color), `--good`, `--bad`, `--warn`, `--visited`, `--code-bg`, `--font-mono`, `--font-display`. Never hard-code a color that only works in one theme.

---

## 3. Code samples

Write raw code inside a text script. It is dedented, highlighted and gets a copy button:

```html
<script type="text/plain" class="code" data-lang="html">
  <p>Hello <strong>world</strong></p>
</script>
```

`data-lang` is `html`, `css` or `js`. `data-title` overrides the label. A literal `</script>` inside the sample must be written `<\/script>`; it is displayed correctly.

---

## 4. Interactive components

All JSON-driven components treat text as **mini-markdown**: `` `code` `` (escaped, so `` `<p>` `` shows the tag), `**bold**`, `[text](url)`. Do not put raw HTML in JSON strings.

Every component accepts `data-title` (the widget heading) and `data-id` (a stable storage key; optional, auto-generated from the section otherwise).

### Quiz

```html
<div class="quiz" data-title="Quick check">
  <script type="application/json">
  [
    {"q": "Single answer?", "choices": ["A", "B", "C"], "answer": 1, "explain": "Why B."},
    {"q": "Select all that apply.", "choices": ["A", "B", "C"], "answer": [0, 2], "explain": "…"},
    {"q": "True or false: …", "answer": true, "explain": "…"},
    {"q": "Type the port number for HTTP.", "answer": ["80"], "explain": "…"},
    {"q": "Regex-checked text answer", "answer": ["h1"], "pattern": "^h1$", "caseSensitive": false},
    {"q": "Question about a code sample", "code": "<p>Hi</p>", "lang": "html", "choices": ["…"], "answer": 0}
  ]
  </script>
</div>
```

Add `"shuffle": true` to a question to shuffle its choices. Finishing a quiz with 70% or better (`data-pass="0.8"` to change) marks the enclosing section complete.

### Flashcards

```html
<div class="flashcards" data-title="Key terms" data-front="Term" data-back="Definition">
  <script type="application/json">[{"front": "DNS", "back": "Domain Name System…"}]</script>
</div>
```

### Playground (live code editor)

```html
<div class="playground" data-title="Try it: …" data-height="280" data-layout="stacked">
  <textarea data-lang="html"><h1>Hello</h1></textarea>
  <textarea data-lang="css">h1 { color: tomato; }</textarea>
  <textarea data-lang="js">console.log('hi');</textarea>
  <script type="application/json" class="checks">
  [
    {"label": "Has an `<h1>`", "test": "return !!$('h1')"},
    {"label": "`<h1>` is navy", "test": "return style('h1', 'color') === 'rgb(0, 0, 128)'"},
    {"label": "Uses a class selector", "test": "return /\\.[a-z]/i.test(code.css)"}
  ]
  </script>
</div>
```

- Include only the tabs you need. A JS tab adds a console panel (`data-console="false"` hides it; `"true"` forces it). For JavaScript-only exercises, `data-preview="false"` hides the rendered preview and gives the console the full column.
- Textarea content is not parsed as HTML, so tags can be written literally. Entities **are** decoded, so write `&amp;copy;` to show `&copy;`.
- Check tests are function bodies called with `doc`, `win`, `$` (querySelector), `$$` (querySelectorAll → array), `style(selectorOrNode, prop)` (computed value) and `code` (`{html, css, js}` strings). Computed colors come back as `rgb(r, g, b)`.
- The preview intercepts form submits and shows exactly what the browser would send (method, URL/body, name/value table, and a warning for controls without `name`). Links do not navigate; `#id` links scroll.
- Student edits persist in localStorage; **Reset** restores the original.

### Match

```html
<div class="match" data-title="Match the status code">
  <script type="application/json">
  {"leftTitle": "Code", "rightTitle": "Meaning", "pairs": [["200", "OK"], ["404", "Not found"]]}
  </script>
</div>
```

Left items render in monospace. Add `"monoLeft": false` for prose on the left.

### Order

```html
<div class="order" data-title="Put the steps in order">
  <script type="application/json">
  {"prompt": "Optional instructions", "code": true, "items": ["first", "second", "third"], "explain": "Shown under the list."}
  </script>
</div>
```

Write `items` in the **correct** order; they are shuffled on screen. `"code": true` shows items literally in monospace (no mini-markdown).

### Buckets (sort into categories)

```html
<div class="buckets" data-title="Which layer?">
  <script type="application/json">
  {"buckets": ["Application", "Transport"], "items": [["HTTP", "Application"], ["TCP", "Transport"]], "code": false, "explain": "…"}
  </script>
</div>
```

### Stepper (walkthroughs and animated diagrams)

```html
<div class="stepper" data-title="DNS lookup" data-autoplay="3000">
  <div class="stepper-stage">
    <!-- any HTML or inline SVG -->
    <div data-on="2-5">visible (full opacity) on steps 2 to 5, faded otherwise</div>
    <div data-active="3">outlined only on step 3</div>
  </div>
  <ol class="steps">
    <li><p>Step one text</p></li>
    <li><p>Step two text</p></li>
  </ol>
</div>
```

Specs are 1-based: `"1"`, `"1,3"`, `"2-4"`, `"1,3-5"`. The stepper element fires `stepchange` (`detail.step`, `detail.count`) and sets `data-step`, so custom code and CSS (`.stepper[data-step="3"] .x {}`) can react.

### Fill in the blanks

```html
<div class="fill" data-title="Complete the rule" data-explain="Shown under the activity">
  <script type="text/plain">
h1 [[{]]
  [[color]]: navy[[;]]
[[}]]
  </script>
</div>
```

`[[answer|alternative]]` becomes an input. Add `data-mode="text"` for prose (mini-markdown allowed) and `data-case="sensitive"` for case-sensitive answers.

### Tabs

```html
<div class="tabs">
  <div data-tab="Inline">…</div>
  <div data-tab="External">…</div>
</div>
```

### Custom widgets

Wrap bespoke interactive code in a widget frame so it matches everything else:

```html
<div class="widget" data-kind="Simulator" data-title="URL dissector">
  <!-- content; it is wrapped in .widget-body automatically -->
</div>
```

Then wire it up in the page script inside `WD1.ready(() => { … })`.

---

## 5. JavaScript API

| API | Use |
|-----|-----|
| `WD1.ready(fn)` | Run after the shell and components mount |
| `WD1.$(sel, root)`, `WD1.$$(sel, root)` | Query helpers (`$$` returns an array) |
| `WD1.h(tag, attrs, ...children)` | Create elements. `attrs` supports `class`, `text`, `html`, `onclick`, `dataset`, `style` (object) |
| `WD1.esc(str)` / `WD1.fmt(str)` | Escape HTML / render mini-markdown |
| `WD1.highlight(code, lang)` | Highlighted HTML string for `html`, `css`, `js` |
| `WD1.codeBlock(code, lang)` | A ready-made code block element |
| `WD1.editor(container, {value, lang, height, onInput})` | A highlighted code editor (`get`, `set`, `focus`) |
| `WD1.buildPreviewDoc({html, css, js})` | Full preview document string (for an `iframe.srcdoc`) |
| `WD1.flashcards(el, cards)` | Mount flashcards from an array |
| `WD1.init(root)` | Mount components inside dynamically added markup |
| `WD1.toast(msg, 'visited'?)` | Brief status message |
| `WD1.copy(text, button?)` | Copy to the clipboard with fallback |
| `WD1.shuffle(array)` | Shuffled copy |
| `WD1.store.get(ns, id)` / `.set(ns, id, value)` | Saved state. Use `ns = 'custom'` for page widgets |
| `WD1.progress.isDone(id)` / `.setDone(id, bool)` / `.moduleStats(modId)` / `.overall()` | Section progress |
| `WD1.MODULES`, `WD1.OBJECTIVES`, `WD1.section(id)`, `WD1.module(id)` | Course manifest |
| `WD1.url(path)` | Absolute URL from the site root (works from any folder) |

Events: `document` receives `wd1:progress` and `wd1:refresh`. A quiz fires `quizdone`, a playground fires `checks`, a stepper fires `stepchange`, and tabs fire `tabchange`.

---

## 6. House style

- Write to the student in second person, plain and direct. Short paragraphs. Explain *why*, then let them try it.
- Every section has at least one interactive element and ends with a short quiz.
- Use real, specific examples (real status codes, real headers, real DNS record types) rather than placeholders.
- Keep all links relative (`../project/index.html`) and point at `index.html` explicitly so pages also work when opened from disk.
- Nothing may require a server, a build tool, or a third-party script.
