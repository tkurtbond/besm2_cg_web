// The part of polibfyaml's Fyaml (~/Repos/Oberon/polibfyaml) that
// besm2_cg_po uses to read a file, over the yaml library: a stream of
// documents, read unresolved; Resolve, for aliases and merge keys;
// nodes with their paths and locations; and the typed accessors, with
// polibfyaml's grammar for integers and booleans and its messages.
//
// The yaml library parses; this keeps its own tree of nodes, made from
// the library's, because libfyaml and the library disagree on what a
// reader of besm2_cg_po's files can see (PLAN.md, Findings,
// 2026-11-15): where a scalar is (columns in characters, a quoted
// scalar inside its quotes, a block scalar at its first line, an empty
// one at its ":"), how a merge key ("<<") is resolved, which the
// library leaves as an ordinary key, how an undefined alias fails, and
// how a key is written in a path. Each of those was checked against
// besm2_calc_po (libfyaml 0.9.x through polibfyaml), and the yaml
// library 2.9.1.
//
// An Oberon String is a string here, an Error a YamlError, and a
// procedure that returns FALSE and sets err returns a Result.

import {
  type Document as YDocument,
  isAlias,
  isMap,
  isScalar,
  isSeq,
  LineCounter,
  parseAllDocuments,
  type Node as YNode,
  type Scalar as YScalar,
} from "yaml";

// Error kinds, as Fyaml's.
export const ParseError = 1; // malformed input
export const FileError = 2; // the file can't be read
export const EmitError = 3;
export const PathError = 4;
export const DuplicateKey = 5;
export const MissingKey = 6; // the ...Field accessors: no such key
export const DataError = 7; // typed accessors: not a scalar, malformed, or out of range
export const ResolveError = 8; // resolve: an invalid alias, a cycle, a bad merge key

// Node styles, as Fyaml's Style* constants.
export const StyleFlow = 0;
export const StyleBlock = 1;
export const StylePlain = 2;
export const StyleSingleQuoted = 3;
export const StyleDoubleQuoted = 4;
export const StyleLiteral = 5;
export const StyleFolded = 6;
export const StyleAlias = 7;

/** The file name reported for string input, as libfyaml's. */
export const stringName = "(string-in-memory)";

/** An error, as Fyaml.Error: msg is the whole message, ending in a line
 *  feed, as polibfyaml's; line and column are 0 when it has no place. */
export interface YamlError {
  kind: number;
  file: string;
  line: number;
  column: number;
  path?: string;
  msg: string;
}

export type Result<T> = { ok: true; value: T } | { ok: false; err: YamlError };

type Kind = "scalar" | "sequence" | "mapping" | "alias";

/** Where a scalar's text starts, 1-based, in characters. */
interface Mark {
  line: number;
  column: number;
}

export interface Pair {
  key: Node;
  value?: Node; // undefined for a key with no value at all ("? key")
}

// ---- Nodes ----

export class Node {
  readonly doc: Document;
  readonly kind: Kind;
  /** A scalar's text; an alias's anchor name. */
  readonly text: string;
  readonly style: number;
  readonly tag: string; // "" for none
  readonly items: Node[] = [];
  readonly pairs: Pair[] = [];
  /** A scalar's or alias's place (the name after "*"); undefined for a
   *  collection, which libfyaml gives no scalar mark. */
  readonly mark?: Mark;
  /** Where the node starts, for a resolve error about it: a scalar's
   *  mark, or a collection's first token ("[", "{", "-" or its first
   *  key). */
  readonly start?: Mark;
  /** An alias's anchored node, as the alias found it; undefined for an
   *  undefined alias. */
  target?: Node;
  // The node holding this one, and, in a mapping, this one's key.
  parent?: Node;
  parentKey?: Node;

