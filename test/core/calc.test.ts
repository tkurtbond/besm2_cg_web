// The checks of besm2_cg_po's test/TestCalc.Mod, with its labels: calc
// on the fixtures by hand, and a case for each rule (its PLAN.md, Part B
// step 2).
//
// The oracle is the characters and mecha whose numbers follow the
// rules: besm2_fmt's fixtures Lieutenant Enyon Boase and the FV2021
// Coleopteran, and the Red Planet Blue Helmets campaign's Cador
// Trewartha and WT-34 Bogatyr, each built here by hand from its file,
// and every number the file holds compared with calc's. (Phase 3's
// tests load the files themselves.) Auto-Fire is 3 slots and Melee 2,
// as the book says.
//
// Then a hand-made case for each rule: Stats, the Staged Stat Cost,
// each derived value and what changes it, options, least costs, each
// Weapon Ability and Disability (its damage, Personal Gear, Mecha Only,
// and which others it excludes), primary and secondary attacks,
// Different Gunners, Skill Points and Skills, Mecha Points, each limit
// and warning, and overrides counting downstream.
//
// As in the Oberon, the cases run in order at load, each check
// registering a test with its result.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as C from "../../src/core/calc.ts";
import * as R from "../../src/core/rules.ts";

let sample = ""; // what is being checked, for labels
let e: C.Entity;
let a: C.Attr;
let d: C.Defect;
let s: C.Skill;
let m: C.Mod;
let h: C.HouseSkill;

// ---- Labels and checks ----

function check(ok: boolean, label: string): void {
  test(label, () => assert.ok(ok, label));
}

function L(what: string): string {
  return `${sample}: ${what}`;
}

// Checks got = want, the label saying both.
function is(got: number, want: number, what: string): void {
  let label = `${L(what)} ${want}`;
  if (got !== want) label += ` (got ${got})`;
  check(got === want, label);
}

function yes(ok: boolean, what: string): void {
  check(ok, L(what));
}

// Whether e has a warning code about a (or about anything if a is
// undefined), as want says.
function warns(
  code: number,
  about: C.Attr | undefined,
  want: boolean,
  what: string,
): void {
  const label = L(what) + (want ? ": warned" : ": not warned");
  check(C.hasWarning(e, code, about) === want, label);
}

// e has no warnings; else they are listed.
function noWarnings(): void {
  let label = L("no warnings");
  if (e.warnings !== undefined) {
    label += " (got";
    for (
      let w: C.Warning | undefined = e.warnings;
      w !== undefined;
      w = w.next
    ) {
      label += ` ${w.code}`;
      if (w.attr !== undefined) label += `@L${w.attr.level}`;
    }
    label += ")";
  }
  check(e.warnings === undefined, label);
}

// ---- Building ----

function need(kind: number, name: string): R.Item {
  const it = kind < 0 ? R.find(name) : R.findKind(kind as R.Kind, name);
  if (it === undefined) throw new Error(`no such item: ${name}`);
  return it;
}

function newEntity(isMecha: boolean): C.Entity {
  e = new C.Entity();
  C.initEntity(e, isMecha);
  return e;
}

function stats(body: number, mind: number, soul: number): void {
  e.stat[C.Body] = body;
  e.stat[C.Mind] = mind;
  e.stat[C.Soul] = soul;
}

// A new Attribute of e.
function at(name: string, level: number): C.Attr {
  const x = new C.Attr();
  C.initAttr(x, need(-1, name), level);
  C.addAttr(e, x);
  return x;
}

function unknown(level: number): C.Attr {
  const x = new C.Attr();
  C.initAttr(x, undefined, level);
  C.addAttr(e, x);
  return x;
}

// A new Weapon Attack of e; a is it, for ab and di.
function wp(level: number): C.Attr {
  a = at("Weapon Attack", level);
  return a;
}

// A Weapon Ability (or Disability) of a, counting as countsAs (0: the book's).
function modOf(it: R.Item | undefined, countsAs: number): void {
  m = new C.Mod();
  C.initMod(m, it, countsAs);
  if (it !== undefined && it.kind === R.Disability)
    a.disabilities = C.addMod(a.disabilities, m);
  else a.abilities = C.addMod(a.abilities, m);
}

function ab(name: string, countsAs: number): void {
  modOf(need(R.Ability, name), countsAs);
}

function di(name: string, countsAs: number): void {
  modOf(need(R.Disability, name), countsAs);
}

function df(name: string, rank: number): C.Defect {
  d = new C.Defect();
  C.initDefect(d, need(-1, name), rank);
  C.addDefect(e, d);
  return d;
}

function sk(name: string, level: number, specs: number): C.Skill {
  s = new C.Skill();
  C.initSkill(s, need(R.Skill, name), undefined, level, specs);
  C.addSkill(e, s);
  return s;
}

// A house Skill of e's creation at cost in Modern Military, and a Skill of it.
function houseSk(cost: number, level: number): C.Skill {
  h = new C.HouseSkill();
  C.initHouseSkill(h);
  h.cost[R.ModernMilitary] = cost;
  C.addHouseSkill(e.creation, h);
  s = new C.Skill();
  C.initSkill(s, undefined, h, level, 1);
  C.addSkill(e, s);
  return s;
}

