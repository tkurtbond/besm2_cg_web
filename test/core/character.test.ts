// The checks of besm2_cg_po's test/TestModel.Mod that need no save,
// with its labels: character's editing, as the page's tabs and dialogs
// use it, on entities built by hand; and the Creation and Campaign
// checks that load a file. What TestModel saves and loads again
// (ReadText of a save, Copy, SaveLoad, a saved Weapon Attack, creation
// and campaign) waits for save, Phase 3.3. A file is given as its text
// and the name the Oberon opens it by ("data/unpriced.yaml"), so the
// messages are its; a file that isn't there is the page's to report.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as C from "../../src/core/calc.ts";
import * as Ch from "../../src/core/character.ts";
import * as R from "../../src/core/rules.ts";

function check(ok: boolean, label: string): void {
  test(label, () => assert.ok(ok, label));
}

/** The text of besm2_cg_po's test/data/NAME, as testdata/cg has it. */
function data(name: string): string {
  return readFileSync(`testdata/cg/${name}`, "utf8");
}

function count(a: C.Attr | undefined): number {
  let n = 0;
  for (; a !== undefined; a = a.next) n++;
  return n;
}

/** Index of option label of it. */
function opt(it: R.Item | undefined, label: string): number {
  const i = it!.option.findIndex((o) => R.sameName(o.label, label));
  assert.ok(i >= 0, label);
  return i;
}

function sameSet(a: ReadonlySet<number>, b: ReadonlySet<number>): boolean {
  return a.size === b.size && [...a].every((x) => b.has(x));
}

const item = (name: string) => R.find(name);
const skillItem = (name: string) => R.findKind(R.Skill, name);

// ---- Attributes ----

const e = Ch.newCharacter();
let es: Ch.Entity[] = Ch.one(e);
{
  let a = Ch.newAttr(item("Flight"), 2, undefined, "  wings  ");
  Ch.insertAttr(e, a);
  Ch.computeAll(es);
  check(
    e.attrs === a &&
      e.hasAttributes &&
      a.name === "Flight" &&
      a.subject === undefined &&
      a.details === "wings",
    "NewAttr, InsertAttr: the rulebook's name, details trimmed, no subject",
  );
  check(
    C.value(a.points) === 8,
    "Flight 2: the first of its required choice, can hover, 4 a Level (p. 33)",
  );
  a.times[opt(a.item, "cannot hover")] = 1;
  a.times[opt(a.item, "skimmer or hovercraft")] = 1;
  Ch.computeAll(es);
  check(
    C.value(a.points) === 5,
    "cannot hover, a skimmer: 3 a Level, -1 on the total",
  );

  const a2 = Ch.newAttr(item("Heavy Armour"), 1, "", undefined);
  Ch.insertAttr(e, a2);
  Ch.computeAll(es);
  check(
    count(e.attrs) === 2 &&
      e.attrs!.next === a2 &&
      a2.subject === undefined &&
      a2.details === undefined,
    "a second: last; blank is none",
  );
  check(e.attrTotal === 9, "both in the total");

  const keep = a;
  a = Ch.changeAttr(e, a, a.item, 3, "Sky", undefined);
  Ch.computeAll(es);
  check(
    a === keep &&
      a.level === 3 &&
      a.subject === "Sky" &&
      a.details === undefined &&
      a.times[opt(a.item, "cannot hover")] === 1,
    "ChangeAttr, the same name: the same record, its options kept",
  );
  check(C.value(a.points) === 8, "and priced at its new Level");

  a.extra = [];
  const extra = a.extra;
  a = Ch.changeAttr(e, a, item("Highly Skilled"), 2, undefined, undefined);
  Ch.computeAll(es);
  // Not TestModel's: ChangeAttr's b.extra := a.extra.
  check(a.extra === extra, "another name: the keys it doesn't know kept");
  check(
    a !== keep &&
      e.attrs === a &&
      a.next === a2 &&
      a.name === "Highly Skilled" &&
      a.times[0] === 0,
    "another name: a new record in its place, no options",
  );
  check(C.value(a.points) === 2, "priced as the new name");

  Ch.removeAttr(e, a2);
  Ch.computeAll(es);
  check(
    count(e.attrs) === 1 &&
      e.attrs === a &&
      a.next === undefined &&
      e.attrTotal === 2,
    "RemoveAttr: the last",
  );
  Ch.removeAttr(e, a);
  Ch.computeAll(es);
  check(e.attrs === undefined && e.attrTotal === 0, "and the only one");
}

