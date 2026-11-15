// A file's characters and mecha: calc's records, with their names and
// text. The port of besm2_cg_po's Besm2Character (its PLAN.md, Part B
// step 4).
//
// An Entity is a calc.Entity, its Attributes, Weapon Abilities and
// Disabilities, Defects, Skills and house Skills extended with what calc
// doesn't need: names, subjects, details, elements, the 4E enhancements
// and limiters, notes, and which optional keys the file had, so that a
// file loaded and saved (save) formats the same in pobesm2_fmt2.
//
// Each entity is read first by entities, pobesm2_fmt2's loader, so a
// file is accepted or refused, with the same messages, as pobesm2_fmt2
// does. entities packs what it reads into the text the formatters
// print, so the entity's mapping is then read again here, into the
// records. The keys entities doesn't read (a Defect's `level`, a Weapon
// Attack's `primary`, `creation`) are checked here, in its words.
//
// Then the numbers: a number its mapping's `overrides:` lists is an
// override. Every other number the file holds is compared with the one
// calc computes; one that differs is kept as an override too, with a
// notice. A value that isn't a number (`value: ""`) is kept as written,
// with a notice.
//
// Decided in besm2_cg_po (2026-11-06), and kept here:
// - A packed name (`name: "Weapon: Railgun"`, no `subject`) is split at
//   its first ": " when the whole isn't a rulebook name and the part
//   before is; it is saved packed again (packed).
// - A Defect without `level` has the rank its points give (points ÷ its
//   Bonus Points a rank, at least 1).
// - A Weapon Attack with none of `abilities`, `disabilities` and
//   `damage` is unstructured: its points are computed, but it has no
//   damage to compare or save.
// - Unknown keys and the `enhancements` and `limiters` are kept as
//   small trees (Raw) and saved as they were, after the known keys.
// - A string or list the file had, even empty, is kept and saved.
//
// Different here (PLAN.md, Phase 3.2):
// - The Oberon's linked lists of its own records (Stat, DerivedValue,
//   Choice, Raw, Notice, Result, a Besm2Text.List) are arrays; calc's
//   lists (attrs, defects, skills, mods, house Skills) stay linked.
// - A flag beside a rope (hasSubject, subject) is an optional string
//   (subject?: string), "" being present and empty; a list beside its
//   flag (hasElements, elements) an optional array. Where the Oberon
//   keeps a flag and a rope that save the same when the rope is NIL
//   (valueIsText, valueText), both are kept, the text "" for NIL.
// - The upgrade hook (SetUpgrade, SetFileDamage, AddNotice) is
//   Besm2Upgrade's, which isn't ported.
// - Files are text the page was given, with a name for messages, not
//   paths: readStream, loadAll, load and loadCampaign take both.

import * as C from "./calc.ts";
import * as R from "./rules.ts";
import * as Check from "./check.ts";
import * as Entities from "./entities.ts";
import {
  type Node,
  type YamlError,
  parseStream,
  stringName,
  StylePlain,
} from "./fyaml.ts";
import { trim } from "./text.ts";

// Notice.kind
export const Difference = Check.Difference;
export const Warning = Check.Warning;
export const Error = Check.Error;

// Raw.kind
export const RawScalar = 0;
export const RawSequence = 1;
export const RawMapping = 2;

// DerivedValue.slot: which of the entity's numbers it is.
export const NoSlot = -1;
export const ACV = 0;
export const DCV = 1;
export const HP = 2;
export const EP = 3;
export const SV = 4;
export const AR = 5;

// Entity.creationKeys: the keys of `creation` (and its `options`) to
// write: those the file had, and those the generator sets.
export const CharacterPointsKey = 0;
export const BackgroundPointsKey = 1;
export const GenreKey = 2;
export const SkillPointsKey = 3;
export const OptionsKey = 4;
export const StagedStatCostKey = 5;
export const StatCeilingKey = 6;
export const BonusCeilingKey = 7;
export const AutoFireSlotsKey = 8;
export const HouseSkillsKey = 9;
export const StatPointsCeilingKey = 10;
export const StatPointsFloorKey = 11;

const EntityKeys =
  "name, tagline, description, size, mecha, stats, derived, attributes, defects, skills, notes, creation";
const StatKeys = "name, value, points, overrides";
const DerivedKeys = "name, value, alternatives, overrides";
const AttrKeys =
  "name, subject, level, points, effective, details, elements, choices, enhancements, limiters, abilities, disabilities, damage, primary, different-gunner, overrides";
const DefectKeys = "name, subject, level, points, details, overrides";
const SkillKeys = "name, level, points, specialisations, overrides";
const CreationKeys =
  "character-points, background-points, genre, skill-points, options, house-skills";
const OptionKeys =
  "staged-stat-cost, stat-ceiling, bonus-point-ceiling, auto-fire-slots, stat-points-ceiling, stat-points-floor";
const HouseSkillKeys = "name, costs, stat, specializations";

// ---- Records ----

/** YAML kept as it was: an unknown key's value, or the enhancements and
 *  limiters. A scalar has text and its style (fyaml.StylePlain, ...); a
 *  collection its items, each a pair's value with its key in a mapping. */
export class Raw {
  key?: string; // in a mapping, or a list of extra keys: the key
  kind = RawScalar;
  style = StylePlain;
  text = "";
  items: Raw[] = [];
}

export class Stat {
  name = "";
  index = -1; // C.Body, C.Mind, C.Soul; -1: not a Stat's name
  // The value as written when it isn't an integer, or the name isn't a
  // Stat's, saved as it is; else the value is the entity's stat[index].
  valueIsText = false;
  valueText = "";
  // A Stat's points are the entity's statPoints[index]; these are those
  // of a name that isn't a Stat's.
  points = new C.Num();
  extra: Raw[] = [];
  fPoints = 0;
  listed = false;
}

export class DerivedValue {
  name = "";
  slot = NoSlot; // ACV .. AR, or NoSlot: a name it doesn't compute (DM)
  // The value as written: for NoSlot, or not an integer.
  valueIsText = false;
  valueText = "";
  alternatives?: string[];
  extra: Raw[] = [];
  fValue = 0;
  listed = false;
}

/** A Weapon Ability or Disability: name as written; countsAs 0: none
 *  written. */
export class Mod extends C.Mod {
  name = "";
  detail?: string;
}

/** An item of `choices`: name as written, its option of the attribute's
 *  item (-1: none of them), and how many times. */
export class Choice {
  name = "";
  option = -1;
  times = 1;
}

export class Attr extends C.Attr {
  name = "";
  subject?: string; // from `subject` or the packed name
  packed = false; // saved as one packed name, as the file had it
  levelIsText = false; // the level as written, when it isn't an integer
  levelText = "";
  effective?: string;
  details?: string;
  elements?: string[];
  choices?: Choice[]; // the file's names for the options of times
  // A Weapon Attack with `abilities`, `disabilities` or `damage`;
  // hasAbilities and hasDisabilities: the key, even empty.
  structured = false;
  hasAbilities = false;
  hasDisabilities = false;
  hasDamage = false; // damage is saved
  enhancements?: Raw; // the sequences
  limiters?: Raw;
  extra: Raw[] = [];
  fPoints = 0;
  fDamage = 0;
  listedPoints = false;
  listedDamage = false;
  damageInFile = false; // the file gave a damage, to compare
}

