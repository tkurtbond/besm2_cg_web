// Phase 10: the Mecha tab on happy-dom. Ports besm2_cg_po's TestWindow
// Several (test/TestWindow.Mod) whole, with its labels, in its order:
// the entities, the Mecha tab's lines and buttons, renaming, New Mecha,
// Duplicate, Move Up, Remove..., the last owner pricing, and Save. Its
// menu items' labels and keys are window.test.ts's Basics. Lines are
// numbered from 0 here, from 1 there. Values from the DOM are compared
// with check only, never equal or deepEqual (AGENTS.md).

import { test } from "node:test";
import * as Ch from "../../src/core/character.ts";
import * as R from "../../src/core/rules.ts";
import type { Lines } from "../../src/ui/widgets.ts";
import {
  CharacterPoints,
  Discard,
  MechaList,
  NLists,
  Title,
  type Window,
} from "../../src/ui/window.ts";
import { checker, chooseIn, newWindow, take } from "./setup.ts";

const SeveralFile = "window-several.yaml"; // TestWindow's SeveralPath

/** Whether line i of l holds s (Holds). */
function holds(l: Lines, i: number, s: string): boolean {
  return i >= 0 && i < l.count() && l.line(i).includes(s);
}

/** Types text into input, as the user does: an input event. */
function fill(input: HTMLInputElement, text: string): void {
  input.value = text;
  input.dispatchEvent(new input.ownerDocument.defaultView!.Event("input"));
}

/** Whether points line i says want, red or not (Line). */
function line(w: Window, i: number, want: string, red: boolean): boolean {
  const b = w.points[i]!;
  return b.textContent === want && b.classList.contains("red") === red;
}

/** Whether tab t's points line i reads as the Character tab's (TabLine). */
function tabLine(w: Window, t: number, i: number): boolean {
  const a = w.tabPoints[t]![i]!;
  const b = w.points[i]!;
  return (
    a.textContent === b.textContent &&
    a.classList.contains("red") === b.classList.contains("red")
  );
}

/** Whether every tab's warnings are the Character tab's (TabWarnings). */
function tabWarnings(w: Window): boolean {
  if (w.tabWarnings.length !== NLists) return false;
  for (const l of w.tabWarnings) {
    if (l.count() !== w.warnings.count()) return false;
    for (let i = 0; i < l.count(); i++) {
      if (l.line(i) !== w.warnings.line(i)) return false;
    }
  }
  return true;
}

/** The Attr of e tied to m; undefined for none (TiedTo). */
function tiedTo(e: Ch.Entity, m: Ch.Entity): Ch.Attr | undefined {
  let a = e.attrs;
  while (a !== undefined && a.mecha !== m) a = a.next;
  return a as Ch.Attr | undefined;
}

