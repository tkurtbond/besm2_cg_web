// The checks of pobesm2_fmt2's test/TestEntities.Mod (besm2_cg_po's
// Besm2Entities is pobesm2_fmt2's), with its labels: entities.load on
// the real fixtures and made-up ones. The expected values come from the
// fixtures and from the Ada binary's terse output for them, not from
// this port. The fixtures are read from testdata/fmt/, which is
// pobesm2_fmt2's test/data/.
//
// Where the Oberon checks a rope for NIL, an absent text is undefined
// here and a present, empty one "" (AGENTS.md); an attribute's or
// defect's details, which the Oberon gives as NIL for none, are
// undefined for none.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { config, resetConfig } from "../../src/core/config.ts";
import * as E from "../../src/core/entities.ts";
import * as F from "../../src/core/fyaml.ts";

function check(ok: boolean, label: string): void {
  test(label, () => assert.ok(ok, label));
}

const fixtures = new URL("../../testdata/fmt/", import.meta.url);

let e: E.Entity | undefined;
let yerr: F.YamlError | undefined;
let msg: string | undefined;

/** Loads the first entity of the first document of text; true if it
 *  loaded. e, yerr and msg are left as load sets them. */
function fromText(text: string, name = F.stringName): boolean {
  const { docs, err } = F.parseStream(text, name);
  if (err !== undefined) throw new Error(err.msg);
  const r = E.load(docs[0]!.root()!.item(0));
  e = r.ok ? r.entity : undefined;
  yerr = r.ok ? undefined : r.yerr;
  msg = r.ok ? undefined : r.msg;
  return r.ok;
}

/** The first entity of the first document of file (in testdata/fmt/),
 *  or undefined. */
function fromFile(file: string): E.Entity | undefined {
  const text = readFileSync(new URL(file, fixtures), "utf8");
  return fromText(text, file) ? e : undefined;
}

/** Loading text fails with message msg (load's own) containing text. */
function failsWith(yaml: string, text: string, label: string): void {
  check(
    !fromText(yaml) &&
      e === undefined &&
      yerr === undefined &&
      msg !== undefined &&
      msg.includes(text),
    label,
  );
}

/** Loading text fails with a polibfyaml error of kind. */
function yamlFails(yaml: string, kind: number, label: string): void {
  check(
    !fromText(yaml) &&
      e === undefined &&
      yerr !== undefined &&
      yerr.kind === kind,
    label,
  );
}

function name(l: E.Named[], i: number): string {
  return l[i]?.name ?? "<no such item>";
}

// ---- Enyon ----
{
  const e = fromFile("enyon-boase-2e.yaml");
  check(e !== undefined, "enyon-boase-2e loads");
  if (e !== undefined) {
    check(e.name === "Lieutenant Enyon Boase", "name");
    check(
      e.tagline === undefined &&
        e.description === undefined &&
        e.size === undefined,
      "absent fields are flagged so, and NIL",
    );
    check(!e.mecha, "mecha is off when absent");
    check(e.stats.length === 3, "3 stats");
    const s = e.stats[0]!;
    check(
      s.name === "Body" && s.value === "8" && s.points === 8,
      "first stat is Body 8, 8 points",
    );
    check(name(e.stats, 2) === "Soul", "stats keep document order");
    check(e.derived.length === 5, "5 derived values");
    const d = e.derived[0]!;
    check(
      d.name === "ACV" && d.value === "9" && d.alternatives.length === 0,
      "derived ACV 9, abbreviation not expanded here",
    );
    check(e.attributes.length === 3, "3 attributes");
    let a = e.attributes[1]!;
    check(
      a.name === "Extra Attacks" &&
        a.level === "1" &&
        a.points === 4 &&
        a.details === "+1 Extra Attack",
      "Extra Attacks 1, details, 4 points",
    );
    a = e.attributes[0]!;
    check(
      a.details === undefined && a.markedDetails === undefined,
      "no details is the empty rope, NIL",
    );
    const df = e.defects[0]!;
    check(
      e.defects.length === 2 &&
        df.name === "Conditional Ownership: Army ownership" &&
        df.points === -2 &&
        df.details === undefined,
      "defects",
    );
    check(e.skills.length === 8, "8 skills");
    const sk = e.skills[1]!;
    check(
      sk.name === "Law" &&
        sk.level === "1" &&
        sk.points === 1 &&
        sk.specialisations.length === 1 &&
        sk.specialisations[0] === "Military",
      "Law 1, specialisation Military",
    );
    // The Ada terse -s output: 20 CP, 18 CP, 3 BP, 20 SP, 35 CP.
    check(
      e.statsTotal === 20 &&
        e.attributesTotal === 18 &&
        e.defectsTotal === -3 &&
        e.skillsTotal === 20,
      "subtotals match the Ada -t -s output",
    );
    check(e.entityTotal === 35, "entity total leaves out skills (35 CP)");
  }
}

