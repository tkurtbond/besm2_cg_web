// The numbers of a character and its mecha, computed from the rules:
// the port of besm2_cg_po's Besm2Calc (its PLAN.md, A2 and Part B
// step 2). Every cost, damage, derived value, total and warning of a
// BESM2ER character or mecha:
//
// - Character Points: the Stats (1 a point, or the Staged Stat Cost,
//   p. 166, PDF 168), the Attributes (cost a Level and their options,
//   p. 16, PDF 18), Weapon Attacks (4 a Level for the primary, 2 or 1
//   for a secondary, +5 for a Different Gunner, p. 82, PDF 84), less
//   the Defects' Bonus Points (p. 100, PDF 102);
// - derived values (pp. 129-130, PDF 131-132): ACV, DCV, Health
//   Points, Energy Points, Shock Value, and the Armour Rating (pp. 40,
//   48, PDF 42, 50);
// - Skill Points (p. 117, PDF 119): 20, +10 a Level of Highly Skilled,
//   -10 a rank of Unskilled, spent at the genre's costs (Table 2-4,
//   p. 119, PDF 121);
// - Mecha Points (p. 59, PDF 61): 20 a Level of Own a Big Mecha, 5
//   fewer for each "less powerful", spent on the mecha's Attributes
//   less its Defects; a mecha's 40 Health Points and Toughness's 20 a
//   Level (p. 99, PDF 101).
//
// An entity (a character or a mecha) is records the client allocates
// with `new` and sets up with the init and add functions (character.ts
// extends the classes with names, subjects and details), as the
// Oberon's NEW then Init. Every computed number is a Num (the Oberon's
// Number, renamed so as not to shadow JavaScript's), which also holds
// the user's override; compute reads the overrides of the numbers
// others are computed from, so that an override counts downstream, sets
// every computed value, and leaves the overrides alone.
//
// The lists stay linked through `next`, in the order added, as in the
// Oberon, so that a reader can follow each loop there; the order sets
// the order of the warnings.
//
// Oberon's DIV floors; every DIV here is `div`.
import * as R from "./rules.ts";

export const NStats = 3;
export const Body = 0;
export const Mind = 1;
export const Soul = 2;
export const NoGenre = -1; // Creation.genre unset
export const Unset = -1; // Creation.skillPoints: the rule's number

// Warning codes. Each names what it is about in its attr, defect,
// skill, mod (a Weapon Ability or Disability), or stat; undefined (or
// stat -1) for the entity as a whole.
export const UnknownItem = 0; // a name rules doesn't have
export const LevelRange = 1; // attribute, defect or skill Level out of range
export const StatRange = 2; // not 1-12 (p. 16, PDF 18), or above stat-ceiling
export const TwoAtTwelve = 3; // more than one Stat at 12 (p. 16, PDF 18)
export const TooManyDefects = 4; // more than 8 Defects (p. 100, PDF 102)
export const OverCharacterPoints = 5; // p. 13, PDF 15
export const OverSkillPoints = 6; // p. 117, PDF 119
export const OverMechaPoints = 7; // p. 59, PDF 61
export const Excluded = 8; // mod: goes with an earlier mod as the book forbids
export const TooOften = 9; // mod, or an attribute's option, taken too often
export const OptionClash = 10; // attribute: two options of one choice
export const NotOffered = 11; // skill: the genre doesn't have it
export const LowDamage = 12; // p. 82, PDF 84
export const NotPersonalGear = 13; // p. 83, PDF 85
export const MechaOnly = 14; // attribute or defect for mecha, on a character
export const OverBonusCeiling = 15; // over the bonus-point-ceiling
export const SecondaryAbove = 16; // p. 82, PDF 84
export const GunnerNotMecha = 17; // p. 82, PDF 84
export const SkilledAndUnskilled = 18; // p. 112, PDF 114
export const NoGenreSet = 19; // skills, but no genre to price them by
export const NoCost = 20; // attribute: the GM's cost, and no override
export const StatPointsAbove = 21; // p. 16, PDF 18
export const StatPointsBelow = 22; // p. 16, PDF 18