export class Defect extends C.Defect {
  name = "";
  subject?: string;
  packed = false;
  hasLevel = false; // the rank is saved as `level`
  details?: string;
  extra: Raw[] = [];
  fPoints = 0;
  listed = false;
}

export class Skill extends C.Skill {
  name = "";
  levelIsText = false;
  levelText = "";
  specialisations?: string[];
  extra: Raw[] = [];
  fPoints = 0;
  listed = false;
  // Its points kept as an override because the file had no genre to
  // price them by, or no house Skill of its name (adoptItems);
  // setGenre and setCreation clear the override once the creation
  // prices it as the file did.
  unpriced = false;
}

export class HouseSkill extends C.HouseSkill {
  name = "";
  stat?: string;
  specializations?: string[];
}

export class Entity extends C.Entity {
  // Read from a file: saved with only the keys it had. Else made here,
  // and saved with Stats and derived values (save).
  fromFile = false;
  name?: string;
  tagline?: string;
  description?: string;
  size?: string;
  hasMechaKey = false; // `mecha:` is written even when false
  stats?: Stat[];
  derived?: DerivedValue[];
  hasAttributes = false;
  hasDefects = false;
  hasSkills = false;
  notes?: string[];
  hasCreation = false;
  creationKeys = new Set<number>();
  extra: Raw[] = [];
  label = ""; // for notices: its name, or "entity N"
}

/** An entity's Skills as they were (saveSkills), for a dialog's Cancel:
 *  each one's points, house Skill and unpriced. */
export interface SkillMark {
  skill: Skill;
  points: C.Num;
  house: C.HouseSkill | undefined;
  unpriced: boolean;
}

/** Something to say about a file read. A Difference is a number of the
 *  file's the rules give differently, or a value that isn't a number;
 *  --check fails on it. A Warning is the rest: a name the rulebook
 *  doesn't have, a number it doesn't price, a mecha not in the file, an
 *  alias, a deprecated key, an empty string. An Error is a number
 *  outside -999..999 (check). */
export interface Notice {
  kind: Check.Kind;
  text: string; // "Hero: Body (p. 15, PDF 17): points is ..."
}

/** What reading a file gave, in its order: an entity, or a problem -- a
 *  polibfyaml error (yerr), or a message of entities' or this module's
 *  (msg, "/0/attributes/2: not a mapping", or "expected a top-level
 *  YAML sequence of entities in FILE") -- as pobesm2_fmt2 reports them. */
export interface Result {
  entity?: Entity;
  yerr?: YamlError;
  msg?: string;
}

// What the last read, load or loadAll found to say about the file: each
// number kept as an override, each value kept that isn't a number, each
// mecha not found. nDifferences: the Differences and Errors.
export let notices: Notice[] = [];
export let nDifferences = 0;

const ownABigMecha = R.find("Own a Big Mecha")!;

// ---- Copies: calc's Num and Creation are records in the Oberon ----

export function copyNum(n: C.Num): C.Num {
  const r = new C.Num();
  r.value = n.value;
  r.overridden = n.overridden;
  r.ovValue = n.ovValue;
  return r;
}

/** A copy of c, sharing its house Skills, as the Oberon's assignment of
 *  a Creation record. */
export function copyCreation(c: C.Creation): C.Creation {
  const r = new C.Creation();
  r.characterPoints = c.characterPoints;
  r.backgroundPoints = c.backgroundPoints;
  r.genre = c.genre;
  r.skillPoints = c.skillPoints;
  r.stagedStatCost = c.stagedStatCost;
  r.statCeiling = c.statCeiling;
  r.bonusCeiling = c.bonusCeiling;
  r.statPointsCeiling = c.statPointsCeiling;
  r.statPointsFloor = c.statPointsFloor;
  r.autoFireSlots = c.autoFireSlots;
  r.houseSkills = c.houseSkills;
  return r;
}

// ---- Errors, in entities' words ----

/** A failure of the read in progress: the Oberon's module variables
 *  yamlError and message. */
class Fail {
  readonly yerr?: YamlError;
  readonly msg?: string;
  constructor(yerr: YamlError | undefined, msg: string | undefined) {
    if (yerr !== undefined) this.yerr = yerr;
    if (msg !== undefined) this.msg = msg;
  }
}

/** Fails with message "PATH: text", PATH being n's place. */
function fail(n: Node, text: string): never {
  throw new Fail(undefined, `${n.path()}: ${text}`);
}

/** The value of a polibfyaml Result, or a failure with its error. */
function got<T>(r: { ok: true; value: T } | { ok: false; err: YamlError }): T {
  if (!r.ok) throw new Fail(r.err, undefined);
  return r.value;
}

// ---- Reading what entities has checked ----

/** A scalar's text. entities has checked that each node read so is a
 *  scalar; anything else gives "" rather than an exception. */
function scalarText(n: Node): string {
  return n.isScalar() ? n.scalar() : "";
}

/** The text of m's key, a scalar, or undefined if it isn't there. */
function field(m: Node, key: string): string | undefined {
  const v = m.value(key);
  return v === undefined ? undefined : scalarText(v);
}

function int(m: Node, key: string): number {
  const r = m.integerField(key);
  return r.ok ? r.value : 0;
}

/** The scalars of m's key, a sequence, or undefined if it isn't there. */
function strings(m: Node, key: string): string[] | undefined {
  const seq = m.value(key);
  if (seq === undefined) return undefined;
  return seq.items.map(scalarText);
}

/** Whether m's `overrides:` lists key. */
function listed(m: Node, key: string): boolean {
  const seq = m.value("overrides");
  return seq !== undefined && seq.items.some((item) => item.scalarIs(key));
}

/** An integer of 6 digits or fewer, with an optional "-", and blanks
 *  around it: what calc.parse takes; undefined for anything else. */
function intOf(r: string): number | undefined {
  const n = new C.Num();
  C.clear(n);
  return C.parse(r, n) && n.overridden ? n.ovValue : undefined;
}

// ---- Raw YAML ----

/** n as a Raw; a pair with no value ("? key") as an empty plain scalar. */
function readRaw(n: Node | undefined): Raw {
  const r = new Raw();
  if (n === undefined) return r;
  r.style = n.style;
  if (n.isScalar()) {
    r.kind = RawScalar;
    r.text = n.scalar();
  } else if (n.isSequence()) {
    r.kind = RawSequence;
    for (const item of n.items) r.items.push(readRaw(item));
  } else {
    r.kind = RawMapping;
    for (const p of n.pairs) {
      const x = readRaw(p.value);
      x.key = p.key.isScalar() ? p.key.scalar() : "?";
      r.items.push(x);
    }
  }
  return r;
}

/** The pairs of mapping m whose keys aren't in known (names separated by
 *  ", "), in order, each with its key. */
function extras(m: Node, known: string): Raw[] {
  const names = known.split(", ");
  const r: Raw[] = [];
  for (const p of m.pairs) {
    const k = p.key.isScalar() ? p.key.scalar() : "?";
    if (!names.includes(k)) {
      const x = readRaw(p.value);
      x.key = k;
      r.push(x);
    }
  }
  return r;
}

/** An error, in entities' words, for a key of mapping m not in known: a
 *  misspelt one would otherwise be dropped silently. */
function onlyKeys(m: Node, known: string): void {
  const x = extras(m, known)[0];
  if (x !== undefined) fail(m, `"${x.key}" is not one of ${known}`);
}

// ---- Names ----