const V = C.value;

// ---- The fixtures and the campaign ----

function coleopteran(): C.Entity {
  const mecha = newEntity(true);
  a = at("Heavy Armour", 2);
  C.setOption(a, "partial, thin area", 1);
  a = at("Super-Strength", 1);
  a = at("Toughness", 2);
  a = at("Ground Speed", 1);
  a = at("Manoeuvre Bonus", 4);
  a = at("Accessories", 2);
  a = at("Life Support", 2);
  a = at("Sensors", 1);
  a = wp(3); // Railgun
  ab("Long Range", 0);
  di("Unreliable", 0);
  a = wp(2); // Plasma Fist
  di("Melee", 0);
  di("Limited Shots", 0);
  a = wp(2); // Rocket Pod
  ab("Auto-Fire", 0);
  ab("Area Effect", 0);
  di("Limited Shots", 2);
  di("Stoppable", 0);
  d = df("Awkward Size", 2);
  d = df("Hanger Queen", 1);
  return mecha;
}

function checkColeopteran(mecha: C.Entity, owner: string): void {
  e = mecha;
  sample = `${owner}'s FV2021 Coleopteran`;
  const want = [7, 3, 8, 2, 4, 2, 2, 1, 12, 1, 1];
  let i = 0;
  for (let p = e.attrs; p !== undefined; p = p.next) {
    is(V(p.points), want[i]!, `attribute ${i + 1} points`);
    i++;
  }
  let p = e.attrs!;
  for (i = 1; i <= 8; i++) p = p.next!;
  is(V(p.damage), 45, "Railgun damage");
  yes(p.isPrimary, "Railgun is the primary");
  is(V(p.next!.damage), 75, "Plasma Fist damage");
  is(V(p.next!.next!.damage), 15, "Rocket Pod damage");
  is(V(e.defects!.points), -2, "Awkward Size 2");
  is(V(e.defects!.next!.points), -1, "Hangar Queen 1");
  is(e.attrTotal, 43, "attributes");
  is(e.bonusPoints, 3, "Mecha Bonus Points");
  is(e.spent, 40, "Mecha Points spent");
  is(e.available, 40, "Mecha Points");
  is(V(e.ar), 20, "AR");
  yes(e.hasAR, "has AR");
  is(V(e.hp), 80, "HP");
  noWarnings();
}

function enyon(): void {
  sample = "Enyon Boase";
  const mecha = coleopteran();
  const pc = newEntity(false);
  stats(8, 6, 6);
  e.creation.characterPoints = 35;
  e.creation.genre = R.ModernMilitary;
  a = at("Combat Mastery", 3);
  a = at("Extra Attacks", 1);
  const obm = at("Own a Big Mecha", 2);
  obm.mecha = mecha;
  d = df("Conditional Ownership", 2);
  d = df("Unique Defect", 1);
  s = sk("Interrogation", 1, 0);
  s = sk("Law", 1, 1);
  s = sk("Military Sciences", 1, 1);
  s = houseSk(3, 1); // Persuasion, the campaign's house rule
  s = sk("Social Sciences", 1, 1);
  s = sk("Stealth", 1, 0);
  s = sk("Visual Arts", 1, 0);
  s = sk("Writing", 1, 1);
  C.compute(pc);
  e = pc;
  is(V(e.statPoints[C.Body]!), 8, "Body points");
  is(e.statTotal, 20, "Stats");
  is(V(e.acv), 9, "ACV");
  is(V(e.dcv), 7, "DCV");
  is(V(e.hp), 70, "HP");
  is(V(e.ep), 60, "EP");
  is(V(e.sv), 14, "SV");
  yes(!e.hasAR, "has no AR");
  is(V(e.attrs!.points), 6, "Combat Mastery 3");
  is(V(e.attrs!.next!.points), 4, "Extra Attacks 1");
  is(V(obm.points), 8, "Own a Big Mecha 2");
  is(e.attrTotal, 18, "attributes");
  is(V(e.defects!.points), -2, "Conditional Ownership 2");
  is(V(e.defects!.next!.points), -1, "Unique Character Defect 1");
  is(e.bonusPoints, 3, "Bonus Points");
  is(e.spent, 35, "Character Points spent");
  is(e.available, 35, "Character Points");
  s = e.skills!;
  is(V(s.points), 3, "Interrogation 1");
  s = s.next!;
  is(V(s.points), 1, "Law 1");
  s = s.next!;
  is(V(s.points), 5, "Military Sciences 1");
  s = s.next!;
  is(V(s.points), 3, "Persuasion 1 (house rule)");
  s = s.next!;
  is(V(s.points), 2, "Social Sciences 1");
  s = s.next!;
  is(V(s.points), 4, "Stealth 1 (the Skill)");
  s = s.next!;
  is(V(s.points), 1, "Visual Arts 1");
  s = s.next!;
  is(V(s.points), 1, "Writing 1");
  is(e.skillPoints, 20, "Skill Points");
  is(e.skillSpent, 20, "Skill Points spent");
  noWarnings();
  yes(mecha.owner === pc, "owns the Coleopteran");
  checkColeopteran(mecha, "Enyon Boase");
}

