// fyaml, the part of polibfyaml besm2_cg_po reads files with, over the
// yaml library. There is no Oberon test to port: every expected message,
// place and path here is what besm2_calc_po 's --check printed for the
// same text (2026-11-15; PLAN.md, Findings), with the file named f.yaml.
// load stands in for besm2_cg_po's ReadStream, up to its first error:
// resolve, then entities.load on each item.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../../src/core/entities.ts";
import * as F from "../../src/core/fyaml.ts";

function check(ok: boolean, label: string): void {
  test(label, () => assert.ok(ok, label));
}

/** The first error reading text as besm2_calc_po reads it, as it
 *  prints it, without the trailing line feed; "" for none. */
function firstError(text: string): string {
  const name = "f.yaml";
  const { docs, err } = F.parseStream(text, name);
  for (const d of docs) {
    const e = d.resolve();
    if (e !== undefined) return e.msg.trimEnd();
    const root = d.root();
    if (root === undefined || !root.isSequence())
      return `error processing ${name}: expected a top-level YAML sequence of entities in ${name}`;
    for (const it of root.items) {
      const r = E.load(it);
      if (!r.ok)
        return r.yerr !== undefined
          ? r.yerr.msg.trimEnd()
          : `error processing ${name}: ${r.msg}`;
    }
  }
  return err !== undefined ? err.msg.trimEnd() : "";
}

function says(text: string, expected: string, label: string): void {
  const got = firstError(text);
  test(label, () => assert.equal(got, expected, label));
}

/** The first document's resolved root. */
function root(text: string): F.Node {
  const { docs, err } = F.parseStream(text, "f.yaml");
  if (err !== undefined) throw new Error(err.msg);
  const d = docs[0]!;
  const e = d.resolve();
  if (e !== undefined) throw new Error(e.msg);
  return d.root()!;
}

/** The first document's root, unresolved. */
function raw(text: string): F.Node {
  return F.parseStream(text, "f.yaml").docs[0]!.root()!;
}

function keys(m: F.Node): string {
  return m.pairs.map((p) => p.key.text).join(",");
}

// ---- Places: lines, and columns in characters ----
says(
  '- {tagline: "ééé😀", mecha: maybe}\n',
  'f.yaml:1:28: error: /0/mecha: not a valid boolean: "maybe"',
  "columns count characters, not bytes or UTF-16 units",
);
says(
  '- name: X\n  mecha: "maybe"\n',
  'f.yaml:2:11: error: /0/mecha: not a valid boolean: "maybe"',
  "a quoted scalar is placed inside its quote",
);
says(
  '- name: X\n  "mecha": maybe\n',
  'f.yaml:2:12: error: /0/mecha: not a valid boolean: "maybe"',
  "a quoted key is found by its text",
);
says(
  "- name: X\n  mecha: |\n    maybe\n",
  'f.yaml:3:1: error: /0/mecha: not a valid boolean: "maybe\n"',
  "a block scalar is placed at its first line, column 1; its text untrimmed but for blanks",
);
says(
  "- name: X\n  mecha:\n",
  'f.yaml:2:8: error: /0/mecha: not a valid boolean: ""',
  "an empty value is placed at its colon",
);
says(
  "- name: X\n  stats: [{name: Body, value: 4, points: }]\n",
  'f.yaml:2:40: error: /0/stats/0/points: not a valid integer: ""',
  "an empty value in a flow mapping is placed at its colon",
);
says(
  '- name: X\n  stats: &s\n    - 1\n  junk: &t [1]\n  j2: &u\n    a: 1\n  j3: &v {a: 1}\n  points: &w 7\n  mecha: &y "q"\n',
  'f.yaml:9:14: error: /0/mecha: not a valid boolean: "q"',
  "an anchored scalar is placed at its text, after the anchor",
);
says(
  "- name: X\n  mecha: [1]\n",
  "f.yaml:2:3: error: /0/mecha: not a scalar value",
  "a value that isn't a scalar is placed at its key",
);
says(
  '- name: X\n  stats:\n    - {"a\\U0001F600b": 1, name: [x], value: 4, points: 8}\n',
  "f.yaml:3:27: error: /0/stats/0/name: not a scalar value",
  "a key after an escaped character beyond U+FFFF is placed in characters",
);
says(
  "\ufeff- name: X\n  mecha: maybe\n",
  'f.yaml:2:10: error: /0/mecha: not a valid boolean: "maybe"',
  "a byte order mark at the start is skipped",
);
says(
  "- name: X\r\n  mecha: maybe\r\n",
  'f.yaml:2:10: error: /0/mecha: not a valid boolean: "maybe"',
  "CR LF line ends",
);

