// Phase 7: the Character tab on happy-dom. Ports besm2_cg_po's
// TestWindow NewCharacter, Editing, the lines and warnings of Files,
// Mecha, and the renaming and the points lines of Several
// (test/TestWindow.Mod), with their labels. What the Mecha tab adds to
// Several comes with Phase 10. Values from the DOM are compared with
// assert.ok or check only, never equal or deepEqual (AGENTS.md).

import { test } from "node:test";
import * as C from "../../src/core/calc.ts";
import * as Ch from "../../src/core/character.ts";
import {
  BonusPoints,
  CharacterPoints,
  SkillPoints,
  Title,
  type Window,
} from "../../src/ui/window.ts";
import { checker, load, newWindow, take } from "./setup.ts";

/** fill types text into input, as the user does: an input event. */
function fill(input: HTMLInputElement, text: string): void {
  input.value = text;
  input.dispatchEvent(new input.ownerDocument.defaultView!.Event("input"));
}

/** Whether points line i says want, red or not (Line). */
function line(w: Window, i: number, want: string, red: boolean): boolean {
  const b = w.points[i]!;
  return b.textContent === want && b.classList.contains("red") === red;
}

/** Whether every number box shows the entity's number, and each spinner
 *  its Stat (AllShown). */
function allShown(w: Window): boolean {
  const e = w.entity;
  let ok =
    w.derived[Ch.ACV]!.shows(e.acv) &&
    w.derived[Ch.DCV]!.shows(e.dcv) &&
    w.derived[Ch.HP]!.shows(e.hp) &&
    w.derived[Ch.EP]!.shows(e.ep) &&
    w.derived[Ch.SV]!.shows(e.sv) &&
    w.derived[Ch.AR]!.shows(e.ar);
  for (let i = 0; i < C.NStats; i++) {
    ok =
      ok &&
      w.statPoints[i]!.shows(e.statPoints[i]!) &&
      w.statValue[i]!.value === e.stat[i] &&
      w.statValue[i]!.input.value === String(e.stat[i]);
  }
  return ok;
}

/** The last line of the warnings holding text; -1 if none (Warning). */
function warning(w: Window, text: string): number {
  for (let i = w.warnings.count() - 1; i >= 0; i--) {
    if (w.warnings.line(i).includes(text)) return i;
  }
  return -1;
}

test("NewCharacter", () => {
  const { w } = newWindow();
  const { check, done } = checker();
  const e = w.entity;
  check(
    e.stat[C.Body] === 1 &&
      e.stat[C.Mind] === 1 &&
      e.stat[C.Soul] === 1 &&
      !e.hasCreation,
    "its Stats are 1, and it has no creation block",
  );
  check(allShown(w), "every box shows its number");
  check(
    !w.derived[Ch.AR]!.visible &&
      w.derived[Ch.ACV]!.visible &&
      w.derived[Ch.SV]!.visible &&
      w.statValue[C.Body]!.active &&
      w.statPoints[C.Body]!.active,
    "no armour: AR hidden; ACV to SV and the Stats shown",
  );
  check(
    line(
      w,
      CharacterPoints,
      "Character Points: Stats 3 + Attributes 0 - Bonus Points 0 = 3 (no limit set)",
      false,
    ),
    "Character Points: what is spent, no limit set, not red",
  );
  check(
    line(w, BonusPoints, "Bonus Points: 0 (ceiling: none)", false),
    "Bonus Points: none, no ceiling",
  );
  check(
    (w.points[SkillPoints]!.textContent ?? "").startsWith(
      "Skill Points: 0 of ",
    ),
    "Skill Points: none spent",
  );
  check(w.warnings.count() === 0, "and no warnings");
  done();
});