// ---- Defects ----
{
  let d = Ch.newDefect(
    item("Unique Character Defect"),
    2,
    "Stubborn",
    undefined,
  );
  Ch.insertDefect(e, d);
  const d2 = Ch.newDefect(item("Easily Distracted"), 1, undefined, "cats");
  Ch.insertDefect(e, d2);
  Ch.computeAll(es);
  check(
    e.hasDefects &&
      e.defects === d &&
      d.next === d2 &&
      d.hasLevel &&
      d.subject === "Stubborn" &&
      d2.details === "cats",
    "NewDefect, InsertDefect: in order; the rank is saved",
  );
  check(
    C.value(d.points) === -2 && e.bonusPoints === 3,
    "Bonus Points: one a rank",
  );
  d = Ch.changeDefect(e, d, d.item, 1, undefined, undefined);
  Ch.computeAll(es);
  check(
    d.subject === undefined && e.bonusPoints === 2,
    "ChangeDefect: the rank and subject",
  );
  Ch.removeDefect(e, d);
  Ch.computeAll(es);
  check(e.defects === d2 && e.bonusPoints === 1, "RemoveDefect: the first");
}

// ---- Skills ----
{
  // The Oberon's list holds a NIL, which SetSpecs drops as blank.
  const s = Ch.newSkill(skillItem("Driving"), undefined, 2, [
    " Cars ",
    "",
    "Trucks",
  ]);
  Ch.insertSkill(e, s);
  Ch.computeAll(es);
  check(
    e.hasSkills &&
      s.name === "Driving" &&
      s.specs === 2 &&
      s.specialisations?.[0] === "Cars" &&
      s.specialisations !== undefined,
    "NewSkill: specialisations trimmed, blanks dropped",
  );
  Ch.setGenre(e, R.ModernMilitary);
  Ch.computeAll(es);
  check(
    e.hasCreation &&
      e.creation.genre === R.ModernMilitary &&
      C.value(s.points) === 9,
    "SetGenre: Modern Military, Driving 4 a Level (p. 119); the first specialisation free, the second 1 (p. 118)",
  );
  Ch.setGenre(e, R.Cyberpunk);
  Ch.computeAll(es);
  check(C.value(s.points) === 7, "Cyberpunk: 3 a Level");

  const h = new Ch.HouseSkill();
  C.initHouseSkill(h);
  h.name = "Mecha Piloting";
  h.cost[R.Cyberpunk] = 5;
  C.addHouseSkill(e.creation, h);
  let s2 = Ch.newSkill(undefined, h, 1, []);
  Ch.insertSkill(e, s2);
  Ch.computeAll(es);
  check(
    s2.house === h &&
      s2.name === "Mecha Piloting" &&
      C.value(s2.points) === 5 &&
      e.skillSpent === 12,
    "a house Skill: its name and its cost",
  );
  s2 = Ch.changeSkill(e, s2, skillItem("Driving"), undefined, 1, []);
  Ch.computeAll(es);
  check(
    s2.house === undefined && s2.name === "Driving" && s.next === s2,
    "ChangeSkill: to a rulebook Skill, in place",
  );
  Ch.removeSkill(e, s2);
  Ch.computeAll(es);
  check(s.next === undefined && e.skillSpent === 7, "RemoveSkill");
}