function cador(): void {
  sample = "Cador Trewartha";
  const mecha = coleopteran();
  const pc = newEntity(false);
  stats(6, 6, 6);
  e.creation.characterPoints = 35;
  e.creation.genre = R.ModernMilitary;
  a = at("Art of Distraction", 1);
  a = at("Combat Mastery", 3);
  a = at("Extra Attacks", 1);
  const obm = at("Own a Big Mecha", 2);
  obm.mecha = mecha;
  d = df("Conditional Ownership", 2);
  s = sk("Gun Combat", 2, 1);
  s = sk("Heavy Weapons", 2, 1);
  C.compute(pc);
  e = pc;
  is(e.statTotal, 18, "Stats");
  is(V(e.acv), 9, "ACV");
  is(V(e.dcv), 7, "DCV");
  is(V(e.hp), 60, "HP");
  is(V(e.ep), 60, "EP");
  is(V(e.sv), 12, "SV");
  is(V(e.attrs!.points), 1, "Art of Distraction 1");
  is(e.attrTotal, 19, "attributes");
  is(e.bonusPoints, 2, "Bonus Points");
  is(e.spent, 35, "Character Points spent");
  is(V(e.skills!.points), 10, "Gun Combat 2");
  is(V(e.skills!.next!.points), 10, "Heavy Weapons 2");
  is(e.skillSpent, 20, "Skill Points spent");
  noWarnings();
  checkColeopteran(mecha, "Cador Trewartha");
}

function bogatyr(): void {
  sample = "WT-34 Bogatyr";
  const mecha = newEntity(true);
  a = at("Heavy Armour", 3);
  C.setOption(a, "partial, thin area", 1);
  a = at("Super Strength", 3);
  a = at("Toughness", 3);
  a = at("Ground Speed", 2);
  a = at("Manoeuvre Bonus", 2);
  a = at("Manoeuvre Bonus", 2);
  a = at("Space Flight", 1);
  a = at("Features or Accessories", 2);
  a = at("Life Support", 2);
  a = at("Sensors", 2);
  const rifle = wp(3);
  ab("Long Range", 0);
  di("Unreliable", 0);
  const sword = wp(3);
  di("Melee", 0);
  const gatling = wp(3);
  ab("Accurate", 0);
  ab("Auto-Fire", 0);
  di("Limited Shots", 0);
  di("Unreliable", 0);
  d = df("Awkward Size", 3);
  d = df("Volatile", 1);
  // Its owner, as Arkady Varenkov's Own a Big Mecha 3
  const pc = newEntity(false);
  stats(4, 4, 4);
  const obm = at("Own a Big Mecha", 3);
  obm.mecha = mecha;
  C.compute(pc);
  is(V(obm.points), 12, "its owner's Own a Big Mecha 3");
  e = mecha;
  a = e.attrs!;
  is(V(a.points), 11, "Heavy Armour 3, partial thin");
  a = a.next!;
  is(V(a.points), 9, "Super Strength 3");
  a = a.next!;
  is(V(a.points), 12, "Toughness 3");
  a = a.next!;
  is(V(a.points), 4, "Ground Speed 2");
  a = a.next!;
  is(V(a.points), 2, "Manoeuvre Bonus 2");
  a = a.next!;
  a = a.next!;
  is(V(a.points), 2, "Space Flight 1");
  a = a.next!;
  for (let i = 1; i <= 3; i++) {
    is(V(a.points), 2, "Accessories, Life Support, Sensors 2");
    a = a.next!;
  }
  is(V(rifle.points), 12, "Particle Beam Rifle 3");
  is(V(rifle.damage), 45, "Particle Beam Rifle damage");
  is(V(sword.points), 2, "Plasma Sword 3");
  is(V(sword.damage), 75, "Plasma Sword damage");
  is(V(gatling.points), 2, "Gatling Gun 3");
  is(V(gatling.damage), 15, "Gatling Gun damage");
  is(e.attrTotal, 64, "attributes");
  is(e.bonusPoints, 4, "Mecha Bonus Points");
  is(e.spent, 60, "Mecha Points spent");
  is(e.available, 60, "Mecha Points");
  is(V(e.ar), 30, "AR");
  is(V(e.hp), 100, "HP");
  noWarnings();
}

// ---- Stats and derived values ----