  constructor(
    doc: Document,
    kind: Kind,
    text: string,
    style: number,
    tag: string,
    mark: Mark | undefined,
    start: Mark | undefined,
  ) {
    this.doc = doc;
    this.kind = kind;
    this.text = text;
    this.style = style;
    this.tag = tag;
    if (mark !== undefined) this.mark = mark;
    if (start !== undefined) this.start = start;
  }

  /** An alias counts as a scalar whose text is the anchor's name, as in
   *  polibfyaml. */
  isScalar(): boolean {
    return this.kind === "scalar" || this.kind === "alias";
  }
  isSequence(): boolean {
    return this.kind === "sequence";
  }
  isMapping(): boolean {
    return this.kind === "mapping";
  }
  isAlias(): boolean {
    return this.kind === "alias";
  }

  /** A scalar's text, untrimmed. */
  scalar(): string {
    if (!this.isScalar()) throw new Error("fyaml: scalar of a collection");
    return this.text;
  }

  scalarIs(s: string): boolean {
    return this.isScalar() && this.text === s;
  }

  /** The number of items in a sequence, or of pairs in a mapping. */
  length(): number {
    if (this.kind === "sequence") return this.items.length;
    if (this.kind === "mapping") return this.pairs.length;
    throw new Error("fyaml: length of a scalar");
  }

  item(i: number): Node {
    if (this.kind !== "sequence")
      throw new Error("fyaml: item of a non-sequence");
    const n = this.items[i];
    if (n === undefined) throw new Error("fyaml: item index out of range");
    return n;
  }

  /** The value for key in a mapping, or undefined if there is no such
   *  key. A key matches by its text, however it is quoted, as libfyaml's
   *  lookup by string; a key that isn't a scalar never matches. */
  value(key: string): Node | undefined {
    if (this.kind !== "mapping")
      throw new Error("fyaml: value of a non-mapping");
    return this.pairFor(key)?.value;
  }

  hasKey(key: string): boolean {
    return this.value(key) !== undefined;
  }

  private pairFor(key: string): Pair | undefined {
    for (const p of this.pairs) {
      if (p.key.kind === "scalar" && p.key.text === key) return p;
    }
    return undefined;
  }

  /** n's path from the document root: "/" for the root, then "/INDEX"
   *  in a sequence or "/KEY" in a mapping, the key written as libfyaml
   *  writes it (pathKey). Through an alias or merge, after resolve, the
   *  path is the one followed to the copy. */
  path(): string {
    const parts: string[] = [];
    for (let n: Node = this; n.parent !== undefined; n = n.parent) {
      if (n.parent.kind === "sequence")
        parts.push(String(n.parent.items.indexOf(n)));
      else parts.push(n.parentKey !== undefined ? pathKey(n.parentKey) : "");
    }
    return "/" + parts.reverse().join("/");
  }

  /** The scalar's place, as Fyaml's Location. */
  location(): Mark | undefined {
    return this.mark;
  }

  /** TRUE if n is null: a plain scalar that is empty or ~, null, Null or
   *  NULL, after trimming blanks. An alias is never null. */
  isNullValue(): boolean {
    if (this.kind !== "scalar" || this.style !== StylePlain) return false;
    const t = trimBlanks(this.text);
    return (
      t === "" || t === "~" || t === "null" || t === "Null" || t === "NULL"
    );
  }

  isInteger(): boolean {
    return this.isScalar() && parseIntText(trimBlanks(this.text)).valid;
  }

  isBoolean(): boolean {
    return (
      this.isScalar() && parseBoolText(trimBlanks(this.text)) !== undefined
    );
  }

  // ---- Typed values of a scalar ----

  /** The 64-bit integer of scalar n, as LongIntValue. */
  longIntValue(): Result<bigint> {
    this.mustBeScalar();
    return longIntOf(this);
  }

  /** The 32-bit integer of scalar n, as IntegerValue. */
  integerValue(): Result<number> {
    this.mustBeScalar();
    return integerOf(this);
  }

