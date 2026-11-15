// A BESM entity, read once from its YAML: the port of besm2_cg_po's
// Besm2Entities (pobesm2_fmt2's, itself the Ada BESM2_Fmt.Entities).
//
// Each entity (character, template, item) is decoded from its YAML
// mapping once, by load, into plain records that the formatters read,
// with make-attribute-details and the sorting of attributes, defects
// and skills done here, once.
//
// load fails on the first error, with either a polibfyaml error (a
// missing key, a malformed number: fyaml's) or a message of its own,
// "PATH: TEXT", for YAML of the wrong shape: a list that isn't a
// sequence, an item that isn't a mapping. The Oberon's loaders return
// FALSE and leave the error in module variables; here they throw a
// Fail, which load catches.
//
// The Oberon's empty rope is NIL, so a field that may be absent has a
// flag beside it there (hasName and friends); here it is optional, and
// "" is a present, empty text (AGENTS.md). A text the Oberon gives as
// NIL for "none" (an attribute's details, a defect's) is undefined
// here, both when absent and when empty.
//
// The optional keys of besm2_cg_po's PLAN.md, A4, are read as the Ada
// version reads them: `subject` on an attribute or defect, after its
// name and ": "; a Weapon Attack's `abilities`, `disabilities`,
// `different-gunner` and `damage`, and an attribute's `choices`, in its
// details; and `overrides`, the keys whose numbers the user typed (the
// ...Mark fields). A defect's `level`, a Weapon Attack's `primary` and
// an entity's `creation` are for the generator, and are not read.

import { type Node, type YamlError } from "./fyaml.ts";
import { minusGlyph, overrideMark, timesGlyph } from "./layout.ts";
import { foldCI, sortByKey, sortCI, trim } from "./text.ts";

// The two kinds of customizer.
const Enhancement = 0;
const Limiter = 1;
type CustomizerKind = typeof Enhancement | typeof Limiter;

/** The base of the five kinds of item. */
export interface Named {
  name: string;
}

// A ...Mark field is true when the mapping's `overrides:` lists that
// number's key. Each mapping accepts only the keys of its computed
// numbers: points on a stat, attribute, defect or skill, damage on an
// attribute, value on a derived value; any other is bad input.

export interface Stat extends Named {
  value: string;
  points: number;
  pointsMark: boolean; // overrides: [points]
}

export interface Derived extends Named {
  value: string;
  alternatives: string[];
  valueMark: boolean; // overrides: [value]
}

/** name is with its `subject`, if any, after ": ". */
export interface Attribute extends Named {
  /** With " (effective)" already added when there is one. */
  level: string;
  points: number;
  /** make-attribute-details: a Weapon Attack's `abilities`,
   *  `disabilities`, `different-gunner` and `damage`, in the book's
   *  order (p. 92, PDF 94); the elements; the `choices`; the
   *  enhancements and limiters; the details text; undefined for none. */
  details?: string;
  /** details with overrideMark after the damage when it is overridden
   *  (overrides: [damage]); else the same as details. */
  markedDetails?: string;
  pointsMark: boolean; // overrides: [points]
}

export interface Defect extends Named {
  points: number;
  details?: string; // trimmed; undefined for none
  pointsMark: boolean; // overrides: [points]
}

export interface Skill extends Named {
  level: string;
  points: number;
  specialisations: string[];
  pointsMark: boolean; // overrides: [points]
}

export interface Entity {
  // undefined when the key isn't there; "" when it is, but empty, which
  // is still written (as an empty header line and underline, for a
  // name).
  name?: string;
  tagline?: string; // trimmed
  description?: string; // not trimmed
  size?: string;
  mecha: boolean;
  /** Stats and derived values in document order; attributes, defects
   *  and skills sorted by name, ignoring case, as every format of
   *  besm2-rst.scm sorts them. */
  stats: Stat[];
  derived: Derived[];
  attributes: Attribute[];
  defects: Defect[];
  skills: Skill[];
  /** The optional "notes" list, short lines about the entity that
   *  aren't priced (besm2_cg_po's PLAN.md, A4): trimmed, in document
   *  order, printed after the skills. */
  notes: string[];
  statsTotal: number;
  attributesTotal: number;
  defectsTotal: number;
  skillsTotal: number; // not part of entityTotal, as in besm2-rst.scm
  entityTotal: number;
}

/** load's result: the entity, or yerr, a polibfyaml error, or msg, a
 *  message of load's own (never empty). */
export type LoadResult =
  | { ok: true; entity: Entity }
  | { ok: false; yerr: YamlError; msg?: undefined }
  | { ok: false; yerr?: undefined; msg: string };

// ---- Errors ----

/** A failure of the load in progress: the Oberon's module variables
 *  yamlError and message. */