const MaxSkillLevel = 6;
export const MaxStat = 12;
const MaxDefects = 8; // recommended, p. 100, PDF 102
const BaseSkillPoints = 20;
const SkillPointsALevel = 10;
const DamageALevel = 15;
const GearDamageALevel = 5;
const PrimaryCost = 4;
const SameLevelCost = 2;
const LowerLevelCost = 1;
const GunnerCost = 5;
const MechaPointsALevel = 20;
const LessPowerfulPoints = 5;
const MechaHP = 40;
const ToughnessHP = 20;
export const BookAutoFireSlots = 3;

// Oberon's DIV, which floors.
function div(a: number, b: number): number {
  return Math.floor(a / b);
}

// A number on the sheet: the computed value, and the override the user
// typed, if any.
export class Num {
  value = 0;
  overridden = false;
  ovValue = 0;
}

// The campaign's own Skill: its Skill Points a Level by genre,
// R.NotOffered where it isn't available.
export class HouseSkill {
  next: HouseSkill | undefined = undefined;
  cost: number[] = new Array<number>(R.NGenres).fill(0);
}

// The creation: the campaign's numbers and options. 0 for
// characterPoints, statCeiling, bonusCeiling, statPointsCeiling or
// statPointsFloor: none given, so no limit is checked.
export class Creation {
  characterPoints = 0;
  backgroundPoints = 0;
  genre = 0; // R.Cyberpunk .. R.TeenageRomance, or NoGenre
  skillPoints = 0; // the GM's, or Unset
  stagedStatCost = false;
  statCeiling = 0;
  bonusCeiling = 0;
  statPointsCeiling = 0;
  statPointsFloor = 0;
  autoFireSlots = 0; // 3, or 1 as the book's examples
  houseSkills: HouseSkill | undefined = undefined;
}

// A Weapon Ability or Disability. countsAs is the file's `counts-as`,
// the slots it counts as in all; 0 when left out: the book's slots,
// taken once (Auto-Fire's from Creation.autoFireSlots).
export class Mod {
  next: Mod | undefined = undefined;
  item: R.Item | undefined = undefined; // undefined: a name rules doesn't have
  countsAs = 0;
  slots = 0; // what it counted as in the last compute
}

// An Attribute or Mecha Attribute, at level, with each of its item's
// options taken times[i] times. A Weapon Attack has its Abilities and
// Disabilities; an Own a Big Mecha its mecha.
export class Attr {
  next: Attr | undefined = undefined;
  item: R.Item | undefined = undefined;
  level = 0;
  times: number[] = new Array<number>(R.MaxOptions).fill(0);
  abilities: Mod | undefined = undefined;
  disabilities: Mod | undefined = undefined;
  primary = false; // the file's `primary`: the user's primary attack
  differentGunner = false; // p. 82, PDF 84
  personalGear = false; // p. 83, PDF 85
  mecha: Entity | undefined = undefined; // Own a Big Mecha's `subject`
  points = new Num();
  damage = new Num();
  weapon = false; // a Weapon Attack
  isPrimary = false; // the primary, after compute
}

export class Defect {
  next: Defect | undefined = undefined;
  item: R.Item | undefined = undefined;
  rank = 0; // the file's `level`
  points = new Num(); // negative, as the files write it: -BP
}

// A Skill: a rulebook one (item), or a house one (house, whose costs
// win); specs is how many specialisations it lists, the first free and
// each other 1 SP (p. 118, PDF 120).
export class Skill {
  next: Skill | undefined = undefined;
  item: R.Item | undefined = undefined;
  house: HouseSkill | undefined = undefined;
  level = 0;
  specs = 0;
  points = new Num();
}

export class Warning {
  next: Warning | undefined = undefined;
  code = 0;
  attr: Attr | undefined = undefined;
  defect: Defect | undefined = undefined;
  skill: Skill | undefined = undefined;
  mod: Mod | undefined = undefined;
  stat = -1; // Body, Mind, Soul, or -1
}