  booleanValue(): Result<boolean> {
    this.mustBeScalar();
    return booleanOf(this);
  }

  private mustBeScalar(): void {
    if (!this.isScalar()) throw new Error("fyaml: typed value of a collection");
  }

  // ---- Mapping fields ----
  //
  // A missing key is a MissingKey error in the ...Field forms, and
  // gives the default in the ...FieldOr forms; a value that isn't a
  // scalar, or doesn't fit the type, is a DataError in both.

  /** The value for key, of any kind, or a MissingKey error. */
  required(key: string): Result<Node> {
    const v = this.value(key);
    return v !== undefined ? { ok: true, value: v } : fail(missing(this, key));
  }

  integerField(key: string): Result<number> {
    const h = this.fieldHandle(key, true);
    return h.ok ? integerOf(h.value!) : h;
  }

  integerFieldOr(key: string, dflt: number): Result<number> {
    const h = this.fieldHandle(key, false);
    if (!h.ok) return h;
    return h.value !== undefined
      ? integerOf(h.value)
      : { ok: true, value: dflt };
  }

  booleanField(key: string): Result<boolean> {
    const h = this.fieldHandle(key, true);
    return h.ok ? booleanOf(h.value!) : h;
  }

  booleanFieldOr(key: string, dflt: boolean): Result<boolean> {
    const h = this.fieldHandle(key, false);
    if (!h.ok) return h;
    return h.value !== undefined
      ? booleanOf(h.value)
      : { ok: true, value: dflt };
  }

  /** The scalar's text, untrimmed. */
  stringField(key: string): Result<string> {
    const h = this.fieldHandle(key, true);
    return h.ok ? { ok: true, value: h.value!.text } : h;
  }

  stringFieldOr(key: string, dflt: string): Result<string> {
    const h = this.fieldHandle(key, false);
    if (!h.ok) return h;
    return { ok: true, value: h.value !== undefined ? h.value.text : dflt };
  }

  /** The scalar value for key; undefined if there is none and it isn't
   *  required. A value that isn't a scalar is a DataError located at
   *  its key, with the value's path. */
  private fieldHandle(
    key: string,
    required: boolean,
  ): Result<Node | undefined> {
    if (this.kind !== "mapping")
      throw new Error("fyaml: field of a non-mapping");
    const p = this.pairFor(key);
    if (p === undefined || p.value === undefined) {
      return required
        ? fail(missing(this, key))
        : { ok: true, value: undefined };
    }
    if (!p.value.isScalar()) {
      return fail(nodeError(DataError, p.value, p.key, "not a scalar value"));
    }
    return { ok: true, value: p.value };
  }
}

function fail(err: YamlError): { ok: false; err: YamlError } {
  return { ok: false, err };
}

// ---- Errors ----

/** An error of kind about node n, located at the scalar at (n itself,
 *  or a key; undefined for none): "FILE:LINE:COLUMN: error: PATH:
 *  TEXT", or without a location "FILE: error: PATH: TEXT". */
function nodeError(
  kind: number,
  n: Node,
  at: Node | undefined,
  text: string,
): YamlError {
  const path = n.path();
  const m = at?.mark;
  const file = n.doc.name;
  const where = m !== undefined ? `${file}:${m.line}:${m.column}` : file;
  return {
    kind,
    file,
    line: m?.line ?? 0,
    column: m?.column ?? 0,
    path,
    msg: `${where}: error: ${path}: ${text}\n`,
  };
}

/** An error with a place but no path: a parse or resolve error, as
 *  libfyaml's diagnostics, "FILE:LINE:COLUMN: error: TEXT". */
function placedError(
  kind: number,
  file: string,
  m: Mark | undefined,
  text: string,
): YamlError {
  const where = m !== undefined ? `${file}:${m.line}:${m.column}` : file;
  return {
    kind,
    file,
    line: m?.line ?? 0,
    column: m?.column ?? 0,
    msg: `${where}: error: ${text}\n`,
  };
}

