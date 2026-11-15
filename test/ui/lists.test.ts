// Phase 8: the Attributes, Defects, Skills and Background tabs on
// happy-dom. Ports besm2_cg_po's TestWindow Attributes, Offers, Defects,
// Skills and Background (test/TestWindow.Mod), with their labels; as
// there, they run in order on one window, each going on from what the
// one before left. Lines are numbered from 0 here, from 1 there. Values
// from the DOM are compared with check only, never equal or deepEqual
// (AGENTS.md).

import { test } from "node:test";
import * as C from "../../src/core/calc.ts";
import * as Ch from "../../src/core/character.ts";
import * as R from "../../src/core/rules.ts";
import type { Panel } from "../../src/ui/widgets.ts";
import {
  AttributesList,
  BonusPoints,
  CharacterPoints,
  DefectsList,
  NLists,
  SkillPoints,
  SkillsList,
  type Window,
} from "../../src/ui/window.ts";
import { checker, chooseIn, load, newWindow, type Fakes } from "./setup.ts";

const { w, f } = newWindow() as { w: Window; f: Fakes };
let e: Ch.Entity;

/** fill types text into input, as the user does: an input event. */
function fill(input: HTMLInputElement | HTMLTextAreaElement, text: string) {
  input.value = text;
  input.dispatchEvent(new input.ownerDocument.defaultView!.Event("input"));
}

/** Whether points line i says want, red or not (Line). */
function line(i: number, want: string, red: boolean): boolean {
  const b = w.points[i]!;
  return b.textContent === want && b.classList.contains("red") === red;
}

/** The last warning holding text; -1 if none (Warning). */
function warning(text: string): number {
  return w.warnings.find(text);
}

/** Whether tab t's points line i reads as the Character tab's (TabLine). */
function tabLine(t: number, i: number): boolean {
  const a = w.tabPoints[t]![i]!;
  const b = w.points[i]!;
  return (
    a.textContent === b.textContent &&
    a.classList.contains("red") === b.classList.contains("red")
  );
}

/** Whether every tab's warnings are the Character tab's (TabWarnings). */
function tabWarnings(): boolean {
  if (w.tabWarnings.length !== NLists) return false;
  for (let t = 0; t < NLists; t++) {
    const l = w.tabWarnings[t]!;
    if (l.count() !== w.warnings.count()) return false;
    for (let i = 0; i < l.count(); i++) {
      if (l.line(i) !== w.warnings.line(i)) return false;
    }
  }
  return true;
}

/** Whether line i of p's lines holds s (Holds). */
function holds(
  l: { count(): number; line(i: number): string },
  i: number,
  s: string,
): boolean {
  return i >= 0 && i < l.count() && l.line(i).includes(s);
}

/** Chooses it in p's <select>, as the user does (ChooseItem). */
function chooseItem(p: Panel, it: R.Item): void {
  const label = R.label(it);
  const i = [...p.choice.options].findIndex((o) => o.textContent === label);
  if (i < 0) throw new Error("not offered: " + label);
  chooseIn(p.choice, i);
}

/** The line of option label of it, from 0 (OptLine). */
function optLine(it: R.Item, label: string): number {
  const i = it.option.findIndex((o) => R.sameName(o.label, label));
  if (i < 0) throw new Error("no option " + label);
  return i;
}

/** The text of the <select>'s option chosen. */
function chosenText(s: HTMLSelectElement): string {
  return s.options[s.selectedIndex]?.textContent ?? "";
}