// ---- Coleopteran ----
{
  const e = fromFile("FV2021-Coleopteran-2e.yaml");
  check(e !== undefined, "FV2021-Coleopteran-2e loads (with a bogus key)");
  if (e !== undefined) {
    check(e.mecha, "mecha: true");
    check(e.stats.length === 0, "no stats");
    check(
      e.description !== undefined &&
        e.description.length > 0 &&
        e.description.endsWith("\n"),
      "description keeps its trailing newline (it isn't trimmed)",
    );
    check(
      name(e.attributes, 0) === "Accessories" &&
        name(e.attributes, 7) === "Toughness" &&
        name(e.attributes, 8) === "Weapon: Plasma Fist" &&
        name(e.attributes, 10) === "Weapon: Rocket Pod",
      "attributes sorted by name",
    );
    check(
      e.attributes[9]?.details ===
        "Damage ACV+45, Long-Range: 5 km, Unreliable",
      "a block scalar's trailing newline is trimmed from details",
    );
    check(
      e.attributes[10]?.details ===
        "Damage ACV+15, Auto-fire, Area Effect, Limited Shots ×2: 3 shots,\nStoppable",
      "an embedded newline is kept in details (the formats deal with it)",
    );
    check(
      e.defects[0]?.details === "Large: 1-10 tonnes",
      "defect details trimmed",
    );
    check(name(e.defects, 1) === "Hanger Queen", "defects sorted");
    check(
      e.notes.length === 1 &&
        e.notes[0] === "Punch: Damage ACV+10, Muscle-Powered, Melee",
      "one note",
    );
    // The Ada terse output: 43 MP, 3 MBP, 40 MP.
    check(
      e.attributesTotal === 43 && e.defectsTotal === -3 && e.entityTotal === 40,
      "totals match the Ada -t output",
    );
  }
}

// ---- Customizers ----
{
  // YAML turns the \n in the double-quoted details into a newline.
  const yaml =
    '- {name: X, attributes: [{name: A, level: 1, points: 1, effective: 3, elements: [Fire, air], enhancements: [Area, [Range, 5], [Zone, 2, a], [Big, 3, b, c]], limiters: [Slow, [Short, 1]], details: "  hi\\n"}]}';
  check(fromText(yaml), "every customizer shape loads");
  let a = e?.attributes[0];
  check(a?.level === "1 (3)", "effective level is added to the level");
  check(
    a?.details ===
      "air, Fire; Area −1, Big: b, c −3, Range −5, Short +1, Slow +1, Zone: a −2; hi",
    "details as the Ada version writes them: elements; customizers; text, each sorted",
  );
  config.unicodeMinus = false;
  a = fromText(yaml) ? e?.attributes[0] : undefined;
  resetConfig();
  check(
    a?.details ===
      "air, Fire; Area -1, Big: b, c -3, Range -5, Short +1, Slow +1, Zone: a -2; hi",
    "-n gives ASCII minus signs in details",
  );
  check(
    fromText(
      '- {name: X, attributes: [{name: A, level: 1, points: 1, effective: ""}]}',
    ),
    "an empty effective loads",
  );
  check(e?.attributes[0]?.level === "1", "an empty effective adds nothing");
}

