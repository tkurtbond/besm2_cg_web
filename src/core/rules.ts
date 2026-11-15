// The rulebook's names, pages and numbers: no descriptions.
//
// The port of besm2_cg_po's Besm2Rules (its PLAN.md, A2 and Part B
// step 1). Every Stat, Attribute, Defect, Skill, Weapon Attack Ability
// and Disability of BESM2ER (Big Eyes, Small Mouth, Revised Second
// Edition), in the book's order, with the page it is described on and
// what the calculations need of it: costs, limits, options and flags;
// and the rulebook's small tables (the Skill costs by genre, Table 2-4;
// the Staged Stat Cost, Table 4-7). The rulebook's text stays out
// (AGENTS.md): to explain an item the page opens the book at its page.
//
// Pages are the book's printed numbers. The PDF has no page labels, and
// its page index is the printed page + PdfPageOffset; every page shown
// gives both (label, pageText). The pages were checked against the PDF
// by the font of the entries' headings (besm2_cg_po's
// tools/check-pages.py, make check-pages), and against besm2_cg_po's
// rules/*.tsv by its tools/check-rules.py (make test), both on what
// tools/listrules.ts prints, which must be besm2_cg_po's listing byte
// for byte (test/core/rules.test.ts).
//
// The tables are built by the same short procedures as the Oberon's
// (A, L, F, D, S, WA, ...), call for call, so that each line can be
// compared with Besm2Rules.Mod's. Oberon's CONSTs are plain numeric
// constants under the same names, since TypeScript's enum isn't
// erasable (AGENTS.md); an Item's SET of flags is a number of bits.

// Kinds
export type Kind = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const Stat = 0;
export const Attribute = 1;
export const MechaAttribute = 2;
export const Defect = 3;
export const MechaDefect = 4;
export const Skill = 5;
export const Ability = 6;
export const Disability = 7;
export const NKinds = 8;
/** The kinds, in order, for a loop over them. */
export const kinds: readonly Kind[] = [
  Stat,
  Attribute,
  MechaAttribute,
  Defect,
  MechaDefect,
  Skill,
  Ability,
  Disability,
];

/** The longest name, "Weapon Attack (or Special Attack)", is 33. */
export const NameLength = 40;
/** PDF page index = printed page + 2 */
export const PdfPageOffset = 2;

// Item.flags: bit numbers
/** names what it applies to (A4's `subject`): Gun Bunny's ability, ... */
export const Subject = 0;
/** for mecha only: "(Mecha Only)" in its cost, or in its name */
export const MechaOnly = 1;
/** its cost or slots are the GM's: the Unique items */
export const GmCost = 2;
/** a Special Defect (Table 2-3, p. 100, PDF 102), not a Normal one */
export const Special = 3;
/** a Weapon Ability or Disability that names something (A4's `detail`) */
export const NeedsDetail = 4;
/** not for a Personal Gear weapon (p. 83, PDF 85) */
export const NotPersonalGear = 5;

/** No maximum: Highly Skilled's Level, Area Effect's times. MAX(INTEGER). */
export const Unlimited = 2147483647;

// The genres of Table 2-4 (p. 119, PDF 121), in its order
export const Cyberpunk = 0;
export const HotRodsAndGuns = 1;
export const MartialArts = 2;
export const MedievalFantasy = 3;
export const ModernMilitary = 4;
export const OccultHorror = 5;
export const SpaceOpera = 6;
export const TeenageRomance = 7;
export const NGenres = 8;
/** Item.skillCost of a Skill the genre doesn't have ("-") */
export const NotOffered = 0;

/** Environmental Control has 9 */
export const MaxOptions = 10;

// Pages of the rules themselves, for the page's "?" buttons
/** Step 3: Assign Stats */
export const StatsPage = 15;
/** Step 4: Character Attributes; Table 2-2 is pp. 16-17 */
export const AttributesPage = 16;
export const AlternateAttacksPage = 82;
/** Weapon Attack Abilities; Hand-Held Weapons, Personal Gear */
export const WeaponAbilitiesPage = 83;
export const WeaponDisabilitiesPage = 89;
export const MechaAttributesPage = 93;
/** Step 5: Character Defects, Table 2-3 */
export const DefectsPage = 100;
export const MechaDefectsPage = 114;
/** Step 6: Skill System; Skill Cost descriptions */
export const SkillsPage = 117;
/** Table 2-4: Skills, the costs by genre */
export const SkillCostsPage = 119;
/** Step 7: Combat Value, Health Points, Energy Points */
export const DerivedValuesPage = 129;
export const ShockValuePage = 130;
/** Step 8 */
export const BackgroundPointsPage = 130;
/** Table 4-7, an optional rule */
export const StagedStatCostPage = 166;

const MaxItems = 300;
const MaxAliases = 32;
const MaxExclusions = 40;

/**
 * A choice that changes an Attribute's cost. amount is points a Level if
 * perLevel, else points on the total; options of the same group > 0 are
 * one required choice (the first by default), of the same group < 0 an
 * optional one (at most one), and of group 0 each on its own, taken up
 * to maxTimes.
 */
export interface Option {
  readonly label: string;
  readonly amount: number;
  readonly group: number;
  readonly maxTimes: number;
  readonly perLevel: boolean;
}

