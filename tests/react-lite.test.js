// Tests for the JSX compiler in assets/js/react-lite.js (the Chapter 11 playground runtime).
// Run with: node --test tests/*.test.js
// No dependencies: node:test and node:assert only. The React runtime itself needs a browser,
// so it is exercised by loading ch11/index.html in a headless browser instead.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { transform, preview } = require('../assets/js/react-lite.js');

// A stand-in React whose createElement builds plain objects, so compiled code can be run and inspected.
const FakeReact = {
  Fragment: 'Fragment',
  createElement(type, props, ...children) {
    return { type, props: props || null, children };
  }
};
// Compiles src, then evaluates it as an expression with React (and any extra names) in scope.
function run(src, scope = {}) {
  const code = transform(src);
  const names = ['React', ...Object.keys(scope)];
  return new Function(...names, 'return (' + code + ');')(FakeReact, ...Object.values(scope));
}
const lines = (s) => s.split('\n').length;

test('exports a runtime function and a transform', () => {
  assert.equal(typeof preview, 'function');
  assert.equal(typeof transform, 'function');
});

test('plain JavaScript passes through unchanged', () => {
  const src = 'const a = 1;\nif (a < 2) { console.log(a > 0 ? "yes" : "no"); }\nfor (let i = 0; i < 3; i++) {}\n';
  assert.equal(transform(src), src);
});

test('a simple element with text', () => {
  assert.deepEqual(run('<h1>Hello</h1>'), { type: 'h1', props: null, children: ['Hello'] });
});

test('lowercase tags are strings, capitalized tags are variables, member tags stay member expressions', () => {
  function App() {}
  const UI = { Card: function Card() {} };
  assert.equal(run('<div />').type, 'div');
  assert.equal(run('<App />', { App }).type, App);
  assert.equal(run('<UI.Card />', { UI }).type, UI.Card);
  assert.equal(run('<my-widget />').type, 'my-widget');
});

test('attributes: strings, expressions, boolean shorthand, dashed names and spread', () => {
  const out = run('<input type="text" value={name} disabled aria-label="Name" {...rest} data-x={1 + 1} />', { name: 'Ana', rest: { id: 'n' } });
  assert.deepEqual(out.props, { type: 'text', value: 'Ana', disabled: true, 'aria-label': 'Name', id: 'n', 'data-x': 2 });
});

test('expression children, nested elements and whitespace rules', () => {
  const out = run('<p>\n  Hello, {name}!\n  <b>Welcome</b>\n</p>', { name: 'Ana' });
  assert.deepEqual(out.children, ['Hello, ', 'Ana', '!', { type: 'b', props: null, children: ['Welcome'] }]);
});

test('text on one line keeps its spaces; text across lines is joined with one space', () => {
  assert.deepEqual(run('<p>a {x} b</p>', { x: 1 }).children, ['a ', 1, ' b']);
  assert.deepEqual(run('<p>\n  one\n  two\n</p>').children, ['one two']);
  assert.deepEqual(run('<p><b>x</b> <i>y</i></p>').children.length, 3);
});

test('map, ternary and && inside braces', () => {
  const out = run('<ul>{items.map((it) => <li key={it}>{it}</li>)}{done ? <b>Done</b> : <i>Todo</i>}{show && <hr />}</ul>',
    { items: ['a', 'b'], done: false, show: true });
  assert.equal(out.children[0].length, 2);
  assert.deepEqual(out.children[0][1], { type: 'li', props: { key: 'b' }, children: ['b'] });
  assert.equal(out.children[1].type, 'i');
  assert.equal(out.children[2].type, 'hr');
});

test('fragments', () => {
  const out = run('<>\n  <h1>A</h1>\n  <p>B</p>\n</>');
  assert.equal(out.type, 'Fragment');
  assert.equal(out.children.length, 2);
});

test('comments inside braces produce no child', () => {
  assert.deepEqual(run('<div>{/* a note */}<p>x</p></div>').children.length, 1);
});

test('entities are decoded in text and attribute strings', () => {
  const out = run('<p title="Tom &amp; Jerry">a&nbsp;b &copy; &#65;&#x42;</p>');
  assert.equal(out.props.title, 'Tom & Jerry');
  assert.equal(out.children[0], 'a b © AB');
});

test('JSX after return, =>, (, =, ?, :, &&, || and [ is compiled; comparisons are not', () => {
  const code = transform([
    'function A() { return <p>1</p>; }',
    'const B = () => <p>2</p>;',
    'const c = x < y;',
    'const d = [<i key="1" />, <i key="2" />];',
    'const e = ok || <p>3</p>;'
  ].join('\n'));
  assert.equal((code.match(/React\.createElement/g) || []).length, 5);
  assert.ok(code.includes('const c = x < y;'));
});