export class Entity {
  isMecha = false;
  owner: Entity | undefined = undefined; // a mecha's, set by compute of its owner
  stat: number[] = [0, 0, 0];
  statPoints: Num[] = [new Num(), new Num(), new Num()];
  attrs: Attr | undefined = undefined; // in the order added
  defects: Defect | undefined = undefined;
  skills: Skill | undefined = undefined;
  creation = new Creation();
  acv = new Num();
  dcv = new Num();
  hp = new Num();
  ep = new Num();
  sv = new Num();
  ar = new Num();
  hasAR = false; // it has Heavy or Light Armour
  // The totals: Character Points (Mecha Points for a mecha) spent on
  // Stats and Attributes, the Defects' Bonus Points (>= 0), spent less
  // Bonus Points, and what it has to spend (0 for a mecha no owner
  // gives points); Skill Points it has and spent.
  statTotal = 0;
  attrTotal = 0;
  bonusPoints = 0;
  spent = 0;
  available = 0;
  skillPoints = 0;
  skillSpent = 0;
  warnings: Warning | undefined = undefined; // from the last compute, in the order found
}

function need(name: string): R.Item {
  const it = R.find(name);
  if (it === undefined) throw new Error(`calc: no item ${name}`);
  return it;
}

const weaponAttack = need("Weapon Attack");
const combatMastery = need("Combat Mastery");
const ineptCombat = need("Inept Combat");
const damnHealthy = need("Damn Healthy!");
const notSoTough = need("Not So Tough");
const diminutive = need("Diminutive");
const energyBonus = need("Energy Bonus");
const highlySkilled = need("Highly Skilled");
const unskilled = need("Unskilled");
const heavyArmour = need("Heavy Armour");
const lightArmour = need("Light Armour");
const toughness = need("Toughness");
const ownABigMecha = need("Own a Big Mecha");
const noDamage = need("No Damage");
const autoFire = need("Auto-Fire");

// ---- Numbers ----

function set(n: Num, value: number): void {
  n.value = value;
}

export function override(n: Num, value: number): void {
  n.overridden = true;
  n.ovValue = value;
}

// Back to the computed value.
export function clear(n: Num): void {
  n.overridden = false;
  n.ovValue = 0;
}

// The value in effect: the override if there is one.
export function value(n: Num): number {
  return n.overridden ? n.ovValue : n.value;
}

// The number in effect, in decimal.
export function text(n: Num): string {
  return String(value(n));
}

// The computed number, whatever the override.
export function computedText(n: Num): string {
  return String(n.value);
}

// Sets n's override from what the user typed in its box: blank clears
// it, an integer (-999999..999999) sets it; false, n unchanged, for
// anything else. Spaces and tabs around it are ignored.
export function parse(s: string, n: Num): boolean {
  const isBlank = (c: string): boolean => c === " " || c === "\t";
  let i = 0;
  while (i < s.length && isBlank(s[i]!)) i++;
  let j = s.length;
  while (j > i && isBlank(s[j - 1]!)) j--;
  if (j === i) {
    clear(n);
    return true;
  }
  let neg = false;
  if (s[i] === "-") {
    neg = true;
    i++;
  }
  let v = 0;
  let digits = 0;
  while (i < j && s[i]! >= "0" && s[i]! <= "9" && digits < 6) {
    v = 10 * v + s.charCodeAt(i) - 48;
    i++;
    digits++;
  }
  if (digits === 0 || i < j) return false;
  if (neg) v = -v;
  override(n, v);
  return true;
}

function initNumber(n: Num): void {
  n.value = 0;
  clear(n);
}

// ---- Building an entity ----

export function initCreation(c: Creation): void {
  c.characterPoints = 0;
  c.backgroundPoints = 0;
  c.genre = NoGenre;
  c.skillPoints = Unset;
  c.stagedStatCost = false;
  c.statCeiling = 0;
  c.bonusCeiling = 0;
  c.statPointsCeiling = 0;
  c.statPointsFloor = 0;
  c.autoFireSlots = BookAutoFireSlots;
  c.houseSkills = undefined;
}

// A character (isMecha false) with each Stat at 1, or a mecha.
export function initEntity(e: Entity, isMecha: boolean): void {
  e.isMecha = isMecha;
  e.owner = undefined;
  for (let i = 0; i < NStats; i++) {
    e.stat[i] = 1;
    initNumber(e.statPoints[i]!);
  }
  e.attrs = undefined;
  e.defects = undefined;
  e.skills = undefined;
  initCreation(e.creation);
  initNumber(e.acv);
  initNumber(e.dcv);
  initNumber(e.hp);
  initNumber(e.ep);
  initNumber(e.sv);
  initNumber(e.ar);
  e.hasAR = false;
  e.statTotal = 0;
  e.attrTotal = 0;
  e.bonusPoints = 0;
  e.spent = 0;
  e.available = 0;
  e.skillPoints = 0;
  e.skillSpent = 0;
  e.warnings = undefined;
}