// ---- Integers and booleans, polibfyaml's grammar and messages ----
says(
  '- name: X\n  stats: [{name: Body, value: 4, points: " 4 "}]\n',
  "",
  "a quoted integer is trimmed of blanks",
);
says(
  '- name: X\n  stats: [{name: Body, value: 4, points: "\\t4"}]\n',
  'f.yaml:2:43: error: /0/stats/0/points: not a valid integer: "\t4"',
  "but not of tabs, and the text isn't escaped in the message",
);
says(
  "- name: X\n  stats: [{name: Body, value: 4, points: null}]\n",
  'f.yaml:2:42: error: /0/stats/0/points: not a valid integer: "null"',
  "null is not an integer",
);
says(
  "- name: X\n  stats: [{name: Body, value: 4, points: x}]\n- name: Y\n  stats: [{name: Body, value: 4, points: 4}]\n",
  'f.yaml:2:42: error: /0/stats/0/points: not a valid integer: "x"',
  "the first error is reported",
);
{
  const v = (s: string) => {
    const r = F.parseIntText(s);
    return r.valid ? (r.overflow ? "overflow" : String(r.value)) : "invalid";
  };
  check(
    v("42") === "42" && v("+5") === "5" && v("-7") === "-7",
    "ParseInt: decimal with a sign",
  );
  check(
    v("0x1F") === "31" && v("0o17") === "15" && v("-0b101") === "-5",
    "ParseInt: hex, octal and binary",
  );
  check(
    v("1_000") === "1000" && v("0x_1") === "invalid" && v("1__0") === "invalid",
    "ParseInt: single underscores between digits only",
  );
  check(
    v("_1") === "invalid" && v("1_") === "invalid" && v("") === "invalid",
    "ParseInt: no underscore at the ends, and not empty",
  );
  check(
    v("0x") === "invalid" && v("0b2") === "invalid" && v("08") === "8",
    "ParseInt: a prefix needs digits of its base; a leading 0 is decimal",
  );
  check(
    v("1.5") === "invalid" && v("1e3") === "invalid" && v("0X1") === "invalid",
    "ParseInt: no floats, no capital prefix",
  );
  check(
    v("9223372036854775807") === "9223372036854775807" &&
      v("-9223372036854775808") === "-9223372036854775808" &&
      v("9223372036854775808") === "overflow",
    "ParseInt: 64 bits",
  );
}
says(
  "- name: X\n  stats: [{name: Body, value: 4, points: 2147483648}]\n",
  'f.yaml:2:42: error: /0/stats/0/points: integer out of range: "2147483648"',
  "an integer beyond 32 bits is out of range",
);
says(
  "- name: X\n  stats: [{name: Body, value: 4, points: 99999999999999999999}]\n",
  'f.yaml:2:42: error: /0/stats/0/points: integer out of range: "99999999999999999999"',
  "an integer beyond 64 bits is out of range too",
);
says(
  "- name: X\n  stats: [{name: Body, value: 4, points: -2147483648}]\n",
  "",
  "MIN(INTEGER) is in range",
);
check(
  ["true", "True", "TRUE", "false", "False", "FALSE"].every(
    (s) => F.parseBoolText(s) !== undefined,
  ) &&
    ["yes", "on", "tRUE", "1", ""].every(
      (s) => F.parseBoolText(s) === undefined,
    ),
  "booleans: true and false in three cases only",
);