test("Attributes", () => {
  const { check, done } = checker();
  check(load(w, "window.yaml"), "window.yaml loads");
  e = w.entity;
  const p = w.attrPanel;
  const l = p.lines;
  check(
    l.count() === 2 &&
      holds(l, 0, "1 Own a Big Mecha: Walker") &&
      holds(l, 0, "4 pts") &&
      holds(l, 0, "p. 59, PDF 61") &&
      holds(l, 1, "1 Heavy Armour"),
    "Attributes: the character's listed, level, name: subject, points and both pages",
  );
  check(
    tabLine(AttributesList, CharacterPoints) &&
      tabLine(SkillsList, SkillPoints) &&
      tabWarnings(),
    "the lists' tabs show the Character tab's points and warnings",
  );

  let before = f.tells;
  const n = l.count();
  p.blank();
  p.addButton.click();
  check(
    f.tells === before + 1 &&
      f.told === "Choose a name first." &&
      l.count() === n &&
      !w.modified,
    "Add with no name chosen: said so, nothing added",
  );

  const flight = R.find("Flight")!;
  chooseItem(p, flight);
  check(
    chosenText(p.choice) === "Flight (p. 33, PDF 35)" && p.help.page === 33,
    "a name chosen: shown with both pages; ? turns to its page",
  );
  const o = p.options;
  check(
    o.active &&
      o.count() === flight.option.length &&
      holds(o, 0, "(x) ") &&
      holds(o, optLine(flight, "cannot hover"), "( ) cannot hover"),
    "its options, the first of a choice counted",
  );
  before = f.tells;
  p.plus.click();
  check(
    f.tells === before + 1 && f.told === "Choose an option first.",
    "+ with no option: said so",
  );
  let ln = optLine(flight, "cannot hover");
  o.select(ln);
  p.plus.click();
  o.select(0);
  p.plus.click();
  check(
    holds(o, 0, "(x) ") && holds(o, ln, "( ) cannot hover"),
    "+ on another of a choice: it, not the one before",
  );
  o.select(ln);
  p.plus.click();
  ln = optLine(flight, "skimmer or hovercraft");
  o.select(ln);
  p.plus.click();
  check(
    holds(o, 0, "( ) ") &&
      holds(o, optLine(flight, "cannot hover"), "(x) cannot hover") &&
      holds(o, ln, "[x] skimmer"),
    "+: one of a choice, the others not; an option alone taken",
  );
  p.spinner.setValue(2);
  p.details.value = "  wings ";
  p.addButton.click();
  let a = e.attrs!.next!.next as Ch.Attr;
  check(
    l.count() === 3 &&
      l.selected() === 2 &&
      a.item === flight &&
      a.level === 2 &&
      a.details === "wings" &&
      C.value(a.points) === 5 &&
      w.modified,
    "Add: last, selected, at its Level, its options, 5 points",
  );
  check(
    line(
      CharacterPoints,
      "Character Points: Stats 13 + Attributes 13 - Bonus Points 1 = 25 of 20",
      true,
    ) &&
      tabLine(AttributesList, CharacterPoints) &&
      tabLine(DefectsList, CharacterPoints) &&
      warning("Character Points") >= 0 &&
      tabWarnings(),
    "the totals and warnings, here and on every tab, as you go",
  );

  const keep = a;
  p.blank();
  l.select(2);
  check(
    p.choiceIndex() >= 0 &&
      p.item() === flight &&
      p.spinner.value === 2 &&
      holds(o, optLine(flight, "cannot hover"), "(x) cannot hover"),
    "a line selected: its name, Level and options loaded",
  );
  p.spinner.setValue(3);
  p.changeButton.click();
  a = e.attrs!.next!.next as Ch.Attr;
  check(
    a === keep &&
      a.level === 3 &&
      C.value(a.points) === 8 &&
      l.selected() === 2 &&
      holds(l, 2, "3 Flight (wings)"),
    "Change: the same Attribute, at its new Level",
  );
  l.select(0);
  p.text.value = "Nobody";
  p.changeButton.click();
  check(
    (e.attrs as Ch.Attr).mecha === undefined &&
      (e.attrs as Ch.Attr).subject === "Nobody",
    "Own a Big Mecha's subject changed: unlinked",
  );
  l.select(0);
  p.text.value = "Walker";
  p.changeButton.click();
  check(
    (e.attrs as Ch.Attr).mecha === w.entities[0],
    "and named again: linked to its mecha",
  );
  l.select(2);
  p.removeButton.click();
  check(
    l.count() === 2 &&
      l.selected() === -1 &&
      p.choiceIndex() < 0 &&
      line(
        CharacterPoints,
        "Character Points: Stats 13 + Attributes 8 - Bonus Points 1 = 20 of 20",
        false,
      ) &&
      tabLine(AttributesList, CharacterPoints),
    "Remove: gone, nothing selected, the totals back",
  );
  before = f.tells;
  p.changeButton.click();
  p.removeButton.click();
  check(
    f.tells === before && l.count() === 2,
    "Change and Remove with no line: nothing",
  );
  done();
});

/**
 * Whether p's <select> offers each of the rulebook's names as its label
 * gives it, one option each, in order, after the Placeholder, with a
 * Divider between the kinds (Offers).
 */
function offers(p: Panel): boolean {
  const dividers = (p.second !== -1 ? 1 : 0) + (p.more() > 0 ? 1 : 0);
  if (p.choice.options.length !== p.offered() + p.more() + 1 + dividers) {
    return false;
  }
  const labels = [...p.choice.options]
    .filter((o) => o.value !== "")
    .map((o) => o.textContent);
  const n = R.count(p.kind);
  for (let i = 0; i < p.offered(); i++) {
    const it = i < n ? R.get(p.kind, i) : R.get(p.second as R.Kind, i - n);
    if (labels[i] !== R.label(it)) return false;
  }
  return true;
}