test("Several", () => {
  const { w, f, doc } = newWindow();
  const { check, done } = checker();
  const choice = (i: number) => w.entityIn.options[i]?.textContent;
  const off = (it: { disabled: boolean }) => it.disabled;
  const titleIs = (rest: string) => doc.title === Title + rest;
  const MP = w.mechaPanel;
  const list = MP.list;

  take(w, "window.yaml", SeveralFile);
  const walker = w.entities[0]!;
  const pilot = w.entities[1]!;
  const p = w.attrPanel;
  check(
    w.current === 1 &&
      titleIs(" - window-several.yaml (2 of 2)") &&
      w.entityIn.options.length === 2 &&
      choice(0) === "1. Walker (mecha)" &&
      choice(1) === "2. Pilot" &&
      w.entityIn.selectedIndex === 1,
    "two entities: the title says which, the Choice lists them",
  );
  check(
    !off(w.removeItem) &&
      !off(w.moveUpItem) &&
      !off(w.previousItem) &&
      off(w.moveDownItem) &&
      off(w.nextItem),
    "the last: Move Down and Next off",
  );

  check(
    MP.n === 1 &&
      holds(list, 0, "1 Own a Big Mecha: Walker") &&
      holds(list, 0, "20 MP") &&
      holds(list, 0, "Walker spends 4 of 20") &&
      list.count() === 1 &&
      !MP.showButton.disabled &&
      !MP.newButton.disabled &&
      tabLine(w, MechaList, CharacterPoints) &&
      tabWarnings(w),
    "Mecha tab: the character's Own a Big Mecha, its Mecha Points, its mecha's; the totals",
  );
  MP.showButton.click();
  check(
    w.current === 0 &&
      w.entity === walker &&
      titleIs(" - window-several.yaml (1 of 2)") &&
      off(w.moveUpItem) &&
      off(w.previousItem) &&
      !off(w.nextItem),
    "Show Mecha, the only line: the mecha shown",
  );
  check(
    MP.n === 1 &&
      holds(list, 0, "Pilot: 1 Own a Big Mecha: Walker") &&
      holds(list, 0, "20 MP") &&
      MP.newButton.disabled &&
      line(
        w,
        CharacterPoints,
        "Mecha Points: Attributes 4 - Bonus Points 0 = 4 of 20",
        false,
      ),
    "on the mecha: its owner, and its Mecha Points of what that gives",
  );
  check(
    p.kind === R.MechaAttribute &&
      p.second === R.Attribute &&
      w.defectPanel.kind === R.MechaDefect,
    "a mecha's lists offer the Mecha Attributes and Defects first",
  );
  fill(w.nameIn, "Strider");
  check(
    (pilot.attrs as Ch.Attr).subject === "Strider" &&
      pilot.attrs?.mecha === walker &&
      choice(0) === "1. Strider (mecha)" &&
      w.modified,
    "the mecha renamed: its owner's Own a Big Mecha follows, still tied; the Choice too",
  );
  MP.showButton.click();
  check(
    w.entity === pilot &&
      p.kind === R.Attribute &&
      p.second === R.MechaAttribute &&
      holds(list, 0, "1 Own a Big Mecha: Strider"),
    "Show Owner: the character, its lists the character's again",
  );

  p.blank();
  const own = R.find("Own a Big Mecha")!;
  chooseIn(
    p.choice,
    [...p.choice.options].findIndex((o) => o.textContent === R.label(own)),
  );
  p.text.value = "";
  p.spinner.setValue(1);
  p.addButton.click();
  check(
    MP.n === 2 && holds(list, 1, "no subject"),
    "an Own a Big Mecha with no subject: no mecha",
  );
  let before = f.tells;
  list.deselect();
  MP.newButton.click();
  check(
    f.tells === before + 1 &&
      f.told === "Choose an Own a Big Mecha first." &&
      w.entities.length === 2,
    "New Mecha, two lines, none chosen: said so",
  );
  list.select(0);
  before = f.tells;
  MP.newButton.click();
  check(
    f.tells === before + 1 && w.entities.length === 2,
    "New Mecha on one with its mecha: said so",
  );
  list.select(1);
  f.typed = "  Hopper ";
  MP.newButton.click();
  f.typed = undefined;
  const hopper = w.entity;
  const a = tiedTo(pilot, hopper);
  check(
    w.entities.length === 3 &&
      w.current === 2 &&
      hopper.isMecha &&
      hopper.name === "Hopper" &&
      a !== undefined &&
      a.subject === "Hopper" &&
      hopper.owner === pilot &&
      hopper.available === 20 &&
      titleIs(" - window-several.yaml (3 of 3) *"),
    "New Mecha, the name asked: the subject given it, the mecha last, shown, tied",
  );
  fill(w.nameIn, "Hop & Skip");
  check(
    choice(2) === "3. Hop & Skip (mecha)" &&
      a?.subject === "Hop & Skip" &&
      a?.mecha === hopper,
    "an & shown as itself",
  );

  w.duplicateItem.button.click();
  let copy = w.entity;
  check(
    w.entities.length === 4 &&
      w.current === 3 &&
      copy !== hopper &&
      copy.name === "Hop & Skip" &&
      copy.owner === undefined &&
      copy.attrs === undefined &&
      line(
        w,
        CharacterPoints,
        "Mecha Points: Attributes 0 - Bonus Points 0 = 0 (no owner in the file)",
        false,
      ) &&
      MP.n === 0 &&
      holds(list, 0, "No character in the file owns this mecha") &&
      MP.showButton.disabled,
    "Duplicate: the copy last, shown; a mecha of a name already tied, so no owner",
  );
  w.moveUpItem.button.click();
  check(
    w.current === 2 &&
      w.entities[2] === copy &&
      w.entities[3] === hopper &&
      a?.mecha === copy &&
      hopper.owner === undefined &&
      choice(2) === "3. Hop & Skip (mecha)",
    "Move Up: swapped, still shown; the first of the name is the one tied",
  );
  f.yes = false;
  before = f.confirmed;
  w.removeItem.button.click();
  check(
    f.confirmed === before + 1 &&
      f.question === "Remove Hop & Skip from the file?" &&
      w.entities.length === 4,
    "Remove..., cancelled: asked, nothing removed",
  );
  f.yes = true;
  w.removeItem.button.click();
  check(
    w.entities.length === 3 &&
      w.current === 2 &&
      w.entity === hopper &&
      a?.mecha === hopper &&
      hopper.owner === pilot,
    "Remove: gone, the one after shown, the other tied again",
  );

  w.addMechaItem.button.click();
  check(
    w.entities.length === 4 &&
      w.current === 3 &&
      w.entity.isMecha &&
      w.entity.name === undefined &&
      choice(3) === "4. (no name) (mecha)" &&
      holds(list, 0, "No character in the file owns this mecha"),
    "Add Mecha: a new mecha, last",
  );
  w.nextItem.button.click();
  check(w.current === 3, "Next at the last: nothing");
  w.previousItem.button.click();
  check(w.entity === hopper, "Previous");
  w.nextItem.button.click();
  check(w.current === 3, "Next");
  chooseIn(w.entityIn, 1);
  check(w.entity === pilot, "the Choice shows the one chosen");
  w.addCharacterItem.button.click();
  check(
    w.entities.length === 5 &&
      w.current === 4 &&
      !w.entity.isMecha &&
      MP.n === 0 &&
      holds(list, 0, "add it on the Attributes tab") &&
      MP.showButton.disabled,
    "Add Character: a new one, last",
  );
  before = f.tells;
  MP.newButton.click();
  check(
    f.tells === before + 1 && w.entities.length === 5,
    "New Mecha with no Own a Big Mecha: said so",
  );

  chooseIn(w.entityIn, 1);
  w.duplicateItem.button.click();
  copy = w.entity;
  check(
    w.entities.length === 6 &&
      copy.name === "Pilot" &&
      walker.owner === copy &&
      holds(list, 0, "Strider spends 4 of 20"),
    "a character duplicated: its copy, last, prices their mecha",
  );
  chooseIn(w.entityIn, 1);
  check(
    holds(list, 0, "Strider is Pilot's: not counted"),
    "and the first says its doesn't count",
  );
  chooseIn(w.entityIn, 0);
  check(
    MP.n === 2 &&
      holds(list, 0, "not counted: Pilot owns it") &&
      !holds(list, 1, "not counted"),
    "the mecha lists both, and which counts",
  );
  chooseIn(w.entityIn, 5);
  w.removeItem.button.click();
  check(
    w.entities.length === 5 && w.current === 4 && walker.owner === pilot,
    "the copy removed, the last: the one before shown",
  );

  const n = f.downloads.length;
  w.saveItem.action!();
  const r =
    f.downloads.length === n + 1
      ? Ch.loadAll(f.downloads.at(-1)!.text, SeveralFile)
      : undefined;
  const es = r?.ok ? r.es : undefined;
  check(
    es !== undefined &&
      es.length === 5 &&
      es[0]!.name === "Strider" &&
      es[1]!.name === "Pilot" &&
      es[2]!.name === "Hop & Skip" &&
      es[3]!.isMecha &&
      es[3]!.name === undefined &&
      !es[4]!.isMecha &&
      tiedTo(es[1]!, es[0]!) !== undefined &&
      tiedTo(es[1]!, es[2]!) !== undefined &&
      es[2]!.available === 20,
    "saved and loaded again: in order, tied, priced",
  );

  f.answer = Discard;
  w.newItem.action!();
  check(
    w.entities.length === 1 &&
      off(w.removeItem) &&
      off(w.nextItem) &&
      off(w.previousItem) &&
      titleIs("") &&
      choice(0) === "1. (no name)",
    "File > New: one, Remove off, the title without a count",
  );
  done();
});