// ---- Parse errors ----
says(
  "- name: X\n  name: Y\n",
  "f.yaml:2:3: error: duplicate key",
  "a duplicate key, in libfyaml's words",
);
says(
  "- name: X\n  stats: [{name: Body, value: 4, points: 4, points: 5}]\n",
  "f.yaml:2:45: error: duplicate key",
  "a duplicate key in a flow mapping",
);
says(
  "- name: X\n  stats:\n\t- {name: Body, value: 4, points: 4}\n",
  "f.yaml:3:1: error: tab character may not be used as indentation",
  "a tab as indentation, in libfyaml's words",
);
{
  // The wording of other syntax errors is the library's (PLAN.md,
  // Findings); the place is libfyaml's.
  const { docs, err } = F.parseStream(
    "- name: X\n---\n- {name: Y\n- name: Z\n",
    "f.yaml",
  );
  check(
    docs.length === 1 &&
      err !== undefined &&
      err.kind === F.ParseError &&
      err.msg.startsWith("f.yaml:4:1: error: "),
    "a syntax error ends the stream after the documents before it",
  );
}
{
  const { docs, err } = F.parseStream("", "f.yaml");
  const c = F.parseStream("# only a comment\n", "f.yaml");
  check(
    docs.length === 0 && err === undefined && c.docs.length === 0,
    "an empty file, or one of comments, has no documents",
  );
}
says("- name: X\n...\n", "", "a document end marker");
says(
  "\ufeff- name: X\n---\n\ufeff- name: Y\n",
  "error processing f.yaml: expected a top-level YAML sequence of entities in f.yaml",
  "a byte order mark after the first document is not skipped",
);

// ---- Aliases and merge keys ----
says(
  "- name: *nope\n",
  "f.yaml:1:10: error: invalid alias",
  "an undefined alias, at its name",
);
says(
  "- &a {name: X, self: *a}\n",
  "f.yaml:1:23: error: cyclic reference detected",
  "an alias inside its own anchor",
);
says(
  "- name: X\n  stats:\n  - &a {name: Body, value: 4, points: x}\n  - *a\n",
  'f.yaml:3:39: error: /0/stats/0/points: not a valid integer: "x"',
  "an error in an aliased node",
);
says(
  "- name: X\n  <<: 5\n",
  "f.yaml:2:7: error: invalid merge key value",
  "a merge of a scalar, at the scalar",
);
says(
  "- name: X\n  <<:\n    a: 1\n",
  "f.yaml:3:5: error: invalid merge key value",
  "a merge of a mapping that isn't an alias, at its first key",
);
says(
  "- name: X\n  <<: &q\n    - a\n",
  "f.yaml:3:5: error: invalid merge key value",
  "a merge of a sequence that isn't of aliases, at its first item",
);
says(
  '- name: X\n  e: &e x\n  "<<": *e\n',
  "",
  "a quoted << is an ordinary key",
);
{
  const r = root(
    "- &base {name: X, stats: [{name: Body, value: 4, points: 4}]}\n- <<: *base\n  name: Y\n",
  );
  const y = r.item(1);
  check(
    keys(y) === "stats,name" &&
      y.value("name")?.text === "Y" &&
      y.value("stats")?.item(0).value("points")?.text === "4",
    "a merge adds the keys the mapping doesn't have, where the << was",
  );
  check(
    y.value("stats")?.item(0).value("points")?.path() === "/1/stats/0/points",
    "a path through a merge is the one followed to the copy",
  );
}
{
  const r = root(
    "- name: X\n  b: &b {p: 1, q: 2}\n  c:\n    <<: *b\n    p: 3\n    z: 4\n  d:\n    z: 4\n    <<: [*b]\n",
  ).item(0);
  check(
    keys(r.value("c")!) === "q,p,z" && r.value("c")!.value("p")?.text === "3",
    "a merged key the mapping has later is skipped",
  );
  check(
    keys(r.value("d")!) === "z,q,p",
    "merged pairs go in just after the <<, each before the one merged before it",
  );
}
{
  const r = root(
    "- name: &x Nm\n  junk: [&b {p: 1}, &c {q: 2, p: 3}, &d {r: *x, mecha: true}]\n- <<: [*b, *c]\n  name: Y\n- <<: *d\n  name: Z\n",
  );
  check(
    keys(r.item(1)) === "q,p,name" && r.item(1).value("p")?.text === "1",
    "the first of several merged mappings wins",
  );
  check(
    keys(r.item(2)) === "mecha,r,name" && r.item(2).value("r")?.text === "Nm",
    "an alias in a merged mapping is resolved",
  );
}
{
  const r = raw("- name: &n X\n  tagline: *n\n").item(0);
  const t = r.value("tagline")!;
  check(
    t.isAlias() &&
      t.isScalar() &&
      t.text === "n" &&
      t.location()?.line === 2 &&
      t.location()?.column === 13,
    "an alias, unresolved, is a scalar of its name, placed at the name",
  );
}