export function initAttr(
  a: Attr,
  item: R.Item | undefined,
  level: number,
): void {
  a.next = undefined;
  a.item = item;
  a.level = level;
  a.times.fill(0);
  a.abilities = undefined;
  a.disabilities = undefined;
  a.primary = false;
  a.differentGunner = false;
  a.personalGear = false;
  a.mecha = undefined;
  initNumber(a.points);
  initNumber(a.damage);
  a.weapon = item !== undefined && item === weaponAttack;
  a.isPrimary = false;
}

export function initMod(
  m: Mod,
  item: R.Item | undefined,
  countsAs: number,
): void {
  m.next = undefined;
  m.item = item;
  m.countsAs = countsAs;
  m.slots = 0;
}

export function initDefect(
  d: Defect,
  item: R.Item | undefined,
  rank: number,
): void {
  d.next = undefined;
  d.item = item;
  d.rank = rank;
  initNumber(d.points);
}

export function initSkill(
  s: Skill,
  item: R.Item | undefined,
  house: HouseSkill | undefined,
  level: number,
  specs: number,
): void {
  s.next = undefined;
  s.item = item;
  s.house = house;
  s.level = level;
  s.specs = specs;
  initNumber(s.points);
}

export function initHouseSkill(h: HouseSkill): void {
  h.next = undefined;
  h.cost.fill(R.NotOffered);
}

// The option of a's item labelled label is taken times times.
export function setOption(a: Attr, label: string, times: number): void {
  const it = a.item;
  if (it === undefined) throw new Error("calc.setOption: an unknown item");
  const i = it.option.findIndex((o) => R.sameName(o.label, label));
  if (i < 0)
    throw new Error(`calc.setOption: ${it.name} has no option ${label}`);
  a.times[i] = times;
}

export function addAttr(e: Entity, a: Attr): void {
  if (e.attrs === undefined) e.attrs = a;
  else {
    let p = e.attrs;
    while (p.next !== undefined) p = p.next;
    p.next = a;
  }
}

// Appends m to a list of mods, and gives the list: the Oberon's VAR list.
export function addMod(list: Mod | undefined, m: Mod): Mod {
  if (list === undefined) return m;
  let p = list;
  while (p.next !== undefined) p = p.next;
  p.next = m;
  return list;
}

export function addDefect(e: Entity, d: Defect): void {
  if (e.defects === undefined) e.defects = d;
  else {
    let p = e.defects;
    while (p.next !== undefined) p = p.next;
    p.next = d;
  }
}

export function addSkill(e: Entity, s: Skill): void {
  if (e.skills === undefined) e.skills = s;
  else {
    let p = e.skills;
    while (p.next !== undefined) p = p.next;
    p.next = s;
  }
}

export function addHouseSkill(c: Creation, h: HouseSkill): void {
  if (c.houseSkills === undefined) c.houseSkills = h;
  else {
    let p = c.houseSkills;
    while (p.next !== undefined) p = p.next;
    p.next = h;
  }
}

// ---- Warnings ----

function warn(
  e: Entity,
  code: number,
  a: Attr | undefined,
  d: Defect | undefined,
  s: Skill | undefined,
  m: Mod | undefined,
  stat: number,
): void {
  const w = new Warning();
  w.code = code;
  w.attr = a;
  w.defect = d;
  w.skill = s;
  w.mod = m;
  w.stat = stat;
  if (e.warnings === undefined) e.warnings = w;
  else {
    let p = e.warnings;
    while (p.next !== undefined) p = p.next;
    p.next = w;
  }
}

// Whether e has a warning code (about a, if a isn't undefined).
export function hasWarning(
  e: Entity,
  code: number,
  a: Attr | undefined,
): boolean {
  let w = e.warnings;
  while (
    w !== undefined &&
    (w.code !== code || (a !== undefined && w.attr !== a))
  )
    w = w.next;
  return w !== undefined;
}

// How many warnings e has.
export function warningCount(e: Entity): number {
  let n = 0;
  for (let w = e.warnings; w !== undefined; w = w.next) n++;
  return n;
}