export interface Item {
  readonly name: string;
  readonly kind: Kind;
  readonly page: number;
  /** A set of the flags above, as bits: test with hasFlag. */
  readonly flags: number;
  /**
   * An Attribute's cost a Level before its options (0 if a required
   * option sets it), its highest Level, and its least total cost (Heavy
   * Armour, Light Armour, Own a Big Mecha: 1). A Defect's Bonus Points a
   * rank, and its highest rank.
   */
  readonly cost: number;
  readonly maxLevel: number;
  readonly minCost: number;
  /** The Oberon's option[0 .. nOptions-1]; nOptions is its length. */
  readonly option: readonly Option[];
  /** A Skill's points a Level by genre */
  readonly skillCost: readonly number[];
  /**
   * A Weapon Ability's or Disability's slots (counts-as, p. 83), the
   * other number some have (0 if none: Homing 2 where ECM is common,
   * Soul Attack 2 with No Damage, Vampiric 2 above the maximum, Only In 2
   * if very rare), and how often it may be taken.
   */
  readonly slots: number;
  readonly altSlots: number;
  readonly maxTimes: number;
}

/** Whether flag is in it's flags (Oberon's `flag IN it.flags`). */
export function hasFlag(it: Item, flag: number): boolean {
  return (it.flags & (1 << flag)) !== 0;
}

// The Item as it is built: Item without its readonly.
type Mutable<T> = { -readonly [K in keyof T]: T[K] };
type ItemDesc = Mutable<Omit<Item, "option" | "skillCost">> & {
  option: Option[];
  skillCost: number[];
};

const items: ItemDesc[] = [];
const firsts: number[] = new Array<number>(NKinds).fill(0);
const counts: number[] = new Array<number>(NKinds).fill(0);
/** the item the options are added to */
let cur: ItemDesc | undefined;
// Other names an item is found by: the headings' full names, Table 2-3's
// spellings, and the BESM 2nd edition and Big Robots, Cool Starships
// names of the fixtures (besm2_cg_po's PLAN.md, open question 11).
const aliases: { alias: string; item: Item }[] = [];
// Pairs of Weapon Abilities and Disabilities that don't go together
const exclusions: { a: Item; b: Item }[] = [];

// ---- Text ----

/** s in lower case, ASCII only: names are ASCII. */
function lower(s: string): string {
  return s.replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));
}

/** a = b, ignoring ASCII case. */
export function sameName(a: string, b: string): boolean {
  return a.length === b.length && lower(a) === lower(b);
}

function assert(cond: boolean, what: string): asserts cond {
  if (!cond) throw new Error(`rules: ${what}`);
}

// ---- The tables ----

function newItem(
  name: string,
  kind: Kind,
  page: number,
  flags: number[],
): ItemDesc {
  assert(items.length < MaxItems, "too many items");
  assert(name.length < NameLength, `name too long: ${name}`);
  let bits = 0;
  for (const f of flags) bits |= 1 << f;
  const it: ItemDesc = {
    name,
    kind,
    page,
    flags: bits,
    cost: 0,
    maxLevel: 0,
    minCost: 0,
    option: [],
    skillCost: new Array<number>(NGenres).fill(NotOffered),
    slots: 0,
    altSlots: 0,
    maxTimes: 1,
  };
  if (counts[kind] === 0) firsts[kind] = items.length;
  counts[kind] = (counts[kind] ?? 0) + 1;
  items.push(it);
  cur = it;
  return it;
}

function St(name: string): void {
  newItem(name, Stat, StatsPage, []).maxLevel = 12;
}

// An Attribute (A) or Mecha Attribute (MA): cost points a Level (0 if
// its options set it), Levels 1 to max.
function At(
  name: string,
  kind: Kind,
  page: number,
  cost: number,
  max: number,
  flags: number[],
): void {
  const it = newItem(name, kind, page, flags);
  it.cost = cost;
  it.maxLevel = max;
}

function A(
  name: string,
  page: number,
  cost: number,
  max: number,
  flags: number[],
): void {
  At(name, Attribute, page, cost, max, flags);
}

function MA(
  name: string,
  page: number,
  cost: number,
  max: number,
  flags: number[],
): void {
  At(name, MechaAttribute, page, cost, max, flags);
}

function Opt(
  label: string,
  amount: number,
  group: number,
  maxTimes: number,
  perLevel: boolean,
): void {
  assert(cur !== undefined, "an option before any item");
  assert(cur.option.length < MaxOptions, `too many options: ${cur.name}`);
  assert(label.length < NameLength, `label too long: ${label}`);
  cur.option.push({ label, amount, group, maxTimes, perLevel });
}

// An option of the last item: points a Level (L) or on the total (F).
function L(label: string, amount: number, group: number): void {
  Opt(label, amount, group, 1, true);
}

function F(
  label: string,
  amount: number,
  group: number,
  maxTimes: number,
): void {
  Opt(label, amount, group, maxTimes, false);
}

function MinCost(n: number): void {
  assert(cur !== undefined, "MinCost before any item");
  cur.minCost = n;
}

// A Defect: bp Bonus Points a rank, ranks 1 to max.
function D(
  name: string,
  page: number,
  bp: number,
  max: number,
  flags: number[],
): void {
  const it = newItem(name, Defect, page, flags);
  it.cost = bp;
  it.maxLevel = max;
}