// ---- Misc ----
check(
  fromText("- {mecha: false}") && !e!.mecha && e!.name === undefined,
  "mecha: false is off; no name",
);
check(
  fromText('- {tagline: "  Hero.  "}') && e!.tagline === "Hero.",
  "tagline is trimmed",
);
check(
  fromText('- {size: Large, description: ""}') &&
    e!.size === "Large" &&
    e!.description === "" &&
    e!.name === undefined &&
    e!.tagline === undefined,
  "size; an empty description is present, though its rope is NIL",
);
check(
  fromText('- {name: "", tagline: "  "}') &&
    e!.name === "" &&
    e!.tagline === "" &&
    e!.size === undefined,
  "an empty name and a tagline that trims to nothing are present too",
);
check(
  fromText('- {defects: [{name: D, points: -1, details: "  "}]}') &&
    e!.defects[0]!.details === undefined,
  "details that trim to nothing are empty",
);
check(
  fromText(
    "- {skills: [{name: b, level: 1, points: 1}, {name: A, level: 1, points: 2}, {name: a, level: 1, points: 3}]}",
  ) &&
    e!.skills.length === 3 &&
    name(e!.skills, 0) === "A" &&
    name(e!.skills, 1) === "a" &&
    name(e!.skills, 2) === "b",
  "skills sorted ignoring case, equal names kept in order",
);
check(
  fromText("- {derived: [{name: DCV, value: 5, alternatives: [x, y]}]}") &&
    e!.derived[0]!.alternatives.length === 2,
  "derived alternatives",
);
check(
  fromText('- {notes: [b, "  a  ", "x\\n  y\\n"]}') &&
    e!.notes.length === 3 &&
    e!.notes[0] === "b" &&
    e!.notes[1] === "a",
  "notes keep their order and are trimmed",
);
check(
  fromText("- {notes: []}") && e!.notes.length === 0,
  "an empty notes list",
);
check(fromText("- {name: X}") && e!.notes.length === 0, "no notes");

// ---- Errors ----
yamlFails(
  "- {stats: [{name: B, value: 3}]}",
  F.MissingKey,
  "a missing points is a MissingKey error",
);
yamlFails(
  "- {stats: [{name: B, value: 3, points: x}]}",
  F.DataError,
  "points: x is a DataError",
);
yamlFails(
  "- {name: [a]}",
  F.DataError,
  "a name that isn't a scalar is a DataError",
);
yamlFails(
  "- {mecha: yes}",
  F.DataError,
  "mecha: yes is a DataError (YAML 1.2 core schema)",
);
yamlFails(
  "- {attributes: [{name: A, points: 1}]}",
  F.MissingKey,
  "an attribute's level is required",
);
yamlFails(
  "- {attributes: [{name: A, level: 1, points: 1, enhancements: [[Range, x]]}]}",
  F.DataError,
  "a customizer's counts-as must be an integer",
);
failsWith("- 5", "/0: not a mapping", "an entity that isn't a mapping");
failsWith(
  "- {stats: 5}",
  "/0/stats: not a sequence",
  "stats that isn't a sequence",
);
failsWith(
  "- {stats: [5]}",
  "/0/stats/0: not a mapping",
  "a stat that isn't a mapping",
);
failsWith(
  "- {attributes: [{name: A, level: 1, points: 1, elements: [{a: 1}]}]}",
  "/0/attributes/0/elements/0: not a scalar",
  "an element that isn't a scalar",
);
failsWith(
  "- {attributes: [{name: A, level: 1, points: 1, enhancements: [[Range]]}]}",
  "/0/attributes/0/enhancements/0: customizer sequence too short",
  "a customizer of one item",
);
failsWith(
  "- {attributes: [{name: A, level: 1, points: 1, limiters: [{a: 1}]}]}",
  "/0/attributes/0/limiters/0: do not understand customizer",
  "a customizer that is a mapping",
);
failsWith(
  "- {attributes: [{name: A, level: 1, points: 1, limiters: [[R, 2, [a]]]}]}",
  "/0/attributes/0/limiters/0/2: not a scalar",
  "an applies-to that isn't a scalar",
);
failsWith(
  "- {attributes: [{name: A, level: 1, points: 1, enhancements: Area}]}",
  "/0/attributes/0/enhancements: not a sequence",
  "enhancements that isn't a sequence",
);
// besm2_cg_po halts here, with polibfyaml's "assertion failed (62)"
// (PLAN.md, Findings, 2026-11-15).
failsWith(
  "- {attributes: [{name: A, level: 1, points: 1, enhancements: [[Foo, {a: 1}]]}]}",
  "/0/attributes/0/enhancements/0/1: not a scalar",
  "a customizer's counts-as that is a mapping is not a scalar (besm2_cg_po halts)",
);