/** The item named name, of kind first, else second (-1: none). */
function lookup(first: R.Kind, second: R.Kind | -1, name: string) {
  const s = trim(name);
  let it = R.findKind(first, s);
  if (it === undefined && second >= 0) it = R.findKind(second as R.Kind, s);
  return it;
}

interface Naming {
  it: R.Item | undefined;
  name: string;
  subject?: string;
  packed: boolean;
}

/** The item of m's name and subject: with `subject`, the name's; else
 *  the whole name's, or, failing that, the part before the first ": ",
 *  the rest being the subject (packed). */
function named(m: Node, first: R.Kind, second: R.Kind): Naming {
  const r: Naming = {
    it: undefined,
    name: field(m, "name") ?? "",
    packed: false,
  };
  const subject = field(m, "subject");
  if (subject !== undefined) r.subject = subject;
  r.it = lookup(first, second, r.name);
  if (r.it === undefined && subject === undefined) {
    const i = r.name.indexOf(": ");
    if (i >= 0) {
      const it = lookup(first, second, r.name.slice(0, i));
      if (it !== undefined) {
        r.it = it;
        r.subject = trim(r.name.slice(i + 2));
        r.name = r.name.slice(0, i);
        r.packed = true;
      }
    }
  }
  return r;
}

// ---- Items ----

function statIndex(name: string): number {
  const s = trim(name);
  if (R.sameName(s, "Body")) return C.Body;
  if (R.sameName(s, "Mind")) return C.Mind;
  if (R.sameName(s, "Soul")) return C.Soul;
  return -1;
}

function readStat(m: Node, e: Entity): Stat {
  const s = new Stat();
  s.name = field(m, "name") ?? "";
  const v = field(m, "value") ?? "";
  s.index = statIndex(s.name);
  const i = s.index >= 0 ? intOf(v) : undefined;
  if (i !== undefined) e.stat[s.index] = i;
  else {
    s.valueIsText = true;
    s.valueText = v;
  }
  C.clear(s.points);
  s.fPoints = int(m, "points");
  s.listed = listed(m, "points");
  s.extra = extras(m, StatKeys);
  return s;
}

function slot(name: string, isMecha: boolean): number {
  const s = trim(name);
  const is = (...names: string[]): boolean =>
    names.some((n) => R.sameName(s, n));
  let r = NoSlot;
  if (is("ACV", "Attack Combat Value")) r = ACV;
  else if (is("DCV", "Defence Combat Value", "Defense Combat Value")) r = DCV;
  else if (is("HP", "Health Points")) r = HP;
  else if (is("EP", "Energy Points")) r = EP;
  else if (is("SV", "Shock Value")) r = SV;
  else if (is("AR", "Armour Rating", "Armor Rating")) r = AR;
  // A mecha has no Combat Value or Energy Points of its own (p. 59,
  // PDF 61).
  if (isMecha && (r === ACV || r === DCV || r === EP)) r = NoSlot;
  return r;
}

function readDerived(m: Node, e: Entity): DerivedValue {
  const d = new DerivedValue();
  d.name = field(m, "name") ?? "";
  const v = field(m, "value") ?? "";
  d.slot = slot(d.name, e.isMecha);
  const i = d.slot === NoSlot ? undefined : intOf(v);
  if (i !== undefined) d.fValue = i;
  else {
    d.valueIsText = true;
    d.valueText = v;
  }
  const alternatives = strings(m, "alternatives");
  if (alternatives !== undefined) d.alternatives = alternatives;
  d.listed = listed(m, "value");
  d.extra = extras(m, DerivedKeys);
  return d;
}

/** An item of `abilities` or `disabilities`, of kind. */
function readMod(n: Node, kind: R.Kind): Mod {
  const x = new Mod();
  let countsAs = 0;
  if (n.isScalar()) x.name = n.scalar();
  else {
    x.name = field(n, "name") ?? "";
    if (n.hasKey("counts-as")) countsAs = int(n, "counts-as");
    const detail = field(n, "detail");
    if (detail !== undefined) x.detail = detail;
  }
  C.initMod(x, lookup(kind, -1, x.name), countsAs);
  return x;
}

/** The mods of m's key, of kind; undefined if there is no such key. */
function readMods(
  m: Node,
  key: string,
  kind: R.Kind,
): { has: boolean; list: C.Mod | undefined } {
  const seq = m.value(key);
  let list: C.Mod | undefined = undefined;
  if (seq !== undefined)
    for (const item of seq.items) list = C.addMod(list, readMod(item, kind));
  return { has: seq !== undefined, list };
}

/** `choices`, each an option of a's item, or kept by name if it isn't. */
function readChoices(m: Node, a: Attr): void {
  const seq = m.value("choices");
  delete a.choices;
  if (seq === undefined) return;
  a.choices = [];
  for (const item of seq.items) {
    const c = new Choice();
    if (item.isScalar()) c.name = item.scalar();
    else {
      c.name = field(item, "name") ?? "";
      if (item.hasKey("counts-as")) c.times = int(item, "counts-as");
    }
    c.option = -1;
    if (a.item !== undefined) {
      const s = trim(c.name);
      const i = a.item.option.findIndex((o) => R.sameName(o.label, s));
      if (i >= 0) {
        c.option = i;
        a.times[i]! += c.times;
      }
    }
    a.choices.push(c);
  }
}

function readAttr(m: Node, e: Entity): Attr {
  const a = new Attr();
  const [first, second] = e.isMecha
    ? [R.MechaAttribute, R.Attribute]
    : [R.Attribute, R.MechaAttribute];
  const nm = named(m, first as R.Kind, second as R.Kind);
  const levelText = field(m, "level") ?? "";
  const level = intOf(levelText);
  C.initAttr(a, nm.it, level ?? 0);
  a.name = nm.name;
  if (nm.subject !== undefined) a.subject = nm.subject;
  a.packed = nm.packed;
  a.levelIsText = level === undefined;
  a.levelText = a.levelIsText ? levelText : "";
  const effective = field(m, "effective");
  if (effective !== undefined) a.effective = effective;
  const details = field(m, "details");
  if (details !== undefined) a.details = details;
  const elements = strings(m, "elements");
  if (elements !== undefined) a.elements = elements;
  readChoices(m, a);
  if (m.hasKey("enhancements"))
    a.enhancements = readRaw(m.value("enhancements"));
  if (m.hasKey("limiters")) a.limiters = readRaw(m.value("limiters"));
  const ab = readMods(m, "abilities", R.Ability);
  a.hasAbilities = ab.has;
  a.abilities = ab.list;
  const dis = readMods(m, "disabilities", R.Disability);
  a.hasDisabilities = dis.has;
  a.disabilities = dis.list;
  a.hasDamage = m.hasKey("damage");
  a.structured = a.hasAbilities || a.hasDisabilities || a.hasDamage;
  if (a.weapon && a.structured) a.hasDamage = true;
  a.differentGunner = got(m.booleanFieldOr("different-gunner", false));
  a.primary = got(m.booleanFieldOr("primary", false));
  a.fPoints = int(m, "points");
  a.listedPoints = listed(m, "points");
  a.damageInFile = m.hasKey("damage");
  a.fDamage = a.damageInFile ? int(m, "damage") : 0;
  a.listedDamage = listed(m, "damage");
  a.extra = extras(m, AttrKeys);
  return a;
}