test("the Mecha tab's messages", () => {
  const { w, f } = newWindow();
  const { check, done } = checker();
  const MP = w.mechaPanel;
  let before = f.tells;
  MP.newButton.click();
  check(
    f.tells === before + 1 &&
      f.told ===
        "Give the character Own a Big Mecha (p. 59, PDF 61) on the Attributes tab first." &&
      MP.n === 0 &&
      MP.list.line(0) ===
        "No Own a Big Mecha (p. 59, PDF 61): add it on the Attributes tab.",
    "a new character: none, and what to do",
  );
  take(w, "window.yaml", SeveralFile);
  const pilot = w.entities[1]!;
  const walker = w.entities[0]!;
  (walker.attrs as Ch.Attr).level = 30;
  w.changed();
  check(
    walker.spent > 20 &&
      holds(MP.list, 0, `Walker spends ${walker.spent} of 20: over`),
    "a mecha spending more than its owners give: over",
  );
  (walker.attrs as Ch.Attr).level = 1;
  (pilot.attrs as Ch.Attr).subject = "Nobody";
  w.changed();
  check(
    holds(MP.list, 0, "no mecha of that name in the file"),
    "a subject naming no mecha in the file: said so",
  );
  before = f.tells;
  MP.showButton.click();
  check(
    f.tells === before + 1 &&
      f.told ===
        "That Own a Big Mecha's mecha isn't in the file: New Mecha makes it." &&
      w.entity === pilot,
    "Show Mecha on it: said so",
  );
  MP.newButton.click();
  check(
    w.entities.length === 3 &&
      w.entity.isMecha &&
      w.entity.name === "Nobody" &&
      w.entity.owner === pilot &&
      f.texts === 0,
    "New Mecha: named by its subject, not asked",
  );
  check(
    MP.list.line(0) === "Pilot: 1 Own a Big Mecha: Nobody\t20 MP\t" &&
      MP.showButton.textContent === "Show Owner",
    "on it: its owner, counted",
  );
  w.addMechaItem.button.click();
  fill(w.nameIn, "Lonely");
  check(
    MP.list.line(0) ===
      "No character in the file owns this mecha: give one Own a Big Mecha (p. 59, PDF 61) with the subject Lonely.",
    "a mecha no one owns: what to do, with its name",
  );
  before = f.tells;
  MP.showButton.click();
  check(
    MP.showButton.disabled && f.tells === before,
    "Show Owner off with no owner",
  );

  chooseIn(w.entityIn, 1);
  const p = w.attrPanel;
  p.blank();
  const own = R.find("Own a Big Mecha")!;
  chooseIn(
    p.choice,
    [...p.choice.options].findIndex((o) => o.textContent === R.label(own)),
  );
  p.addButton.click();
  MP.list.select(MP.n - 1);
  const n = w.entities.length;
  f.typed = "   ";
  before = f.tells;
  MP.newButton.click();
  check(
    f.tells === before + 1 &&
      f.told === "A mecha is found by its name: give one." &&
      w.entities.length === n,
    "a blank name: said so, nothing added",
  );
  f.typed = undefined;
  MP.newButton.click();
  check(w.entities.length === n, "the name not given: nothing added");
  done();
});
