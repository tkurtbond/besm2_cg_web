// Writes a file's entities as YAML, for pobesm2_fmt2 and the other
// formatters. The port of besm2_cg_po's Besm2Save (its PLAN.md, Part B
// step 4).
//
// One document, a sequence of the entities, in order, each with its
// keys in the order of the fixtures (besm2_cg_po's PLAN.md, A4), then
// the keys this program doesn't know, as the file had them. The numbers
// written are the ones in effect: an override where there is one, which
// the item's `overrides:` then lists, so the formatters mark it. Every
// key the file had is written, even an empty string or list, so a file
// loaded and saved formats the same (character).
//
// Decided in besm2_cg_po (2026-11-06), and kept here:
// - An attribute's `choices` are written from its times: each choice
//   the file had, by the file's name, with the times of its option now
//   (dropped at 0); then each option taken that the file didn't name,
//   by the rulebook's label. A choice that isn't an option is kept.
// - An entity with no `stats` (a character) or `derived` gets them:
//   Body, Mind and Soul; ACV, DCV, HP, EP, SV and AR if it has Armour
//   (a mecha: HP, and AR). A loaded file always has its own.
//
// The structure is the `yaml` library's nodes, as the Oberon's is
// libfyaml's; the bytes are what besm2_cg_po's save writes, which is
// what libfyaml 0.8's emitter writes for the scalars polibfyaml's
// CreateStyledScalar makes. Each scalar's text is written here, by a
// port of both (PLAN.md, "The YAML a save writes"):
// - CreateStyledScalar (polibfyaml's Fyaml.Mod) picks the style: plain
//   if PlainSafe, a literal block if asked for and LiteralSafe, else
//   double-quoted (QuotedSource).
// - libfyaml's emitter (fy-emit.c, fy_emit_token_write_plain, _quoted,
//   _literal and _block_hints) writes it: a plain scalar folded at a
//   space once its line passes column 80; a double-quoted one written as
//   it is when it needs no escape, else re-escaped and folded the same
//   way; a literal block with its hints, each line at the indent.
//
// Different here: the page downloads the text, so there's no SaveAll or
// SaveCampaign to a path, and no NAME.tmp; saveAll and saveCampaign
// give the text or the Oberon's message.

import { Document, Pair, Scalar, YAMLMap, YAMLSeq } from "yaml";
import * as C from "./calc.ts";
import * as Ch from "./character.ts";
import * as R from "./rules.ts";
import { StyleDoubleQuoted, StyleFolded, StyleLiteral } from "./fyaml.ts";

// ---- Scalars, as CreateStyledScalar makes them ----

// The style asked for (CreateStyledScalar's StylePlain, StyleLiteral,
// StyleDoubleQuoted).
type Style = "plain" | "literal" | "double";

// NEL, LS, PS and the BOM: Fyaml.Mod's Special, which no plain scalar
// or literal block holds.
const isSpecial = (c: number): boolean =>
  c === 0x85 || c === 0x2028 || c === 0x2029 || c === 0xfeff;

const isDigit = (c: number | undefined): boolean =>
  c !== undefined && c >= 0x30 && c <= 0x39;

const isAlnum = (c: number): boolean =>
  isDigit(c) || (c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a);

// Fyaml.Mod's PlainSafe, on code points: every byte it tests against
// an ASCII character is one, and a non-ASCII character is tested whole
// by Special.
function plainSafe(cs: readonly number[]): boolean {
  const n = cs.length;
  if (n === 0) return false;
  const c0 = cs[0]!;
  if (!(
    isAlnum(c0) ||
    (c0 >= 0x80 && !isSpecial(c0)) ||
    ((c0 === 0x2d || c0 === 0x2b || c0 === 0x2e) && isDigit(cs[1]))
  ))
    return false;
  if (cs[n - 1] === 0x20 || cs[n - 1] === 0x3a) return false;
  for (let i = 0; i < n; i++) {
    const c = cs[i]!;
    if (
      c < 0x20 ||
      c === 0x7f ||
      c === 0x2c ||
      c === 0x5b ||
      c === 0x5d ||
      c === 0x7b ||
      c === 0x7d ||
      isSpecial(c) ||
      (c === 0x3a && cs[i + 1] === 0x20) ||
      (c === 0x23 && cs[i - 1] === 0x20)
    )
      return false;
  }
  const t = String.fromCodePoint(...cs);
  return !(t === "null" || t === "Null" || t === "NULL");
}