function readDefect(m: Node, e: Entity): Defect {
  const d = new Defect();
  const [first, second] = e.isMecha
    ? [R.MechaDefect, R.Defect]
    : [R.Defect, R.MechaDefect];
  const nm = named(m, first as R.Kind, second as R.Kind);
  d.fPoints = int(m, "points");
  d.listed = listed(m, "points");
  d.hasLevel = m.hasKey("level");
  let rank: number;
  if (d.hasLevel) rank = got(m.integerField("level"));
  else {
    // calc prices a Defect it doesn't have at 1 a rank.
    const it = nm.it;
    if (it === undefined) rank = -d.fPoints;
    else if (it.cost > 0) rank = Math.floor(-d.fPoints / it.cost);
    else rank = 1;
    if (rank < 1) rank = 1;
  }
  C.initDefect(d, nm.it, rank);
  d.name = nm.name;
  if (nm.subject !== undefined) d.subject = nm.subject;
  d.packed = nm.packed;
  const details = field(m, "details");
  if (details !== undefined) d.details = details;
  d.extra = extras(m, DefectKeys);
  return d;
}

/** The house Skill named name, ignoring case; undefined if none. */
function house(e: Entity, name: string): HouseSkill | undefined {
  const s = trim(name);
  for (let h = e.creation.houseSkills; h !== undefined; h = h.next) {
    const hs = h as HouseSkill;
    if (R.sameName(s, trim(hs.name))) return hs;
  }
  return undefined;
}

function readSkill(m: Node, e: Entity): Skill {
  const s = new Skill();
  const name = field(m, "name") ?? "";
  const levelText = field(m, "level") ?? "";
  const level = intOf(levelText);
  const specs = strings(m, "specialisations");
  const h = house(e, name);
  C.initSkill(s, lookup(R.Skill, -1, name), h, level ?? 0, specs?.length ?? 0);
  if (specs !== undefined) s.specialisations = specs;
  s.name = name;
  s.levelIsText = level === undefined;
  s.levelText = s.levelIsText ? levelText : "";
  s.fPoints = int(m, "points");
  s.listed = listed(m, "points");
  s.unpriced = false;
  s.extra = extras(m, SkillKeys);
  return s;
}

// ---- Creation: keys entities doesn't read ----

function mapping(n: Node): void {
  if (!n.isMapping()) fail(n, "not a mapping");
}

function genre(n: Node): number {
  if (!n.isScalar()) fail(n, "not a scalar");
  const s = n.scalar();
  const g = R.findGenre(s);
  if (g < 0) fail(n, `"${s}" is not a genre of Table 2-4`);
  return g;
}

function readHouseSkill(m: Node): HouseSkill {
  const h = new HouseSkill();
  C.initHouseSkill(h);
  mapping(m);
  onlyKeys(m, HouseSkillKeys);
  h.name = got(m.stringField("name"));
  const costs = got(m.required("costs"));
  mapping(costs);
  for (const p of costs.pairs) {
    const g = genre(p.key);
    // A key with no value ("? Cyberpunk") has no cost: the Oberon reads
    // a node libfyaml gives it; this one has none.
    if (p.value === undefined) fail(p.key, "not a scalar value");
    const cost = got(p.value.integerValue());
    if (cost < 1) fail(p.value, "a Skill's cost must be positive");
    h.cost[g] = cost;
  }
  if (m.hasKey("stat")) h.stat = got(m.stringField("stat"));
  if (m.hasKey("specializations")) {
    const v = m.value("specializations")!;
    if (!v.isSequence()) fail(v, "not a sequence");
    h.specializations = strings(m, "specializations")!;
  }
  return h;
}

function readOptions(m: Node, e: Entity): void {
  const c = e.creation;
  const keys = e.creationKeys;
  mapping(m);
  onlyKeys(m, OptionKeys);
  if (m.hasKey("staged-stat-cost")) {
    keys.add(StagedStatCostKey);
    c.stagedStatCost = got(m.booleanField("staged-stat-cost"));
  }
  if (m.hasKey("stat-ceiling")) {
    keys.add(StatCeilingKey);
    c.statCeiling = got(m.integerField("stat-ceiling"));
  }
  if (m.hasKey("bonus-point-ceiling")) {
    keys.add(BonusCeilingKey);
    c.bonusCeiling = got(m.integerField("bonus-point-ceiling"));
  }
  if (m.hasKey("auto-fire-slots")) {
    keys.add(AutoFireSlotsKey);
    c.autoFireSlots = got(m.integerField("auto-fire-slots"));
    if (c.autoFireSlots !== 1 && c.autoFireSlots !== 3)
      fail(m.value("auto-fire-slots")!, "auto-fire-slots must be 1 or 3");
  }
  if (m.hasKey("stat-points-ceiling")) {
    keys.add(StatPointsCeilingKey);
    c.statPointsCeiling = got(m.integerField("stat-points-ceiling"));
    if (c.statPointsCeiling < 1)
      fail(
        m.value("stat-points-ceiling")!,
        "stat-points-ceiling must be 1 or more",
      );
  }
  if (m.hasKey("stat-points-floor")) {
    keys.add(StatPointsFloorKey);
    c.statPointsFloor = got(m.integerField("stat-points-floor"));
    if (c.statPointsFloor < 1)
      fail(
        m.value("stat-points-floor")!,
        "stat-points-floor must be 1 or more",
      );
  }
}

function readCreation(m: Node, e: Entity): void {
  const c = e.creation;
  const keys = e.creationKeys;
  mapping(m);
  onlyKeys(m, CreationKeys);
  if (m.hasKey("character-points")) {
    keys.add(CharacterPointsKey);
    c.characterPoints = got(m.integerField("character-points"));
  }
  if (m.hasKey("background-points")) {
    keys.add(BackgroundPointsKey);
    c.backgroundPoints = got(m.integerField("background-points"));
  }
  if (m.hasKey("genre")) {
    keys.add(GenreKey);
    c.genre = genre(m.value("genre")!);
  }
  if (m.hasKey("skill-points")) {
    keys.add(SkillPointsKey);
    c.skillPoints = got(m.integerField("skill-points"));
    if (c.skillPoints < 0)
      fail(m.value("skill-points")!, "skill-points must not be negative");
  }
  if (m.hasKey("options")) {
    keys.add(OptionsKey);
    readOptions(m.value("options")!, e);
  }
  if (m.hasKey("house-skills")) {
    keys.add(HouseSkillsKey);
    const seq = m.value("house-skills")!;
    if (!seq.isSequence()) fail(seq, "not a sequence");
    for (const item of seq.items) C.addHouseSkill(c, readHouseSkill(item));
  }
}

// ---- Entities ----

/** Entity n of the file (1 for the first), from mapping m, which
 *  entities has accepted. Throws a Fail for a fault in a key it doesn't
 *  read. */