function statsAndDerived(): void {
  sample = "Stats";
  e = newEntity(false);
  stats(8, 1, 12);
  e.creation.stagedStatCost = true;
  C.compute(e);
  is(V(e.statPoints[C.Body]!), 11, "Staged Stat Cost of 8");
  is(V(e.statPoints[C.Soul]!), 24, "of 12");
  is(e.statTotal, 36, "Staged total");
  noWarnings();
  e = newEntity(false);
  stats(12, 12, 0);
  C.compute(e);
  warns(C.TwoAtTwelve, undefined, true, "two at 12");
  warns(C.StatRange, undefined, true, "a Stat of 0");
  let w = e.warnings;
  while (w !== undefined && w.code !== C.StatRange) w = w.next;
  is(w!.stat, C.Soul, "the Stat out of range");
  e = newEntity(false);
  stats(13, 4, 4);
  C.compute(e);
  warns(C.StatRange, undefined, true, "a Stat of 13");
  e = newEntity(false);
  stats(9, 4, 4);
  e.creation.statCeiling = 8;
  C.compute(e);
  warns(C.StatRange, undefined, true, "9 above a stat-ceiling of 8");
  e.creation.statCeiling = 9;
  C.compute(e);
  noWarnings();

  sample = "Derived values";
  e = newEntity(false);
  stats(6, 6, 6);
  a = at("Combat Mastery", 2);
  C.compute(e);
  is(V(e.acv), 8, "ACV 6 + Combat Mastery 2");
  is(V(e.dcv), 6, "DCV");
  d = df("Inept Combat", 2);
  C.compute(e);
  is(V(e.acv), 6, "and Inept Combat 2");
  is(V(e.dcv), 4, "its DCV");
  e = newEntity(false);
  stats(2, 1, 1);
  d = df("Inept Combat", 2);
  C.compute(e);
  is(V(e.acv), 1, "Inept Combat doesn't lower ACV below 1");
  e = newEntity(false);
  stats(1, 1, 1);
  a = at("Combat Mastery", 1);
  d = df("Inept Combat", 2);
  C.compute(e);
  is(V(e.acv), 1, "nor Combat Mastery's 2 below 1");
  e = newEntity(false);
  stats(6, 4, 6);
  a = at("Damn Healthy!", 2);
  C.compute(e);
  is(V(e.hp), 80, "HP 60 + Damn Healthy! 2");
  is(V(e.sv), 16, "SV");
  d = df("Not So Tough", 1);
  C.compute(e);
  is(V(e.hp), 70, "and Not So Tough 1");
  d = df("Diminutive", 1);
  C.compute(e);
  is(V(e.hp), 14, "and Diminutive 1: / 5");
  is(V(e.sv), 3, "SV 14 / 5 rounded up");
  d.rank = 2;
  C.compute(e);
  is(V(e.hp), 3, "Diminutive 2: 70 / 20, rounded down");
  is(V(d.points), -6, "Diminutive 2 gives 6 BP");
  is(V(e.sv), 1, "SV 3 / 5 rounded up");
  e = newEntity(false);
  stats(4, 5, 3);
  a = at("Energy Bonus", 3);
  C.compute(e);
  is(V(e.ep), 70, "EP 40 + Energy Bonus 3");
  a = at("Place of Power", 2);
  C.compute(e);
  is(V(e.ep), 70, "Place of Power's EP are its own");
  e = newEntity(false);
  stats(4, 4, 4);
  a = at("Heavy Armour", 2);
  C.setOption(a, "hidden", 1);
  const la = at("Light Armour", 3);
  C.compute(e);
  is(V(e.ar), 15, "AR: Heavy Armour 2 hidden 8 + Light Armour 3 7");
  yes(e.hasAR, "has AR");
  C.setOption(a, "hidden", 0);
  C.setOption(la, "hidden", 1);
  C.compute(e);
  is(V(e.ar), 23, "AR: Heavy Armour 2 20 + Light Armour 3 hidden 3");
  la.level = 6;
  C.setOption(la, "hidden", 0);
  C.compute(e);
  is(V(e.ar), 35, "Light Armour 6 15");
  la.level = 1;
  C.compute(e);
  is(V(e.ar), 22, "Light Armour 1 2");
  e = newEntity(true);
  C.compute(e);
  is(V(e.hp), 40, "a mecha's 40 HP");
  is(V(e.sv), 8, "its SV");
}

// ---- Attributes ----