test("Editing", () => {
  const { w, f, doc } = newWindow();
  const { check, done } = checker();
  const e = w.entity;
  w.statValue[C.Body]!.spin(5);
  check(
    e.stat[C.Body] === 5 && C.value(e.statPoints[C.Body]!) === 5 && allShown(w),
    "a Stat's spinner sets it, and its points, and every number shown follows",
  );
  check(
    line(
      w,
      CharacterPoints,
      "Character Points: Stats 7 + Attributes 0 - Bonus Points 0 = 7 (no limit set)",
      false,
    ),
    "and the Character Points",
  );
  check(w.modified, "a change marks the character changed");
  check(doc.title === Title + " *", "and the title says so");
  fill(w.nameIn, "Kei Tanaka");
  check(e.name === "Kei Tanaka", "the name typed is the character's");
  check(
    w.entityIn.options[0]?.textContent === "1. Kei Tanaka",
    "and the Choice shows it",
  );
  fill(w.taglineIn, "  Pilot  ");
  check(e.tagline === "Pilot", "the tagline typed, trimmed");
  fill(w.sizeIn, "Medium");
  check(e.size === "Medium", "the size typed");
  fill(w.sizeIn, "  ");
  check(e.size === "", "emptied: a key it has stays, empty");

  w.derived[Ch.HP]!.type("99");
  check(
    e.hp.overridden && C.value(e.hp) === 99 && allShown(w),
    "a number typed in HP's box overrides it",
  );
  w.statPoints[C.Mind]!.type("4");
  check(
    e.statPoints[C.Mind]!.overridden && e.statTotal === 10 && e.spent === 10,
    "an override of a Stat's points counts in the Character Points",
  );
  w.statPoints[C.Mind]!.type("");
  check(
    !e.statPoints[C.Mind]!.overridden && e.statTotal === 7,
    "and emptied, the computed points count again",
  );
  const before = f.tells;
  w.derived[Ch.SV]!.type("lots");
  check(
    f.tells === before + 1 && !e.sv.overridden && allShown(w),
    "text that isn't a number is refused, and said so",
  );
  check(
    f.told.endsWith("SV: a whole number. The computed number is used."),
    "naming the box",
  );
  w.statPoints[C.Soul]!.type("x");
  check(
    f.told.endsWith(
      "Soul's points: a whole number. The computed number is used.",
    ),
    "or the Stat",
  );
  w.derived[Ch.AR]!.type("3");
  check(
    e.ar.overridden && w.derived[Ch.AR]!.visible,
    "an override of AR shows it",
  );
  done();
});

test("a fresh name: no key added for a blank one", () => {
  const { w } = newWindow();
  const { check, done } = checker();
  fill(w.taglineIn, "   ");
  check(w.entity.tagline === undefined, "a blank tagline it hadn't: none");
  check(w.modified, "but typed: changed");
  done();
});

test("Files: the lines and the warnings", () => {
  const { w, f } = newWindow();
  const { check, done } = checker();
  check(load(w, "window.yaml"), "window.yaml loads");
  check(f.tells === 0 && !w.modified, "nothing said, unchanged");
  check(w.nameIn.value === "Pilot", "the name is shown");
  check(
    allShown(w) && w.derived[Ch.AR]!.visible,
    "every number shown, and AR, with Heavy Armour",
  );
  check(
    line(
      w,
      CharacterPoints,
      "Character Points: Stats 13 + Attributes 8 - Bonus Points 1 = 20 of 20",
      false,
    ),
    "Character Points: of the creation block's",
  );
  check(
    line(w, SkillPoints, "Skill Points: 8 of 20", false),
    "Skill Points: of the creation block's",
  );
  check(w.warnings.count() === 0, "no warnings");
  w.statValue[C.Body]!.spin(6);
  check(
    line(
      w,
      CharacterPoints,
      "Character Points: Stats 14 + Attributes 8 - Bonus Points 1 = 21 of 20",
      true,
    ),
    "one point over: red",
  );
  check(
    warning(w, "spent 21 Character Points of 20 (p. 13, PDF 15)") >= 0,
    "and a warning says so, with both pages",
  );
  w.statValue[C.Body]!.spin(13);
  check(
    warning(w, "Body (p. 15, PDF 17): 13 is outside 1 to 12 (p. 16, PDF 18)") >=
      0,
    "a Stat above 12: warned",
  );
  w.statValue[C.Body]!.spin(6);
  check(warning(w, "outside 1 to 12") < 0, "and back: not");
  check(f.tells === 0, "nothing told");
  done();
});