class Fail {
  readonly yerr?: YamlError;
  readonly msg?: string;
  constructor(yerr: YamlError | undefined, msg: string | undefined) {
    if (yerr !== undefined) this.yerr = yerr;
    if (msg !== undefined) this.msg = msg;
  }
}

/** Fails with message "PATH: text", PATH being n's place in the
 *  document, as in /0/attributes/2/enhancements/1. */
function fail(n: Node, text: string): never {
  throw new Fail(undefined, `${n.path()}: ${text}`);
}

/** The value of a polibfyaml Result, or a failure with its error. */
function got<T>(r: { ok: true; value: T } | { ok: false; err: YamlError }): T {
  if (!r.ok) throw new Fail(r.err, undefined);
  return r.value;
}

// ---- Fields ----

/** The text of the scalar for key, which must be there. */
function required(m: Node, key: string): string {
  return got(m.stringField(key));
}

/** The text of the scalar for key, if there is such a key: the Ada
 *  Has_Key then String_Value. A key whose value isn't a scalar is an
 *  error. */
function optional(m: Node, key: string): string | undefined {
  return m.hasKey(key) ? required(m, key) : undefined;
}

function integer(m: Node, key: string): number {
  return got(m.integerField(key));
}

/** The sequence for key, or undefined if there's no such key; anything
 *  else there is an error. */
function sequence(m: Node, key: string): Node | undefined {
  const s = m.value(key);
  if (s !== undefined && !s.isSequence()) fail(s, "not a sequence");
  return s;
}

/** The text of scalar n. */
function scalar(n: Node): string {
  if (!n.isScalar()) fail(n, "not a scalar");
  return n.scalar();
}

/** The scalars of sequence seq, in order, appended to l. */
function strings(seq: Node, l: string[]): void {
  for (const item of seq.items) l.push(scalar(item));
}

/** The strings for key, which is optional (none if absent). */
function stringList(m: Node, key: string): string[] {
  const l: string[] = [];
  const seq = sequence(m, key);
  if (seq !== undefined) strings(seq, l);
  return l;
}

// ---- The keys of besm2_cg_po's PLAN.md, A4, all optional ----

/** m's name, with its `subject`, trimmed, after ": " if it has one: the
 *  packed name ("Own a Big Mecha: FV2021 Coleopteran") a file without
 *  `subject` holds in `name`. */
function nameWithSubject(m: Node): string {
  const s = required(m, "name");
  const subject = optional(m, "subject");
  return subject !== undefined ? s + ": " + trim(subject) : s;
}

/** Whether m's `overrides:` lists key. The list must be a sequence of
 *  scalars, each one of allowed (key names separated by ", "): a
 *  misspelled name would otherwise silently drop a mark. */
function overridden(m: Node, key: string, allowed: string): boolean {
  let marked = false;
  const seq = sequence(m, "overrides");
  if (seq !== undefined) {
    const names = allowed.split(", ");
    for (const item of seq.items) {
      if (!item.isScalar()) fail(item, "an override is not a key name");
      const name = scalar(item);
      if (!names.includes(name))
        fail(item, `"${name}" is not one of ${allowed}`);
      if (name === key) marked = true;
    }
  }
  return marked;
}

/** An item of a Weapon Attack's `abilities` or `disabilities`, or of an
 *  attribute's `choices`: a name, or a mapping of `name`, `counts-as` (a
 *  positive count, default 1, written " ×N" when 2 or more) and, but for
 *  a choice, `detail` (written " [DETAIL]"). */
function item(n: Node, detailAllowed: boolean): string {
  if (n.isScalar()) return trim(scalar(n));
  if (!n.isMapping()) fail(n, "not a name or a mapping");
  let r = required(n, "name");
  const countsAs = got(n.integerFieldOr("counts-as", 1));
  r = trim(r);
  if (countsAs < 1) fail(n.value("counts-as")!, "counts-as must be positive");
  if (countsAs >= 2) r += " " + timesGlyph() + String(countsAs);
  if (detailAllowed) {
    const detail = optional(n, "detail");
    if (detail !== undefined) r += " [" + trim(detail) + "]";
  }
  return r;
}

/** The items of m's key, which is optional, appended to l. */
function itemList(
  m: Node,
  key: string,
  detailAllowed: boolean,
  l: string[],
): void {
  const seq = sequence(m, key);
  if (seq !== undefined)
    for (const n of seq.items) l.push(item(n, detailAllowed));
}

/** A Weapon Attack's structured keys, as the book records an attack
 *  (p. 92, PDF 94): its Abilities, its Disabilities, "Different Gunner",
 *  then "N Damage", joined with ", "; "" if it has none of them. marked
 *  is the same with overrideMark after N when damageMark. */