function missing(m: Node, key: string): YamlError {
  return nodeError(MissingKey, m, undefined, `missing required key "${key}"`);
}

/** A DataError about scalar n: 'what: "TEXT"', TEXT trimmed of blanks
 *  and not escaped, as polibfyaml's. */
function valueError(n: Node, what: string, t: string): YamlError {
  return nodeError(DataError, n, n, `${what}: "${t}"`);
}

// ---- Scalars, as polibfyaml converts them ----

/** s without leading and trailing blanks (" " only), as GetText. */
function trimBlanks(s: string): string {
  let i = 0;
  let j = s.length;
  while (i < j && s[i] === " ") i++;
  while (j > i && s[j - 1] === " ") j--;
  return s.slice(i, j);
}

function digitValue(c: string | undefined): number {
  if (c === undefined) return 99;
  if (c >= "0" && c <= "9") return c.charCodeAt(0) - 48;
  if (c >= "a" && c <= "f") return c.charCodeAt(0) - 97 + 10;
  if (c >= "A" && c <= "F") return c.charCodeAt(0) - 65 + 10;
  return 99;
}

// The length of the run digit {["_"] digit} of base-digits at s[i], or
// 0 if s[i] isn't one: Fyaml's DigitRun, as ova_cg_web's entities.ts
// ported it. Only ASCII can be in a run, so UTF-16 units and the
// Oberon's bytes agree.
function digitRun(s: string, i: number, base: number): number {
  let j = i;
  if (j >= s.length || digitValue(s[j]) >= base) return 0;
  j++;
  while (j < s.length) {
    if (digitValue(s[j]) < base) j++;
    else if (s[j] === "_" && j + 1 < s.length && digitValue(s[j + 1]) < base)
      j += 2;
    else break;
  }
  return j - i;
}

const minLong = -(2n ** 63n);
const maxLong = 2n ** 63n - 1n;

/** s read as Fyaml's ParseInt reads it: [+-], then decimal, 0x hex, 0o
 *  octal or 0b binary digits, with single "_"s between them. valid is
 *  false if s doesn't fit that; overflow, if the value is beyond 64
 *  bits. Exact, by BigInt, however long s is. */
export function parseIntText(s: string): {
  valid: boolean;
  overflow: boolean;
  value: bigint;
} {
  let i = 0;
  let neg = false;
  if (s.length > 0 && (s[0] === "+" || s[0] === "-")) {
    neg = s[0] === "-";
    i = 1;
  }
  let base = 10;
  let prefix = "";
  if (s.length - i >= 2 && s[i] === "0") {
    const p = s[i + 1];
    if (p === "x" || p === "o" || p === "b") {
      base = p === "x" ? 16 : p === "o" ? 8 : 2;
      prefix = "0" + p;
      i += 2;
    }
  }
  if (i === s.length || digitRun(s, i, base) !== s.length - i) {
    return { valid: false, overflow: false, value: 0n };
  }
  let v = BigInt(prefix + s.slice(i).replaceAll("_", ""));
  if (neg) v = -v;
  return { valid: true, overflow: v < minLong || v > maxLong, value: v };
}

/** s as Fyaml's booleans: true/True/TRUE and false/False/FALSE only. */
export function parseBoolText(s: string): boolean | undefined {
  switch (s) {
    case "true":
    case "True":
    case "TRUE":
      return true;
    case "false":
    case "False":
    case "FALSE":
      return false;
  }
  return undefined;
}

function longIntOf(n: Node): Result<bigint> {
  const t = trimBlanks(n.text);
  const r = parseIntText(t);
  if (!r.valid) return fail(valueError(n, "not a valid integer", t));
  if (r.overflow) return fail(valueError(n, "integer out of range", t));
  return { ok: true, value: r.value };
}