function attributes(): void {
  sample = "Attributes";
  e = newEntity(false);
  stats(4, 4, 4);
  a = at("Super Strength", 2);
  C.compute(e);
  is(V(a.points), 6, "Super Strength 2, whole body by default");
  C.setOption(a, "one limb", 1);
  C.compute(e);
  is(V(a.points), 4, "one limb");
  noWarnings();
  C.setOption(a, "whole body", 1);
  C.compute(e);
  warns(C.OptionClash, a, true, "both");

  e = newEntity(false);
  stats(4, 4, 4);
  a = at("Heavy Armour", 1);
  C.setOption(a, "partial, unarmoured area", 1);
  C.compute(e);
  is(V(a.points), 2, "Heavy Armour 1, partial unarmoured");
  a = at("Light Armour", 1);
  C.setOption(a, "partial, unprotected area", 1);
  C.compute(e);
  is(V(a.points), 1, "Light Armour 1, partial unprotected: at least 1");
  noWarnings();
  C.setOption(a, "partial, thin area", 1);
  C.compute(e);
  warns(C.OptionClash, a, true, "both partial options");
  C.setOption(a, "partial, thin area", 0);
  C.setOption(a, "partial, unprotected area", 2);
  C.compute(e);
  warns(C.TooOften, a, true, "a partial option twice");

  e = newEntity(false);
  stats(4, 4, 4);
  const mecha = newEntity(true);
  e = mecha;
  a = at("Toughness", 1);
  e = newEntity(false);
  stats(4, 4, 4);
  a = at("Own a Big Mecha", 1);
  a.mecha = mecha;
  C.setOption(a, "less powerful, 5 fewer MP", 1);
  C.compute(e);
  is(V(a.points), 3, "Own a Big Mecha 1, less powerful");
  is(mecha.available, 15, "its Mecha Points");
  is(mecha.spent, 4, "spent");
  e = mecha;
  noWarnings();
  e = mecha.owner!;
  C.setOption(a, "less powerful, 5 fewer MP", 4);
  C.compute(e);
  is(V(a.points), 1, "less powerful 4 times: at least 1");
  is(mecha.available, 0, "no Mecha Points");
  e = mecha;
  warns(C.OverMechaPoints, undefined, true, "the mecha spends more");
  e = mecha.owner!;
  const b = at("Own a Big Mecha", 1);
  b.mecha = mecha;
  C.compute(e);
  is(mecha.available, 20, "two Own a Big Mecha share it");

  e = newEntity(false);
  stats(4, 4, 4);
  a = at("Highly Skilled", 11);
  C.compute(e);
  is(V(a.points), 11, "Highly Skilled has no highest Level");
  a.level = 0;
  C.compute(e);
  warns(C.LevelRange, a, true, "Level 0");
  a = at("Life Support", 3);
  C.compute(e);
  warns(C.LevelRange, a, true, "Life Support 3, above 2");
  a = at("Toughness", 1);
  C.compute(e);
  warns(C.MechaOnly, a, true, "Toughness on a character");
  a = at("Unique Character Attribute", 2);
  C.compute(e);
  warns(C.NoCost, a, true, "the GM's cost, not given");
  C.override(a.points, 5);
  C.compute(e);
  warns(C.NoCost, a, false, "given by an override");
  a = unknown(1);
  C.compute(e);
  warns(C.UnknownItem, a, true, "an unknown Attribute");
}

// ---- Weapon Attacks ----

// Each Ability and Disability alone: its damage, with and without
// Personal Gear, and Mecha Only on a character.
function eachMod(kind: R.Kind): void {
  let ok = true;
  let gear = true;
  let mechaOnly = true;
  let bad = "";
  for (let i = 0; i < R.count(kind); i++) {
    const it = R.get(kind, i);
    e = newEntity(false);
    stats(4, 4, 4);
    a = wp(6);
    modOf(it, 0);
    C.compute(e);
    let slots = it.slots;
    if (R.sameName(it.name, "Auto-Fire")) slots = 3;
    const n = kind === R.Ability ? 6 - slots : 6 + slots;
    let want = 15 * n;
    if (R.sameName(it.name, "No Damage")) want = 0;
    const isMechaOnly = R.hasFlag(it, R.MechaOnly);
    const n2 = isMechaOnly ? 1 : 0;
    if (
      V(a.damage) !== want ||
      C.hasWarning(e, C.MechaOnly, a) !== isMechaOnly ||
      C.warningCount(e) !== n2
    ) {
      ok = false;
      bad += ` ${it.name}`;
    }
    a.personalGear = true;
    C.compute(e);
    want = R.sameName(it.name, "No Damage") ? 0 : 5 * n;
    if (
      V(a.damage) !== want ||
      V(a.points) !== 0 ||
      C.hasWarning(e, C.NotPersonalGear, a) !== R.hasFlag(it, R.NotPersonalGear)
    ) {
      gear = false;
      bad += ` gear:${it.name}`;
    }
    e = newEntity(true);
    a = wp(6);
    modOf(it, 0);
    C.compute(e);
    if (C.warningCount(e) !== 0) {
      mechaOnly = false;
      bad += ` mecha:${it.name}`;
    }
  }
  sample =
    kind === R.Ability ? "each Weapon Ability" : "each Weapon Disability";
  const failed = bad !== "" ? ` (failed:${bad})` : "";
  yes(
    ok,
    "its damage at Level 6, and Mecha Only warned on a character" + failed,
  );
  yes(
    gear,
    "as Personal Gear: a third of it, no points, and warned if not for Personal Gear" +
      failed,
  );
  yes(mechaOnly, "on a mecha, no warnings" + failed);
}

// Every pair of Abilities and Disabilities: warned exactly when rules
// excludes them.
function exclusions(): void {
  const nA = R.count(R.Ability);
  const get = (i: number): R.Item =>
    i < nA ? R.get(R.Ability, i) : R.get(R.Disability, i - nA);
  sample = "Exclusions";
  const n = nA + R.count(R.Disability);
  let ok = true;
  let pairs = 0;
  const failed: string[] = [];
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      if (i !== j) {
        const x = get(i);
        const y = get(j);
        e = newEntity(true);
        a = wp(6);
        modOf(x, 0);
        modOf(y, 0);
        C.compute(e);
        if (C.hasWarning(e, C.Excluded, a) !== R.excludes(x, y)) {
          ok = false;
          failed.push(`${x.name} with ${y.name}`);
        }
        if (R.excludes(x, y)) pairs++;
      }
  const k = Math.floor(pairs / 2);
  yes(
    ok,
    "every pair of Abilities and Disabilities warned exactly when excluded" +
      (failed.length > 0 ? ` (failed: ${failed.join("; ")})` : ""),
  );
  is(k, 19, "excluded pairs");
}