function MD(name: string, page: number, max: number): void {
  const it = newItem(name, MechaDefect, page, [MechaOnly]);
  it.cost = 1;
  it.maxLevel = max;
}

// A Skill and its points a Level in each genre of Table 2-4, in order; 0
// where it isn't offered.
function S(name: string, page: number, ...c: number[]): void {
  assert(c.length === NGenres, `a cost for each genre: ${name}`);
  const it = newItem(name, Skill, page, []);
  it.maxLevel = 6;
  it.skillCost = c;
}

function Weapon(
  name: string,
  kind: Kind,
  page: number,
  slots: number,
  alt: number,
  maxTimes: number,
  flags: number[],
): void {
  const it = newItem(name, kind, page, flags);
  it.slots = slots;
  it.altSlots = alt;
  it.maxTimes = maxTimes;
}

function WA(
  name: string,
  page: number,
  slots: number,
  alt: number,
  maxTimes: number,
  flags: number[],
): void {
  Weapon(name, Ability, page, slots, alt, maxTimes, flags);
}

function WD(
  name: string,
  page: number,
  slots: number,
  alt: number,
  maxTimes: number,
  flags: number[],
): void {
  Weapon(name, Disability, page, slots, alt, maxTimes, flags);
}

function exact(name: string): Item {
  const it = items.find((i) => i.name === name);
  assert(it !== undefined, `no item ${name}`);
  return it;
}

function Alias(alias: string, name: string): void {
  assert(aliases.length < MaxAliases, "too many aliases");
  aliases.push({ alias, item: exact(name) });
}

function Ex(a: string, b: string): void {
  assert(exclusions.length < MaxExclusions, "too many exclusions");
  exclusions.push({ a: exact(a), b: exact(b) });
}

function stats(): void {
  St("Body");
  St("Mind");
  St("Soul");
}