function readEntity(m: Node, n: number): Entity {
  const e = new Entity();
  const mecha = got(m.booleanFieldOr("mecha", false));
  C.initEntity(e, mecha);
  e.fromFile = true;
  e.hasMechaKey = m.hasKey("mecha");
  const name = field(m, "name");
  if (name !== undefined) e.name = name;
  const tagline = field(m, "tagline");
  if (tagline !== undefined) e.tagline = tagline;
  const description = field(m, "description");
  if (description !== undefined) e.description = description;
  const size = field(m, "size");
  if (size !== undefined) e.size = size;
  e.label =
    e.name !== undefined && trim(e.name) !== "" ? trim(e.name) : `entity ${n}`;
  e.creationKeys = new Set();
  e.hasCreation = m.hasKey("creation");
  if (e.hasCreation) readCreation(m.value("creation")!, e);
  const stats = m.value("stats");
  if (stats !== undefined) e.stats = stats.items.map((x) => readStat(x, e));
  const derived = m.value("derived");
  if (derived !== undefined)
    e.derived = derived.items.map((x) => readDerived(x, e));
  const attrs = m.value("attributes");
  e.hasAttributes = attrs !== undefined;
  if (attrs !== undefined)
    for (const item of attrs.items) C.addAttr(e, readAttr(item, e));
  const defects = m.value("defects");
  e.hasDefects = defects !== undefined;
  if (defects !== undefined)
    for (const item of defects.items) C.addDefect(e, readDefect(item, e));
  const skills = m.value("skills");
  e.hasSkills = skills !== undefined;
  if (skills !== undefined)
    for (const item of skills.items) C.addSkill(e, readSkill(item, e));
  const notes = strings(m, "notes");
  if (notes !== undefined) e.notes = notes;
  e.extra = extras(m, EntityKeys);
  return e;
}

// ---- Computing ----

/** Computes e: through its owner, for a mecha one gives. */
export function recompute(e: C.Entity): void {
  if (e.isMecha && e.owner !== undefined) C.compute(e.owner);
  else C.compute(e);
}

/** Computes the entities of a file: the characters, so each gives its
 *  mecha its owner, then each mecha no one owns. */
export function computeAll(es: readonly C.Entity[] | undefined): void {
  if (es === undefined) return;
  for (const e of es) if (e.isMecha) e.owner = undefined;
  for (const e of es) if (!e.isMecha) C.compute(e);
  for (const e of es) if (e.isMecha && e.owner === undefined) C.compute(e);
}

// ---- The generator's ----

/** A new character, with no file, no name and no creation: save writes
 *  its Stats and derived values. */
export function newCharacter(): Entity {
  const e = new Entity();
  C.initEntity(e, false);
  e.fromFile = false;
  e.label = "the character";
  C.compute(e);
  return e;
}

/** A new mecha, named name (undefined: none): save writes `mecha: true`,
 *  and its derived values. */
export function newMecha(name: string | undefined): Entity {
  const e = newCharacter();
  C.initEntity(e, true);
  e.hasMechaKey = true;
  if (name !== undefined) e.name = name;
  e.label = "the mecha";
  C.compute(e);
  return e;
}

/** The new entities: e alone. */
export function one(e: Entity): Entity[] {
  return [e];
}

const statNames = ["Body", "Mind", "Soul"];
const slotNames = ["ACV", "DCV", "HP", "EP", "SV", "AR"];

/** Stat i of e, which the user set: an entity from a file gets it in its
 *  `stats`, as a number, if it lacked it or had it as text; one made
 *  here gets them all anyway (save). */
export function useStat(e: Entity, i: number): void {
  if (!e.fromFile) return;
  e.stats ??= [];
  let s = e.stats.find((x) => x.index === i);
  if (s === undefined) {
    s = new Stat();
    s.index = i;
    s.name = statNames[i]!;
    C.clear(s.points);
    e.stats.push(s);
  }
  s.valueIsText = false;
  s.valueText = "";
}

/** The derived value of slot, which the user overrode: as useStat. */
export function useDerived(e: Entity, slot: number): void {
  if (!e.fromFile) return;
  e.derived ??= [];
  let d = e.derived.find((x) => x.slot === slot);
  if (d === undefined) {
    d = new DerivedValue();
    d.slot = slot;
    d.name = slotNames[slot]!;
    e.derived.push(d);
  }
  d.valueIsText = false;
  d.valueText = "";
}

function note(kind: Check.Kind, r: string): void {
  notices.push({ kind, text: r });
  if (kind !== Warning) nDifferences++;
}

function clearNotices(): void {
  notices = [];
  nDifferences = 0;
}

/** where, ": ", and name, and ": " and subject if it has one, and the
 *  pages if page > 0. */
function within(
  where: string,
  name: string,
  subject: string | undefined,
  page: number,
): string {
  let r = `${where}: `;
  r += trim(name) === "" ? '""' : trim(name);
  if (subject !== undefined) r += `: ${trim(subject)}`;
  if (page > 0) r += ` (${R.pagesText(page)})`;
  return r;
}

/** The printed page of it, for within: 0, none, for undefined. */
function pageOf(it: R.Item | undefined): number {
  return it === undefined ? 0 : it.page;
}

/** "LABEL: Name: subject (p. N, PDF N+2)", an item of e's for a notice. */
export function place(
  e: Entity,
  name: string,
  subject: string | undefined,
  it: R.Item | undefined,
): string {
  return within(e.label, name, subject, pageOf(it));
}

/** A derived value's page: SV's own, or Step 7's (p. 129, PDF 131). */
function derivedPage(slot: number): number {
  if (slot === SV) return R.ShockValuePage;
  if (slot === NoSlot) return 0;
  return R.DerivedValuesPage;
}

/** A Stat's page, if name is a Stat's. */
function statPage(s: Stat): number {
  return s.index < 0 ? 0 : R.StatsPage;
}

/** Ties each Own a Big Mecha to the mecha its subject names, of the
 *  entities es; a subject no mecha has is a notice (the mecha may be in
 *  another file), unless quiet. */
function link(es: readonly Entity[], quiet: boolean): void {
  for (const e of es) {
    for (let a = e.attrs; a !== undefined; a = a.next) {
      a.mecha = undefined;
      const x = a as Attr;
      if (a.item === ownABigMecha && x.subject !== undefined) {
        const subject = trim(x.subject);
        const m = es.find(
          (y) => y.isMecha && y.name !== undefined && trim(y.name) === subject,
        );
        if (m !== undefined) a.mecha = m;
        else if (!quiet)
          note(
            Warning,
            within(e.label, x.name, x.subject, pageOf(a.item)) +
              ": no mecha of that name in the file",
          );
      }
    }
  }
}

/** Ties each Own a Big Mecha of es to the mecha its subject names again,
 *  after the user changed one, or a mecha's name: quietly, as the page
 *  shows what isn't found in its warnings. */
export function relink(es: readonly Entity[] | undefined): void {
  if (es !== undefined) link(es, true);
}

// ---- Editing: the page's (besm2_cg_po's PLAN.md, Part B, step 7) ----

/** text, trimmed: blank (or undefined) is absent. */
function optional(text: string | undefined): string | undefined {
  const r = trim(text ?? "");
  return r === "" ? undefined : r;
}

function setOptional<T extends object, K extends keyof T>(
  x: T,
  key: K,
  text: string | undefined,
): void {
  const r = optional(text);
  if (r === undefined) delete x[key];
  else x[key] = r as T[K];
}

/** A name for a new item: it's, or "" for undefined. */
function itemName(it: R.Item | undefined): string {
  return it === undefined ? "" : it.name;
}

/** A new Attribute of it at level, about subject, with details (blank or
 *  undefined: none), with no options taken; not yet e's (insertAttr). A
 *  Weapon Attack is structured, so its damage is saved. */
export function newAttr(
  it: R.Item | undefined,
  level: number,
  subject: string | undefined,
  details: string | undefined,
): Attr {
  const a = new Attr();
  C.initAttr(a, it, level);
  a.name = itemName(it);
  setOptional(a, "subject", subject);
  setOptional(a, "details", details);
  a.structured = a.weapon;
  a.hasDamage = a.weapon;
  return a;
}