// ---- Helpers ----

// The total Level of the item's Attributes on e (or rank of its Defects).
function levels(e: Entity, it: R.Item): number {
  let n = 0;
  if (it.kind === R.Defect || it.kind === R.MechaDefect) {
    for (let d = e.defects; d !== undefined; d = d.next)
      if (d.item === it) n += d.rank;
  } else {
    for (let a = e.attrs; a !== undefined; a = a.next)
      if (a.item === it) n += a.level;
  }
  return n;
}

// The creation that prices e: its owner's for a mecha.
function rules(e: Entity): Creation {
  return e.isMecha && e.owner !== undefined ? e.owner.creation : e.creation;
}

// ---- Stats ----

function computeStats(e: Entity): void {
  let twelves = 0;
  e.statTotal = 0;
  for (let i = 0; i < NStats; i++) {
    const v = e.stat[i]!;
    if (
      v < 1 ||
      v > MaxStat ||
      (e.creation.statCeiling > 0 && v > e.creation.statCeiling)
    )
      warn(e, StatRange, undefined, undefined, undefined, undefined, i);
    if (v === MaxStat) twelves++;
    if (e.creation.stagedStatCost && v >= 1 && v <= MaxStat)
      set(e.statPoints[i]!, R.stagedStatCost(v));
    else set(e.statPoints[i]!, v);
    e.statTotal += value(e.statPoints[i]!);
  }
  if (twelves > 1)
    warn(e, TwoAtTwelve, undefined, undefined, undefined, undefined, -1);
  if (
    e.creation.statPointsCeiling > 0 &&
    e.statTotal > e.creation.statPointsCeiling
  )
    warn(e, StatPointsAbove, undefined, undefined, undefined, undefined, -1);
  if (
    e.creation.statPointsFloor > 0 &&
    e.statTotal < e.creation.statPointsFloor
  )
    warn(e, StatPointsBelow, undefined, undefined, undefined, undefined, -1);
}

// ---- Attributes ----

// a's points before any Weapon Attack rule: its cost a Level, with its
// options' points a Level, times its Level, with its options' points on
// the total, and at least its item's least cost. Warns of clashing or
// repeated options, and of a cost no rule gives.
function attrPoints(e: Entity, a: Attr, it: R.Item): number {
  let perLevel = it.cost;
  let flat = 0;
  const opts = it.option;
  for (let i = 0; i < opts.length; i++) {
    const o = opts[i]!;
    let n = a.times[i]!;
    if (o.group > 0 && n === 0) {
      // A required choice left open is its first option.
      let chosen = false;
      for (let j = 0; j < opts.length; j++)
        if (opts[j]!.group === o.group && a.times[j]! > 0) chosen = true;
      let j = 0;
      while (opts[j]!.group !== o.group) j++;
      if (!chosen && j === i) n = 1;
    }
    if (n > o.maxTimes)
      warn(e, TooOften, a, undefined, undefined, undefined, -1);
    if (n > 0 && o.group !== 0)
      for (let j = 0; j < i; j++)
        if (opts[j]!.group === o.group && a.times[j]! > 0)
          warn(e, OptionClash, a, undefined, undefined, undefined, -1);
    if (o.perLevel) perLevel += n * o.amount;
    else flat += n * o.amount;
  }
  if ((perLevel === 0 || R.hasFlag(it, R.GmCost)) && !a.points.overridden)
    warn(e, NoCost, a, undefined, undefined, undefined, -1);
  return Math.max(it.minCost, perLevel * a.level + flat);
}

// The slots Weapon Ability or Disability it counts as, taken once, as
// Creation c prices it: the book's, Auto-Fire's c's; 1 for undefined.
function slotsOnce(it: R.Item | undefined, c: Creation): number {
  if (it === undefined) return 1;
  if (it === autoFire) return c.autoFireSlots;
  return it.slots;
}

// The same, as e's campaign prices it (a mecha's owner's).
export function onceSlots(e: Entity, it: R.Item | undefined): number {
  return slotsOnce(it, rules(e));
}

// The slots m counts as, as Creation c prices it.
function slots(m: Mod, c: Creation): number {
  return m.countsAs > 0 ? m.countsAs : slotsOnce(m.item, c);
}