// pp. 20-81. The options' labels are short names of the choices, not
// the book's words; the cost tables of besm2_cg_po's rules/attributes.tsv.
// prettier-ignore
function attributes(): void {
  A("Animal Friendship", 20, 1, 6, []);
  A("Appearance", 21, 1, 6, []);
  A("Art of Distraction", 21, 1, 6, []);
  A("Astral Projection", 22, 3, 6, []);
  A("Aura of Command", 22, 1, 6, []);
  A("Combat Mastery", 23, 2, 6, []);
  A("Contamination", 23, 0, 6, []);
    L("difficult to spread", 1, 1); L("easy to spread", 2, 1);
  A("Damn Healthy!", 24, 1, 6, []);
  A("Dimensional Portal", 25, 0, 6, [Subject]);
    L("fixed portal", 2, 1); L("mobile portal", 3, 1); L("class of objects", 4, 1);
    F("extra aperture", 1, 0, Unlimited);
  A("Divine Relationship", 26, 1, 6, []);
  A("Dynamic Sorcery", 26, 0, 6, []);
    L("full", 4, 1); L("one discipline", 2, 1); L("other reality only", 1, 1);
  A("Elasticity", 28, 1, 2, []);
  A("ECM", 28, 1, 6, [Subject]);
    F("extra jamming type", 1, 0, 2);
  A("Energy Bonus", 29, 1, 6, []);
  A("Environmental Control", 29, 0, 6, [Subject]);
    L("light", 1, 0);
    L("darkness, partial", 1, -1); L("darkness, total", 2, -1);
    L("silence, barrier", 1, -2); L("silence, zone", 2, -2);
    L("temperature, one way", 1, -3); L("temperature, both ways", 2, -3);
    L("weather, specific", 1, -4); L("weather, general", 2, -4);
  A("Exorcism", 31, 1, 6, []);
  A("Extra Arms", 31, 1, 6, []);
  A("Extra Attacks", 32, 4, 6, []);
  A("Features or Accessories", 32, 1, 6, [Subject]);
  A("Flight", 33, 0, 6, []);
    L("can hover", 4, 1); L("cannot hover", 3, 1);
    F("skimmer or hovercraft", -1, -1, 1); F("glider", -2, -1, 1);
  A("Flunkies", 34, 1, 6, []);
  A("Focused Damage", 35, 1, 6, [Subject]);
  A("Force Field", 35, 0, 6, []);
    L("extendable or area", 4, 1); L("self only", 3, 1); L("wall", 2, 1);
  A("Ground Speed", 37, 2, 6, []);
  A("Gun Bunny", 38, 1, 6, [Subject]);
  A("Healing", 39, 4, 6, []);
  A("Heavy Armour", 40, 4, 6, []);
    F("partial, thin area", -1, -1, 1); F("partial, unarmoured area", -2, -1, 1);
    L("hidden", 0, 0); L("optimized", 0, 0);
    MinCost(1);
  A("Heightened Awareness", 41, 1, 2, []);
  A("Heightened Senses", 41, 1, 6, [Subject]);
  A("Highly Skilled", 42, 1, Unlimited, []);
  A("Illusion", 42, 0, 6, []);
    L("1 sense", 2, 1); L("2 senses", 3, 1); L("3 senses", 4, 1); L("4 senses", 5, 1);
    L("all 5 senses", 6, 1);
    F("extra illusion", 1, 0, Unlimited);
  A("Insubstantial", 43, 4, 6, [Subject]);
  A("Invisibility", 44, 0, 2, []);
    L("sensors only", 3, 1); L("vision", 5, 1); L("vision and sensors", 7, 1);
  A("Item of Power", 45, 2, 6, [Subject]);
  A("Jumping", 46, 1, 6, []);
  A("Kensei", 46, 1, 6, [Subject]);
  A("Life Support", 47, 1, 2, []);
  A("Light Armour", 48, 1, 6, []);
    F("partial, thin area", -1, -1, 1); F("partial, unprotected area", -2, -1, 1);
    L("hidden", 0, 0); L("optimized", 0, 0);
    MinCost(1);
  A("Magic (and Psionics)", 48, 4, 6, [Subject]);
    F("less powerful, 3 fewer PP", -1, -1, 1); F("less powerful, 5 fewer PP", -2, -1, 1);
    F("less powerful, 8 fewer PP", -3, -1, 1);
  A("Massive Damage", 51, 2, 6, []);
  A("Mechanical Genius", 52, 2, 6, []);
  A("Meld", 53, 0, 2, []);
    L("one class of objects", 2, 1); L("any inanimate", 4, 1);
    L("animate, one class", 4, 1); L("animate, any", 8, 1);
  A("Metamorphosis", 53, 5, 6, []);
    F("extra form, same Level", 2, 0, Unlimited); F("extra form, lower Level", 1, 0, Unlimited);
  A("Mind Control", 55, 0, 6, [Subject]);
    L("anything with a mind", 4, 1); L("broad category", 3, 1); L("narrow category", 2, 1);
    L("one type of control", -1, 0);
  A("Mind Shield", 56, 1, 6, []);
  A("Natural Weapons", 57, 1, 6, [Subject]);
  A("Organizational Ties", 58, 0, 6, [Subject]);
    L("moderate power", 1, 1); L("significant power", 2, 1); L("great power", 3, 1);
  A("Own a Big Mecha", 59, 4, 6, [Subject]);
    F("less powerful, 5 fewer MP", -1, 0, Unlimited);
    MinCost(1);
  A("Personal Gear", 62, 1, 6, [Subject]);
  A("Place of Power", 63, 1, 6, [Subject]);
  A("Precognition", 63, 0, 2, []);
    L("uncontrolled", 1, 1); L("deliberate", 2, 1);
  A("Regeneration", 64, 4, 6, []);
    F("one uncommon attack not regenerated", -1, -1, 1); F("one common attack not regenerated", -2, -1, 1);
  A("Reincarnation", 64, 3, 6, []);
  A("Sensors", 65, 1, 6, [Subject]);
    L("underwater", 0, -1); L("analytic", 0, -1); L("indirect", 0, -1);
    F("analytic function", 1, 0, 1);
  A("Servant", 66, 0, 6, [Subject]);
    L("single servant", 1, 1); L("replaceable", 2, 1);
  A("Shape Change", 66, 0, 2, []);
    L("self or others", 2, 1); L("self and others", 3, 1);
    L("one type of change", -1, 0);
  A("Shield", 67, 1, 6, []);
  A("Sixth Sense", 68, 1, 6, [Subject]);
  A("Size Change", 69, 0, 6, []);
    L("shrink and grow", 2, 1); L("one direction", 1, 1);
  A("Space Flight", 70, 2, 6, []);
  A("Special Defense", 71, 1, 2, [Subject]);
  A("Special Movement", 71, 1, 6, [Subject]);
  A("Speed", 72, 1, 6, []);
  A("Spirit Ward", 72, 1, 6, []);
  A("Star Flight", 73, 2, 6, []);
  A("Stealth", 73, 1, 6, [Subject]);
    F("extra sense", 1, 0, Unlimited);
  A("Super Strength", 74, 0, 6, []);
    L("whole body", 3, 1); L("one limb", 2, 1);
  A("Swarm", 74, 2, 6, []);
  A("Telekinesis", 75, 0, 6, [Subject]);
    L("any matter", 2, 1); L("one kind of matter", 1, 1);
  A("Telepathy", 76, 0, 6, []);
    L("quite restricted", 1, 1); L("somewhat restricted", 2, 1); L("universal", 3, 1);
  A("Teleport", 78, 0, 6, []);
    L("self or others", 5, 1); L("self and others", 10, 1);
  A("Transmutation", 78, 0, 6, [Subject]);
    L("anything", 4, 1); L("general class", 2, 1); L("specific category", 1, 1);
  A("Tunnelling", 79, 2, 6, []);
  A("Unique Character Attribute", 80, 0, 6, [Subject, GmCost]);
  A("Water Speed", 81, 0, 6, []);
    L("mecha, surface", 2, 1); L("mecha, underwater", 3, 1);
    L("character, swimming", 2, 1); L("character, amphibious", 3, 1);
  // Its secondary attacks, Different Gunner and damage: calc's
  A("Weapon Attack", 81, 4, 6, [Subject]);
}