/** a, last of e's Attributes. */
export function insertAttr(e: Entity, a: Attr): void {
  a.next = undefined;
  C.addAttr(e, a);
  e.hasAttributes = true;
}

/** Puts b in a's place in a calc list starting at first: the new first. */
function replace<T extends { next: T | undefined }>(
  first: T | undefined,
  a: T,
  b: T,
): T | undefined {
  b.next = a.next;
  if (first === a) return b;
  let p = first!;
  while (p.next !== a) p = p.next!;
  p.next = b;
  return first;
}

/** Takes a out of a calc list starting at first: the new first. */
function remove<T extends { next: T | undefined }>(
  first: T | undefined,
  a: T,
): T | undefined {
  let r = first;
  if (first === a) r = a.next;
  else {
    let p = first;
    while (p !== undefined && p.next !== a) p = p.next;
    if (p !== undefined) p.next = a.next;
  }
  a.next = undefined;
  return r;
}

/** a, one of e's, made it at level, about subject, with details: the
 *  same record if it is a's item, so what else it has stays (a Weapon
 *  Attack's Abilities, its options, the keys the file had); else a new
 *  one in its place, keeping only the file's unknown keys. Gives the
 *  record now in the list. Its level is a number now. */
export function changeAttr(
  e: Entity,
  a: Attr,
  it: R.Item | undefined,
  level: number,
  subject: string | undefined,
  details: string | undefined,
): Attr {
  if (it === a.item) {
    a.level = level;
    a.levelIsText = false;
    a.levelText = "";
    setOptional(a, "subject", subject);
    a.packed = a.packed && a.subject !== undefined;
    setOptional(a, "details", details);
    return a;
  }
  const b = newAttr(it, level, subject, details);
  b.extra = a.extra;
  e.attrs = replace(e.attrs, a as C.Attr, b);
  return b;
}

export function removeAttr(e: Entity, a: Attr): void {
  e.attrs = remove(e.attrs, a as C.Attr);
}

// ---- A Weapon Attack's Abilities and Disabilities (step 8) ----

/** A new Weapon Ability or Disability of it, counting as slots, with
 *  detail (blank or undefined: none); not yet a's (insertMod).
 *  counts-as is left out when slots is what it counts as taken once, as
 *  e's campaign prices it. */
export function newMod(
  e: Entity,
  it: R.Item | undefined,
  slots: number,
  detail: string | undefined,
): Mod {
  const m = new Mod();
  C.initMod(m, it, slots === C.onceSlots(e, it) ? 0 : slots);
  m.name = itemName(it);
  setOptional(m, "detail", detail);
  return m;
}

/** m, last of a's Abilities (ability) or Disabilities; a is saved
 *  structured, with its damage. */
export function insertMod(a: Attr, ability: boolean, m: Mod): void {
  m.next = undefined;
  if (ability) {
    a.abilities = C.addMod(a.abilities, m);
    a.hasAbilities = true;
  } else {
    a.disabilities = C.addMod(a.disabilities, m);
    a.hasDisabilities = true;
  }
  a.structured = true;
  a.hasDamage = true;
}

/** m, one of e's, made it (undefined: as it is), counting as slots, with
 *  detail, in its place. */
export function changeMod(
  e: Entity,
  m: Mod,
  it: R.Item | undefined,
  slots: number,
  detail: string | undefined,
): void {
  if (it !== undefined && it !== m.item) {
    m.item = it;
    m.name = itemName(it);
  }
  m.countsAs = slots === C.onceSlots(e, m.item) ? 0 : slots;
  setOptional(m, "detail", detail);
}

export function removeMod(a: Attr, ability: boolean, m: Mod): void {
  if (ability) a.abilities = remove(a.abilities, m as C.Mod);
  else a.disabilities = remove(a.disabilities, m as C.Mod);
}

/** A copy of list, its own records, for putting back. */
export function copyMods(list: C.Mod | undefined): C.Mod | undefined {
  let first: C.Mod | undefined = undefined;
  for (let p = list; p !== undefined; p = p.next) {
    const m = Object.assign(new Mod(), p as Mod);
    m.next = undefined;
    first = C.addMod(first, m);
  }
  return first;
}

/** a, one of e's Weapon Attacks, marked primary (on) or not: marking it
 *  unmarks the others, as only one is primary (p. 82, PDF 84). */
export function setPrimary(e: Entity, a: Attr, on: boolean): void {
  if (on) for (let p = e.attrs; p !== undefined; p = p.next) p.primary = false;
  a.primary = on;
}

/** A new Defect of it at rank, about subject, with details; its rank is
 *  saved as `level`. */
export function newDefect(
  it: R.Item | undefined,
  rank: number,
  subject: string | undefined,
  details: string | undefined,
): Defect {
  const d = new Defect();
  C.initDefect(d, it, rank);
  d.name = itemName(it);
  setOptional(d, "subject", subject);
  d.hasLevel = true;
  setOptional(d, "details", details);
  return d;
}

export function insertDefect(e: Entity, d: Defect): void {
  d.next = undefined;
  C.addDefect(e, d);
  e.hasDefects = true;
}

/** As changeAttr. A Defect's rank is saved from now on. */
export function changeDefect(
  e: Entity,
  d: Defect,
  it: R.Item | undefined,
  rank: number,
  subject: string | undefined,
  details: string | undefined,
): Defect {
  if (it === d.item) {
    d.rank = rank;
    d.hasLevel = true;
    setOptional(d, "subject", subject);
    d.packed = d.packed && d.subject !== undefined;
    setOptional(d, "details", details);
    return d;
  }
  const b = newDefect(it, rank, subject, details);
  b.extra = d.extra;
  e.defects = replace(e.defects, d as C.Defect, b);
  return b;
}

export function removeDefect(e: Entity, d: Defect): void {
  e.defects = remove(e.defects, d as C.Defect);
}

/** The specialisations of a Skill set from specs, each trimmed, blanks
 *  dropped; the key is saved if it was, or if there are any. */
function setSpecs(s: Skill, specs: readonly string[]): void {
  const l = specs.map((x) => trim(x)).filter((x) => x !== "");
  s.specs = l.length;
  if (s.specialisations !== undefined || l.length > 0) s.specialisations = l;
}

/** A new Skill: the rulebook's it, or e's house Skill h (whose costs
 *  win, as the loader's), at level, with specs. */
export function newSkill(
  it: R.Item | undefined,
  h: C.HouseSkill | undefined,
  level: number,
  specs: readonly string[],
): Skill {
  const s = new Skill();
  if (h !== undefined) {
    const hs = h as HouseSkill;
    C.initSkill(s, lookup(R.Skill, -1, hs.name), h, level, 0);
    s.name = hs.name;
  } else {
    C.initSkill(s, it, undefined, level, 0);
    s.name = itemName(it);
  }
  setSpecs(s, specs);
  return s;
}

export function insertSkill(e: Entity, s: Skill): void {
  s.next = undefined;
  C.addSkill(e, s);
  e.hasSkills = true;
}

/** As changeAttr: the same record if it is the same Skill. */
export function changeSkill(
  e: Entity,
  s: Skill,
  it: R.Item | undefined,
  h: C.HouseSkill | undefined,
  level: number,
  specs: readonly string[],
): Skill {
  if (h === s.house && (h !== undefined || it === s.item)) {
    s.level = level;
    s.levelIsText = false;
    s.levelText = "";
    setSpecs(s, specs);
    return s;
  }
  const b = newSkill(it, h, level, specs);
  b.extra = s.extra;
  e.skills = replace(e.skills, s as C.Skill, b);
  return b;
}