// How many times m is taken: its slots over the book's for one.
export function times(m: Mod): number {
  if (m.countsAs === 0 || m.item === undefined || m.item.slots === 0) return 1;
  return Math.max(1, div(m.countsAs, m.item.slots));
}

// Checks one list of mods of a, and gives its slots.
function modSlots(
  e: Entity,
  a: Attr,
  list: Mod | undefined,
  c: Creation,
): number {
  let n = 0;
  for (let m = list; m !== undefined; m = m.next) {
    m.slots = slots(m, c);
    n += m.slots;
    if (m.item === undefined)
      warn(e, UnknownItem, a, undefined, undefined, m, -1);
    else {
      if (times(m) > m.item.maxTimes)
        warn(e, TooOften, a, undefined, undefined, m, -1);
      if (a.personalGear && R.hasFlag(m.item, R.NotPersonalGear))
        warn(e, NotPersonalGear, a, undefined, undefined, m, -1);
      if (R.hasFlag(m.item, R.MechaOnly) && !e.isMecha)
        warn(e, MechaOnly, a, undefined, undefined, m, -1);
    }
  }
  return n;
}

// Whether m excludes, or repeats, a mod before it in a's lists.
function checkExclusions(e: Entity, a: Attr): void {
  const lists = [a.abilities, a.disabilities];
  for (let i = 0; i <= 1; i++)
    for (let m = lists[i]; m !== undefined; m = m.next) {
      const mi = m.item;
      if (mi === undefined) continue;
      let stop = false;
      for (let j = 0; j <= i && !stop; j++)
        for (let p = lists[j]; p !== undefined && p !== m && !stop; p = p.next)
          if (p.item !== undefined && R.excludes(p.item, mi)) {
            warn(e, Excluded, a, undefined, undefined, m, -1);
            stop = true;
          }
    }
}

function hasMod(list: Mod | undefined, it: R.Item): boolean {
  while (list !== undefined && list.item !== it) list = list.next;
  return list !== undefined;
}

// A Weapon Attack's damage (p. 82, PDF 84): 15 a Level, less 15 a slot
// of its Abilities, more 15 a slot of its Disabilities, never below 0;
// 5 instead of 15 as Personal Gear (p. 83, PDF 85); 0 with No Damage.
function computeDamage(e: Entity, a: Attr, c: Creation): void {
  let n =
    a.level -
    modSlots(e, a, a.abilities, c) +
    modSlots(e, a, a.disabilities, c);
  if (n < 0) n = 0; // more Ability slots than Levels: no damage, and warned
  checkExclusions(e, a);
  const each = a.personalGear ? GearDamageALevel : DamageALevel;
  if (hasMod(a.disabilities, noDamage)) set(a.damage, 0);
  else {
    set(a.damage, each * n);
    if (value(a.damage) < each)
      warn(e, LowDamage, a, undefined, undefined, undefined, -1);
  }
  if (a.differentGunner && !e.isMecha)
    warn(e, GunnerNotMecha, a, undefined, undefined, undefined, -1);
}

// The primary attack (p. 82, PDF 84): the one marked primary, else the
// first of the highest Level, of the Weapon Attacks that aren't
// Personal Gear.
function primaryOf(e: Entity): Attr | undefined {
  let best: Attr | undefined = undefined;
  for (let a = e.attrs; a !== undefined; a = a.next)
    if (a.weapon && !a.personalGear) {
      if (a.primary) return a;
      if (best === undefined || a.level > best.level) best = a;
    }
  return best;
}

function computeAttrs(e: Entity): void {
  const c = rules(e);
  const primary = primaryOf(e);
  e.attrTotal = 0;
  for (let a = e.attrs; a !== undefined; a = a.next) {
    const it = a.item;
    a.weapon = it !== undefined && it === weaponAttack;
    a.isPrimary = a === primary;
    if (it === undefined) {
      warn(e, UnknownItem, a, undefined, undefined, undefined, -1);
      set(a.points, 0);
    } else {
      if (a.level < 1 || a.level > it.maxLevel)
        warn(e, LevelRange, a, undefined, undefined, undefined, -1);
      if (R.hasFlag(it, R.MechaOnly) && !e.isMecha)
        warn(e, MechaOnly, a, undefined, undefined, undefined, -1);
      if (a.weapon) {
        computeDamage(e, a, c);
        let p: number;
        // primary is a weapon whenever a is a weapon that isn't Personal Gear.
        if (a.personalGear) p = 0;
        else if (a.isPrimary) p = PrimaryCost * a.level;
        else if (a.level === primary!.level) p = SameLevelCost;
        else if (a.level < primary!.level) p = LowerLevelCost;
        else {
          p = SameLevelCost;
          warn(e, SecondaryAbove, a, undefined, undefined, undefined, -1);
        }
        if (a.differentGunner) p += GunnerCost;
        set(a.points, p);
      } else set(a.points, attrPoints(e, a, it));
    }
    e.attrTotal += value(a.points);
  }
}

