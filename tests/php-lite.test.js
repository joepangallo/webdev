// Tests for assets/js/php-lite.js, the PHP interpreter behind the Chapter 12 playgrounds.
// Run with: node --test tests/
// Each test runs a small PHP script and compares the output with what PHP 8.3 prints.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const PHP = require('../assets/js/php-lite.js');

// A fixed clock (Monday 12 October 2026, 14:30:00 UTC) and seed keep every run the same.
const NOW = Date.UTC(2026, 9, 12, 14, 30, 0);
const run = (src, opts) => PHP.run(src, Object.assign({ now: NOW, seed: 42 }, opts || {}));
const out = (src, opts) => run(src, opts).output;
const php = (code, opts) => out('<?php\n' + code, opts);
// The text of the first warning/error message PHP would show, without the HTML around it.
const plain = (html) => html.replace(/<br \/>\n?/g, '').replace(/<\/?b>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

test('HTML outside the tags passes through, and ?> swallows one newline', () => {
  assert.equal(out('<p>Hi</p>\n<?php echo 1; ?>\n<p>Bye</p>'), '<p>Hi</p>\n1<p>Bye</p>');
  assert.equal(out('<?= "a" ?> <?= "b" ?>'), 'a b');
  assert.equal(out('<?php\necho "x";'), 'x');
  assert.equal(out('<?PHP echo "case";'), 'case');
});

test('templates with the alternative syntax repeat HTML', () => {
  const src = '<ul>\n<?php foreach ([1, 2] as $n): ?>\n  <li><?= $n ?></li>\n<?php endforeach; ?>\n</ul>';
  assert.equal(out(src), '<ul>\n  <li>1</li>\n  <li>2</li>\n</ul>');
  const ifs = '<?php $x = 5; if ($x > 3): ?>big<?php elseif ($x > 1): ?>mid<?php else: ?>small<?php endif; ?>';
  assert.equal(out(ifs), 'big');
  assert.equal(out('<?php for ($i = 0; $i < 3; $i++): ?><?= $i ?><?php endfor; ?>'), '012');
  assert.equal(out('<?php $i = 3; while ($i > 0): ?><?= $i-- ?><?php endwhile; ?>'), '321');
  assert.equal(out('<?php switch (2): ?><?php case 1: ?>one<?php break; ?><?php case 2: ?>two<?php break; ?><?php endswitch; ?>'), 'two');
});

test('echo, print, printf and sprintf', () => {
  assert.equal(php('echo "a", "b", 3;'), 'ab3');
  assert.equal(php('$r = print "x"; echo $r;'), 'x1');
  assert.equal(php('printf("%05.2f|%-6s|%6s|%d%%|%x|%b|%o|%c|%+d", 3.14159, "ab", "cd", 50, 255, 5, 8, 65, 7);'), '03.14|ab    |    cd|50%|ff|101|10|A|+7');
  assert.equal(php("echo sprintf('%2\$s %1\$s', 'world', 'hello');"), 'hello world');
  assert.match(plain(php('echo sprintf("%2$s", "a", "b");')), /Warning:\s+Undefined variable \$s/);
  assert.equal(php("echo sprintf(\"%'*8s|%.3s|%e\", 'pad', 'abcdef', 1234.5);"), '*****pad|abc|1.234500e+3');
  assert.equal(php('echo sprintf("%.2f", 1.005), " ", sprintf("%d", "12abc"), " ", sprintf("%s", true);'), '1.01 12 1');
  assert.match(plain(php('echo sprintf("%s %s", "one");')), /Uncaught ArgumentCountError: 3 arguments are required, 2 given/);
});

test('types, gettype and var_dump', () => {
  assert.equal(php('var_dump(5, 5.0, "5", true, null, 0.1 + 0.2, [1, "a" => 2]);'),
    'int(5)\nfloat(5)\nstring(1) "5"\nbool(true)\nNULL\nfloat(0.30000000000000004)\narray(2) {\n  [0]=>\n  int(1)\n  ["a"]=>\n  int(2)\n}\n');
  assert.equal(php('echo gettype(1), gettype(1.5), gettype("s"), gettype(false), gettype(null), gettype([]);'), 'integerdoublestringbooleanNULLarray');
  assert.equal(php('echo get_debug_type(1), get_debug_type(1.5), get_debug_type(null);'), 'intfloatnull');
  assert.equal(php('var_dump("héllo");'), 'string(6) "héllo"\n');
  assert.equal(php('echo strlen("héllo"), mb_strlen("héllo");'), '65');
});

test('floats print like PHP', () => {
  assert.equal(php('echo 10/3, "|", 1e20, "|", 0.00001, "|", 2.50, "|", -0.0, "|", 1/7;'), '3.3333333333333|1.0E+20|1.0E-5|2.5|-0|0.14285714285714');
  assert.equal(php('echo 7/2, " ", 8/2, " ", 7.0/2;'), '3.5 4 3.5');
  assert.equal(php('var_dump(8/2, 7/2, intdiv(7, 2), 7 % 2, 2 ** 3, 2 ** -1, 2.0 ** 3);'), 'int(4)\nfloat(3.5)\nint(3)\nint(1)\nint(8)\nfloat(0.5)\nfloat(8)\n');
  assert.equal(php('echo round(2.5), round(-2.5), round(1.955, 2), " ", floor(7.8), ceil(7.2), " ", round(1234.5678, -2);'), '3-31.96 78 1200');
  assert.equal(php('var_dump(round(5), floor(5), abs(-5), abs(-5.5));'), 'float(5)\nfloat(5)\nint(5)\nfloat(5.5)\n');
  assert.equal(php('echo number_format(1234567.891), " ", number_format(1234567.891, 2), " ", number_format(1234.5, 2, ",", "."), " ", number_format(0.5);'), '1,234,568 1,234,567.89 1.234,50 1');
});

test('strings: quotes, escapes, interpolation, heredoc', () => {
  assert.equal(php('$n = "Ana"; echo \'Hi $n\\n\', "|", "Hi $n\\n";'), 'Hi $n\\n|Hi Ana\n');
  assert.equal(php('$a = ["k" => "v", 2 => "two"]; $o = new stdClass; $o->p = "P"; echo "$a[k] $a[2] {$a[\'k\']} $o->p {$o->p}s \\$a";'), 'v two v P Ps $a');
  assert.equal(php('$x = 5; echo "${x}" . "\\x41\\101\\u{1F600}";'), '5AA😀');
  assert.equal(php('$name = "Bo";\n$t = <<<EOT\n  Hello $name\n    indented\n  EOT;\necho $t;'), 'Hello Bo\n  indented');
  assert.equal(php("$t = <<<'EOT'\nraw \$name\nEOT;\necho \$t;"), 'raw $name');
  assert.equal(php('$s = "a"; $s .= "b"; $s .= 1 + 2; echo $s, "|", "Sum: " . 1 + 2;'), 'ab3|Sum: 3');
  assert.equal(php('echo "abc"[1], "abc"[-1];'), 'bc');
});

test('string functions', () => {
  assert.equal(php('echo strtoupper("abc"), strtolower("ABC"), ucfirst("hi"), ucwords("hello big world"), lcfirst("HI");'), 'ABCabcHiHello Big WorldhI');
  assert.equal(php('echo trim("  x  "), "|", rtrim("x\\n"), "|", ltrim("0012", "0"), "|", trim("[a]", "[]");'), 'x|x|12|a');
  assert.equal(php('echo str_repeat("ab", 3), str_pad("5", 3, "0", STR_PAD_LEFT), str_pad("x", 5, "-", STR_PAD_BOTH);'), 'ababab005--x--');
  assert.equal(php('echo str_replace("a", "o", "banana"), str_replace(["a", "b"], ["1", "2"], "abc"), substr("hello", 1, 3), substr("hello", -3), substr("hi", 5), "|";'), 'bonono12cellllo|');
  assert.equal(php('var_dump(strpos("hello", "l"), strpos("hello", "z"), str_contains("hello", "ell"), str_starts_with("hello", "he"), strrpos("hello", "l"));'), 'int(2)\nbool(false)\nbool(true)\nbool(true)\nint(3)\n');
  assert.equal(php('echo implode(", ", ["a", "b"]), "|", join("-", [1, 2]); print_r(explode(",", "a,b,,c")); print_r(explode(",", "a,b,c", 2));'),
    'a, b|1-2Array\n(\n    [0] => a\n    [1] => b\n    [2] => \n    [3] => c\n)\nArray\n(\n    [0] => a\n    [1] => b,c\n)\n');
  assert.equal(php('echo htmlspecialchars("<a href=\'x\'>Tom & \\"Jerry\\"</a>");'), '&lt;a href=&#039;x&#039;&gt;Tom &amp; &quot;Jerry&quot;&lt;/a&gt;');
  assert.equal(php('echo nl2br("a\\nb"), strrev("abc"), str_word_count("one two three"), ucfirst(strtolower("HELLO"));'), 'a<br />\nbcba3Hello');
  assert.equal(php('echo wordwrap("The quick brown fox", 10, "\\n", true);'), 'The quick\nbrown fox');
  assert.equal(php('echo strcmp("a", "b"), strcmp("b", "a"), strcmp("a", "a"), strcasecmp("HELLO", "hello");'), '-1100');
  assert.equal(php('echo md5("hello");'), '5d41402abc4b2a76b9719d911017c592');
  assert.equal(php('echo strip_tags("<b>bold</b> <i>it</i>", "<i>");'), 'bold <i>it</i>');
  assert.equal(php('echo urlencode("a b&c/d"), " ", rawurlencode("a b"), " ", http_build_query(["q" => "php 8", "tags" => ["a", "b"]]);'), 'a+b%26c%2Fd a%20b q=php+8&tags%5B0%5D=a&tags%5B1%5D=b');
});

test('arithmetic with strings follows PHP 8', () => {
  assert.equal(php('var_dump("5" + "5", "1.5" + 1, " 7 " * 2, "10" / "4");'), 'int(10)\nfloat(2.5)\nint(14)\nfloat(2.5)\n');
  const w = run('<?php\n$x = "5 apples" + 1;\necho $x;');
  assert.match(plain(w.output), /Warning:\s+A non-numeric value encountered in \/index\.php on line 2/);
  assert.match(w.output, /6$/);
  assert.match(plain(php('echo "abc" + 1;')), /Fatal error:\s+Uncaught TypeError: Unsupported operand types: string \+ int/);
  assert.match(plain(php('echo [] - 1;')), /Unsupported operand types: array - int/);
  assert.match(plain(php('echo 1 / 0;')), /Uncaught DivisionByZeroError: Division by zero/);
  assert.match(plain(php('echo 1 % 0;')), /Uncaught DivisionByZeroError: Modulo by zero/);
});

test('comparisons: loose ==, strict ===, spaceship, PHP 8 rules', () => {
  const r = php('$t = [[0, "a"], ["1", "01"], ["10", "1e1"], [100, "1e2"], ["abc", 0], [null, false], [[], false], ["0", false], ["", null], [" 1", 1], ["1 ", 1], [null, 0], ["null", null]];\n' +
    'foreach ($t as [$a, $b]) echo $a == $b ? "T" : "F";');
  assert.equal(r, 'FTTTFTTTTTTTF');
  assert.equal(php('var_dump(1 === 1.0, "1" === "1", [1, 2] === [1, 2], [1, 2] == [2 => 1], 1 <=> 2, "b" <=> "a", [1, 2] <=> [1, 3]);'),
    'bool(false)\nbool(true)\nbool(true)\nbool(false)\nint(-1)\nint(1)\nint(-1)\n');
  assert.equal(php('var_dump("abc" < "abd", 10 < 9, "10" < "9", "10" < "9a", null < 1);'), 'bool(true)\nbool(false)\nbool(false)\nbool(true)\nbool(true)\n');
});

test('logical operators, ??, ?:, precedence of and/or', () => {
  assert.equal(php('$a = null; echo $a ?? "default", "|", 0 ?: "zero", "|", 5 ?: "five";'), 'default|zero|5');
  assert.equal(php('$x = true and false; var_dump($x); $y = (true and false); var_dump($y); var_dump(true xor true, !0);'), 'bool(true)\nbool(false)\nbool(false)\nbool(true)\n');
  assert.equal(php('$u = []; echo $u["missing"]["deep"] ?? "none", isset($u["a"]) ? 1 : 0, empty($u) ? "E" : "N";'), 'none0E');
  assert.equal(php('$c = null; $c ??= 5; $c ??= 9; echo $c;'), '5');
});

test('increment and decrement', () => {
  assert.equal(php('$i = 5; echo $i++, $i, ++$i, $i--, --$i;'), '56775');
  assert.equal(php('$s = "a"; $s++; echo $s; $z = "Az"; $z++; echo $z; $n = "zz"; $n++; echo $n; $d = "a9"; $d++; echo $d;'), 'bBaaaab0');
  assert.equal(php('$n = null; $n++; var_dump($n); $m = null; $m--; var_dump($m);'), 'int(1)\nNULL\n');
});

test('if, switch, match', () => {
  assert.equal(php('$g = 85; if ($g >= 90) echo "A"; elseif ($g >= 80) echo "B"; else if ($g >= 70) echo "C"; else echo "F";'), 'B');
  assert.equal(php('$d = "sat"; switch ($d) { case "sat": case "sun": echo "weekend"; break; default: echo "weekday"; }'), 'weekend');
  assert.equal(php('switch (3) { case 1: echo 1; default: echo "d"; case 4: echo 4; }'), 'd4');
  assert.equal(php('switch ("1") { case 1: echo "loose"; break; }'), 'loose');
  assert.equal(php('echo match(true) { 5 > 10 => "a", 5 > 1, 5 > 2 => "b", default => "c" };'), 'b');
  assert.equal(php('echo match("1") { 1 => "int", "1" => "string" };'), 'string');
  assert.match(plain(php('echo match(5) { 1 => "a" };')), /Uncaught UnhandledMatchError: Unhandled match case 5/);
  assert.match(plain(php('echo match("x") { 1 => "a" };')), /Unhandled match case 'x'/);
});

test('loops, break n and continue n', () => {
  assert.equal(php('for ($i = 0, $j = 10; $i < 3; $i++, $j--) echo "$i-$j ";'), '0-10 1-9 2-8 ');
  assert.equal(php('$i = 0; do { echo $i; } while (++$i < 3); $k = 5; do { echo "once"; } while (false);'), '012once');
  assert.equal(php('foreach ([1, 2, 3] as $a) { foreach ([1, 2, 3] as $b) { if ($b == 2) continue 2; if ($a == 3) break 2; echo "$a$b "; } }'), '11 21 ');
  assert.equal(php('foreach (["x" => 1, "y" => 2] as $k => $v) echo "$k=$v,";'), 'x=1,y=2,');
  assert.equal(php('$a = [1, 2]; foreach ($a as $v) { $a[] = $v; } echo count($a);'), '4');
});

test('foreach by reference changes the array, and the classic gotcha', () => {
  assert.equal(php('$p = [10, 20]; foreach ($p as &$x) { $x *= 2; } unset($x); echo implode(",", $p);'), '20,40');
  assert.equal(php('$a = [1, 2, 3]; foreach ($a as &$v) {} foreach ($a as $v) {} echo implode(",", $a);'), '1,2,2');
});

test('functions: defaults, types, errors', () => {
  assert.equal(php('function area(float $w, float $h = 2): float { return $w * $h; } var_dump(area(3), area("2.5", 4), area(w: 1, h: 5));'), 'float(6)\nfloat(10)\nfloat(5)\n');
  assert.match(plain(php('function f(int $n) { return $n; }\nf("abc");')), /Uncaught TypeError: f\(\): Argument #1 \(\$n\) must be of type int, string given, called in \/index\.php on line 3/);
  assert.match(plain(php('function f($a, $b) {}\nf(1);')), /Uncaught ArgumentCountError: Too few arguments to function f\(\), 1 passed in \/index\.php on line 3 and exactly 2 expected/);
  assert.match(plain(php('nope();')), /Uncaught Error: Call to undefined function nope\(\)/);
  assert.match(plain(php('function g(): int { return "x"; }\ng();')), /g\(\): Return value must be of type int, string returned/);
  assert.equal(php('function h(?string $s = null) { return $s ?? "none"; } echo h(), h("y");'), 'noney');
  assert.equal(php('echo early(); function early() { return "hoisted"; }'), 'hoisted');
  assert.match(plain(php('function d() {} function D() {}')), /Cannot redeclare D\(\)/);
});

test('scope: local, global, static', () => {
  const w = run('<?php\n$total = 10;\nfunction show() {\n  echo $total;\n}\nshow();');
  assert.match(plain(w.output), /Warning:\s+Undefined variable \$total in \/index\.php on line 4/);
  assert.equal(php('$t = 1; function inc() { global $t; $t++; } inc(); inc(); echo $t;'), '3');
  assert.equal(php('function counter() { static $n = 0; return ++$n; } counter(); counter(); echo counter();'), '3');
  assert.equal(php('$x = 1; function f() { $x = 99; } f(); echo $x;'), '1');
});

test('by reference, variadics, closures and arrow functions', () => {
  assert.equal(php('function addOne(&$n) { $n++; } $v = 1; addOne($v); echo $v;'), '2');
  assert.equal(php('function sum(...$n) { return array_sum($n); } echo sum(1, 2, 3), sum(...[4, 5]);'), '69');
  assert.equal(php('$m = 3; $by = function ($x) use ($m) { return $x * $m; }; $m = 10; echo $by(2);'), '6');
  assert.equal(php('$c = 0; $inc = function () use (&$c) { $c++; }; $inc(); $inc(); echo $c;'), '2');
  assert.equal(php('$k = 4; $f = fn($x) => $x + $k; echo $f(1); $k = 100; echo $f(1);'), '55');
  assert.equal(php('echo implode(",", array_map(fn($x) => $x ** 2, [1, 2, 3]));'), '1,4,9');
  assert.equal(php('function fact($n) { return $n <= 1 ? 1 : $n * fact($n - 1); } echo fact(10);'), '3628800');
  assert.equal(php('$a = [1, 2]; $b = &$a; $b[] = 3; echo count($a);'), '3');
  assert.equal(php('echo call_user_func("strtoupper", "x"), call_user_func_array(fn($a, $b) => $a . $b, ["p", "q"]);'), 'Xpq');
});

test('arrays are ordered maps copied on assignment', () => {
  assert.equal(php('$a = [5 => "a", "b", "x" => "c", "d"]; print_r($a);'), 'Array\n(\n    [5] => a\n    [6] => b\n    [x] => c\n    [7] => d\n)\n');
  assert.equal(php('$a = ["1" => "a", "01" => "b", 1.7 => "c", true => "d"]; var_dump(array_keys($a));'), 'array(2) {\n  [0]=>\n  int(1)\n  [1]=>\n  string(2) "01"\n}\n');
  assert.equal(php('$a = [1, 2]; $b = $a; $b[] = 3; echo count($a), count($b);'), '23');
  assert.equal(php('$a = ["n" => ["x" => 1]]; $b = $a; $b["n"]["x"] = 2; echo $a["n"]["x"], $b["n"]["x"];'), '12');
  assert.equal(php('function add($arr) { $arr[] = 9; return $arr; } $a = [1]; $c = add($a); echo count($a), count($c);'), '12');
  assert.equal(php('$m = []; $m["a"]["b"][] = 1; $m["a"]["b"][] = 2; echo json_encode($m);'), '{"a":{"b":[1,2]}}');
  assert.equal(php('$a = [3 => "x"]; unset($a[3]); $a[] = "y"; print_r($a);'), 'Array\n(\n    [4] => y\n)\n');
  const w = php('$a = ["x" => 1];\necho $a["y"];');
  assert.match(plain(w), /Warning:\s+Undefined array key "y" in \/index\.php on line 3/);
  assert.match(plain(php('$n = null;\necho $n["k"];')), /Trying to access array offset on value of type null/);
  assert.equal(php('[$a, [$b, $c]] = [1, [2, 3]]; ["x" => $x] = ["x" => 9]; [, $second] = [1, 2]; list($l1, $l2) = ["p", "q"]; echo $a, $b, $c, $x, $second, $l1, $l2;'), '12392pq');
  assert.equal(php('$a = [1, 2]; $b = [...$a, 3, ...["k" => 4]]; echo json_encode($b);'), '{"0":1,"1":2,"2":3,"k":4}');
  assert.equal(php('echo json_encode([1, 2] + [5, 6, 7]);'), '[1,2,7]');
});

test('array functions', () => {
  assert.equal(php('$a = [3, "10", 1]; sort($a); echo implode(",", $a); rsort($a); echo "|", implode(",", $a);'), '1,3,10|10,3,1');
  assert.equal(php('$a = ["b" => 2, "a" => 3, "c" => 1]; asort($a); echo json_encode($a); ksort($a); echo json_encode($a); arsort($a); echo json_encode($a);'), '{"c":1,"b":2,"a":3}{"a":3,"b":2,"c":1}{"a":3,"b":2,"c":1}');
  assert.equal(php('$p = [["n" => "b", "a" => 2], ["n" => "a", "a" => 1]]; usort($p, fn($x, $y) => $x["a"] <=> $y["a"]); echo $p[0]["n"];'), 'a');
  assert.equal(php('echo json_encode(array_filter([1, 0, 2, null, 3]));'), '{"0":1,"2":2,"4":3}');
  assert.equal(php('echo json_encode(array_values(array_filter([1, 2, 3, 4], fn($n) => $n % 2 == 0)));'), '[2,4]');
  assert.equal(php('echo json_encode(array_filter(["a" => 1, "b" => 2], fn($k) => $k != "a", ARRAY_FILTER_USE_KEY));'), '{"b":2}');
  assert.equal(php('echo array_reduce([1, 2, 3], fn($c, $i) => $c + $i, 10), array_sum([1, 2.5]), array_product([2, 3]);'), '163.56');
  assert.equal(php('echo json_encode(array_merge(["a" => 1, 5 => "x"], ["a" => 2, 9 => "y"]));'), '{"a":2,"0":"x","1":"y"}');
  assert.equal(php('echo json_encode(array_slice([1, 2, 3, 4], 1, 2)), json_encode(array_slice(["a" => 1, 5 => 2, 6 => 3], 0, 2)), json_encode(array_slice([5 => "x", 6 => "y"], 1, 1, true));'), '[2,3]{"a":1,"0":2}{"6":"y"}');
  assert.equal(php('$a = [1, 2, 3, 4]; $r = array_splice($a, 1, 2, ["x"]); echo json_encode($a), json_encode($r);'), '[1,"x",4][2,3]');
  assert.equal(php('var_dump(array_search("2", [1, 2, 3]), in_array("2", [1, 2]), in_array("2", [1, 2], true));'), 'int(1)\nbool(true)\nbool(false)\n');
  assert.equal(php('echo json_encode(array_unique([1, "1", 2, 2.0, "a", "A"])), json_encode(array_reverse(["x" => 1, 2])), json_encode(array_keys(["a" => 1, "b" => 2, "c" => 1], 1));'), '{"0":1,"2":2,"4":"a","5":"A"}{"0":2,"x":1}["a","c"]');
  assert.equal(php('$q = [1, 2]; array_push($q, 3, 4); $l = array_pop($q); array_unshift($q, 0); $f = array_shift($q); echo json_encode($q), $l, $f;'), '[1,2,3]40');
  assert.equal(php('echo implode(",", range(1, 5)), "|", implode(",", range("a", "e")), "|", implode(",", range(10, 0, 5)), "|", implode(",", range(0, 1, 0.25));'), '1,2,3,4,5|a,b,c,d,e|10,5,0|0,0.25,0.5,0.75,1');
  assert.equal(php('echo count([1, [2, 3]]), count([1, [2, 3]], COUNT_RECURSIVE), max([1, 5, 3]), min(4, 2, 8), max("apple", "banana");'), '2452banana');
  assert.equal(php('$people = [["id" => 3, "n" => "A"], ["id" => 5, "n" => "B"]]; echo json_encode(array_column($people, "n", "id")), json_encode(array_combine(["a", "b"], [1, 2])), json_encode(array_flip(["a", "b"]));'), '{"3":"A","5":"B"}{"a":1,"b":2}{"a":0,"b":1}');
  assert.equal(php('echo json_encode(array_diff([1, 2, 3, 4], [2, 4])), json_encode(array_intersect(["a", "b", "c"], ["b", "c", "d"])), json_encode(array_chunk([1, 2, 3], 2)), json_encode(array_count_values(["a", "b", "a"]));'), '{"0":1,"2":3}{"1":"b","2":"c"}[[1,2],[3]]{"a":2,"b":1}');
  assert.equal(php('$name = "Ana"; $age = 20; echo json_encode(compact("name", "age")); extract(["city" => "Miami"]); echo $city;'), '{"name":"Ana","age":20}Miami');
  assert.equal(php('$a = ["x" => 1, "y" => 2]; echo array_key_first($a), array_key_last($a), key_exists("x", $a) ? "y" : "n", array_key_exists("z", $a) ? "y" : "n";'), 'xyyn');
  assert.match(plain(php('count(null);')), /count\(\): Argument #1 \(\$value\) must be of type Countable\|array, null given/);
});

test('print_r and var_export formats', () => {
  assert.equal(php('print_r(["a" => [1, 2], "b" => true, "c" => null]);'),
    'Array\n(\n    [a] => Array\n        (\n            [0] => 1\n            [1] => 2\n        )\n\n    [b] => 1\n    [c] => \n)\n');
  assert.equal(php('echo print_r([1], true) === "Array\\n(\\n    [0] => 1\\n)\\n" ? "ok" : "no";'), 'ok');
  assert.equal(php('var_export([1, "a" => [true, null], "q" => "it\'s", "f" => 1.0]);'),
    "array (\n  0 => 1,\n  'a' => \n  array (\n    0 => true,\n    1 => NULL,\n  ),\n  'q' => 'it\\'s',\n  'f' => 1.0,\n)");
});

test('classes, visibility, constructors and static members', () => {
  const src = `class Account {
  private float $balance = 0;
  public static int $count = 0;
  const BANK = "WD Bank";
  public function __construct(public string $owner) { self::$count++; }
  public function deposit(float $amt): static { $this->balance += $amt; return $this; }
  public function getBalance(): float { return $this->balance; }
}
$a = new Account("Ana");
$b = new Account("Bo");
echo $a->owner, " ", $a->deposit(50)->deposit(25)->getBalance(), " ", Account::$count, " ", Account::BANK, " ", $a::class;`;
  assert.equal(php(src), 'Ana 75 2 WD Bank Account');
  assert.match(plain(php('class S { private $secret = 1; }\n$s = new S;\necho $s->secret;')), /Uncaught Error: Cannot access private property S::\$secret in \/index\.php:4/);
  assert.match(plain(php('class S { private function m() {} }\n(new S)->m();')), /Call to private method S::m\(\) from global scope/);
  assert.match(plain(php('class S {}\n(new S)->nope();')), /Call to undefined method S::nope\(\)/);
  assert.match(plain(php('$x = null;\n$x->go();')), /Call to a member function go\(\) on null/);
  assert.match(plain(php('class P { public $a; }\n$p = new P;\necho $p->b;')), /Warning:\s+Undefined property: P::\$b/);
  assert.match(plain(php('class P {}\n$p = new P;\n$p->x = 1;')), /Deprecated:\s+Creation of dynamic property P::\$x is deprecated/);
  assert.match(plain(php('class B { public function __construct(public readonly string $t) {} }\n$b = new B("x");\n$b->t = "y";')), /Cannot modify readonly property B::\$t/);
  assert.match(plain(php('class T { public int $n = 0; }\n$t = new T;\n$t->n = "abc";')), /Cannot assign string to property T::\$n of type int/);
  assert.match(plain(php('class U { public string $name; }\n$u = new U;\necho $u->name;')), /Typed property U::\$name must not be accessed before initialization/);
});

test('inheritance, abstract classes, interfaces, polymorphism', () => {
  const src = `interface HasArea { public function area(): float; }
abstract class Shape implements HasArea {
  public function __construct(protected string $name) {}
  abstract public function area(): float;
  public function describe(): string { return $this->name . " " . number_format($this->area(), 2); }
  public function __toString(): string { return $this->describe(); }
}
class Circle extends Shape {
  public function __construct(private float $r) { parent::__construct("circle"); }
  public function area(): float { return M_PI * $this->r ** 2; }
}
class Square extends Shape {
  public function __construct(private float $s) { parent::__construct("square"); }
  public function area(): float { return $this->s ** 2; }
  public function describe(): string { return "[" . parent::describe() . "]"; }
}
foreach ([new Circle(1), new Square(2)] as $s) { echo $s, ";"; }
var_dump(new Circle(1) instanceof Shape, new Circle(1) instanceof HasArea, new Square(1) instanceof Circle);`;
  assert.equal(php(src), 'circle 3.14;[square 4.00];bool(true)\nbool(true)\nbool(false)\n');
  assert.match(plain(php('abstract class A {}\nnew A;')), /Cannot instantiate abstract class A/);
  assert.match(plain(php('interface I { function f(); }\nclass C implements I {}')), /Class C contains 1 abstract method and must therefore be declared abstract or implement the remaining methods \(I::f\)/);
  assert.equal(php('class A { public static function make() { return new static; } } class B extends A {} echo get_class(B::make());'), 'B');
  assert.equal(php('class A { protected $v = "A"; public function get() { return $this->v; } } class B extends A { protected $v = "B"; } echo (new B)->get();'), 'B');
  assert.match(plain(php('class A { public function f() {} }\nclass B extends A { private function f() {} }')), /Access level to B::f\(\) must be public \(as in class A\)/);
});

test('print_r and var_dump of objects', () => {
  assert.equal(php('class P { public $a = 1; protected $b = 2; private $c = 3; } print_r(new P);'),
    'P Object\n(\n    [a] => 1\n    [b:protected] => 2\n    [c:P:private] => 3\n)\n');
  assert.equal(php('class P { public $a = 1; protected $b = [2]; } var_dump(new P);'),
    'object(P)#1 (2) {\n  ["a"]=>\n  int(1)\n  ["b":protected]=>\n  array(1) {\n    [0]=>\n    int(2)\n  }\n}\n');
});

test('exceptions: try, catch, finally, custom and uncaught', () => {
  const src = `class LowBalance extends Exception {}
function withdraw($bal, $amt) { if ($amt > $bal) throw new LowBalance("Need " . ($amt - $bal) . " more", 7); return $bal - $amt; }
try { echo withdraw(10, 5), ","; echo withdraw(10, 50); } catch (LowBalance $e) { echo $e->getMessage(), "#", $e->getCode(), "@", $e->getLine(); } finally { echo ";done"; }`;
  assert.equal(php(src), '5,Need 40 more#7@3;done');
  assert.equal(php('try { intdiv(1, 0); } catch (DivisionByZeroError | TypeError $e) { echo get_class($e), ": ", $e->getMessage(); }'), 'DivisionByZeroError: Division by zero');
  assert.equal(php('try { throw new InvalidArgumentException("bad"); } catch (Exception $e) { echo $e instanceof LogicException ? "logic" : "other"; }'), 'logic');
  const u = plain(php('function risky() {\n  throw new RuntimeException("Boom");\n}\nrisky();'));
  assert.match(u, /Fatal error:\s+Uncaught RuntimeException: Boom in \/index\.php:3\nStack trace:\n#0 \/index\.php\(5\): risky\(\)\n#1 \{main\}\n  thrown in \/index\.php on line 3/);
  assert.equal(php('function f() { try { return "try"; } finally { echo "finally "; } } echo f();'), 'finally try');
  assert.match(plain(php('throw new Exception();')), /Uncaught Exception in \/index\.php:2/);
});

test('errors look like PHP: parse errors, warnings, step limit', () => {
  assert.match(plain(out('<?php\necho "hi"\necho "there";')), /Parse error:\s+syntax error, unexpected token "echo", expecting "," or ";"|Parse error:\s+syntax error, unexpected token "echo", expecting ";"/);
  assert.match(plain(out('<?php\nif ($x) {\n  echo 1;\n')), /Parse error:\s+syntax error, unexpected end of file/);
  assert.match(plain(out('<?php\n$a = [1, 2;\n')), /Parse error:\s+syntax error, unexpected token ";", expecting "\]" in \/index\.php on line 2/);
  const loop = run('<?php\n$i = 0;\nwhile ($i < 10) {\n  echo "";\n}', { stepLimit: 5000 });
  assert.match(plain(loop.output), /Fatal error:\s+Maximum execution time exceeded/);
  assert.equal(loop.logs[loop.logs.length - 1][0], 'error');
  const two = run('<?php\necho $a;\necho $b;');
  assert.equal(two.logs.length, 2);
  assert.equal(two.logs[1][1], 'Warning: Undefined variable $b in /index.php on line 3');
  assert.match(plain(php('echo [1, 2];')), /Warning:\s+Array to string conversion/);
  assert.equal(php('echo @$nothing, "ok";'), 'ok');
  assert.match(plain(php('echo UNKNOWN_CONST;')), /Uncaught Error: Undefined constant "UNKNOWN_CONST"/);
  assert.match(plain(php('break;')), /'break' not in the 'loop' or 'switch' context/);
  assert.match(plain(php('function f() { return f(); } f();')), /Maximum function nesting level/);
});

test('constants', () => {
  assert.equal(php('define("TAX", 0.07); const SITE = "Shop"; echo TAX * 100, SITE, PHP_EOL === "\\n" ? "nl" : "x", defined("TAX") ? "Y" : "N";'), '7ShopnlY');
  assert.equal(php('class C { const A = 2; const B = self::A * 3; } echo C::B;'), '6');
  assert.match(plain(php('define("X", 1);\ndefine("X", 2);')), /Warning:\s+Constant X already defined/);
});

test('superglobals from the request', () => {
  const r = run('<?php\necho $_GET["q"], "|", implode(",", $_GET["tags"]), "|", $_GET["user"]["name"], "|", $_SERVER["REQUEST_METHOD"], "|", $_POST["x"] ?? "-", "|", $_REQUEST["q"];',
    { get: PHP.phpArrayFromPairs(PHP.parsePairs('q=hello+world&tags%5B%5D=a&tags[]=b&user[name]=Ana')) });
  assert.equal(r.output, 'hello world|a,b|Ana|GET|-|hello world');
  const p = PHP.runtime.render({ php: '<?php if ($_SERVER["REQUEST_METHOD"] === "POST") { echo "Thanks, " . htmlspecialchars($_POST["name"]) . " (" . $_SERVER["REQUEST_URI"] . ")"; } else { echo "form"; }' },
    { method: 'POST', url: '/contact.php?x=1', path: '/contact.php', query: 'x=1', body: 'name=%3Cb%3EAna%3C%2Fb%3E', cookies: {} });
  assert.equal(p.html, 'Thanks, &lt;b&gt;Ana&lt;/b&gt; (/contact.php?x=1)');
  assert.equal(p.status, 200);
  assert.match(p.logs[p.logs.length - 1][1], /127\.0\.0\.1 \[200\]: POST \/contact\.php\?x=1/);
  const c = PHP.runtime.render({ php: '<?= $_COOKIE["theme"] ?? "light" ?>' }, { method: 'GET', url: '/', path: '/', query: '', body: '', cookies: { theme: 'dark' } });
  assert.equal(c.html, 'dark');
  assert.equal(php('echo isset($_GET["missing"]) ? "set" : "unset", empty($_POST) ? " empty" : "";'), 'unset empty');
});

test('header(), redirects, status codes and JSON responses', () => {
  const r = run('<?php\nheader("Location: thanks.php");\nexit;');
  assert.equal(r.status, 302);
  assert.deepEqual(r.headers.find((h) => h[0] === 'Location'), ['Location', 'thanks.php']);
  const j = run('<?php\nheader("Content-Type: application/json");\nhttp_response_code(201);\necho json_encode(["ok" => true]);');
  assert.equal(j.status, 201);
  assert.equal(j.output, '{"ok":true}');
  assert.deepEqual(j.headers.filter((h) => h[0].toLowerCase() === 'content-type'), [['Content-Type', 'application/json']]);
  assert.equal(run('<?php header("HTTP/1.1 404 Not Found"); echo "missing";').status, 404);
  const late = run('<p>Hello</p>\n<?php\nheader("Location: /home.php");');
  assert.match(plain(late.output), /Warning:\s+Cannot modify header information - headers already sent by \(output started at \/index\.php:1\) in \/index\.php on line 3/);
  assert.equal(late.status, 200);
  const buffered = run('<?php ob_start(); ?>\n<p>Hi</p>\n<?php header("X-Test: yes"); ob_end_flush();');
  assert.ok(buffered.headers.some((h) => h[0] === 'X-Test'));
  assert.equal(run('<?php echo "a"; exit("bye"); echo "never";').output, 'abye');
});

test('setcookie() writes Set-Cookie headers', () => {
  const r = run('<?php setcookie("theme", "dark mode", time() + 3600, "/"); setcookie("old", ""); echo "ok";');
  const cookies = r.headers.filter((h) => h[0] === 'Set-Cookie').map((h) => h[1]);
  assert.equal(cookies[0], 'theme=dark%20mode; expires=Mon, 12 Oct 2026 15:30:00 GMT; Max-Age=3600; path=/');
  assert.equal(cookies[1], 'old=deleted; expires=Thu, 01 Jan 1970 00:00:01 GMT; Max-Age=0');
  assert.match(plain(run('<?php echo "x"; setcookie("a", "b");').output), /Warning:\s+setcookie\(\): Cannot modify header information - headers already sent/);
});

test('sessions survive between requests through the PHPSESSID cookie', () => {
  const code = { php: '<?php session_start(); $_SESSION["visits"] = ($_SESSION["visits"] ?? 0) + 1; echo $_SESSION["visits"];' };
  const first = PHP.runtime.render(code, { method: 'GET', url: '/', path: '/', query: '', body: '', cookies: {} });
  assert.equal(first.html, '1');
  const id = /PHPSESSID=(\w+)/.exec(first.headers.find((h) => h[0] === 'Set-Cookie')[1])[1];
  const second = PHP.runtime.render(code, { method: 'GET', url: '/', path: '/', query: '', body: '', cookies: { PHPSESSID: id } });
  assert.equal(second.html, '2');
});

test('json_encode and json_decode', () => {
  assert.equal(php('echo json_encode(["name" => "Zoë", "url" => "a/b", "n" => 1.0, "f" => 0.1, "e" => [], "o" => new stdClass, "t" => true, "z" => null]);'),
    '{"name":"Zo\\u00eb","url":"a\\/b","n":1.0,"f":0.1,"e":[],"o":{},"t":true,"z":null}');
  assert.equal(php('echo json_encode(["a" => 1, "b" => [1, 2]], JSON_PRETTY_PRINT);'), '{\n    "a": 1,\n    "b": [\n        1,\n        2\n    ]\n}');
  assert.equal(php('echo json_encode("é/", JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), json_encode([3 => "x"]), json_encode([1, 2], JSON_FORCE_OBJECT);'), '"é/"{"3":"x"}{"0":1,"1":2}');
  assert.equal(php('$d = json_decode(\'{"a":{"b":[1,2.5]},"c":"x"}\'); echo $d->a->b[1], $d->c; $e = json_decode(\'{"a":1}\', true); echo $e["a"]; var_dump(json_decode("{bad"), json_last_error_msg(), json_decode("5"), json_decode("5.0"));'),
    '2.5x1NULL\nstring(12) "Syntax error"\nint(5)\nfloat(5)\n');
  assert.equal(php('class P implements JsonSerializable { public function __construct(private $x) {} public function jsonSerialize(): mixed { return ["x" => $this->x]; } } echo json_encode([new P(3)]);'), '[{"x":3}]');
});

test('dates use the clock and time zone', () => {
  assert.equal(php('echo date("Y-m-d H:i:s l jS F, D M n/j/y g:i A N z t L W U");'), '2026-10-12 14:30:00 Monday 12th October, Mon Oct 10/12/26 2:30 PM 1 284 31 0 42 1791815400');
  assert.equal(php('echo date("D, d M Y", mktime(0, 0, 0, 12, 25, 2026)), " ", date("Y-m-d", strtotime("+1 week")), " ", date("Y-m-d", strtotime("2026-02-28 +1 day")), " ", date("l", strtotime("next friday"));'), 'Fri, 25 Dec 2026 2026-10-19 2026-03-01 Friday');
  assert.equal(php('date_default_timezone_set("America/New_York"); echo date("H:i T P");'), '10:30 EDT -04:00');
  assert.equal(php('var_dump(checkdate(2, 29, 2027), checkdate(2, 29, 2028), strtotime("garbage"));'), 'bool(false)\nbool(true)\nbool(false)\n');
});

test('regular expressions', () => {
  assert.equal(php('if (preg_match("/^(\\\\d{3})-(\\\\d{4})$/", "555-1234", $m)) { echo $m[0], "|", $m[1], "|", $m[2]; }'), '555-1234|555|1234');
  assert.equal(php('preg_match("/(?P<year>\\\\d{4})-(?<month>\\\\d{2})/", "Due 2026-10", $m); echo json_encode($m);'), '{"0":"2026-10","year":"2026","1":"2026","month":"10","2":"10"}');
  assert.equal(php('echo preg_replace("/(\\\\w+) (\\\\w+)/", "$2 $1", "hello world"), preg_replace("/\\\\s+/", " ", "a   b \\n c"), preg_match("/abc/i", "xABCx");'), 'world helloa b c1');
  assert.equal(php('echo implode("|", preg_split("/[\\\\s,]+/", "a, b  c,d")), preg_match_all("/\\\\d/", "a1b22", $all), json_encode($all);'), 'a|b|c|d3[["1","2","2"]]');
  assert.equal(php('echo preg_replace_callback("/\\\\d+/", fn($m) => $m[0] * 2, "a1 b20");'), 'a2 b40');
  assert.match(plain(php('preg_match("abc", "x");')), /Warning:\s+preg_match\(\): Delimiter must not be alphanumeric/);
});

test('filter_var and filter_input', () => {
  assert.equal(php('var_dump(filter_var("ana@example.com", FILTER_VALIDATE_EMAIL), filter_var("ana@", FILTER_VALIDATE_EMAIL), filter_var("42", FILTER_VALIDATE_INT), filter_var("4.2", FILTER_VALIDATE_INT), filter_var("15", FILTER_VALIDATE_INT, ["options" => ["min_range" => 1, "max_range" => 10]]), filter_var("yes", FILTER_VALIDATE_BOOLEAN), filter_var("3.5", FILTER_VALIDATE_FLOAT));'),
    'string(15) "ana@example.com"\nbool(false)\nint(42)\nbool(false)\nbool(false)\nbool(true)\nfloat(3.5)\n');
  assert.equal(php('var_dump(filter_input(INPUT_GET, "age", FILTER_VALIDATE_INT), filter_input(INPUT_GET, "nope"));', { get: { age: '21' } }), 'int(21)\nNULL\n');
  assert.equal(php('echo filter_var("<b>hi</b>", FILTER_SANITIZE_SPECIAL_CHARS), filter_var("a1b2", FILTER_SANITIZE_NUMBER_INT);'), '&#60;b&#62;hi&#60;/b&#62;12');
});

test('include and require read the files given to run()', () => {
  const files = { 'header.php': '<header><?= $title ?></header>\n', 'config.php': '<?php return ["site" => "Demo"];' };
  assert.equal(out('<?php $title = "Home"; include "header.php"; $c = require "config.php"; echo $c["site"];', { files }), '<header>Home</header>\nDemo');
  assert.match(plain(out('<?php include "missing.php"; echo "after";')), /Warning:\s+include\(missing\.php\): Failed to open stream: No such file or directory[\s\S]*after$/);
  assert.match(plain(out('<?php require "missing.php"; echo "after";')), /Fatal error:\s+Uncaught Error: Failed opening required 'missing\.php'/);
});

test('null passed to string functions is deprecated, not fatal', () => {
  const r = php('$name = $_GET["name"] ?? null;\necho strlen($name);');
  assert.match(plain(r), /Deprecated:\s+strlen\(\): Passing null to parameter #1 \(\$string\) of type string is deprecated/);
  assert.match(r, /0$/);
});

test('password_hash and password_verify agree', () => {
  assert.equal(php('$h = password_hash("secret", PASSWORD_DEFAULT); echo strlen($h), substr($h, 0, 7), password_verify("secret", $h) ? "Y" : "N", password_verify("guess", $h) ? "Y" : "N";'), '60$2y$10$YN');
});

test('the playground runtime follows the course.js contract', () => {
  assert.equal(typeof PHP.runtime.render, 'function');
  const r = PHP.runtime.render({ php: '<?php echo "<h1>Hi " . ($_GET["n"] ?? "") . "</h1>";' }, { method: 'GET', url: '/index.php?n=Bo', path: '/index.php', query: 'n=Bo', body: '', cookies: {} });
  assert.equal(r.html, '<h1>Hi Bo</h1>');
  assert.ok(Array.isArray(r.headers) && Array.isArray(r.logs));
  const e = PHP.runtime.render({ php: '<?php\necho $x;' });
  assert.equal(e.logs[0][0], 'warn');
  assert.match(PHP.runtime.render({ php: '<?php echo 1' }).html, /Parse error/);
});

test('a script that mixes HTML, a class, arrays, GET filtering and a POST redirect', () => {
  const app = `<?php
class Item {
  public function __construct(public string $name, public float $price, public string $type) {}
  public function label(): string { return $this->name . ' ($' . number_format($this->price, 2) . ')'; }
}
$menu = [new Item('Taco', 3.5, 'food'), new Item('Soda', 1.25, 'drink'), new Item('Burrito', 7, 'food')];
$type = $_GET['type'] ?? 'all';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $qty = filter_var($_POST['qty'] ?? '', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
  if ($qty === false) { $error = 'Quantity must be a whole number of at least 1.'; }
  else { header('Location: index.php?ordered=' . $qty); exit; }
}
$shown = array_filter($menu, fn($i) => $type === 'all' || $i->type === $type);
?>
<h1>Menu</h1>
<?php if (isset($_GET['ordered'])): ?><p class="ok">Ordered <?= (int) $_GET['ordered'] ?>!</p><?php endif; ?>
<?php if (!empty($error)): ?><p class="err"><?= htmlspecialchars($error) ?></p><?php endif; ?>
<ul>
<?php foreach ($shown as $item): ?>
  <li><?= htmlspecialchars($item->label()) ?></li>
<?php endforeach; ?>
</ul>`;
  const get = (q) => PHP.runtime.render({ php: app }, { method: 'GET', url: '/index.php' + (q ? '?' + q : ''), path: '/index.php', query: q || '', body: '', cookies: {} });
  assert.equal((get('').html.match(/<li>/g) || []).length, 3);
  assert.equal((get('type=food').html.match(/<li>/g) || []).length, 2);
  assert.match(get('type=drink').html, /<li>Soda \(\$1\.25\)<\/li>/);
  const post = (body) => PHP.runtime.render({ php: app }, { method: 'POST', url: '/index.php', path: '/index.php', query: '', body, cookies: {} });
  const bad = post('qty=0');
  assert.equal(bad.status, 200);
  assert.match(bad.html, /Quantity must be a whole number/);
  const good = post('qty=2');
  assert.equal(good.status, 302);
  assert.deepEqual(good.headers.find((h) => h[0] === 'Location'), ['Location', 'index.php?ordered=2']);
  assert.match(get('ordered=2').html, /Ordered 2!/);
});

test('loose details students notice', () => {
  assert.equal(php('$a = "10"; $b = 10; var_dump($a == $b, $a === $b, (int) "12abc", (float) "3.14xyz", (bool) "0", (bool) "0.0", (string) false, intval("0x1A", 16), (array) "x");'),
    'bool(true)\nbool(false)\nint(12)\nfloat(3.14)\nbool(false)\nbool(true)\nstring(0) ""\nint(26)\narray(1) {\n  [0]=>\n  string(1) "x"\n}\n');
  assert.equal(php('$x = 5; $y = &$x; $y = 6; echo $x; unset($y); $y = 7; echo $x;'), '66');
  assert.equal(php('$s = "abc"; $s[0] = "X"; echo $s;'), 'Xbc');
  assert.equal(php('$i = 10; $f = 10.0; var_dump(is_int($i), is_float($f), is_numeric("1e3"), is_numeric("abc"), is_numeric(" 5"));'), 'bool(true)\nbool(true)\nbool(true)\nbool(false)\nbool(true)\n');
  assert.equal(php('echo PHP_VERSION >= "8.0" ? "modern" : "old", " ", str_contains(phpversion(), "8.") ? "8" : "?";'), 'modern 8');
});