function weapons(): void {
  sample = "Weapon Attacks";
  e = newEntity(false);
  stats(4, 4, 4);
  let p = wp(3);
  let q = wp(2);
  C.compute(e);
  is(V(p.points), 12, "primary 3");
  is(V(q.points), 1, "secondary below it");
  yes(p.isPrimary && !q.isPrimary, "the first of the highest Level is primary");
  q.level = 3;
  C.compute(e);
  is(V(q.points), 2, "secondary at its Level");
  q.level = 4;
  C.compute(e);
  is(V(q.points), 16, "a higher Level becomes the primary");
  is(V(p.points), 1, "and the first one below it");
  q.level = 3;
  q.primary = true;
  C.compute(e);
  yes(q.isPrimary && !p.isPrimary, "primary: true chooses it");
  is(V(p.points), 2, "the other at its Level");
  q.level = 2;
  C.compute(e);
  is(V(q.points), 8, "a primary 2");
  warns(C.SecondaryAbove, p, true, "a secondary above the primary");
  q.primary = false;
  const g = wp(6);
  g.personalGear = true;
  C.compute(e);
  yes(p.isPrimary, "a Personal Gear weapon isn't the primary");
  is(V(g.points), 0, "nor costs anything");
  is(V(g.damage), 30, "5 damage a Level");
  noWarnings();
  p.differentGunner = true;
  C.compute(e);
  warns(C.GunnerNotMecha, p, true, "a Different Gunner on a character");

  sample = "KA-99 Archangel";
  e = newEntity(true);
  p = wp(1); // Harmonic Knife
  di("Melee", 0);
  q = wp(1); // Auto-Laser
  ab("Auto-Fire", 0);
  di("Limited Shots", 2);
  di("Unreliable", 0);
  C.compute(e);
  is(V(p.points), 4, "Harmonic Knife 1");
  is(V(p.damage), 45, "its damage");
  is(V(q.points), 2, "Auto-Laser 1");
  is(V(q.damage), 15, "its damage");
  noWarnings();

  sample = "Weapon Attacks";
  e = newEntity(true);
  p = wp(2);
  q = wp(2);
  q.differentGunner = true;
  C.compute(e);
  is(V(q.points), 7, "a secondary with a Different Gunner");
  noWarnings();

  e = newEntity(false);
  stats(4, 4, 4);
  a = wp(1);
  ab("Accurate", 0);
  C.compute(e);
  is(V(a.damage), 0, "Level 1, Accurate");
  warns(C.LowDamage, a, true, "under 15");
  a = wp(1);
  di("No Damage", 0);
  ab("Accurate", 0);
  C.compute(e);
  is(V(a.damage), 0, "No Damage");
  warns(C.LowDamage, a, false, "with No Damage");
  e = newEntity(false);
  stats(4, 4, 4);
  a = wp(6);
  di("Limited Shots", 3);
  C.compute(e);
  is(V(a.damage), 135, "Limited Shots x3");
  noWarnings();
  e.attrs!.disabilities!.countsAs = 4;
  C.compute(e);
  warns(C.TooOften, a, true, "Limited Shots x4");
  e = newEntity(false);
  stats(4, 4, 4);
  a = wp(6);
  ab("Contagious", 6);
  C.compute(e);
  is(V(a.damage), 0, "Contagious x2");
  warns(C.LowDamage, a, true, "0 damage");
  warns(C.TooOften, a, false, "taken twice");
  e = newEntity(false);
  stats(4, 4, 4);
  a = wp(6);
  ab("Area Effect", 5);
  C.compute(e);
  is(V(a.damage), 15, "Area Effect x5, unlimited");
  noWarnings();
  a = wp(6);
  modOf(undefined, 0);
  C.compute(e);
  is(V(a.damage), 75, "an unknown Ability is one slot");
  warns(C.UnknownItem, a, true, "an unknown Ability");

  sample = "Auto-Fire";
  const mecha = newEntity(true);
  a = wp(2);
  ab("Auto-Fire", 0);
  const pc = newEntity(false);
  stats(4, 4, 4);
  a = at("Own a Big Mecha", 1);
  a.mecha = mecha;
  C.compute(pc);
  is(V(mecha.attrs!.damage), 0, "3 slots by default, never below 0");
  is(mecha.attrs!.abilities!.slots, 3, "its slots");
  pc.creation.autoFireSlots = 1;
  C.compute(pc);
  is(V(mecha.attrs!.damage), 15, "1 slot with the owner's auto-fire-slots 1");
  pc.creation.autoFireSlots = 3;
  mecha.attrs!.abilities!.countsAs = 1;
  C.compute(pc);
  is(V(mecha.attrs!.damage), 15, "counts-as 1");
  e = mecha;
  warns(C.TooOften, undefined, false, "counts-as 1");
}