// ---- Mecha ----
{
  const m = Ch.newCharacter();
  m.isMecha = true;
  m.hasMechaKey = true;
  m.name = "Walker";
  es = [e, m];
  let a = Ch.newAttr(item("Own a Big Mecha"), 1, "Nobody", undefined);
  Ch.insertAttr(e, a);
  Ch.relink(es);
  check(
    a.mecha === undefined,
    "Relink: Own a Big Mecha's subject names no mecha",
  );
  a = Ch.changeAttr(e, a, a.item, 1, "Walker", undefined);
  Ch.relink(es);
  check(a.mecha === m, "named: linked");
  a = Ch.changeAttr(e, a, a.item, 1, "Other", undefined);
  Ch.relink(es);
  check(a.mecha === undefined, "renamed: unlinked");
}

// ---- Several (step 9), without save ----
{
  const w = Ch.newMecha("Walker");
  check(
    w.isMecha &&
      w.hasMechaKey &&
      w.name === "Walker" &&
      w.owner === undefined &&
      w.available === 0 &&
      w.attrs === undefined,
    "NewMecha: a mecha, named, with no owner and no Mecha Points",
  );
  const c = Ch.newCharacter();
  c.name = "Pilot";
  const oa = Ch.newAttr(item("Own a Big Mecha"), 2, "Walker", undefined);
  Ch.insertAttr(c, oa);
  Ch.insertAttr(w, Ch.newAttr(item("Heavy Armour"), 1, undefined, undefined));
  const ces = [c, w];
  Ch.relink(ces);
  Ch.computeAll(ces);
  check(
    oa.mecha === w &&
      w.owner === c &&
      C.mechaPoints(oa) === 40 &&
      w.available === 40 &&
      w.spent === 4,
    "Own a Big Mecha 2 names it: 40 Mecha Points (p. 59), 4 spent",
  );
  const { es: rs } = Ch.readText("- name: [bad");
  check(
    rs === undefined || rs.length === 0,
    "and of text that isn't YAML, none",
  );
}