// Fyaml.Mod's LiteralSafe: some character other than a line feed, and
// no control character but line feed and tab.
function literalSafe(cs: readonly number[]): boolean {
  let content = false;
  for (const c of cs) {
    if ((c < 0x20 && c !== 0x0a && c !== 0x09) || c === 0x7f || isSpecial(c))
      return false;
    if (c !== 0x0a) content = true;
  }
  return content;
}

// Whether Fyaml.Mod's QuotedSource writes c with an escape. libfyaml
// writes a double-quoted scalar as its source when the source has no
// escape (fy_token_get_direct_output), else from its characters.
const quotedEscape = (c: number): boolean =>
  isSpecial(c) || c === 0x22 || c === 0x5c || c < 0x20 || c === 0x7f;

// ---- Scalars, as libfyaml's emitter writes them ----

// fy_emit_width: the emitter's default width, which besm2_cg_po keeps.
const Width = 80;
// fy_emit_indent: the emitter's default indent, written as a literal
// block's indentation indicator.
const Indent = 2;

const isWs = (c: number | undefined): boolean => c === 0x20 || c === 0x09;

// fy-ctype.h's fy_is_printq: what a double-quoted scalar written from
// its characters holds unescaped (besides " and \).
const isPrintq = (c: number): boolean =>
  (c >= 0x20 && c <= 0x7e) ||
  (c >= 0xa1 && c <= 0xd7ff && c !== 0x2028 && c !== 0x2029) ||
  (c >= 0xe000 && c <= 0xfffd && c !== 0xfeff);

const hex = (c: number, w: number): string =>
  c.toString(16).toUpperCase().padStart(w, "0");

// fy_emit_token_write_quoted's escapes, not in JSON mode.
const shortEscapes = new Map<number, string>([
  [0x08, "b"],
  [0x0c, "f"],
  [0x0a, "n"],
  [0x0d, "r"],
  [0x09, "t"],
  [0x22, '"'],
  [0x5c, "\\"],
  [0x00, "0"],
  [0x07, "a"],
  [0x0b, "v"],
  [0x1b, "e"],
  [0x85, "N"],
  [0xa0, "_"],
  [0x2028, "L"],
  [0x2029, "P"],
]);

function escape(c: number): string {
  const s = shortEscapes.get(c);
  if (s !== undefined) return "\\" + s;
  if (c <= 0xff) return "\\x" + hex(c, 2);
  if (c <= 0xffff) return "\\u" + hex(c, 4);
  return "\\U" + hex(c, 8);
}

// A scalar's place: the column it starts at, the indent of its
// continuation lines, and whether it is a simple key, which libfyaml
// never folds (DDNF_SIMPLE).
interface Place {
  column: number;
  indent: number;
  simple: boolean;
}

const spaces = (n: number): string => " ".repeat(n);

// fy_emit_token_write_plain. At a blank, once the line passes Width
// and the next character isn't a blank, the line ends and the blank is
// dropped; a run of blanks is never broken. Columns count characters.
function writePlain(cs: readonly number[], p: Place): string {
  let o = "";
  let column = p.column;
  let blanks = false;
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i]!;
    if (isWs(c)) {
      if (!p.simple && !blanks && column > Width && !isWs(cs[i + 1])) {
        o += "\n" + spaces(p.indent);
        column = p.indent;
      } else {
        o += String.fromCodePoint(c);
        column++;
      }
      blanks = true;
    } else {
      o += String.fromCodePoint(c);
      column++;
      blanks = false;
    }
  }
  return o;
}