test("Defects", () => {
  const { check, done } = checker();
  const p = w.defectPanel;
  const l = p.lines;
  check(
    l.count() === 1 &&
      holds(l, 0, "1 Unique Character Defect: Stubborn") &&
      holds(l, 0, "1 BP"),
    "Defects: listed, rank, name: subject, Bonus Points",
  );
  chooseItem(p, R.find("Easily Distracted")!);
  check(p.help.page === 104, "? at its page");
  const magnet = R.find("Girl/Guy Magnet")!;
  chooseItem(p, magnet);
  check(
    offers(p) && p.item() === magnet,
    "every name offered as it is, a / too",
  );
  chooseItem(p, R.find("Easily Distracted")!);
  p.spinner.setValue(2);
  p.details.value = "cats";
  p.addButton.click();
  const d = e.defects!.next as Ch.Defect;
  check(
    d !== undefined &&
      d.rank === 2 &&
      d.details === "cats" &&
      holds(l, 1, "2 Easily Distracted (cats)") &&
      holds(l, 1, "2 BP") &&
      e.bonusPoints === 3,
    "Add: its rank, and its Bonus Points",
  );
  check(
    line(
      CharacterPoints,
      "Character Points: Stats 13 + Attributes 8 - Bonus Points 3 = 18 of 20",
      false,
    ) &&
      tabLine(DefectsList, CharacterPoints) &&
      tabLine(DefectsList, BonusPoints),
    "and the totals",
  );
  l.select(1);
  p.spinner.setValue(1);
  p.changeButton.click();
  check(
    e.defects!.next === d && d.rank === 1 && e.bonusPoints === 2,
    "Change: its rank",
  );
  l.select(1);
  p.removeButton.click();
  check(e.defects!.next === undefined && e.bonusPoints === 1, "Remove");
  done();
});

test("Skills", () => {
  const { check, done } = checker();
  const p = w.skillPanel;
  const l = p.lines;
  check(
    p.genre.selectedIndex === R.ModernMilitary + 1 &&
      l.count() === 1 &&
      holds(l, 0, "2 Driving") &&
      holds(l, 0, "8 SP") &&
      holds(l, 0, "p. 122, PDF 124"),
    "Skills: the genre, and the Skill at its cost",
  );
  check(p.genreHelp.page === R.SkillCostsPage, "the genre's ? at Table 2-4");
  w.saveItem.action!();
  chooseIn(p.genre, R.Cyberpunk + 1);
  check(
    e.creation.genre === R.Cyberpunk &&
      C.value(e.skills!.points) === 6 &&
      holds(l, 0, "6 SP") &&
      w.modified &&
      line(SkillPoints, "Skill Points: 6 of 20", false) &&
      tabLine(SkillsList, SkillPoints),
    "another genre: every Skill priced again (p. 119)",
  );
  l.select(0);
  p.text.value = " Cars, , Trucks ";
  p.changeButton.click();
  const s = e.skills as Ch.Skill;
  check(
    s.specs === 2 &&
      s.specialisations?.[1] === "Trucks" &&
      holds(l, 0, "2 Driving (Cars, Trucks)") &&
      C.value(s.points) === 7,
    "specialisations: split at commas, trimmed, blanks dropped; the second 1 SP",
  );
  p.text.value = "";
  l.select(0);
  check(
    p.text.value === "Cars, Trucks",
    "selected: its specialisations loaded, joined by commas",
  );

  const h = new Ch.HouseSkill();
  C.initHouseSkill(h);
  h.name = "Mecha Piloting";
  h.cost[R.Cyberpunk] = 5;
  C.addHouseSkill(e.creation, h);
  p.show(e);
  chooseIn(
    p.choice,
    [...p.choice.options].findIndex((o) => o.value === String(p.offered())),
  );
  check(
    chosenText(p.choice) === "Mecha Piloting (house rule)" &&
      p.house() === h &&
      p.help.page === 0,
    "a house Skill offered after the rulebook's",
  );
  p.spinner.setValue(1);
  p.addButton.click();
  check(
    e.skills!.next !== undefined &&
      (e.skills!.next as Ch.Skill).house === h &&
      holds(l, 1, "5 SP") &&
      holds(l, 1, "house rule") &&
      e.skillSpent === 12,
    "Add: priced at its genre's cost",
  );
  p.blank();
  l.select(1);
  check(
    chosenText(p.choice) === "Mecha Piloting (house rule)" && p.house() === h,
    "its line selected: the house Skill chosen again",
  );
  p.removeButton.click();
  check(e.skills!.next === undefined && e.skillSpent === 7, "Remove");
  done();
});