// ---- Weapons, without save ----
{
  const we = Ch.newCharacter();
  const wes = Ch.one(we);
  const w = Ch.newAttr(item("Weapon Attack"), 4, "Sword", undefined);
  Ch.insertAttr(we, w);
  Ch.computeAll(wes);
  check(
    C.value(w.points) === 16 && C.value(w.damage) === 60,
    "Weapon Attack 4: the primary, 4 a Level, 15 damage a Level (p. 82)",
  );

  const acc = Ch.newMod(we, R.findKind(R.Ability, "Accurate"), 1, undefined);
  Ch.insertMod(w, true, acc);
  Ch.computeAll(wes);
  check(
    w.abilities === acc &&
      w.hasAbilities &&
      !w.hasDisabilities &&
      w.structured &&
      w.hasDamage &&
      acc.countsAs === 0 &&
      acc.slots === 1 &&
      acc.name === "Accurate",
    "NewMod, InsertMod: its slots taken once leave counts-as out; the keys saved",
  );
  check(C.value(w.damage) === 45, "an Ability slot: 15 less damage");

  const area = Ch.newMod(
    we,
    R.findKind(R.Ability, "Area Effect"),
    2,
    "  wide  ",
  );
  Ch.insertMod(w, true, area);
  Ch.computeAll(wes);
  check(
    acc.next === area &&
      area.countsAs === 2 &&
      C.times(area) === 2 &&
      area.detail === "wide",
    "twice: counts-as 2, last, its detail trimmed",
  );
  check(C.value(w.damage) === 15, "two slots more: 15 damage");

  const melee = Ch.newMod(we, R.findKind(R.Disability, "Melee"), 1, undefined);
  Ch.insertMod(w, false, melee);
  Ch.computeAll(wes);
  check(
    w.hasDisabilities &&
      w.disabilities === melee &&
      melee.countsAs === 1 &&
      melee.slots === 1,
    "Melee counting as 1, less than its 2: counts-as kept",
  );
  check(C.value(w.damage) === 30, "a Disability slot: 15 more damage");

  Ch.changeMod(we, area, undefined, 1, undefined);
  Ch.computeAll(wes);
  check(
    area.item?.name === "Area Effect" &&
      area.countsAs === 0 &&
      area.detail === undefined &&
      C.value(w.damage) === 45,
    "ChangeMod: the same name, one slot, no detail",
  );
  Ch.changeMod(we, area, R.findKind(R.Ability, "Long Range"), 1, "far");
  Ch.computeAll(wes);
  check(
    area.name === "Long Range" && acc.next === area && area.detail === "far",
    "another name, in place",
  );

  const copy = Ch.copyMods(w.abilities)!;
  check(
    copy !== acc &&
      copy.item === acc.item &&
      copy.next !== area &&
      copy.next?.item === area.item &&
      (copy.next as Ch.Mod).detail === "far" &&
      copy.next?.next === undefined,
    "CopyMods: its own records, the same",
  );

  Ch.removeMod(w, true, acc);
  Ch.computeAll(wes);
  check(
    w.abilities === area && C.value(w.damage) === 60,
    "RemoveMod: the first",
  );

  const auto = Ch.newMod(we, R.findKind(R.Ability, "Auto-Fire"), 1, undefined);
  Ch.insertMod(w, true, auto);
  Ch.computeAll(wes);
  check(
    auto.countsAs === 1 && C.value(w.damage) === 45,
    "Auto-Fire counting as 1, as the book's examples",
  );

  const w2 = Ch.newAttr(item("Weapon Attack"), 4, "Bow", undefined);
  Ch.insertAttr(we, w2);
  Ch.computeAll(wes);
  check(
    w.isPrimary && !w2.isPrimary && C.value(w2.points) === 2,
    "two at Level 4: the first the primary, the second 2",
  );
  Ch.setPrimary(we, w2, true);
  Ch.computeAll(wes);
  check(
    w2.primary &&
      w2.isPrimary &&
      !w.isPrimary &&
      C.value(w.points) === 2 &&
      C.value(w2.points) === 16,
    "SetPrimary: the second marked, now the primary",
  );
  Ch.setPrimary(we, w, true);
  Ch.computeAll(wes);
  check(
    w.primary && !w2.primary && w.isPrimary,
    "marking the first unmarks the second",
  );
  Ch.setPrimary(we, w, false);
  Ch.computeAll(wes);
  check(
    !w.primary && w.isPrimary,
    "unmarked: the first of the highest Level again",
  );
  w2.differentGunner = true;
  Ch.computeAll(wes);
  check(
    C.hasWarning(we, C.GunnerNotMecha, w2),
    "a different gunner on a character: warned",
  );
}