// fy_emit_token_write_quoted for '"'. As writePlain, but only at a
// space, and a line ended before another blank ends in "\".
function writeDouble(cs: readonly number[], p: Place): string {
  if (!cs.some(quotedEscape)) return '"' + String.fromCodePoint(...cs) + '"';
  let o = '"';
  let column = p.column + 1;
  let blanks = false;
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i]!;
    if (c === 0x20) {
      if (!p.simple && !blanks && column > Width) {
        if (isWs(cs[i + 1])) o += "\\";
        o += "\n" + spaces(p.indent);
        column = p.indent;
      } else {
        o += " ";
        column++;
      }
      blanks = true;
    } else {
      const s =
        !isPrintq(c) || c === 0x22 || c === 0x5c
          ? escape(c)
          : String.fromCodePoint(c);
      o += s;
      column += s.length; // an escape is ASCII
      blanks = false;
    }
  }
  return o + '"';
}

// fy_emit_token_write_literal, with fy_emit_token_write_block_hints:
// "|", the indentation indicator when the first line with content
// starts with a blank (fy-parse.c's starts_with_ws; a leading empty
// line is read before it), then "-" for no final line feed, "+" for
// more than one. Each line at the indent, an empty one too.
function writeLiteral(cs: readonly number[], p: Place): string {
  let o = "|";
  const first = cs.find((c) => c !== 0x0a);
  if (isWs(first)) o += String(Indent);
  let k = 0;
  while (k < cs.length && cs[cs.length - 1 - k] === 0x0a) k++;
  if (k === 0) o += "-";
  else if (k > 1) o += "+";
  o += "\n";
  let breaks = true;
  let start = true;
  for (const c of cs) {
    if (breaks) {
      if (!start) o += "\n";
      o += spaces(p.indent);
      breaks = false;
      start = false;
    }
    if (c === 0x0a) breaks = true;
    else o += String.fromCodePoint(c);
  }
  return o;
}

// ---- Text nodes ----

// A Text is a scalar CreateStyledScalar makes; any other Scalar is
// CreateScalar's, a key, a number or a boolean, written as it is.
// column and indent are its place, set by place once the document is
// built; key: it is a mapping's key.
class Text extends Scalar<string> {
  asked: Style = "plain";
  column = 0;
  indent = 0;
  key = false;
}

// The style libfyaml writes cs, asked for as style, in:
// CreateStyledScalar's choice.
function written(cs: readonly number[], style: Style): Style {
  if (style === "plain" && plainSafe(cs)) return "plain";
  if (style === "literal" && literalSafe(cs)) return "literal";
  return "double";
}

// A text's code points, up to its first NUL: CreateStyledScalar holds
// its text up to its first 0X.
function codePoints(s: string): number[] {
  const i = s.indexOf("\0");
  return [...(i < 0 ? s : s.slice(0, i))].map((ch) => ch.codePointAt(0)!);
}

// t as libfyaml writes it at p.
function scalarText(t: Text, p: Place): string {
  const cs = codePoints(String(t.value));
  switch (written(cs, t.asked)) {
    case "plain":
      return writePlain(cs, p);
    case "literal":
      return writeLiteral(cs, p);
    case "double":
      return writeDouble(cs, p);
  }
}

// The string tag every Scalar is written with.
const strTag = {
  identify: (v: unknown) => typeof v === "string",
  default: true,
  tag: "tag:yaml.org,2002:str",
  resolve: (s: string) => s,
  stringify(item: Scalar): string {
    if (!(item instanceof Text)) return String(item.value);
    return scalarText(item, {
      column: item.column,
      indent: item.indent,
      simple: item.key,
    });
  },
};

// ---- Places ----

type Node = Scalar | YAMLMap | YAMLSeq;

const width = (s: string): number => [...s].length;