// ---- Defects, Skills and the totals ----

function defectsSkillsTotals(): void {
  sample = "Defects";
  e = newEntity(false);
  stats(4, 4, 4);
  d = df("Awkward Size", 6);
  C.compute(e);
  is(V(d.points), -6, "Awkward Size 6");
  d.rank = 7;
  C.compute(e);
  yes(C.hasWarning(e, C.LevelRange, undefined), "Awkward Size 7: out of range");
  d.rank = 1;
  d = df("Hangar Queen", 3);
  C.compute(e);
  yes(C.hasWarning(e, C.LevelRange, undefined), "Hangar Queen 3");
  d.rank = 2;
  d = df("Crew Requirement", 1);
  C.compute(e);
  yes(
    C.hasWarning(e, C.MechaOnly, undefined),
    "a Mecha-Only Defect on a character",
  );
  e = newEntity(false);
  stats(4, 4, 4);
  for (let i = 1; i <= 8; i++) d = df("Awkward", 1);
  C.compute(e);
  warns(C.TooManyDefects, undefined, false, "8 Defects");
  is(e.bonusPoints, 8, "8 BP");
  d = df("Awkward", 1);
  C.compute(e);
  warns(C.TooManyDefects, undefined, true, "9 Defects");
  e.creation.bonusCeiling = 8;
  C.compute(e);
  warns(C.OverBonusCeiling, undefined, true, "9 BP, ceiling 8");
  e.creation.bonusCeiling = 9;
  C.compute(e);
  warns(C.OverBonusCeiling, undefined, false, "ceiling 9");
  sample = "Stats' total";
  e = newEntity(false);
  stats(4, 4, 4);
  e.creation.statPointsCeiling = 11;
  C.compute(e);
  warns(C.StatPointsAbove, undefined, true, "Stats 12, ceiling 11");
  e.creation.statPointsCeiling = 12;
  C.compute(e);
  warns(C.StatPointsAbove, undefined, false, "Stats 12, ceiling 12");
  e.creation.statPointsFloor = 13;
  C.compute(e);
  warns(C.StatPointsBelow, undefined, true, "Stats 12, floor 13");
  e.creation.statPointsFloor = 12;
  C.compute(e);
  warns(C.StatPointsBelow, undefined, false, "Stats 12, floor 12");
  e.creation.statPointsCeiling = 0;
  e.creation.statPointsFloor = 0;
  e.creation.stagedStatCost = true;
  e.stat[C.Body] = 11;
  C.compute(e);
  e.creation.statPointsCeiling = e.statTotal - 1;
  C.compute(e);
  warns(
    C.StatPointsAbove,
    undefined,
    true,
    "the Stats' cost, Staged, not their values",
  );
  sample = "Defects";
  d = new C.Defect();
  C.initDefect(d, undefined, 2);
  C.addDefect(e, d);
  C.compute(e);
  is(V(d.points), -2, "an unknown Defect, its rank");
  yes(C.hasWarning(e, C.UnknownItem, undefined), "warned");

  sample = "Skills";
  e = newEntity(false);
  stats(4, 4, 4);
  e.creation.genre = R.ModernMilitary;
  C.compute(e);
  is(e.skillPoints, 20, "20 Skill Points");
  a = at("Highly Skilled", 2);
  C.compute(e);
  is(e.skillPoints, 40, "and Highly Skilled 2");
  d = df("Unskilled", 1);
  C.compute(e);
  is(e.skillPoints, 30, "and Unskilled 1");
  warns(C.SkilledAndUnskilled, undefined, true, "both");
  e = newEntity(false);
  stats(4, 4, 4);
  e.creation.genre = R.ModernMilitary;
  d = df("Unskilled", 2);
  C.compute(e);
  is(e.skillPoints, 0, "Unskilled 2");
  e.creation.skillPoints = 30;
  C.compute(e);
  is(e.skillPoints, 30, "the GM's 30");
  s = sk("Gun Combat", 3, 3);
  C.compute(e);
  is(V(s.points), 17, "Gun Combat 3, 3 specialisations");
  e.creation.genre = R.TeenageRomance;
  C.compute(e);
  is(V(s.points), 11, "in Teenage Romance");
  s = sk("Gun Combat", 7, 1);
  C.compute(e);
  warns(C.LevelRange, undefined, true, "Level 7");
  e = newEntity(false);
  stats(4, 4, 4);
  e.creation.genre = R.MedievalFantasy;
  s = sk("Gun Combat", 1, 1);
  C.compute(e);
  is(V(s.points), 0, "Gun Combat in Medieval Fantasy");
  warns(C.NotOffered, undefined, true, "not offered");
  e = newEntity(false);
  stats(4, 4, 4);
  s = sk("Law", 1, 1);
  s = sk("Law", 1, 1);
  C.compute(e);
  warns(C.NoGenreSet, undefined, true, "no genre");
  is(C.warningCount(e), 1, "warned once");
  e = newEntity(false);
  stats(4, 4, 4);
  e.creation.genre = R.ModernMilitary;
  s = houseSk(3, 2);
  C.compute(e);
  is(V(s.points), 6, "a house Skill 2 at 3");
  e.creation.genre = R.SpaceOpera;
  C.compute(e);
  warns(C.NotOffered, undefined, true, "a house Skill outside its genres");
  e.creation.genre = R.ModernMilitary;
  s = sk("Military Sciences", 3, 1);
  C.compute(e);
  is(e.skillSpent, 21, "21 spent");
  warns(C.OverSkillPoints, undefined, true, "over 20");
  s.house = h;
  C.compute(e);
  is(V(s.points), 9, "a house Skill's costs win over the book's");

  sample = "Totals";
  e = newEntity(false);
  stats(6, 6, 6);
  e.creation.characterPoints = 20;
  a = at("Combat Mastery", 2);
  C.compute(e);
  warns(C.OverCharacterPoints, undefined, true, "22 spent of 20");
  e.creation.backgroundPoints = 2;
  C.compute(e);
  is(e.available, 22, "and 2 Background Points");
  warns(C.OverCharacterPoints, undefined, false, "22 of 22");
  e.creation.characterPoints = 0;
  C.compute(e);
  is(e.available, 0, "no budget");
  noWarnings();
}