// pp. 93-99.
// prettier-ignore
function mechaAttributes(): void {
  MA("A.I.", 93, 2, 6, [MechaOnly]);
  MA("Extra Capacity", 94, 1, 6, [MechaOnly]);
  MA("Extra Endurance", 94, 1, 6, [MechaOnly]);
  MA("Manoeuvre Bonus", 94, 1, 6, [Subject, MechaOnly]);
  MA("Mecha Regeneration", 95, 4, 6, [MechaOnly]);
  MA("Mechanical Transformation", 95, 0, 6, []);
    L("full-powered form", 4, 1); L("half-powered form", 2, 1);
    F("non-sequential", 1, 0, 1);
  MA("Merging", 96, 2, 6, []);
  MA("Multiple Mecha Attacks", 97, 10, 6, [MechaOnly]);
  MA("Special Equipment", 98, 2, 6, [Subject]);
  MA("Subordinate Mecha", 98, 1, 6, [Subject, MechaOnly]);
  MA("Summonable", 98, 4, 2, [MechaOnly]);
  MA("Super Transformation", 99, 0, 6, [MechaOnly]);
    L("half-powered form", 3, 1); L("full-powered form", 5, 1);
  MA("Toughness", 99, 4, 6, [MechaOnly]);
}

// pp. 101-113; Unique Defect Sample - Weak Point (p. 112) is an example
// of Unique Character Defect, not a Defect of its own.
// prettier-ignore
function defects(): void {
  D("Ageism", 101, 1, 2, []);
  D("Attack Restriction", 101, 1, 2, []);
  D("Awkward", 101, 1, 2, []);
  D("Awkward Size", 101, 1, 6, [Special]);
  D("Bane", 102, 1, 2, [Special]);
  D("Cannot Talk", 102, 1, 2, []);
  D("Conditional Ownership", 103, 1, 2, [Special]);
  D("Cursed", 103, 1, 2, [Special]);
  D("Diminutive", 103, 3, 2, [Special]);
  D("Easily Distracted", 104, 1, 2, []);
  D("Girl/Guy Magnet", 104, 1, 2, []);
  D("Hangar Queen", 105, 1, 2, [Special]);
  D("Inept Combat", 105, 1, 2, []);
  D("Involuntary Physical Change", 105, 1, 2, [Special]);
  D("Magical Restrictions", 105, 1, 2, [Special]);
  D("Marked", 106, 1, 2, []);
  D("Nemesis", 106, 1, 2, []);
  D("Not So Fast", 107, 1, 2, []);
  D("Not So Strong", 107, 1, 2, []);
  D("Not So Tough", 107, 1, 2, []);
  D("One Arm/No Arms", 108, 1, 2, []);
  D("One-Way Transformation", 108, 1, 2, [Special]);
  D("Owned By A Megacorp", 108, 1, 2, []);
  D("Phobia", 108, 1, 2, []);
  D("Physically Unappealing", 109, 1, 2, []);
  D("Recurring Nightmares", 109, 1, 2, []);
  D("Red Tape", 109, 1, 2, []);
  D("Restricted Ground Movement", 110, 1, 2, [Special]);
  D("Restricted Path", 110, 1, 2, [Special]);
  D("Sensory Impairment", 110, 1, 2, []);
  D("Significant Other (S.O.)", 111, 1, 2, []);
  D("Skeleton in the Closet", 111, 1, 2, []);
  D("Special Requirement", 112, 1, 2, [Special]);
  D("Unique Character Defect", 112, 1, 2, [GmCost]); // Normal or Special
  D("Unskilled", 112, 1, 2, []);
  D("Volatile", 113, 1, 2, [Special]);
  D("Vulnerability", 113, 1, 2, [Special]);
  D("Wanted", 113, 1, 2, []);
}

// pp. 114-116.
// prettier-ignore
function mechaDefects(): void {
  MD("Crew Requirement", 114, 6);
  MD("Exposed Occupants", 114, 2);
  MD("Limited Endurance", 114, 2);
  MD("Mutual Damage", 115, 2);
  MD("Noisy", 115, 2);
  MD("Poor Manoeuvrability", 115, 2);
  MD("Reduced Capacity", 115, 2);
  MD("Start-Up Time", 116, 2);
  MD("Summoning Object", 116, 2);
  MD("Wind Powered", 116, 2);
}