// The width of key k as written: a simple key is one line.
function keyWidth(k: Scalar): number {
  if (!(k instanceof Text)) return width(String(k.value));
  return width(scalarText(k, { column: 0, indent: 0, simple: true }));
}

// Sets the place of each Text in n, as libfyaml lays out a block
// document with indent 2: a Text at column, its continuation lines at
// indent; a mapping's keys at indent, a sequence's "- " at indent, each
// item 2 further in. A sequence that is a mapping's value is at its
// key's indent, not indented under it; a mapping, 2 further in.
function place(n: Node, column: number, indent: number): void {
  if (n instanceof Text) {
    n.column = column;
    n.indent = indent;
  } else if (n instanceof YAMLSeq) {
    for (const item of n.items as Node[]) place(item, indent + 2, indent + 2);
  } else if (n instanceof YAMLMap) {
    for (const p of n.items as Pair<Scalar, Node>[]) {
      const k = p.key;
      const v = p.value!;
      if (k instanceof Text) {
        if (k.type === Scalar.BLOCK_LITERAL) {
          // An explicit key, "? |", its lines at indent + 2, and its
          // value after ": " on the next line.
          k.indent = indent + 2;
          place(v, indent + 2, indent + 2);
          continue;
        }
        k.key = true;
      }
      if (v instanceof YAMLSeq) place(v, indent, indent);
      else if (v instanceof YAMLMap) place(v, indent + 2, indent + 2);
      else place(v, indent + keyWidth(k) + 2, indent + 2);
    }
  }
}

// ---- Nodes ----

// Every pair appended so far had a key its mapping didn't (AppendPair).
let ok = true;

function text(s: string, style: Style): Text {
  const t = new Text(s);
  t.asked = style;
  // A key of more than one line is an explicit key, "? |", as libfyaml
  // writes it.
  if (written(codePoints(s), style) === "literal")
    t.type = Scalar.BLOCK_LITERAL;
  return t;
}

// Besm2Save's Text: a literal block if r has a line feed, else plain.
function textNode(r: string): Text {
  return text(r, r.includes("\n") ? "literal" : "plain");
}

function plain(s: string): Text {
  return text(s, "plain");
}

// CreateScalar's: written as it is.
function scalar(s: string): Scalar {
  return new Scalar(s);
}

function int(i: number): Scalar {
  return scalar(String(i));
}

function bool(b: boolean): Scalar {
  return scalar(b ? "true" : "false");
}

// n in effect.
function num(n: C.Num): Scalar {
  return int(C.value(n));
}

// text as written if isText, else i.
function intOr(isText: boolean, t: string, i: number): Node {
  return isText ? textNode(t) : int(i);
}

function strings(l: readonly string[]): YAMLSeq {
  const seq = new YAMLSeq();
  for (const s of l) seq.items.push(textNode(s));
  return seq;
}

// AppendPair: k: v in m, unless m has k already, which fails the
// document.
function appendPair(m: YAMLMap, k: Scalar, v: Node): void {
  if (!ok) return;
  const key = String(k.value);
  if ((m.items as Pair<Scalar>[]).some((p) => String(p.key.value) === key)) {
    ok = false;
    return;
  }
  m.items.push(new Pair(k, v));
}

// A YAML value kept as it was.
function rawNode(r: Ch.Raw): Node {
  switch (r.kind) {
    case Ch.RawScalar:
      if (r.style === StyleDoubleQuoted) return text(r.text, "double");
      if (r.style === StyleLiteral || r.style === StyleFolded)
        return text(r.text, "literal");
      return text(r.text, "plain");
    case Ch.RawSequence: {
      const n = new YAMLSeq();
      for (const x of r.items) n.items.push(rawNode(x));
      return n;
    }
    default: {
      const n = new YAMLMap();
      for (const x of r.items) appendPair(n, textNode(x.key!), rawNode(x));
      return n;
    }
  }
}

// ---- Mappings ----