test('strings, template literals, regex literals and comments containing < are left alone', () => {
  const src = 'const s = "<p>"; const t = `<b>${1 < 2}</b>`; const r = /<a>/g; // <i>\n/* <em> */';
  assert.equal(transform(src), src);
});

test('JSX inside a template literal expression is compiled', () => {
  const code = transform('const t = `${ok ? <b>y</b> : "n"}`;');
  assert.ok(code.includes('React.createElement("b"'));
});

test('every line break stays on its line, so error line numbers still match', () => {
  const srcs = [
    'function App() {\n  return (\n    <div\n      className="card"\n      onClick={() => {\n        go();\n      }}\n    >\n      <h1>Hi</h1>\n      {items.map((i) => (\n        <li key={i}>\n          {i}\n        </li>\n      ))}\n    </div>\n  );\n}\nthrowsHere();',
    'const a = <p\n>\n\n</p\n>;\nnext();',
    'const b = <input\n  value="multi\nline"\n/>;'
  ];
  for (const src of srcs) {
    const out = transform(src);
    assert.equal(lines(out), lines(src), out);
  }
  // The last statement is still on the last line.
  const out = transform(srcs[0]).split('\n');
  assert.equal(out[out.length - 1], 'throwsHere();');
});

test('imports from react and react-dom/client become destructuring of the globals', () => {
  const out = transform("import React, { useState, useEffect as useFx } from 'react';\nimport ReactDOM from 'react-dom/client';\nimport { createRoot } from 'react-dom/client';\nimport './App.css';\nimport Card from './Card';");
  const l = out.split('\n');
  assert.equal(l.length, 5);
  assert.equal(l[0], 'const { useState, useEffect: useFx } = React;');
  assert.equal(l[1], '');
  assert.equal(l[2], 'const { createRoot } = ReactDOM;');
  assert.match(l[3], /^\/\* import ".\/App.css" skipped/);
  assert.match(l[4], /^\/\* import from ".\/Card" skipped/);
});

test('multi-line imports keep their line count', () => {
  const src = "import {\n  useState,\n  useEffect\n} from 'react';\nuse();";
  const out = transform(src);
  assert.equal(lines(out), lines(src));
  assert.ok(out.startsWith('const { useState, useEffect } = React;'));
  assert.ok(out.endsWith('use();'));
});

test('export default and named exports become plain declarations', () => {
  assert.equal(transform('export default function App() {}'), 'function App() {}');
  assert.equal(transform('export const x = 1;'), 'const x = 1;');
  assert.equal(transform('export default App;'), 'var __defaultExport = App;');
  assert.match(transform('export { a, b };'), /^\/\* export list skipped \*\/$/);
});

test('an unclosed tag is a SyntaxError that names the line it opened on', () => {
  assert.throws(() => transform('const a = 1;\nconst el = (\n  <div>\n    <p>Hi</p>\n);'), (e) => {
    assert.equal(e.name, 'SyntaxError');
    assert.equal(e.line, 3);
    assert.match(e.message, /<div>/);
    return true;
  });
});

test('a mismatched closing tag is reported on the closing tag\'s line', () => {
  assert.throws(() => transform('const el = <div>\n  <p>Hi</span>\n</div>;'), (e) => e.line === 2 && /<p>/.test(e.message) && /<\/span>/.test(e.message));
});

test('two sibling elements without a wrapper are an error on the second element\'s line', () => {
  assert.throws(() => transform('return (\n  <h1>A</h1>\n  <p>B</p>\n);'), (e) => e.line === 3 && /Adjacent JSX elements/.test(e.message));
  // A comparison after an element is still just a comparison operator in plain code
  assert.doesNotThrow(() => transform('const ok = a < b;'));
});

test('an empty attribute expression is an error', () => {
  assert.throws(() => transform('<p title={} />'), /non-empty/);
});

test('an attribute value without quotes or braces is an error', () => {
  assert.throws(() => transform('<p title=hi />'), /quotes/);
});

test('class components and arrow-function event handlers compile', () => {
  const code = transform([
    'class Counter extends React.Component {',
    '  state = { n: 0 };',
    '  render() {',
    '    return <button onClick={() => this.setState({ n: this.state.n + 1 })}>{this.state.n}</button>;',
    '  }',
    '}'
  ].join('\n'));
  assert.ok(code.includes('React.createElement("button", {onClick: () => this.setState({ n: this.state.n + 1 })}, this.state.n)'));
});