// pp. 120-128, the costs from Table 2-4 (p. 119): Cyberpunk, Hot Rods
// and Guns, Martial Arts, Medieval Fantasy, Modern Military, Occult
// Horror, Space Opera, Teenage Romance.
// prettier-ignore
function skills(): void {
  S("Acrobatics", 120, 4, 4, 5, 3, 2, 4, 3, 3);
  S("Animal Training", 120, 1, 1, 1, 2, 1, 1, 1, 1);
  S("Architecture", 120, 2, 1, 1, 2, 2, 1, 1, 1);
  S("Artisan", 121, 2, 2, 4, 4, 2, 2, 1, 2);
  S("Biological Sciences", 121, 4, 2, 1, 2, 2, 3, 4, 2);
  S("Boating", 121, 2, 3, 2, 3, 2, 1, 1, 2);
  S("Burglary", 121, 3, 2, 2, 4, 2, 2, 2, 2);
  S("Business Management", 121, 2, 4, 2, 2, 2, 1, 2, 2);
  S("Computers", 121, 5, 4, 1, 0, 4, 2, 4, 3);
  S("Controlled Breathing", 121, 1, 1, 3, 2, 2, 3, 1, 1);
  S("Cooking", 121, 1, 1, 1, 1, 1, 1, 1, 4);
  S("Cultural Arts", 122, 2, 2, 2, 2, 1, 1, 1, 4);
  S("Demolitions", 122, 3, 4, 2, 3, 3, 2, 2, 2);
  S("Disguise", 122, 3, 3, 3, 3, 2, 2, 2, 2);
  S("Driving", 122, 3, 6, 2, 2, 4, 2, 2, 4);
  S("Electronics", 122, 4, 4, 2, 0, 4, 2, 4, 2);
  S("Forgery", 122, 3, 4, 1, 2, 2, 2, 2, 2);
  S("Gaming", 122, 2, 2, 1, 2, 1, 1, 2, 4);
  S("Interrogation", 122, 3, 3, 3, 3, 3, 2, 2, 3);
  S("Intimidation", 123, 4, 4, 4, 4, 3, 3, 3, 4);
  S("Law", 123, 3, 2, 2, 2, 1, 1, 2, 2);
  S("Linguistics", 123, 2, 2, 2, 3, 2, 1, 2, 2);
  S("Mechanics", 123, 3, 4, 2, 2, 4, 2, 4, 3);
  S("Medical", 123, 4, 3, 4, 4, 4, 3, 3, 2);
  S("Military Sciences", 123, 3, 3, 2, 3, 5, 2, 3, 2);
  S("Navigation", 124, 2, 3, 2, 2, 3, 2, 3, 2);
  S("Performing Arts", 124, 2, 1, 1, 2, 1, 1, 1, 4);
  S("Physical Sciences", 124, 2, 2, 1, 1, 2, 2, 3, 2);
  S("Piloting", 124, 3, 4, 2, 0, 4, 1, 5, 2);
  S("Poisons", 124, 2, 2, 2, 3, 1, 2, 1, 2);
  S("Police Sciences", 125, 3, 4, 2, 2, 2, 2, 3, 2);
  S("Riding", 125, 1, 1, 1, 3, 1, 1, 1, 2);
  S("Seduction", 125, 3, 2, 3, 3, 3, 2, 3, 4);
  S("Sleight of Hand", 125, 2, 2, 2, 4, 2, 2, 2, 3);
  S("Social Sciences", 125, 2, 2, 2, 1, 2, 1, 2, 2);
  S("Sports", 125, 1, 1, 2, 1, 1, 1, 1, 5);
  S("Stealth", 125, 4, 4, 4, 4, 4, 4, 4, 3);
  S("Swimming", 126, 1, 1, 1, 1, 1, 1, 1, 2);
  S("Urban Tracking", 126, 4, 4, 3, 3, 3, 3, 3, 3);
  S("Visual Arts", 126, 1, 1, 2, 2, 1, 1, 1, 3);
  S("Wilderness Survival", 126, 1, 1, 2, 3, 3, 2, 2, 2);
  S("Wilderness Tracking", 126, 1, 1, 2, 3, 3, 2, 2, 2);
  S("Writing", 126, 2, 1, 1, 1, 1, 1, 2, 3);
  S("Archery", 127, 4, 4, 4, 5, 3, 4, 2, 4);
  S("Gun Combat", 127, 5, 6, 4, 0, 5, 4, 5, 3);
  S("Heavy Weapons", 127, 5, 4, 4, 0, 5, 4, 5, 0);
  S("Melee Attack", 127, 4, 4, 6, 5, 4, 5, 4, 5);
  S("Melee Defense", 127, 4, 4, 6, 5, 4, 5, 4, 5);
  S("Ranged Defense", 127, 5, 6, 4, 4, 5, 5, 5, 4);
  S("Thrown Weapons", 128, 4, 4, 5, 4, 4, 4, 4, 4);
  S("Unarmed Attack", 128, 4, 4, 6, 4, 4, 5, 4, 5);
  S("Unarmed Defense", 128, 4, 4, 6, 4, 4, 5, 4, 5);
}