function integerOf(n: Node): Result<number> {
  const r = longIntOf(n);
  if (!r.ok) return r;
  if (r.value < -(2n ** 31n) || r.value > 2n ** 31n - 1n) {
    return fail(valueError(n, "integer out of range", trimBlanks(n.text)));
  }
  return { ok: true, value: Number(r.value) };
}

function booleanOf(n: Node): Result<boolean> {
  const t = trimBlanks(n.text);
  const b = parseBoolText(t);
  return b !== undefined
    ? { ok: true, value: b }
    : fail(valueError(n, "not a valid boolean", t));
}

// ---- Keys in paths ----

/** Whether libfyaml writes key text t in a path as it is: empty, or a
 *  letter or "_" then letters, digits, "_" and "-" (fy-atom.c,
 *  fy_atom_text_analyze_internal, FYTTAF_CAN_BE_UNQUOTED_PATH_KEY). */
function unquotedPathKey(t: string): boolean {
  return /^(?:[A-Za-z_][A-Za-z0-9_-]*)?$/.test(t);
}

/** Whether libfyaml writes c as it is in a quoted path key (fy-ctype.h,
 *  fy_is_printq): printable, but not a tab, a no-break space, a line
 *  break, a BOM, or anything beyond U+FFFF. */
function printQ(c: number): boolean {
  return (
    (c >= 0x20 && c <= 0x7e) ||
    (c >= 0xa1 && c <= 0xd7ff && c !== 0x2028 && c !== 0x2029) ||
    (c >= 0xe000 && c <= 0xfffd && c !== 0xfeff)
  );
}

const escapes: Record<number, string> = {
  0x08: "b",
  0x0c: "f",
  0x0a: "n",
  0x0d: "r",
  0x09: "t",
  0x22: '"',
  0x5c: "\\",
  0x00: "0",
  0x07: "a",
  0x0b: "v",
  0x1b: "e",
  0x85: "N",
  0xa0: "_",
  0x2028: "L",
  0x2029: "P",
};

function hex(c: number, w: number): string {
  return c.toString(16).toUpperCase().padStart(w, "0");
}

/** Key text t in double quotes, escaped as libfyaml's
 *  fy_token_get_scalar_path_key escapes it. */
function quotedPathKey(t: string): string {
  let r = '"';
  for (const ch of t) {
    const c = ch.codePointAt(0)!;
    if (printQ(c) && c !== 0x22 && c !== 0x5c) {
      r += ch;
      continue;
    }
    const e = escapes[c];
    if (e !== undefined) r += "\\" + e;
    else if (c <= 0xff) r += "\\x" + hex(c, 2);
    else if (c <= 0xffff) r += "\\u" + hex(c, 4);
    else r += "\\U" + hex(c, 8);
  }
  return r + '"';
}

/** A key as a path writes it: a scalar's text as it is or quoted; any
 *  other key in flow style, on one line, as libfyaml emits it (only
 *  checked for "[k]"). */
function pathKey(k: Node): string {
  if (k.kind === "scalar")
    return unquotedPathKey(k.text) ? k.text : quotedPathKey(k.text);
  return flow(k);
}

function flow(n: Node): string {
  switch (n.kind) {
    case "alias":
      return "*" + n.text;
    case "scalar":
      return n.text;
    case "sequence":
      return "[" + n.items.map(flow).join(", ") + "]";
    case "mapping":
      return (
        "{" +
        n.pairs
          .map(
            (p) =>
              flow(p.key) + (p.value !== undefined ? ": " + flow(p.value) : ""),
          )
          .join(", ") +
        "}"
      );
  }
}

// ---- Documents ----

export class Document {
  readonly name: string;
  private rootNode?: Node;

  constructor(name: string) {
    this.name = name;
  }

  /** The root node, or undefined for an empty document. */
  root(): Node | undefined {
    return this.rootNode;
  }