export function removeSkill(e: Entity, s: Skill): void {
  e.skills = remove(e.skills, s as C.Skill);
}

/** The Skills whose points were kept for want of a genre (unpriced), now
 *  that e has one: an override the genre's price agrees with is cleared
 *  (besm2_cg_po's PLAN.md, Part B, step 10). One it doesn't agree with
 *  is kept, and may still be cleared by another genre. */
function reprice(e: Entity): void {
  if (e.isMecha || e.creation.genre === C.NoGenre) return;
  C.compute(e);
  for (let p = e.skills; p !== undefined; p = p.next) {
    const s = p as Skill;
    if (
      s.unpriced &&
      (!s.points.overridden || s.points.ovValue === s.points.value)
    ) {
      C.clear(s.points);
      s.unpriced = false;
    }
  }
}

/** e's genre set to g (C.NoGenre: none); it is saved in `creation`. */
export function setGenre(e: Entity, g: number): void {
  e.creation.genre = g;
  if (g !== C.NoGenre) {
    e.creationKeys.add(GenreKey);
    e.hasCreation = true;
  } else e.creationKeys.delete(GenreKey);
  reprice(e);
}

/** Each of e's Skills tied again, by name, to a house Skill of its
 *  creation (undefined: none), after the house Skills changed. */
function bindSkills(e: Entity): void {
  for (let s = e.skills; s !== undefined; s = s.next)
    s.house = house(e, (s as Skill).name);
}

/** e's creation set to (a copy of) c, written with the keys keys, and
 *  `creation` written at all if has (or keys has any); its Skills tied
 *  again to c's house Skills, and repriced if c has a genre. */
export function setCreation(
  e: Entity,
  c: C.Creation,
  keys: ReadonlySet<number>,
  has: boolean,
): void {
  e.creation = copyCreation(c);
  e.creationKeys = new Set(keys);
  e.hasCreation = has || keys.size > 0;
  bindSkills(e);
  reprice(e);
}

/** A copy of house Skills h, for another entity. */
function copyHouseSkills(
  h: C.HouseSkill | undefined,
): C.HouseSkill | undefined {
  let first: C.HouseSkill | undefined = undefined;
  let last: C.HouseSkill | undefined = undefined;
  for (; h !== undefined; h = h.next) {
    // The Oberon's n^ := h^ copies the cost array; Object.assign would
    // share it.
    const n = Object.assign(new HouseSkill(), h as HouseSkill);
    n.cost = [...h.cost];
    const specs = (h as HouseSkill).specializations;
    if (specs !== undefined) n.specializations = [...specs];
    n.next = undefined;
    if (last === undefined) first = n;
    else last.next = n;
    last = n;
  }
  return first;
}

/** to's creation made from's: the campaign's numbers, options and house
 *  Skills (copied), so a character starts in from's campaign. */
export function takeCreation(to: Entity, from: Entity): void {
  const c = copyCreation(from.creation);
  c.houseSkills = copyHouseSkills(from.creation.houseSkills);
  setCreation(to, c, from.creationKeys, from.hasCreation);
}

/** e's Skills as they are now, for restoreCreation. */
export function saveSkills(e: Entity): SkillMark[] {
  const m: SkillMark[] = [];
  for (let s = e.skills; s !== undefined; s = s.next)
    m.push({
      skill: s as Skill,
      points: copyNum(s.points),
      house: s.house,
      unpriced: (s as Skill).unpriced,
    });
  return m;
}

/** e's creation put back to (a copy of) c, keys and has, and its Skills
 *  as m saved them (saveSkills), with nothing priced again. */
export function restoreCreation(
  e: Entity,
  c: C.Creation,
  keys: ReadonlySet<number>,
  has: boolean,
  m: readonly SkillMark[],
): void {
  e.creation = copyCreation(c);
  e.creationKeys = new Set(keys);
  e.hasCreation = has;
  for (const x of m) {
    x.skill.points = copyNum(x.points);
    x.skill.house = x.house;
    x.skill.unpriced = x.unpriced;
  }
}

// ---- The file's numbers ----

/** The file's number for n: an override if listed, or if it differs from
 *  the computed number, with a notice. */
function adopt(
  n: C.Num,
  file: number,
  listed: boolean,
  where: string,
  what: string,
): void {
  if (listed) C.override(n, file);
  else if (file !== n.value) {
    C.override(n, file);
    note(
      Difference,
      `${where}: ${what} is ${file} in the file, ${n.value} by the rules: kept as an override`,
    );
  }
}

/** The file's number for n, which the rules don't give (why), kept as an
 *  override, with a notice unless listed or why is "". */
function keep(
  n: C.Num,
  file: number,
  listed: boolean,
  where: string,
  what: string,
  why: string,
): void {
  C.override(n, file);
  if (!listed && why !== "")
    note(Warning, `${where}: ${why}: ${what} ${file} kept as an override`);
}

/** A value or level kept as written, text, that isn't a number. */
function notANumber(where: string, what: string, text: string): void {
  note(
    Difference,
    `${where}: ${what} is "${text}" in the file, not a number: kept as written`,
  );
}

function slotNumber(e: Entity, slot: number): C.Num {
  switch (slot) {
    case ACV:
      return e.acv;
    case DCV:
      return e.dcv;
    case HP:
      return e.hp;
    case EP:
      return e.ep;
    case SV:
      return e.sv;
    case AR:
      return e.ar;
  }
  throw new globalThis.Error(`character: no slot ${slot}`);
}

/** The derived values computed from others (DCV from ACV, SV from HP)
 *  are adopted in a second pass (late), after those others, so that an
 *  overridden ACV doesn't make the file's DCV, which agrees with it,
 *  look wrong. */
function adoptDerived(e: Entity, late: boolean): void {
  for (const d of e.derived ?? []) {
    const isLate = d.slot === DCV || d.slot === SV;
    if (d.slot !== NoSlot && isLate === late && !d.valueIsText)
      adopt(
        slotNumber(e, d.slot),
        d.fValue,
        d.listed,
        within(e.label, d.name, undefined, derivedPage(d.slot)),
        "value",
      );
  }
}

/** Every number of e but the late derived values (adoptDerived), and a
 *  notice for each value kept that isn't a number. */