// pp. 83-89. Contagious is 3 slots mild, taken twice (6) highly.
// prettier-ignore
function weaponAbilities(): void {
  WA("Accurate", 83, 1, 0, 3, []);
  WA("Affects Incorporeal", 83, 1, 0, 1, [NotPersonalGear]);
  WA("Area Effect", 84, 1, 0, Unlimited, []);
  WA("Aura", 84, 2, 0, 1, []);
  WA("Auto-Fire", 84, 3, 0, 1, []); // 1 with creation.options auto-fire-slots (question 12)
  WA("Burning", 84, 1, 0, 1, []);
  WA("Concealable", 85, 1, 0, 1, []);
  WA("Contagious", 85, 3, 0, 2, [NeedsDetail]);
  WA("Drain Body", 85, 1, 0, 1, []);
  WA("Drain Energy", 85, 1, 0, 1, []);
  WA("Drain Mind", 85, 1, 0, 1, []);
  WA("Drain Soul", 85, 1, 0, 1, [NotPersonalGear]);
  WA("Flare", 86, 1, 0, Unlimited, []);
  WA("Flexible", 86, 1, 0, 1, []);
  WA("Homing", 86, 1, 2, 1, []);
  WA("Incapacitating", 86, 3, 0, 1, [NeedsDetail]);
  WA("Incurable", 86, 2, 0, 1, [NeedsDetail, NotPersonalGear]);
  WA("Indirect", 86, 1, 0, 1, []);
  WA("Irritant", 87, 1, 0, 1, []);
  WA("Linked (Attack)", 87, 2, 0, 1, [NeedsDetail]);
  WA("Linked (Attribute)", 87, 1, 0, 1, [NeedsDetail]);
  WA("Long Range", 87, 1, 0, Unlimited, []);
  WA("Muscle-Powered", 87, 1, 0, 1, []);
  WA("No Regeneration", 88, 1, 0, 1, [NotPersonalGear]);
  WA("Penetrating (Armour)", 88, 1, 0, 2, []);
  WA("Penetrating (Force Field)", 88, 1, 0, 2, []);
  WA("Quake", 88, 1, 0, 1, []);
  WA("Soul Attack", 88, 5, 2, 1, [NotPersonalGear]);
  WA("Spreading", 88, 1, 0, Unlimited, []);
  WA("Stun", 88, 1, 0, 1, []);
  WA("Tangle", 88, 1, 0, 1, []);
  WA("Trap", 89, 1, 0, 1, []);
  WA("Unique Ability", 89, 1, 0, Unlimited, [NeedsDetail, GmCost]);
  WA("Vampiric", 89, 1, 2, 1, [NotPersonalGear]);
}

// pp. 89-92.
// prettier-ignore
function weaponDisabilities(): void {
  WD("Backblast", 89, 1, 0, 2, []);
  WD("Drop Shields", 90, 1, 0, 1, []);
  WD("Exposed (Mecha Only)", 90, 1, 0, 1, [MechaOnly]);
  WD("Extra Energy", 90, 1, 0, Unlimited, []);
  WD("Fixed (Mecha Only)", 90, 1, 0, 1, [MechaOnly]);
  WD("Inaccurate", 90, 1, 0, 3, []);
  WD("Internal", 90, 1, 0, 1, [NeedsDetail]);
  WD("Limited Shots", 90, 1, 0, 3, []);
  WD("Low Penetration", 90, 1, 0, 1, []);
  WD("Melee", 91, 2, 0, 1, []);
  WD("No Damage", 91, 1, 0, 1, []);
  WD("Only In (Environment)", 91, 1, 2, 1, [NeedsDetail]);
  WD("Self-Destruct", 91, 4, 0, 1, []);
  WD("Short Range", 91, 1, 0, 1, []);
  WD("Slow", 91, 1, 0, 5, []);
  WD("Static", 91, 1, 0, 1, []);
  WD("Stoppable", 91, 1, 0, Unlimited, []);
  WD("Toxic", 92, 1, 0, 1, []);
  WD("Unique Weapon Disability", 92, 1, 0, Unlimited, [NeedsDetail, GmCost]);
  WD("Unreliable", 92, 1, 0, 1, []);
  WD("Uses Energy", 92, 1, 0, 2, []);
}

// The pairs that don't go together, from each entry's own exclusions
// (besm2_cg_po's rules/weapon-abilities-disabilities.tsv), each pair once.
// prettier-ignore
function exclusionPairs(): void {
  Ex("Accurate", "Linked (Attack)");
  Ex("Area Effect", "Vampiric");
  Ex("Aura", "Backblast"); Ex("Aura", "Melee"); Ex("Aura", "Short Range"); Ex("Aura", "Quake");
  Ex("Linked (Attack)", "Long Range"); Ex("Linked (Attack)", "Inaccurate");
  Ex("Linked (Attack)", "Melee"); Ex("Linked (Attack)", "Short Range");
  Ex("Linked (Attack)", "Low Penetration"); Ex("Linked (Attack)", "Slow");
  Ex("Long Range", "Melee"); Ex("Long Range", "Short Range");
  Ex("Penetrating (Armour)", "Low Penetration"); Ex("Penetrating (Force Field)", "Low Penetration");
  Ex("Limited Shots", "Self-Destruct");
  Ex("Melee", "Short Range"); Ex("Melee", "Stoppable");
}

// prettier-ignore
function aliasNames(): void {
  // The headings' full names (besm2_cg_po's rules/headings.tsv)
  Alias("Electronic Counter-Measures (ECM)", "ECM");
  Alias("Own a Big Mecha (OBM)", "Own a Big Mecha");
  Alias("OBM", "Own a Big Mecha");
  Alias("Weapon Attack (or Special Attack)", "Weapon Attack");
  Alias("Special Attack", "Weapon Attack");
  Alias("Artificial Intelligence (A.I.)", "A.I.");
  Alias("Wind-Powered", "Wind Powered");
  Alias("Magic (or Psionics)", "Magic (and Psionics)"); // Table 2-2's
  Alias("Magic", "Magic (and Psionics)");
  Alias("Significant Other", "Significant Other (S.O.)");
  // Features or Accessories, shown as either word (question 11)
  Alias("Features", "Features or Accessories");
  Alias("Accessories", "Features or Accessories");
  // BESM 2nd edition and Big Robots, Cool Starships names (question 11)
  Alias("Weapon", "Weapon Attack");
  Alias("Hanger Queen", "Hangar Queen");
  Alias("Super-Strength", "Super Strength");
  Alias("Armour", "Heavy Armour");
  Alias("Unique Defect", "Unique Character Defect");
  Alias("Unarmed Defence", "Unarmed Defense");
}