// ---- Defects ----

function computeDefects(e: Entity): void {
  e.bonusPoints = 0;
  let n = 0;
  for (let d = e.defects; d !== undefined; d = d.next) {
    const it = d.item;
    if (it === undefined) {
      warn(e, UnknownItem, undefined, d, undefined, undefined, -1);
      set(d.points, -d.rank);
    } else {
      if (d.rank < 1 || d.rank > it.maxLevel)
        warn(e, LevelRange, undefined, d, undefined, undefined, -1);
      if (R.hasFlag(it, R.MechaOnly) && !e.isMecha)
        warn(e, MechaOnly, undefined, d, undefined, undefined, -1);
      set(d.points, -it.cost * d.rank);
    }
    e.bonusPoints -= value(d.points);
    n++;
  }
  if (!e.isMecha && n > MaxDefects)
    warn(e, TooManyDefects, undefined, undefined, undefined, undefined, -1);
  if (e.creation.bonusCeiling > 0 && e.bonusPoints > e.creation.bonusCeiling)
    warn(e, OverBonusCeiling, undefined, undefined, undefined, undefined, -1);
}

// ---- Skills ----

function computeSkills(e: Entity): void {
  const hs = levels(e, highlySkilled);
  const us = levels(e, unskilled);
  if (hs > 0 && us > 0)
    warn(
      e,
      SkilledAndUnskilled,
      undefined,
      undefined,
      undefined,
      undefined,
      -1,
    );
  if (e.creation.skillPoints !== Unset) e.skillPoints = e.creation.skillPoints;
  else e.skillPoints = BaseSkillPoints + SkillPointsALevel * (hs - us);
  const g = e.creation.genre;
  let warned = false;
  e.skillSpent = 0;
  for (let s = e.skills; s !== undefined; s = s.next) {
    let cost: number;
    if (s.level < 1 || s.level > MaxSkillLevel)
      warn(e, LevelRange, undefined, undefined, s, undefined, -1);
    if (s.item === undefined && s.house === undefined) {
      warn(e, UnknownItem, undefined, undefined, s, undefined, -1);
      cost = 0;
    } else if (g === NoGenre) {
      if (!warned) {
        warn(e, NoGenreSet, undefined, undefined, undefined, undefined, -1);
        warned = true;
      }
      cost = 0;
    } else {
      cost = s.house !== undefined ? s.house.cost[g]! : s.item!.skillCost[g]!;
      if (cost === R.NotOffered)
        warn(e, NotOffered, undefined, undefined, s, undefined, -1);
    }
    set(s.points, cost * s.level + Math.max(0, s.specs - 1));
    e.skillSpent += value(s.points);
  }
  if (e.skillSpent > e.skillPoints)
    warn(e, OverSkillPoints, undefined, undefined, undefined, undefined, -1);
}

// ---- Derived values ----

// The Armour Rating (p. 40, PDF 42; p. 48, PDF 50): Heavy Armour 10 a
// Level (4 if Hidden), Light Armour 5/2 a Level rounded down (its Level
// if Hidden).
function armourRating(e: Entity): number {
  let n = 0;
  e.hasAR = false;
  for (let a = e.attrs; a !== undefined; a = a.next) {
    const it = a.item;
    if (it !== undefined && (it === heavyArmour || it === lightArmour)) {
      e.hasAR = true;
      const hidden = it.option.findIndex((o) => R.sameName(o.label, "hidden"));
      if (hidden < 0) throw new Error(`calc: ${it.name} has no option hidden`);
      if (it === heavyArmour)
        n += a.times[hidden]! > 0 ? 4 * a.level : 10 * a.level;
      else n += a.times[hidden]! > 0 ? a.level : div(5 * a.level, 2);
    }
  }
  return n;
}