test("Background", () => {
  const { check, done } = checker();
  const b = w.background;
  w.saveItem.action!();
  fill(b.description, "  A test pilot.  ");
  check(
    e.description === "A test pilot." && w.modified,
    "Background: the description, as typed, trimmed",
  );
  let before = f.tells;
  b.noteIn.value = "  ";
  b.addNote.click();
  check(
    f.tells === before + 1 &&
      f.told === "Type the note first." &&
      e.notes === undefined,
    "a blank note: said so",
  );
  b.noteIn.value = " first ";
  b.addNote.click();
  b.noteIn.value = "second";
  b.addNote.click();
  check(
    e.notes?.length === 2 &&
      e.notes[0] === "first" &&
      b.notes.count() === 2 &&
      b.notes.selected() === 1,
    "notes added, last, trimmed",
  );
  before = f.tells;
  b.notes.deselect();
  b.removeNote.click();
  check(
    f.tells === before + 1 && f.told === "Choose a note first.",
    "Remove with none selected: said so",
  );
  b.notes.select(0);
  check(b.noteIn.value === "first", "a note selected: in the input");
  b.noteIn.value = "one";
  b.changeNote.click();
  check(
    e.notes?.length === 2 && e.notes[0] === "one" && e.notes[1] === "second",
    "Change: in place",
  );
  b.notes.select(1);
  b.removeNote.click();
  check(e.notes?.length === 1 && b.notes.count() === 1, "Remove");

  const flight = R.find("Flight")!;
  chooseItem(w.attrPanel, flight);
  const glider = optLine(flight, "glider");
  w.attrPanel.options.select(glider);
  w.attrPanel.plus.click();
  w.attrPanel.addButton.click();
  const n = f.downloads.length;
  w.saveItem.action!();
  const r =
    f.downloads.length === n + 1
      ? Ch.loadAll(f.downloads.at(-1)!.text, "window.yaml")
      : undefined;
  const es = r?.ok ? r.es : undefined;
  check(!w.modified && es?.length === 2, "File > Save");
  if (es !== undefined) {
    const c = es[1]!;
    check(
      c.creation.genre === R.Cyberpunk &&
        c.skills?.specs === 2 &&
        c.description === "A test pilot." &&
        c.notes?.length === 1 &&
        c.notes[0] === "one",
      "and loaded again: the genre, the specialisations, the description, the notes",
    );
    const a = c.attrs?.next?.next as Ch.Attr | undefined;
    check(
      a !== undefined &&
        a.times[glider] === 1 &&
        !a.points.overridden &&
        (c.attrs as Ch.Attr).mecha === es[0],
      "the option, priced the same; the mecha linked",
    );
  }
  done();
});

test("a mecha is offered the Mecha Attributes and Defects first", () => {
  const { check, done } = checker();
  w.previousItem.button.click();
  check(w.entity.isMecha, "the mecha shown");
  const p = w.attrPanel;
  check(
    p.kind === R.MechaAttribute &&
      p.second === R.Attribute &&
      offers(p) &&
      w.defectPanel.kind === R.MechaDefect &&
      offers(w.defectPanel),
    "Mecha Attributes, then Attributes; Mecha Defects, then Defects",
  );
  check(
    p.lines.count() > 0 && holds(p.lines, 0, "pts"),
    "and the mecha's own listed",
  );
  w.nextItem.button.click();
  check(
    p.kind === R.Attribute && w.defectPanel.kind === R.Defect,
    "the character again: the character's first",
  );
  done();
});

test("an Attribute without options: none to take", () => {
  const { check, done } = checker();
  const p = w.attrPanel;
  p.blank();
  check(
    !p.options.active && p.plus.disabled && p.minus.disabled,
    "nothing chosen: no options",
  );
  chooseItem(p, R.find("Appearance")!);
  check(
    R.find("Appearance")!.option.length === 0 &&
      !p.options.active &&
      p.options.count() === 0 &&
      p.plus.disabled,
    "one with none: the list and + and - off",
  );
  chooseItem(p, R.find("Flight")!);
  check(
    p.options.active && !p.plus.disabled && p.options.count() > 0,
    "one with options: on again",
  );
  done();
});