function adoptItems(e: Entity): void {
  for (const s of e.stats ?? []) {
    const where = within(e.label, s.name, undefined, statPage(s));
    if (s.valueIsText && s.index >= 0) notANumber(where, "value", s.valueText);
    if (s.index < 0)
      keep(
        s.points,
        s.fPoints,
        s.listed,
        where,
        "points",
        "not a Stat of the rulebook",
      );
    else if (e.isMecha)
      // A mecha's Stats aren't bought (p. 59, PDF 61).
      keep(
        e.statPoints[s.index]!,
        s.fPoints,
        s.listed,
        where,
        "points",
        "a mecha's Stat",
      );
    else adopt(e.statPoints[s.index]!, s.fPoints, s.listed, where, "points");
  }
  for (const d of e.derived ?? [])
    if (d.slot !== NoSlot && d.valueIsText)
      notANumber(
        within(e.label, d.name, undefined, derivedPage(d.slot)),
        "value",
        d.valueText,
      );
  adoptDerived(e, false);
  for (let p = e.attrs; p !== undefined; p = p.next) {
    const a = p as Attr;
    const where = within(e.label, a.name, a.subject, pageOf(a.item));
    if (a.levelIsText) notANumber(where, "level", a.levelText);
    if (a.item === undefined)
      keep(
        a.points,
        a.fPoints,
        a.listedPoints,
        where,
        "points",
        "not in the rulebook",
      );
    else adopt(a.points, a.fPoints, a.listedPoints, where, "points");
    if (a.hasDamage && a.damageInFile)
      adopt(a.damage, a.fDamage, a.listedDamage, where, "damage");
  }
  for (let p = e.defects; p !== undefined; p = p.next) {
    const d = p as Defect;
    adopt(
      d.points,
      d.fPoints,
      d.listed,
      within(e.label, d.name, d.subject, pageOf(d.item)),
      "points",
    );
  }
  // Without a genre no Skill has a price (Table 2-4, p. 119, PDF 121):
  // one notice for them all.
  let unpriced = false;
  for (let p = e.skills; p !== undefined; p = p.next) {
    const s = p as Skill;
    const where = within(e.label, s.name, undefined, pageOf(s.item));
    if (s.levelIsText) notANumber(where, "level", s.levelText);
    if (s.item === undefined && s.house === undefined) {
      keep(
        s.points,
        s.fPoints,
        s.listed,
        where,
        "points",
        "not in the rulebook",
      );
      s.unpriced = !s.listed; // a house Skill copied in later may price it
    } else if (e.creation.genre === C.NoGenre) {
      keep(s.points, s.fPoints, s.listed, where, "points", "");
      s.unpriced = !s.listed;
      unpriced = unpriced || !s.listed;
    } else adopt(s.points, s.fPoints, s.listed, where, "points");
  }
  if (unpriced)
    note(
      Warning,
      `${e.label}: no genre in creation to price Skills by (Table 2-4, ${R.pagesText(R.SkillCostsPage)}): their points kept as overrides`,
    );
}

/** Links, computes and adopts the numbers of the entities of a file. */
function finish(es: readonly Entity[]): void {
  link(es, false);
  computeAll(es);
  for (const e of es) adoptItems(e);
  computeAll(es);
  for (const e of es) adoptDerived(e, true);
  computeAll(es);
}

// ---- Files ----

/** What reading a file gives: each entity read, or problem, in order;
 *  and the entities, linked, computed and with the file's numbers
 *  (notices, for all of them, each naming its entity); undefined for
 *  none. */
export interface Read {
  results: Result[];
  es: Entity[] | undefined;
}

/** Reads text, a file named name in messages, as pobesm2_fmt2 reads it:
 *  every entity of every document, each read by entities, then here; a
 *  document whose top level isn't a sequence is a problem, and the file
 *  goes on; a YAML error ends the file. config.unicodeMinus is
 *  entities', so set it first. */
export function readStream(text: string, name: string): Read {
  const results: Result[] = [];
  clearNotices();
  // Read unresolved, so that check can see the aliases, then resolved,
  // as pobesm2_fmt2 reads.
  const stream = parseStream(text, name);
  let i = 0;
  for (const d of stream.docs) {
    Check.aliases(d.root(), note);
    const yerr = d.resolve();
    const root = d.root();
    if (yerr !== undefined) results.push({ yerr });
    else if (root === undefined || !root.isSequence())
      results.push({
        msg: `expected a top-level YAML sequence of entities in ${name}`,
      });
    else
      for (const item of root.items) {
        i++;
        const x = Entities.load(item);
        if (!x.ok) {
          results.push(
            x.yerr !== undefined ? { yerr: x.yerr } : { msg: x.msg },
          );
          continue;
        }
        try {
          const e = readEntity(item, i);
          results.push({ entity: e });
          Check.entity(item, e.label, note);
        } catch (f) {
          if (!(f instanceof Fail)) throw f;
          results.push(
            f.yerr !== undefined ? { yerr: f.yerr } : { msg: f.msg! },
          );
        }
      }
  }
  if (stream.err !== undefined) results.push({ yerr: stream.err });
  const es: Entity[] = [];
  for (const r of results) if (r.entity !== undefined) es.push(r.entity);
  if (es.length === 0) return { results, es: undefined };
  finish(es);
  return { results, es };
}

/** The entities of YAML text, as readStream reads a file: for save's
 *  copy. */
export function readText(text: string): Read {
  return readStream(text, stringName);
}

/** The text of problem r, for a message: polibfyaml's, or "NAME: MSG". */
export function problem(r: Result, name: string): string | undefined {
  if (r.yerr !== undefined) return trim(r.yerr.msg);
  if (r.msg !== undefined) return `${name}: ${r.msg}`;
  return undefined;
}

export type LoadAll =
  { ok: true; es: Entity[] } | { ok: false; msg: string; es?: undefined };

/** Every entity in text, a file named name, in order, as readStream
 *  gives them; a message if it has any problem (the first), or holds no
 *  entities. */
export function loadAll(text: string, name: string): LoadAll {
  const { results, es } = readStream(text, name);
  const r = results.find((x) => x.entity === undefined);
  if (r !== undefined) return { ok: false, msg: problem(r, name)! };
  if (es === undefined) return { ok: false, msg: `${name} holds no entities` };
  return { ok: true, es };
}

export type Load =
  { ok: true; c: Entity; es: Entity[] } | { ok: false; msg: string };

/** The one character in text, a file named name, as loadAll, with es,
 *  all the file's entities (its mecha with it); a message, as loadAll,
 *  or if the file holds more than one character, or none. */
export function load(text: string, name: string): Load {
  const r = loadAll(text, name);
  if (!r.ok) return r;
  const cs = r.es.filter((e) => !e.isMecha);
  if (cs.length !== 1)
    return {
      ok: false,
      msg: `${name} holds ${cs.length} characters, not one`,
    };
  return { ok: true, c: cs[0]!, es: r.es };
}

export type LoadCampaign =
  { ok: true; from: Entity } | { ok: false; msg: string };

/** The creation in campaign file text, named name (a mapping of only
 *  `creation`), or of the first character of a file of entities, in
 *  from, a new character's (newCharacter), to copy with takeCreation; a
 *  message if the file has a problem, or has no creation to give (a file
 *  of only mecha). */
export function loadCampaign(text: string, name: string): LoadCampaign {
  const stream = parseStream(text, name);
  const d = stream.docs[0];
  if (d === undefined) {
    if (stream.err !== undefined)
      return { ok: false, msg: trim(stream.err.msg) };
  } else {
    // Opened resolving, as the Oberon's stream: a resolve error is the
    // stream's.
    const yerr = d.resolve();
    if (yerr !== undefined) return { ok: false, msg: trim(yerr.msg) };
    const root = d.root();
    if (root !== undefined && root.isMapping()) {
      const from = newCharacter();
      from.hasCreation = true;
      try {
        onlyKeys(root, "creation");
        if (!root.hasKey("creation"))
          fail(root, "a campaign file holds a creation");
        readCreation(root.value("creation")!, from);
      } catch (f) {
        if (!(f instanceof Fail)) throw f;
        return {
          ok: false,
          msg: f.yerr !== undefined ? trim(f.yerr.msg) : `${name}: ${f.msg}`,
        };
      }
      C.compute(from);
      return { ok: true, from };
    }
  }
  const r = loadAll(text, name);
  if (!r.ok) return r;
  const from = r.es.find((e) => !e.isMecha);
  if (from === undefined)
    return {
      ok: false,
      msg: `${name} has no character to copy from, only mecha`,
    };
  return { ok: true, from };
}