function computeDerived(e: Entity): void {
  set(e.ar, armourRating(e));
  if (e.isMecha) set(e.hp, MechaHP + ToughnessHP * levels(e, toughness));
  else {
    let cv =
      div(e.stat[Body]! + e.stat[Mind]! + e.stat[Soul]!, 3) +
      levels(e, combatMastery);
    // Inept Combat (p. 105, PDF 107) lowers it 1 a rank, but not below 1.
    const ic = levels(e, ineptCombat);
    if (ic > 0) cv = Math.max(cv - ic, Math.min(cv, 1));
    set(e.acv, cv);
    set(e.dcv, value(e.acv) - 2);
    let hp =
      (e.stat[Body]! + e.stat[Soul]!) * 5 +
      10 * levels(e, damnHealthy) -
      10 * levels(e, notSoTough);
    const dim = levels(e, diminutive);
    if (dim === 1) hp = div(hp, 5);
    else if (dim >= 2) hp = div(hp, 20);
    set(e.hp, hp);
    set(
      e.ep,
      (e.stat[Mind]! + e.stat[Soul]!) * 5 + 10 * levels(e, energyBonus),
    );
  }
  // Shock Value (p. 130, PDF 132): HP / 5, rounded up.
  const hp = Math.max(0, value(e.hp));
  set(e.sv, div(hp + 4, 5));
}

// ---- Mecha ----

// The Mecha Points one Own a Big Mecha gives (p. 59, PDF 61).
export function mechaPoints(a: Attr): number {
  const it = a.item;
  if (it === undefined) throw new Error("calc.mechaPoints: an unknown item");
  const less = it.option.findIndex((o) =>
    R.sameName(o.label, "less powerful, 5 fewer MP"),
  );
  if (less < 0)
    throw new Error(`calc.mechaPoints: ${it.name} has no less powerful`);
  return MechaPointsALevel * a.level - LessPowerfulPoints * a.times[less]!;
}

function totals(e: Entity): void {
  e.spent = e.statTotal + e.attrTotal - e.bonusPoints;
  if (e.isMecha) {
    // No owner gives none: not the Mecha Points of one it had, gone
    // since (removed, or its Own a Big Mecha renamed).
    if (e.owner === undefined) e.available = 0;
    if (e.owner !== undefined && e.spent > e.available)
      warn(e, OverMechaPoints, undefined, undefined, undefined, undefined, -1);
  } else {
    e.available =
      e.creation.characterPoints > 0
        ? e.creation.characterPoints + e.creation.backgroundPoints
        : 0;
    if (e.creation.characterPoints > 0 && e.spent > e.available)
      warn(
        e,
        OverCharacterPoints,
        undefined,
        undefined,
        undefined,
        undefined,
        -1,
      );
  }
}

function computeOne(e: Entity): void {
  e.warnings = undefined;
  if (e.isMecha) e.statTotal = 0;
  else computeStats(e);
  computeAttrs(e);
  computeDefects(e);
  if (e.isMecha) {
    e.skillPoints = 0;
    e.skillSpent = 0;
  } else computeSkills(e);
  computeDerived(e);
  totals(e);
}

// Computes every number of e, and of each mecha its Own a Big Mecha
// Attributes give, which then has e as its owner and the Mecha Points
// of all of them. A mecha given alone keeps its owner, if any, but not
// its Mecha Points: compute its owner.
export function compute(e: Entity): void {
  computeOne(e);
  if (e.isMecha) return;
  for (let a = e.attrs; a !== undefined; a = a.next)
    if (a.item === ownABigMecha && a.mecha !== undefined) {
      a.mecha.owner = e;
      a.mecha.available = 0;
    }
  for (let a = e.attrs; a !== undefined; a = a.next)
    if (a.item === ownABigMecha && a.mecha !== undefined)
      a.mecha.available += mechaPoints(a);
  for (let a = e.attrs; a !== undefined; a = a.next)
    if (a.item === ownABigMecha && a.mecha !== undefined && a.mecha.owner === e)
      computeOne(a.mecha);
}
