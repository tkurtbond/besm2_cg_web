// The checks of besm2_cg_po's test/TestWarnings.Mod, with its labels:
// entities built by hand with character's records, as a file would give
// them, and each warning's line compared with what it should say.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as C from "../../src/core/calc.ts";
import * as Ch from "../../src/core/character.ts";
import * as R from "../../src/core/rules.ts";
import * as W from "../../src/core/warnings.ts";

function check(ok: boolean, label: string): void {
  test(label, () => assert.ok(ok, label));
}

function newEntity(): Ch.Entity {
  const e = new Ch.Entity();
  C.initEntity(e, false);
  return e;
}

function attr(e: Ch.Entity, name: string, subject: string, level: number) {
  const a = new Ch.Attr();
  C.initAttr(a, R.find(name), level);
  a.name = name;
  if (subject !== "") a.subject = subject;
  C.addAttr(e, a);
  return a;
}

function defect(e: Ch.Entity, name: string, rank: number): void {
  const d = new Ch.Defect();
  C.initDefect(d, R.find(name), rank);
  d.name = name;
  C.addDefect(e, d);
}

function skill(e: Ch.Entity, name: string, level: number): void {
  const s = new Ch.Skill();
  C.initSkill(s, R.findKind(R.Skill, name), undefined, level, 0);
  s.name = name;
  C.addSkill(e, s);
}

function mod(a: C.Attr, name: string): void {
  const it = R.findKind(R.Ability, name) ?? R.findKind(R.Disability, name);
  const m = new Ch.Mod();
  C.initMod(m, it, 0);
  m.name = name;
  a.abilities = C.addMod(a.abilities, m);
}

/** e has a warning of code whose line is want. */
function says(e: Ch.Entity, code: number, want: string): void {
  C.compute(e);
  let found = false;
  let got: string | undefined = undefined;
  for (let w = e.warnings; w !== undefined && !found; w = w.next)
    if (w.code === code) {
      got = W.text(e, w);
      found = got === want;
    }
  let label = want;
  if (!found && got !== undefined) label += `   (got: ${got})`;
  else if (!found) label += "   (no such warning)";
  check(found, label);
}

let e = newEntity();
e.stat[C.Body] = 13;
says(
  e,
  C.StatRange,
  "Body (p. 15, PDF 17): 13 is outside 1 to 12 (p. 16, PDF 18)",
);
e = newEntity();
e.stat[C.Mind] = 9;
e.creation.statCeiling = 8;
says(
  e,
  C.StatRange,
  "Mind (p. 15, PDF 17): 9 is above the campaign's ceiling of 8",
);
e = newEntity();
e.stat[C.Body] = 12;
e.stat[C.Soul] = 12;
says(e, C.TwoAtTwelve, "more than one Stat at 12 (p. 16, PDF 18)");

e = newEntity();
attr(e, "Frobnicate", "", 1);
says(
  e,
  C.UnknownItem,
  "Frobnicate (p. ?): not a name the rulebook has: it costs nothing unless its points are given",
);
e = newEntity();
attr(e, "Heightened Senses", "Hearing", 7);
says(
  e,
  C.LevelRange,
  "Heightened Senses: Hearing (p. 41, PDF 43): Level 7 is outside 1 to 6",
);
e = newEntity();
attr(e, "A.I.", "", 1);
says(e, C.MechaOnly, "A.I. (p. 93, PDF 95): for mecha only");
e = newEntity();
C.override(attr(e, "Weapon Attack", "Gun", 1).damage, 10);
says(
  e,
  C.LowDamage,
  "Weapon Attack: Gun (p. 81, PDF 83): damage 10 is under 15 a Level (p. 82, PDF 84), without No Damage (p. 91, PDF 93)",
);
e = newEntity();
attr(e, "Weapon Attack", "Gun", 1).differentGunner = true;
says(
  e,
  C.GunnerNotMecha,
  "Weapon Attack: Gun (p. 81, PDF 83): a Different Gunner on a character's weapon; it is a mecha's (p. 82, PDF 84)",
);
e = newEntity();
mod(attr(e, "Weapon Attack", "Gun", 1), "Frobnicate");
says(
  e,
  C.UnknownItem,
  "Weapon Attack: Gun (p. 81, PDF 83): Frobnicate (p. ?): not a Weapon Ability the rulebook has: it costs nothing unless its points are given",
);

e = newEntity();
for (let i = 1; i <= 9; i++) defect(e, "Unique Character Defect", 1);
says(e, C.TooManyDefects, "more than 8 Defects (p. 100, PDF 102)");
e = newEntity();
defect(e, "Unique Character Defect", 1);
defect(e, "Unique Character Defect", 1);
e.creation.bonusCeiling = 1;
says(
  e,
  C.OverBonusCeiling,
  "the Defects give 2 Bonus Points, above the campaign's ceiling of 1",
);
e = newEntity();
e.creation.statPointsCeiling = 2;
says(
  e,
  C.StatPointsAbove,
  "the Stats cost 3 Character Points, above the campaign's ceiling of 2 (p. 16, PDF 18)",
);
e = newEntity();
e.creation.statPointsFloor = 12;
says(
  e,
  C.StatPointsBelow,
  "the Stats cost 3 Character Points, below the campaign's floor of 12 (p. 16, PDF 18)",
);
e = newEntity();
attr(e, "Highly Skilled", "", 1);
defect(e, "Unskilled", 1);
says(
  e,
  C.SkilledAndUnskilled,
  "Highly Skilled (p. 42, PDF 44) with Unskilled (p. 112, PDF 114)",
);

e = newEntity();
e.creation.characterPoints = 10;
e.stat[C.Body] = 8;
e.stat[C.Mind] = 4;
says(
  e,
  C.OverCharacterPoints,
  "spent 13 Character Points of 10 (p. 13, PDF 15)",
);
e = newEntity();
skill(e, "Stealth", 1);
says(
  e,
  C.NoGenreSet,
  "Skills (p. 117, PDF 119), but no genre to price them by (Table 2-4, p. 119, PDF 121)",
);
e = newEntity();
e.creation.genre = R.ModernMilitary;
skill(e, "Stealth", 7);
says(
  e,
  C.LevelRange,
  "Stealth (p. 125, PDF 127): Level 7 is outside 1 to 6 (p. 117, PDF 119)",
);
says(e, C.OverSkillPoints, "spent 28 Skill Points of 20 (p. 117, PDF 119)");

// Every warning of these is a line of its own words, never the fallback.
{
  let n = 0;
  let ok = true;
  for (let w = e.warnings; w !== undefined; w = w.next) {
    const s = W.text(e, w);
    n++;
    if (s === "" || s.startsWith("warning ")) ok = false;
  }
  check(ok && n > 0, "every warning has its own line");
}