// ---- Creation (step 10), without save ----
{
  const r = Ch.loadAll(data("unpriced.yaml"), "data/unpriced.yaml");
  const ok = r.ok && r.es.length === 2;
  check(ok, "data/unpriced.yaml loaded");
  if (r.ok && ok) {
    const back = r.es;
    const [u, camp] = back as [Ch.Entity, Ch.Entity];
    const dr = u.skills as Ch.Skill;
    const ga = dr.next as Ch.Skill;
    const mp = ga.next as Ch.Skill;
    check(
      dr.unpriced &&
        dr.points.overridden &&
        C.value(dr.points) === 8 &&
        ga.unpriced &&
        mp.unpriced &&
        mp.house === undefined &&
        mp.points.overridden &&
        !u.hasCreation,
      "no genre: each Skill's points kept as an unpriced override",
    );
    const oc = Ch.copyCreation(u.creation);
    const keys = new Set(u.creationKeys);
    const has = u.hasCreation;
    const marks = Ch.saveSkills(u);

    Ch.takeCreation(u, camp);
    Ch.computeAll(back);
    check(
      u.creation.genre === R.Cyberpunk &&
        u.creation.characterPoints === 45 &&
        u.available === 47 &&
        u.creation.statCeiling === 10 &&
        sameSet(u.creationKeys, camp.creationKeys) &&
        u.hasCreation,
      "TakeCreation: the numbers, options and keys",
    );
    check(
      mp.house !== undefined &&
        mp.house !== camp.creation.houseSkills &&
        u.creation.houseSkills === mp.house &&
        (mp.house as Ch.HouseSkill).name === "Mecha Piloting",
      "the house Skills copied, and the Skill tied to the copy",
    );
    check(
      mp.house!.cost !== camp.creation.houseSkills!.cost,
      "the copy's costs its own (the Oberon's record assignment)",
    );
    check(
      !mp.points.overridden && !mp.unpriced && C.value(mp.points) === 5,
      "the house Skill's price agrees with the file's: the override cleared",
    );
    check(
      dr.points.overridden && dr.unpriced && C.value(dr.points) === 8,
      "Cyberpunk prices Driving 2 at 6, not the file's 8: kept, still unpriced",
    );

    Ch.setGenre(u, R.ModernMilitary);
    Ch.computeAll(back);
    check(
      !dr.points.overridden && !dr.unpriced && C.value(dr.points) === 8,
      "SetGenre: Modern Military prices it at 8 (p. 119): the override cleared",
    );
    check(
      ga.points.overridden && ga.unpriced && C.value(ga.points) === 99,
      "Gaming's 99 still kept",
    );

    Ch.restoreCreation(u, oc, keys, has, marks);
    Ch.computeAll(back);
    check(
      u.creation.genre === C.NoGenre &&
        u.creationKeys.size === 0 &&
        !u.hasCreation &&
        u.creation.houseSkills === undefined &&
        mp.house === undefined &&
        mp.points.overridden &&
        mp.unpriced &&
        dr.points.overridden &&
        dr.unpriced &&
        C.value(dr.points) === 8,
      "RestoreCreation: the creation and every Skill as they were",
    );

    const c = Ch.copyCreation(u.creation);
    c.genre = R.ModernMilitary;
    c.backgroundPoints = 1;
    Ch.setCreation(u, c, new Set([Ch.GenreKey]), false);
    Ch.computeAll(back);
    check(
      u.hasCreation &&
        !dr.points.overridden &&
        u.creation.backgroundPoints === 1,
      "SetCreation: a key written makes `creation`; the genre prices Driving",
    );
  }
}

// ---- Campaign (step 10a), without save ----
{
  const r = Ch.loadCampaign(data("campaign.yaml"), "data/campaign.yaml");
  check(
    r.ok && !r.from.isMecha && r.from.hasCreation,
    "data/campaign.yaml loaded",
  );
  if (r.ok) {
    const c = r.from.creation;
    check(
      c.characterPoints === 40 &&
        c.genre === R.ModernMilitary &&
        c.statPointsCeiling === 6 &&
        c.statPointsFloor === 4 &&
        c.skillPoints === C.Unset &&
        !c.stagedStatCost &&
        sameSet(
          r.from.creationKeys,
          new Set([
            Ch.CharacterPointsKey,
            Ch.GenreKey,
            Ch.OptionsKey,
            Ch.StatPointsCeilingKey,
            Ch.StatPointsFloorKey,
          ]),
        ),
      "its numbers, options and keys",
    );
  }
  const x = Ch.loadCampaign(data("unpriced.yaml"), "data/unpriced.yaml");
  check(
    x.ok && x.from.name === "Unpriced",
    "a file of entities: its first character",
  );
  const refused = (name: string, msg: string, label: string): void => {
    const y = Ch.loadCampaign(data(name), `data/${name}`);
    check(!y.ok && y.msg === msg, label);
  };
  refused(
    "mecha.yaml",
    "data/mecha.yaml has no character to copy from, only mecha",
    "a file of only mecha: refused, said why",
  );
  refused(
    "campaign-extra.yaml",
    'data/campaign-extra.yaml: /: "players" is not one of creation',
    "a key besides creation: refused, said where",
  );
  refused(
    "campaign-zero.yaml",
    "data/campaign-zero.yaml: /creation/options/stat-points-floor: stat-points-floor must be 1 or more",
    "a floor of 0: refused, said where",
  );
}