test("the Stats' limits, on the points line", () => {
  const { w } = newWindow();
  const { check, done } = checker();
  const e = w.entity;
  e.creation.statPointsFloor = 4;
  e.creation.statPointsCeiling = 9;
  w.statValue[C.Body]!.spin(1);
  w.statValue[C.Body]!.spin(2);
  check(
    line(
      w,
      CharacterPoints,
      "Character Points: Stats 4 + Attributes 0 - Bonus Points 0 = 4 (no limit set); Stats at least 4, at most 9",
      false,
    ),
    "both limits, not red within them",
  );
  e.creation.statPointsCeiling = 0;
  w.statValue[C.Body]!.spin(1);
  check(
    line(
      w,
      CharacterPoints,
      "Character Points: Stats 3 + Attributes 0 - Bonus Points 0 = 3 (no limit set); Stats at least 4",
      true,
    ),
    "a floor alone; below it: red",
  );
  done();
});

test("Mecha", () => {
  const { w, f } = newWindow();
  const { check, done } = checker();
  check(load(w, "mecha.yaml"), "mecha.yaml loads");
  const e = w.entity;
  check(
    e.isMecha &&
      e.name === "Lone Mecha" &&
      f.tells === 0 &&
      !w.statValue[C.Body]!.active &&
      !w.statPoints[C.Soul]!.active,
    "a mecha alone is shown, its Stats off",
  );
  check(
    w.derived[Ch.HP]!.visible &&
      !w.derived[Ch.ACV]!.visible &&
      !w.derived[Ch.DCV]!.visible &&
      !w.derived[Ch.EP]!.visible &&
      !w.derived[Ch.SV]!.visible,
    "of the derived values, only HP",
  );
  check(
    (w.points[CharacterPoints]!.textContent ?? "").startsWith(
      "Mecha Points: Attributes 0 - Bonus Points 0 = ",
    ),
    "and Mecha Points",
  );
  w.addCharacterItem.button.click();
  check(
    w.statValue[C.Body]!.active &&
      w.statPoints[C.Soul]!.active &&
      w.derived[Ch.ACV]!.visible,
    "a character after: its Stats on again",
  );
  done();
});

test("Several: renaming, and the Mecha Points", () => {
  const { w } = newWindow();
  const { check, done } = checker();
  take(w, "window.yaml", "window-several.yaml");
  const walker = w.entities[0]!;
  const pilot = w.entities[1]!;
  w.previousItem.button.click();
  check(
    w.entity === walker &&
      line(
        w,
        CharacterPoints,
        "Mecha Points: Attributes 4 - Bonus Points 0 = 4 of 20",
        false,
      ),
    "on the mecha: its Mecha Points of what that gives",
  );
  fill(w.nameIn, "Strider");
  const a = pilot.attrs as Ch.Attr;
  check(
    a.subject === "Strider" &&
      a.mecha === walker &&
      w.entityIn.options[0]?.textContent === "1. Strider (mecha)" &&
      w.modified,
    "the mecha renamed: its owner's Own a Big Mecha follows, still tied; the Choice too",
  );
  fill(w.nameIn, "");
  check(
    walker.name === "" && a.subject === "Strider" && walker.owner === undefined,
    "a blank name isn't given the subject: untied",
  );
  fill(w.nameIn, "Strider");
  check(walker.owner === pilot, "and named again, tied again");

  w.addMechaItem.button.click();
  const hopper = w.entity;
  fill(w.nameIn, "Hop & Skip");
  check(
    w.entityIn.options[2]?.textContent === "3. Hop & Skip (mecha)" &&
      hopper.name === "Hop & Skip",
    "an & shown as itself",
  );
  w.duplicateItem.button.click();
  check(
    w.entity !== hopper &&
      w.entity.owner === undefined &&
      line(
        w,
        CharacterPoints,
        "Mecha Points: Attributes 0 - Bonus Points 0 = 0 (no owner in the file)",
        false,
      ),
    "a mecha no one owns: said so",
  );
  done();
});