  /** Resolves aliases and merge keys, as Fyaml's Resolve: each alias
   *  becomes a copy of its anchored node, and each "<<" merge key is
   *  replaced by the pairs it merges. Nodes taken from the document
   *  before are of the unresolved tree; get them again from root. An
   *  error is a ResolveError, at the alias or merge value. */
  resolve(): YamlError | undefined {
    if (this.rootNode === undefined) return undefined;
    const r = new Resolver(this);
    try {
      const root = r.node(this.rootNode);
      root.parent = undefined;
      root.parentKey = undefined;
      this.rootNode = root;
    } catch (e) {
      if (e instanceof ResolveFail) return e.err;
      throw e;
    }
    return undefined;
  }

  /** @internal */
  setRoot(n: Node | undefined): void {
    this.rootNode = n;
  }
}

class ResolveFail {
  readonly err: YamlError;
  constructor(err: YamlError) {
    this.err = err;
  }
}

/** Resolves a document as libfyaml's fy_resolve_anchor_node does, but
 *  into a new tree: aliases are expanded, recursively, into copies that
 *  keep their original's places (an error inside one is located at the
 *  anchored node, as libfyaml locates it), and merge keys are applied
 *  in libfyaml's order: each pair of each merged mapping, in order,
 *  unless the mapping already has its key, is put just after the "<<"
 *  pair, so before the pairs put there earlier. */
class Resolver {
  private readonly doc: Document;
  // The unresolved nodes being resolved: an alias to one of them is a
  // cycle.
  private readonly active = new Set<Node>();

  constructor(doc: Document) {
    this.doc = doc;
  }

  private error(m: Mark | undefined, text: string): never {
    throw new ResolveFail(placedError(ResolveError, this.doc.name, m, text));
  }

  node(n: Node): Node {
    if (n.kind === "alias") {
      const t = n.target;
      if (t === undefined) this.error(n.mark, "invalid alias");
      if (this.active.has(t)) this.error(n.mark, "cyclic reference detected");
      return this.node(t);
    }
    this.active.add(n);
    const c = new Node(
      this.doc,
      n.kind,
      n.text,
      n.style,
      n.tag,
      n.mark,
      n.start,
    );
    if (n.kind === "sequence") {
      for (const item of n.items) adopt(c, this.node(item));
    } else if (n.kind === "mapping") {
      this.mapping(n, c);
    }
    this.active.delete(n);
    return c;
  }

  /** The anchored mapping an alias in a merge key's value stands for,
   *  or undefined if it isn't one. */
  private mergeSource(n: Node | undefined): Node | undefined {
    if (n === undefined || n.kind !== "alias") return undefined;
    const t = n.target;
    return t !== undefined && t.kind === "mapping" ? t : undefined;
  }

  private mapping(n: Node, c: Node): void {
    n.pairs.forEach((p, i) => {
      if (!isMergeKey(p.key)) {
        const k = this.node(p.key);
        const v = p.value !== undefined ? this.node(p.value) : undefined;
        addPair(c, k, v);
        return;
      }
      // The value: an alias of a mapping, or a sequence of them.
      const v = p.value;
      let sources: Node[];
      const one = this.mergeSource(v);
      if (one !== undefined) sources = [one];
      else if (
        v !== undefined &&
        v.kind === "sequence" &&
        v.items.every((x) => this.mergeSource(x) !== undefined)
      )
        sources = v.items.map((x) => this.mergeSource(x)!);
      else this.error(v?.start, "invalid merge key value");
      // A key is already in the mapping if a pair before or after the
      // "<<" has it, or a pair merged before it.
      const keys = new Set<string>();
      for (const q of c.pairs) keys.add(keyText(q.key));
      n.pairs.forEach((q, j) => {
        if (j !== i && !isMergeKey(q.key)) keys.add(keyText(q.key));
      });
      let merged: Pair[] = [];
      for (const src of sources) {
        if (this.active.has(src))
          this.error(
            v!.kind === "alias" ? v!.mark : undefined,
            "cyclic reference detected",
          );
        const r = this.node(src);
        for (const q of r.pairs) {
          const k = keyText(q.key);
          if (keys.has(k)) continue;
          keys.add(k);
          merged = [q, ...merged];
        }
      }
      for (const q of merged) addPair(c, q.key, q.value);
    });
  }
}