// ---- Extensions ----
{
  const weapon =
    '- {attributes: [{name: Weapon Attack, subject: "  Spark Lance ", level: 3, points: 12, primary: true, damage: 60, abilities: [Area Effect, Long Range], disabilities: [{name: Limited Shots, counts-as: 2, detail: " 3 shots "}, Slow], different-gunner: true, choices: [{name: zz, detail: no}, Aa], details: Personal Gear, overrides: [damage]}]}';
  check(fromText(weapon), "a Weapon Attack with every new key loads");
  let a = e?.attributes[0];
  check(
    a?.name === "Weapon Attack: Spark Lance",
    "subject after the name and a colon, trimmed",
  );
  check(
    a?.details ===
      "Area Effect, Long Range, Limited Shots ×2 [3 shots], Slow, Different Gunner, 60 Damage; Aa, zz; Personal Gear",
    "weapon keys; choices sorted, their detail ignored; details text",
  );
  check(
    a?.markedDetails ===
      "Area Effect, Long Range, Limited Shots ×2 [3 shots], Slow, Different Gunner, 60\\* Damage; Aa, zz; Personal Gear",
    "an overridden damage is marked in markedDetails only",
  );
  check(a !== undefined && !a.pointsMark, "points not overridden");
  config.unicodeMinus = false;
  a = fromText(weapon) ? e?.attributes[0] : undefined;
  resetConfig();
  check(
    a?.details?.includes("Limited Shots x2 [3 shots]") === true,
    "-n gives an ASCII times sign",
  );
  check(
    fromText(
      "- {attributes: [{name: Weapon Attack, level: 1, points: 3, damage: 20, overrides: [points, damage]}]}",
    ),
    "a weapon with only damage loads",
  );
  a = e?.attributes[0];
  check(
    a?.details === "20 Damage" &&
      a.markedDetails === "20\\* Damage" &&
      a.pointsMark,
    "damage alone; points and damage overridden",
  );
  check(
    fromText(
      "- {defects: [{name: Unique Character Defect, subject: Afraid of the Dark, level: 2, points: -2, overrides: [points]}], stats: [{name: Body, value: 4, points: 4, overrides: [points]}], derived: [{name: DCV, value: 4, overrides: [value]}], skills: [{name: Driving, level: 1, points: 1, overrides: []}]}",
    ),
    "defect, stat, derived and skill overrides load",
  );
  check(
    e?.defects[0]?.name === "Unique Character Defect: Afraid of the Dark" &&
      e.defects[0].pointsMark &&
      e.stats[0]!.pointsMark &&
      e.derived[0]!.valueMark &&
      !e.skills[0]!.pointsMark,
    "the marks are set as overridden",
  );
}
failsWith(
  "- {attributes: [{name: A, level: 1, points: 1, overrides: [pionts]}]}",
  '/0/attributes/0/overrides/0: "pionts" is not one of points, damage',
  "a misspelt override",
);
failsWith(
  "- {derived: [{name: DCV, value: 4, overrides: [points]}]}",
  '/0/derived/0/overrides/0: "points" is not one of value',
  "a derived value has only value",
);
failsWith(
  "- {skills: [{name: D, level: 1, points: 1, overrides: [[points]]}]}",
  "/0/skills/0/overrides/0: an override is not a key name",
  "an override that isn't a name",
);
failsWith(
  "- {attributes: [{name: A, level: 1, points: 1, disabilities: [[x]]}]}",
  "/0/attributes/0/disabilities/0: not a name or a mapping",
  "a Disability that is a list",
);
failsWith(
  "- {attributes: [{name: A, level: 1, points: 1, choices: [{name: x, counts-as: 0}]}]}",
  "/0/attributes/0/choices/0/counts-as: counts-as must be positive",
  "a choice's counts-as of 0",
);
yamlFails(
  "- {attributes: [{name: A, level: 1, points: 1, abilities: [{detail: x}]}]}",
  F.MissingKey,
  "an Ability with no name",
);
yamlFails(
  "- {attributes: [{name: A, level: 1, points: 1, different-gunner: 1}]}",
  F.DataError,
  "different-gunner must be a boolean",
);