// ---- Finding items ----

/** How many items of a kind there are. */
export function count(kind: Kind): number {
  return counts[kind] ?? 0;
}

/** The i'th item of a kind, 0 <= i < count(kind), in the book's order. */
export function get(kind: Kind, i: number): Item {
  assert(i >= 0 && i < count(kind), `no item ${i} of kind ${kind}`);
  const it = items[(firsts[kind] ?? 0) + i];
  assert(it !== undefined, "items out of step");
  return it;
}

/**
 * The item named name, ignoring case, or by an alias ("Weapon" for
 * "Weapon Attack"); undefined if there is none. Names are unique across
 * the kinds, but for Stealth, an Attribute (p. 73) and a Skill (p. 125):
 * find gives the Attribute, findKind either.
 */
export function find(name: string): Item | undefined {
  for (const it of items) if (sameName(it.name, name)) return it;
  for (const a of aliases) if (sameName(a.alias, name)) return a.item;
  return undefined;
}

/** The item of kind named name, or by an alias; undefined if there is none. */
export function findKind(kind: Kind, name: string): Item | undefined {
  const f = firsts[kind] ?? 0;
  for (let i = f; i < f + count(kind); i++) {
    const it = items[i];
    if (it !== undefined && sameName(it.name, name)) return it;
  }
  for (const a of aliases)
    if (a.item.kind === kind && sameName(a.alias, name)) return a.item;
  return undefined;
}

/** How many aliases there are. */
export function aliasCount(): number {
  return aliases.length;
}

/** The i'th alias, 0 <= i < aliasCount(), and its item. */
export function getAlias(i: number): { alias: string; item: Item } {
  const a = aliases[i];
  assert(a !== undefined, `no alias ${i}`);
  return { alias: a.alias, item: a.item };
}

/** Whether Weapon Abilities or Disabilities a and b don't go together. */
export function excludes(a: Item | undefined, b: Item | undefined): boolean {
  return exclusions.some(
    (e) => (e.a === a && e.b === b) || (e.a === b && e.b === a),
  );
}

// ---- What the page shows (PLAN.md, "Pages beside names") ----

/** The PDF's page index of a printed page. */
export function pdfIndex(page: number): number {
  return page + PdfPageOffset;
}

/** The PDF page an item is on, for the viewer; 0 for none. */
export function pdfPage(it: Item | undefined): number {
  return it === undefined ? 0 : pdfIndex(it.page);
}

/** "p. 42, PDF 44" for a printed page. */
export function pagesText(page: number): string {
  assert(page >= 0, "a page >= 0");
  return `p. ${page}, PDF ${pdfIndex(page)}`;
}

/** "p. 42, PDF 44"; "p. ?" for none, an item the tables don't have. */
export function pageText(it: Item | undefined): string {
  return it === undefined ? "p. ?" : pagesText(it.page);
}

/** "Secondary Attack (p. 82, PDF 84)": a name with a page. */
export function pageLabel(name: string, page: number): string {
  return `${name} (${pagesText(page)})`;
}

/**
 * "Highly Skilled (p. 42, PDF 44)": an item's name with its pages, as
 * every name is shown.
 */
export function label(it: Item): string {
  return pageLabel(it.name, it.page);
}

/**
 * name's label, as written, if the tables have it (by an alias too):
 * "Natural Attack (p. ?)" if they don't.
 */
export function labelOf(name: string): string {
  const it = find(name);
  return it !== undefined ? pageLabel(name, it.page) : `${name} (p. ?)`;
}

const genreNames = [
  "Cyberpunk",
  "Hot Rods and Guns",
  "Martial Arts",
  "Medieval Fantasy",
  "Modern Military",
  "Occult Horror",
  "Space Opera",
  "Teenage Romance",
] as const;

/** Table 2-4's name of genre g: "Modern Military". */
export function genreName(g: number): string {
  const s = genreNames[g];
  assert(s !== undefined, `no genre ${g}`);
  return s;
}

/** The genre named name, ignoring case; -1 if none. */
export function findGenre(name: string): number {
  for (let g = 0; g < NGenres; g++) if (sameName(genreName(g), name)) return g;
  return -1;
}

// ---- The rulebook's small tables ----

/**
 * A Stat's cost under the Staged Stat Cost rule (Table 4-7, p. 166, PDF
 * 168): 1-5 their value; 6 = 7, 7 = 9, 8 = 11, 9 = 14, 10 = 17, 11 = 20,
 * 12 = 24.
 */
export function stagedStatCost(value: number): number {
  assert(
    Number.isInteger(value) && value >= 1 && value <= 12,
    `a Stat of 1 to 12: ${value}`,
  );
  if (value <= 5) return value;
  return [7, 9, 11, 14, 17, 20, 24][value - 6] as number;
}

function init(): void {
  stats();
  attributes();
  mechaAttributes();
  defects();
  mechaDefects();
  skills();
  weaponAbilities();
  weaponDisabilities();
  exclusionPairs();
  aliasNames();
  cur = undefined;
}

init();