function weapon(
  m: Node,
  damageMark: boolean,
): { plain: string; marked: string } {
  const parts: string[] = [];
  itemList(m, "abilities", true, parts);
  itemList(m, "disabilities", true, parts);
  const gunner = got(m.booleanFieldOr("different-gunner", false));
  if (gunner) parts.push("Different Gunner");
  let plain = parts.join(", ");
  let marked = plain;
  if (m.hasKey("damage")) {
    const damage = integer(m, "damage");
    const d = String(damage) + " Damage";
    const md = String(damage) + (damageMark ? overrideMark() : "") + " Damage";
    if (plain !== "") {
      plain += ", ";
      marked += ", ";
    }
    plain += d;
    marked += md;
  }
  return { plain, marked };
}

// ---- Enhancements, limiters and attribute details ----

/** An enhancement counts as a minus in the details text and a limiter
 *  as a plus. The plus is always ASCII; -n/--no-unicode-minus changes
 *  only the minus. */
function sign(kind: CustomizerKind): string {
  return kind === Enhancement ? minusGlyph() : "+";
}

/** besm2-rst.scm's format-customizers, for one item of an enhancements
 *  or limiters list: either a plain name, "NAME −1" (an enhancement) or
 *  "NAME +1" (a limiter); or a sequence [NAME, COUNTS-AS,
 *  APPLIES-TO...], "NAME −N" with no APPLIES-TO, else "NAME: A, B −N". */
function customizer(n: Node, kind: CustomizerKind): string {
  if (n.isScalar()) return scalar(n) + " " + sign(kind) + "1";
  if (!n.isSequence()) fail(n, "do not understand customizer");
  const len = n.length();
  if (len < 2) fail(n, "customizer sequence too short");
  let r = scalar(n.item(0));
  // besm2_cg_po calls IntegerValue on item 1 whatever it is, and
  // polibfyaml halts on a collection ("assertion failed"); here it is an
  // input error, in Scalar's words (PLAN.md, Findings, 2026-11-15).
  const part = n.item(1);
  if (!part.isScalar()) fail(part, "not a scalar");
  const countsAs = got(part.integerValue());
  if (len > 2) {
    const appliesTo: string[] = [];
    for (let i = 2; i < len; i++) appliesTo.push(scalar(n.item(i)));
    r += ": " + appliesTo.join(", ");
  }
  // The sign comes from kind, so counts-as is a number of levels.
  // Checked after the applies-to items, in the Ada version's order.
  if (countsAs <= 0) fail(n.item(1), "counts-as must be positive");
  return r + " " + sign(kind) + String(countsAs);
}

/** The customizers of sequence seq (undefined for none) appended to l. */
function customizers(
  seq: Node | undefined,
  kind: CustomizerKind,
  l: string[],
): void {
  if (seq !== undefined) for (const n of seq.items) l.push(customizer(n, kind));
}

/** weapon, then "; " if there are both, then rest; undefined for
 *  neither. */
function withWeapon(weapon: string, rest: string): string | undefined {
  const s = weapon !== "" && rest !== "" ? weapon + "; " + rest : weapon + rest;
  return s !== "" ? s : undefined;
}

/** besm2-rst.scm's make-attribute-details, with the keys of
 *  besm2_cg_po's PLAN.md, A4: the weapon part (see weapon); the
 *  elements, sorted and joined with ", "; the choices, the same way;
 *  then the enhancements and limiters together, sorted and joined with
 *  ", "; then the details text; the non-empty ones of those joined with
 *  "; ". */
function attributeDetails(
  m: Node,
  w: { plain: string; marked: string },
  detailsText: string | undefined,
): { details?: string; markedDetails?: string } {
  const parts: string[] = [];
  const elements = stringList(m, "elements");
  if (elements.length > 0) {
    sortCI(elements);
    parts.push(elements.join(", "));
  }
  const choices: string[] = [];
  itemList(m, "choices", false, choices);
  if (choices.length > 0) {
    sortCI(choices);
    parts.push(choices.join(", "));
  }
  const enhancements = sequence(m, "enhancements");
  const limiters = sequence(m, "limiters");
  const custom: string[] = [];
  customizers(enhancements, Enhancement, custom);
  customizers(limiters, Limiter, custom);
  if (custom.length > 0) {
    sortCI(custom);
    parts.push(custom.join(", "));
  }
  if (detailsText !== undefined) parts.push(detailsText);
  const rest = parts.join("; ");
  const r: { details?: string; markedDetails?: string } = {};
  const s = withWeapon(w.plain, rest);
  const marked = withWeapon(w.marked, rest);
  if (s !== undefined) r.details = s;
  if (marked !== undefined) r.markedDetails = marked;
  return r;
}