function isMergeKey(k: Node): boolean {
  return k.kind === "scalar" && k.style === StylePlain && k.text === "<<";
}

/** A key's text for comparing keys: libfyaml compares them as nodes. */
function keyText(k: Node): string {
  return k.kind === "scalar" ? "s:" + k.text : k.kind + ":" + flow(k);
}

function adopt(parent: Node, child: Node): void {
  child.parent = parent;
  child.parentKey = undefined;
  parent.items.push(child);
}

function addPair(m: Node, k: Node, v: Node | undefined): void {
  k.parent = undefined;
  k.parentKey = undefined;
  if (v !== undefined) {
    v.parent = m;
    v.parentKey = k;
  }
  m.pairs.push(v !== undefined ? { key: k, value: v } : { key: k });
}

// ---- Reading ----

/** Places in the text: lines and columns, counting characters (code
 *  points), not the yaml library's UTF-16 units. */
class Places {
  private readonly text: string;
  private readonly lc: LineCounter;

  constructor(text: string, lc: LineCounter) {
    this.text = text;
    this.lc = lc;
  }

  at(offset: number): Mark {
    const starts = this.lc.lineStarts;
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid]! <= offset) lo = mid;
      else hi = mid - 1;
    }
    const lineStart = starts[lo] ?? 0;
    let column = 1;
    for (const _ of this.text.slice(lineStart, offset)) column++;
    return { line: lo + 1, column };
  }

  /** Where libfyaml places a scalar whose source starts at offset and
   *  ends at end. */
  scalar(n: YScalar, offset: number, end: number): Mark {
    switch (n.type) {
      case "QUOTE_DOUBLE":
      case "QUOTE_SINGLE":
        return this.at(offset + 1); // inside the quote
      case "BLOCK_LITERAL":
      case "BLOCK_FOLDED": {
        // The first line after the header ("|" and its indicators).
        const nl = this.text.indexOf("\n", offset);
        if (nl < 0) return this.at(this.text.length);
        return { line: this.at(nl).line + 1, column: 1 };
      }
    }
    if (offset === end) {
      // An empty value: libfyaml places it at the ":" (or "-") before.
      let i = offset - 1;
      while (i >= 0 && " \t\r\n".includes(this.text[i]!)) i--;
      if (i >= 0 && ":-?".includes(this.text[i]!)) return this.at(i);
    }
    return this.at(offset);
  }
}

function styleOf(n: YScalar): number {
  switch (n.type) {
    case "QUOTE_SINGLE":
      return StyleSingleQuoted;
    case "QUOTE_DOUBLE":
      return StyleDoubleQuoted;
    case "BLOCK_LITERAL":
      return StyleLiteral;
    case "BLOCK_FOLDED":
      return StyleFolded;
  }
  return StylePlain;
}

/** A tag as written: the yaml library expands "!!x" to
 *  "tag:yaml.org,2002:x". */
function tagOf(tag: string | undefined): string {
  if (tag === undefined) return "";
  const core = "tag:yaml.org,2002:";
  return tag.startsWith(core) ? "!!" + tag.slice(core.length) : tag;
}

/** Turns the yaml library's tree into Nodes, unresolved, in document
 *  order, so that an alias finds the anchor defined last before it. */
class Builder {
  private readonly doc: Document;
  private readonly places: Places;
  private readonly anchors = new Map<string, Node>();

  constructor(doc: Document, places: Places) {
    this.doc = doc;
    this.places = places;
  }