// ---- Keys in paths ----
{
  const r = raw(
    '- name: &n X\n  "a\\U0001F600b": *n\n  "x\\u00A0y": *n\n  "t\\tq": *n\n  "e\\u00e9": *n\n  "z\\u2028": *n\n  "_a9-": *n\n  "9a": *n\n  "": *n\n  "\\x01": *n\n  a b: *n\n  \'c d\': *n\n  \'e\': *n\n  a/b: *n\n  "a\\"b": *n\n  "a\\\\b": *n\n  ? [k]\n  : *n\n',
  ).item(0);
  const paths = r.pairs.map((p) => p.value!.path());
  const expected = [
    "/0/name",
    '/0/"a\\U0001F600b"',
    '/0/"x\\_y"',
    '/0/"t\\tq"',
    '/0/"eé"',
    '/0/"z\\L"',
    "/0/_a9-",
    '/0/"9a"',
    "/0/",
    '/0/"\\x01"',
    '/0/"a b"',
    '/0/"c d"',
    "/0/e",
    '/0/"a/b"',
    '/0/"a\\"b"',
    '/0/"a\\\\b"',
    "/0/[k]",
  ];
  for (let i = 0; i < expected.length; i++) {
    check(
      paths[i] === expected[i],
      `a key in a path, as libfyaml writes it: ${expected[i]}`,
    );
  }
  check(
    raw("- <<: [*b]\n").item(0).value("<<")!.item(0).path() === '/0/"<<"/0',
    "a merge key in a path, unresolved",
  );
  check(raw("- x\n").path() === "/", "the root's path");
}

// ---- Lookups ----
{
  const r = raw("- {? [a] : 1, name: X, \"q\": 2, 's': 3, ? x}\n").item(0);
  check(
    r.value("name")?.text === "X" &&
      r.value("q")?.text === "2" &&
      r.value("s")?.text === "3",
    "a key is found by its text, however it is quoted",
  );
  check(
    !r.hasKey("[a]") && !r.hasKey("a") && !r.hasKey("x"),
    "a complex key is never found, nor a key with no value",
  );
  check(
    r.value("name")!.isNullValue() === false &&
      raw("- {a: , b: ~, c: Null, d: '', e: \" \"}\n")
        .item(0)
        .pairs.map((p) => p.value!.isNullValue())
        .join() === "true,true,true,false,false",
    "IsNullValue: plain empty, ~ and null only",
  );
}
says("- name: !!int 5\n", "", "tags are ignored");
says(
  "- ? [a]\n  : 1\n  name: X\n",
  "",
  "a complex key in an entity is ignored",
);