function pair(m: YAMLMap, key: string, v: Node): void {
  appendPair(m, scalar(key), v);
}

function textPair(m: YAMLMap, key: string, r: string | undefined): void {
  if (r !== undefined) pair(m, key, textNode(r));
}

// The keys the file had that this program doesn't know.
function extras(m: YAMLMap, x: readonly Ch.Raw[]): void {
  for (const r of x) appendPair(m, textNode(r.key!), rawNode(r));
}

// "overrides: [first]", "[second]", or both, of those overridden.
function overrides(
  m: YAMLMap,
  first: string,
  a: boolean,
  second: string,
  b: boolean,
): void {
  if (a || b) {
    const seq = new YAMLSeq();
    if (a) seq.items.push(scalar(first));
    if (b) seq.items.push(scalar(second));
    pair(m, "overrides", seq);
  }
}

// name, packed with its subject as the file had it, and `subject`
// otherwise if it has one.
function name(
  m: YAMLMap,
  n: string,
  subject: string | undefined,
  packed: boolean,
): void {
  if (packed) pair(m, "name", textNode(`${n}: ${subject ?? ""}`));
  else {
    pair(m, "name", textNode(n));
    textPair(m, "subject", subject);
  }
}

// ---- Items ----

function statNode(e: Ch.Entity, s: Ch.Stat): YAMLMap {
  const m = new YAMLMap();
  pair(m, "name", textNode(s.name));
  let over: boolean;
  if (s.index >= 0) {
    pair(m, "value", intOr(s.valueIsText, s.valueText, e.stat[s.index]!));
    pair(m, "points", num(e.statPoints[s.index]!));
    over = e.statPoints[s.index]!.overridden;
  } else {
    pair(m, "value", textNode(s.valueText));
    pair(m, "points", num(s.points));
    over = s.points.overridden;
  }
  overrides(m, "points", over, "", false);
  extras(m, s.extra);
  return m;
}

function slotNumber(e: Ch.Entity, slot: number): C.Num {
  switch (slot) {
    case Ch.ACV:
      return e.acv;
    case Ch.DCV:
      return e.dcv;
    case Ch.HP:
      return e.hp;
    case Ch.EP:
      return e.ep;
    case Ch.SV:
      return e.sv;
    case Ch.AR:
      return e.ar;
  }
  throw new Error(`save: no derived value in slot ${slot}`);
}

function derivedNode(e: Ch.Entity, x: Ch.DerivedValue): YAMLMap {
  const m = new YAMLMap();
  pair(m, "name", textNode(x.name));
  let over = false;
  if (x.valueIsText) pair(m, "value", textNode(x.valueText));
  else {
    const n = slotNumber(e, x.slot);
    pair(m, "value", num(n));
    over = n.overridden;
  }
  if (x.alternatives !== undefined)
    pair(m, "alternatives", strings(x.alternatives));
  overrides(m, "value", over, "", false);
  extras(m, x.extra);
  return m;
}

// A choice or a Weapon Ability or Disability: a plain name, or a
// mapping when it has a count or a detail to say. A choice's count
// (its times) is said from 2; a Weapon Ability's or Disability's
// counts-as whenever it is given (0: left out), since 1 can be less
// than its slots taken once ({name: Melee, counts-as: 1}).
function itemNode(
  n: string,
  countsAs: number,
  from: number,
  detail: string | undefined,
): Node {
  if (countsAs < from && detail === undefined) return textNode(n);
  const m = new YAMLMap();
  pair(m, "name", textNode(n));
  if (countsAs >= from) pair(m, "counts-as", int(countsAs));
  textPair(m, "detail", detail);
  return m;
}

function mods(
  m: YAMLMap,
  key: string,
  has: boolean,
  first: C.Mod | undefined,
): void {
  if (has || first !== undefined) {
    const seq = new YAMLSeq();
    for (let x = first; x !== undefined; x = x.next) {
      const md = x as Ch.Mod;
      seq.items.push(itemNode(md.name, md.countsAs, 1, md.detail));
    }
    pair(m, key, seq);
  }
}