// ---- Overrides ----

function overrides(): void {
  sample = "Overrides";
  e = newEntity(false);
  stats(6, 6, 6);
  e.creation.genre = R.ModernMilitary;
  a = at("Combat Mastery", 1);
  d = df("Awkward", 1);
  s = sk("Law", 1, 1);
  C.override(e.statPoints[C.Mind]!, 9);
  C.compute(e);
  is(V(e.statPoints[C.Mind]!), 9, "Mind's points");
  is(e.statPoints[C.Mind]!.value, 6, "computed still");
  is(e.statTotal, 21, "count in the Stats");
  C.override(a.points, 5);
  C.compute(e);
  is(e.attrTotal, 5, "an Attribute's in the total");
  is(e.spent, 25, "and in what is spent");
  C.override(d.points, -3);
  C.compute(e);
  is(e.bonusPoints, 3, "a Defect's in the Bonus Points");
  C.override(s.points, 4);
  C.compute(e);
  is(e.skillSpent, 4, "a Skill's in Skill Points spent");
  C.override(e.acv, 12);
  C.compute(e);
  is(V(e.dcv), 10, "ACV's in DCV");
  is(e.acv.value, 7, "ACV computed");
  C.override(e.hp, 47);
  C.compute(e);
  is(V(e.sv), 10, "HP's in SV, rounded up");
  C.clear(e.hp);
  C.compute(e);
  is(V(e.sv), 12, "cleared");
  const mecha = newEntity(true);
  a = at("Toughness", 1);
  C.override(a.points, 30);
  e = newEntity(false);
  stats(4, 4, 4);
  a = at("Own a Big Mecha", 1);
  a.mecha = mecha;
  C.compute(e);
  e = mecha;
  warns(
    C.OverMechaPoints,
    undefined,
    true,
    "a mecha's Attribute in its Mecha Points",
  );

  sample = "Numbers";
  yes(
    C.parse(" -12 ", e.ar) && e.ar.overridden && V(e.ar) === -12,
    "Parse -12",
  );
  yes(C.text(e.ar) === "-12", "Text");
  yes(C.computedText(e.ar) === "0", "ComputedText");
  yes(!C.parse("1x", e.ar) && V(e.ar) === -12, "Parse rejects 1x, unchanged");
  yes(!C.parse("-", e.ar), "and a lone -");
  yes(C.parse("  ", e.ar) && !e.ar.overridden, "blank clears");
}

enyon();
cador();
bogatyr();
statsAndDerived();
attributes();
eachMod(R.Ability);
eachMod(R.Disability);
exclusions();
weapons();
defectsSkillsTotals();
overrides();

// Beyond TestCalc: where JavaScript would differ from Oberon.
sample = "Beyond TestCalc";
{
  // Oberon's DIV floors, and so does calc's: HP (1+1)*5 - 10*2 = -10,
  // with Diminutive 2 is -10 DIV 20 = -1 (truncating would give 0).
  e = newEntity(false);
  stats(1, 1, 1);
  d = df("Not So Tough", 2);
  d = df("Diminutive", 2);
  C.compute(e);
  is(V(e.hp), -1, "Diminutive 2 of HP -10 floors");
  is(V(e.sv), 0, "SV of HP below 0");
  const p = new C.Num();
  yes(C.parse("\t999999\t", p) && V(p) === 999999, "Parse 999999 between tabs");
  yes(!C.parse("1000000", p) && V(p) === 999999, "Parse refuses 7 digits");
  yes(!C.parse("+1", p), "Parse refuses +1");
  yes(!C.parse("1 2", p), "Parse refuses 1 2");
}