// ---- Items ----

/** The "details" text, trimmed; undefined if absent or empty. */
function details(m: Node): string | undefined {
  const s = optional(m, "details");
  if (s === undefined) return undefined;
  const t = trim(s);
  return t !== "" ? t : undefined;
}

function loadStat(m: Node): Stat {
  return {
    name: required(m, "name"),
    value: required(m, "value"),
    points: integer(m, "points"),
    pointsMark: overridden(m, "points", "points"),
  };
}

function loadDerived(m: Node): Derived {
  return {
    name: required(m, "name"),
    value: required(m, "value"),
    alternatives: stringList(m, "alternatives"),
    valueMark: overridden(m, "value", "value"),
  };
}

/** level is required, for every attribute, mecha ones included:
 *  besm-tools commit 6139f21, ported to the Ada version too. */
function loadAttribute(m: Node): Attribute {
  const allowed = "points, damage";
  const name = nameWithSubject(m);
  const points = integer(m, "points");
  let level = required(m, "level");
  const detailsText = details(m);
  const effective = optional(m, "effective");
  const damageMark = overridden(m, "damage", allowed);
  const pointsMark = overridden(m, "points", allowed);
  const w = weapon(m, damageMark);
  // An empty effective adds nothing, like an absent one.
  if (effective !== undefined && effective !== "")
    level += " (" + effective + ")";
  return {
    name,
    level,
    points,
    ...attributeDetails(m, w, detailsText),
    pointsMark,
  };
}

function loadDefect(m: Node): Defect {
  const name = nameWithSubject(m);
  const points = integer(m, "points");
  const d = details(m);
  const pointsMark = overridden(m, "points", "points");
  return d !== undefined
    ? { name, points, details: d, pointsMark }
    : { name, points, pointsMark };
}

function loadSkill(m: Node): Skill {
  return {
    name: required(m, "name"),
    level: required(m, "level"),
    points: integer(m, "points"),
    specialisations: stringList(m, "specialisations"),
    pointsMark: overridden(m, "points", "points"),
  };
}

// ---- Entities ----

/** The items of the sequence for key (none if absent), each a mapping
 *  read by load. */
function loadList<T>(m: Node, key: string, load: (m: Node) => T): T[] {
  const l: T[] = [];
  const seq = sequence(m, key);
  if (seq !== undefined) {
    for (const n of seq.items) {
      if (!n.isMapping()) fail(n, "not a mapping");
      l.push(load(n));
    }
  }
  return l;
}

/** Sorts l by name, ignoring case (foldCI, as the Ada CI_Less): stable.
 *  Each name is folded once, into keys. */
export function sortByName(l: Named[]): void {
  sortByKey(
    l,
    l.map((x) => foldCI(x.name)),
  );
}

function sum(l: { points: number }[]): number {
  let t = 0;
  for (const x of l) t += x.points;
  return t;
}

/** Reads an entity from node m. The minus sign in attribute details
 *  depends on config.unicodeMinus. */
export function load(m: Node): LoadResult {
  try {
    if (!m.isMapping()) fail(m, "not a mapping");
    const name = optional(m, "name");
    const tagline = optional(m, "tagline");
    const description = optional(m, "description");
    const size = optional(m, "size");
    // booleanFieldOr, not hasKey: "mecha: false" must turn mecha off.
    // besm-tools commit 8da3e95 fixed besm2-rst.scm, which tested the
    // key's presence, and the Ada version followed.
    const mecha = got(m.booleanFieldOr("mecha", false));
    const stats = loadList(m, "stats", loadStat);
    const derived = loadList(m, "derived", loadDerived);
    const attributes = loadList(m, "attributes", loadAttribute);
    const defects = loadList(m, "defects", loadDefect);
    const skills = loadList(m, "skills", loadSkill);
    const notes = stringList(m, "notes").map(trim);
    sortByName(attributes);
    sortByName(defects);
    sortByName(skills);
    const e: Entity = {
      mecha,
      stats,
      derived,
      attributes,
      defects,
      skills,
      notes,
      statsTotal: sum(stats),
      attributesTotal: sum(attributes),
      defectsTotal: sum(defects),
      skillsTotal: sum(skills),
      entityTotal: 0,
    };
    e.entityTotal = e.statsTotal + e.attributesTotal + e.defectsTotal;
    if (name !== undefined) e.name = name;
    if (tagline !== undefined) e.tagline = trim(tagline);
    if (description !== undefined) e.description = description;
    if (size !== undefined) e.size = size;
    return { ok: true, entity: e };
  } catch (x) {
    if (!(x instanceof Fail)) throw x;
    if (x.yerr !== undefined) return { ok: false, yerr: x.yerr };
    return { ok: false, msg: x.msg! };
  }
}