// See "Decided" above.
function choices(m: YAMLMap, a: Ch.Attr): void {
  const seq = new YAMLSeq();
  const written = new Set<number>();
  for (const c of a.choices ?? []) {
    if (c.option < 0) seq.items.push(itemNode(c.name, c.times, 2, undefined));
    else if (!written.has(c.option) && a.times[c.option]! > 0) {
      written.add(c.option);
      seq.items.push(itemNode(c.name, a.times[c.option]!, 2, undefined));
    }
  }
  if (a.item !== undefined)
    a.item.option.forEach((o, i) => {
      if (!written.has(i) && a.times[i]! > 0)
        seq.items.push(itemNode(o.label, a.times[i]!, 2, undefined));
    });
  if (a.choices !== undefined || seq.items.length > 0) pair(m, "choices", seq);
}

function attrNode(x: C.Attr): YAMLMap {
  const a = x as Ch.Attr;
  const m = new YAMLMap();
  name(m, a.name, a.subject, a.packed);
  pair(m, "level", intOr(a.levelIsText, a.levelText, a.level));
  pair(m, "points", num(a.points));
  textPair(m, "effective", a.effective);
  textPair(m, "details", a.details);
  if (a.elements !== undefined) pair(m, "elements", strings(a.elements));
  choices(m, a);
  if (a.enhancements !== undefined)
    pair(m, "enhancements", rawNode(a.enhancements));
  if (a.limiters !== undefined) pair(m, "limiters", rawNode(a.limiters));
  mods(m, "abilities", a.hasAbilities, a.abilities);
  mods(m, "disabilities", a.hasDisabilities, a.disabilities);
  if (a.hasDamage) pair(m, "damage", num(a.damage));
  if (a.primary) pair(m, "primary", bool(true));
  if (a.differentGunner) pair(m, "different-gunner", bool(true));
  overrides(
    m,
    "points",
    a.points.overridden,
    "damage",
    a.hasDamage && a.damage.overridden,
  );
  extras(m, a.extra);
  return m;
}

function defectNode(x: C.Defect): YAMLMap {
  const d = x as Ch.Defect;
  const m = new YAMLMap();
  name(m, d.name, d.subject, d.packed);
  if (d.hasLevel) pair(m, "level", int(d.rank));
  pair(m, "points", num(d.points));
  textPair(m, "details", d.details);
  overrides(m, "points", d.points.overridden, "", false);
  extras(m, d.extra);
  return m;
}

function skillNode(x: C.Skill): YAMLMap {
  const s = x as Ch.Skill;
  const m = new YAMLMap();
  pair(m, "name", textNode(s.name));
  pair(m, "level", intOr(s.levelIsText, s.levelText, s.level));
  pair(m, "points", num(s.points));
  if (s.specialisations !== undefined)
    pair(m, "specialisations", strings(s.specialisations));
  overrides(m, "points", s.points.overridden, "", false);
  extras(m, s.extra);
  return m;
}

// ---- Entities ----

function newStat(e: Ch.Entity, n: string, i: number): YAMLMap {
  const m = new YAMLMap();
  pair(m, "name", plain(n));
  pair(m, "value", int(e.stat[i]!));
  pair(m, "points", num(e.statPoints[i]!));
  overrides(m, "points", e.statPoints[i]!.overridden, "", false);
  return m;
}

function newDerived(n: string, x: C.Num): YAMLMap {
  const m = new YAMLMap();
  pair(m, "name", plain(n));
  pair(m, "value", num(x));
  overrides(m, "value", x.overridden, "", false);
  return m;
}