  // A missing node (an empty document, an empty item or key) is an
  // empty plain scalar at offset.
  private empty(offset: number): Node {
    const m = this.places.at(offset);
    return new Node(this.doc, "scalar", "", StylePlain, "", m, m);
  }

  build(y: unknown, offset: number): Node {
    if (y === null || y === undefined) return this.empty(offset);
    const yn = y as YNode;
    const r = yn.range;
    const start = r ? r[0] : offset;
    if (isAlias(y)) {
      const m = this.places.at(start + 1);
      const n = new Node(this.doc, "alias", y.source, StyleAlias, "", m, m);
      const t = this.anchors.get(y.source);
      if (t !== undefined) n.target = t;
      return n;
    }
    let n: Node;
    if (isScalar(y)) {
      const m = this.places.scalar(y, start, r ? r[1] : start);
      n = new Node(
        this.doc,
        "scalar",
        String(y.value),
        styleOf(y),
        tagOf(y.tag),
        m,
        m,
      );
    } else if (isSeq(y) || isMap(y)) {
      const kind = isSeq(y) ? "sequence" : "mapping";
      const style = y.flow ? StyleFlow : StyleBlock;
      n = new Node(
        this.doc,
        kind,
        "",
        style,
        tagOf(y.tag),
        undefined,
        this.places.at(start),
      );
    } else {
      throw new Error("fyaml: unexpected node from the yaml library");
    }
    const anchor = (yn as { anchor?: string }).anchor;
    if (anchor !== undefined) this.anchors.set(anchor, n);
    if (isSeq(y)) {
      for (const item of y.items) adopt(n, this.build(item, start));
    } else if (isMap(y)) {
      for (const p of y.items) {
        const k = this.build(p.key, start);
        const v = p.value === null ? undefined : this.build(p.value, start);
        addPair(n, k, v);
      }
    }
    return n;
  }
}

/** The yaml library's messages for errors whose wording libfyaml's
 *  differs from, at the same place (PLAN.md, Findings, 2026-11-15). */
function parseMessage(code: string, message: string): string {
  switch (code) {
    case "DUPLICATE_KEY":
      return "duplicate key";
    case "TAB_AS_INDENT":
      return "tab character may not be used as indentation";
  }
  return message;
}

/** A stream's documents, unresolved, and the parse error that ended it,
 *  if one did: a document with an error ends the stream, as a
 *  FyamlStreams stream ends at libfyaml's first error. name is the
 *  file's, for messages. */
export function parseStream(
  text: string,
  name: string,
): { docs: Document[]; err?: YamlError } {
  // libfyaml skips a byte order mark at the start; the yaml library
  // fails on it.
  if (text.startsWith("﻿")) text = text.slice(1);
  const lc = new LineCounter();
  const ydocs = parseAllDocuments(text, {
    schema: "failsafe", // every scalar its text, for the typed accessors
    lineCounter: lc,
    prettyErrors: false,
    merge: false, // "<<" is resolved here, as libfyaml does
  });
  const places = new Places(text, lc);
  const docs: Document[] = [];
  const parseError = (e: {
    code: string;
    message: string;
    pos: [number, number];
  }): YamlError =>
    placedError(
      ParseError,
      name,
      places.at(e.pos[0]),
      parseMessage(e.code, e.message),
    );
  if (!Array.isArray(ydocs)) {
    const e = (
      ydocs as {
        errors: { code: string; message: string; pos: [number, number] }[];
      }
    ).errors[0];
    return e !== undefined ? { docs, err: parseError(e) } : { docs };
  }
  for (const yd of ydocs as YDocument.Parsed[]) {
    const e = yd.errors[0];
    if (e !== undefined) return { docs, err: parseError(e) };
    const d = new Document(name);
    const c = yd.contents;
    if (c !== null) {
      const root = new Builder(d, places).build(c, yd.range[0]);
      d.setRoot(root);
    }
    docs.push(d);
  }
  return { docs };
}