function stats(m: YAMLMap, e: Ch.Entity): void {
  if (e.fromFile || e.stats !== undefined) {
    if (e.stats === undefined) return;
    const seq = new YAMLSeq();
    for (const s of e.stats) seq.items.push(statNode(e, s));
    pair(m, "stats", seq);
  } else if (!e.isMecha) {
    const seq = new YAMLSeq();
    seq.items.push(newStat(e, "Body", C.Body));
    seq.items.push(newStat(e, "Mind", C.Mind));
    seq.items.push(newStat(e, "Soul", C.Soul));
    pair(m, "stats", seq);
  }
}

function derived(m: YAMLMap, e: Ch.Entity): void {
  if (e.fromFile && e.derived === undefined) return;
  const seq = new YAMLSeq();
  if (e.fromFile || e.derived !== undefined) {
    for (const x of e.derived ?? []) seq.items.push(derivedNode(e, x));
  } else {
    if (!e.isMecha) {
      seq.items.push(newDerived("ACV", e.acv));
      seq.items.push(newDerived("DCV", e.dcv));
    }
    seq.items.push(newDerived("HP", e.hp));
    if (!e.isMecha) {
      seq.items.push(newDerived("EP", e.ep));
      seq.items.push(newDerived("SV", e.sv));
    }
    if (e.hasAR || e.ar.overridden) seq.items.push(newDerived("AR", e.ar));
  }
  pair(m, "derived", seq);
}

function houseSkillNode(x: C.HouseSkill): YAMLMap {
  const h = x as Ch.HouseSkill;
  const m = new YAMLMap();
  pair(m, "name", textNode(h.name));
  const costs = new YAMLMap();
  for (let g = 0; g < R.NGenres; g++)
    if (h.cost[g]! > 0)
      appendPair(costs, plain(R.genreName(g)), int(h.cost[g]!));
  pair(m, "costs", costs);
  textPair(m, "stat", h.stat);
  if (h.specializations !== undefined)
    pair(m, "specializations", strings(h.specializations));
  return m;
}

// e's `creation` in m, if it has one, or always.
function creation(m: YAMLMap, e: Ch.Entity, always: boolean): void {
  const k = e.creationKeys;
  const c = e.creation;
  if (!always && !e.hasCreation && k.size === 0) return;
  const n = new YAMLMap();
  if (k.has(Ch.CharacterPointsKey))
    pair(n, "character-points", int(c.characterPoints));
  if (k.has(Ch.BackgroundPointsKey))
    pair(n, "background-points", int(c.backgroundPoints));
  if (k.has(Ch.GenreKey) && c.genre !== C.NoGenre)
    pair(n, "genre", plain(R.genreName(c.genre)));
  if (k.has(Ch.SkillPointsKey) && c.skillPoints !== C.Unset)
    pair(n, "skill-points", int(c.skillPoints));
  if (
    [
      Ch.OptionsKey,
      Ch.StagedStatCostKey,
      Ch.StatCeilingKey,
      Ch.BonusCeilingKey,
      Ch.AutoFireSlotsKey,
      Ch.StatPointsCeilingKey,
      Ch.StatPointsFloorKey,
    ].some((x) => k.has(x))
  ) {
    const o = new YAMLMap();
    if (k.has(Ch.StagedStatCostKey))
      pair(o, "staged-stat-cost", bool(c.stagedStatCost));
    if (k.has(Ch.StatCeilingKey)) pair(o, "stat-ceiling", int(c.statCeiling));
    if (k.has(Ch.BonusCeilingKey))
      pair(o, "bonus-point-ceiling", int(c.bonusCeiling));
    if (k.has(Ch.AutoFireSlotsKey))
      pair(o, "auto-fire-slots", int(c.autoFireSlots));
    if (k.has(Ch.StatPointsCeilingKey))
      pair(o, "stat-points-ceiling", int(c.statPointsCeiling));
    if (k.has(Ch.StatPointsFloorKey))
      pair(o, "stat-points-floor", int(c.statPointsFloor));
    pair(n, "options", o);
  }
  if (k.has(Ch.HouseSkillsKey) || c.houseSkills !== undefined) {
    const seq = new YAMLSeq();
    for (let h = c.houseSkills; h !== undefined; h = h.next)
      seq.items.push(houseSkillNode(h));
    pair(n, "house-skills", seq);
  }
  pair(m, "creation", n);
}

function entityNode(e: Ch.Entity): YAMLMap {
  const m = new YAMLMap();
  textPair(m, "name", e.name);
  textPair(m, "tagline", e.tagline);
  textPair(m, "description", e.description);
  textPair(m, "size", e.size);
  if (e.hasMechaKey || e.isMecha) pair(m, "mecha", bool(e.isMecha));
  creation(m, e, false);
  stats(m, e);
  derived(m, e);
  if (e.hasAttributes || e.attrs !== undefined) {
    const seq = new YAMLSeq();
    for (let a = e.attrs; a !== undefined; a = a.next)
      seq.items.push(attrNode(a));
    pair(m, "attributes", seq);
  }
  if (e.hasDefects || e.defects !== undefined) {
    const seq = new YAMLSeq();
    for (let d = e.defects; d !== undefined; d = d.next)
      seq.items.push(defectNode(d));
    pair(m, "defects", seq);
  }
  if (e.hasSkills || e.skills !== undefined) {
    const seq = new YAMLSeq();
    for (let s = e.skills; s !== undefined; s = s.next)
      seq.items.push(skillNode(s));
    pair(m, "skills", seq);
  }
  if (e.notes !== undefined) pair(m, "notes", strings(e.notes));
  extras(m, e.extra);
  return m;
}

// ---- Documents ----

// root as YAML text, as libfyaml's emitter writes it in block mode:
// every collection in block style but an empty one ([], {}), a sequence
// not indented under its key, no line too long to break.
function documentText(root: YAMLSeq | YAMLMap): string {
  place(root, 0, 0);
  const doc = new Document(null, {
    customTags: (tags) =>
      tags.map((t) =>
        typeof t === "object" && t.tag === strTag.tag
          ? (strTag as typeof t)
          : t,
      ),
  });
  doc.contents = root;
  return doc.toString({
    indent: 2,
    indentSeq: false,
    lineWidth: 0,
    flowCollectionPadding: false,
  });
}

/** The entities es, in order, as YAML text; undefined if building it
 *  failed (a duplicate key: a programmer's error, or two unknown keys
 *  the same once read). */
export function toText(
  es: readonly Ch.Entity[] | undefined,
): string | undefined {
  ok = true;
  const root = new YAMLSeq();
  for (const e of es ?? []) root.items.push(entityNode(e));
  if (!ok) return undefined;
  return documentText(root);
}

/** A copy of es[i], sharing nothing with it: es written as YAML and
 *  read back, so that it holds just what a save would, and is priced as
 *  es prices it (a mecha by its owner); undefined if that fails. */
export function copy(
  es: readonly Ch.Entity[],
  i: number,
): Ch.Entity | undefined {
  const t = toText(es);
  if (t === undefined) return undefined;
  const r = Ch.readText(t);
  if (r.es === undefined || r.es.length !== es.length) return undefined;
  return r.es[i];
}

export type Saved = { ok: true; text: string } | { ok: false; msg: string };

/** The entities es as the text of a file (SaveAll's), or why not. */
export function saveAll(es: readonly Ch.Entity[] | undefined): Saved {
  const t = toText(es);
  if (t === undefined)
    return {
      ok: false,
      msg: "the entities' YAML couldn't be built (a duplicate key)",
    };
  return { ok: true, text: t };
}

/** e's creation as the text of a campaign file (SaveCampaign's): a
 *  mapping of only `creation`, always written; or why not. */
export function saveCampaign(e: Ch.Entity): Saved {
  ok = true;
  const root = new YAMLMap();
  creation(root, e, true);
  if (!ok)
    return {
      ok: false,
      msg: "the campaign's YAML couldn't be built (a duplicate key)",
    };
  return { ok: true, text: documentText(root) };
}
