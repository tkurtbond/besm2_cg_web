// Phase 9: the Weapon Attack dialog on happy-dom. Ports besm2_cg_po's
// TestWindow Weapons (test/TestWindow.Mod), with its labels, in order on
// one window. Lines are numbered from 0 here, from 1 there. Values from
// the DOM are compared with check only, never equal or deepEqual
// (AGENTS.md).

import { test } from "node:test";
import * as C from "../../src/core/calc.ts";
import * as Ch from "../../src/core/character.ts";
import * as R from "../../src/core/rules.ts";
import type { Lines, NumberBox, Panel } from "../../src/ui/widgets.ts";
import { Discard, type Window } from "../../src/ui/window.ts";
import { checker, chooseIn, newWindow, type Fakes } from "./setup.ts";

const { w, f } = newWindow() as { w: Window; f: Fakes };

/** Whether line i of l holds s (Holds). */
function holds(l: Lines, i: number, s: string): boolean {
  return i >= 0 && i < l.count() && l.line(i).includes(s);
}

/** Chooses it in p's <select>, as the user does (ChooseItem). */
function chooseItem(p: Panel, it: R.Item): void {
  const label = R.label(it);
  const i = [...p.choice.options].findIndex((o) => o.textContent === label);
  if (i < 0) throw new Error("not offered: " + label);
  chooseIn(p.choice, i);
}

/** Whether b shows n: computed, and its override or "" (Shows). */
function shows(b: NumberBox, n: C.Num): boolean {
  return b.shows(n);
}

function kind(k: R.Kind, name: string): R.Item {
  const it = R.findKind(k, name);
  if (it === undefined) throw new Error("no " + name);
  return it;
}

test("Weapons", () => {
  const { check, done } = checker();
  f.answer = Discard;
  w.newItem.action!();
  const e = w.entity;
  const p = w.attrPanel;
  const wa = R.find("Weapon Attack")!;
  let before = f.tells;
  w.weaponButton.click();
  check(
    f.tells === before + 1 &&
      f.told === "Choose a Weapon Attack first." &&
      w.weapon === undefined,
    "Weapon... with no Weapon Attack selected: said so",
  );
  chooseItem(p, wa);
  p.spinner.setValue(4);
  p.text.value = "Sword";
  p.addButton.click();
  const a = e.attrs as Ch.Attr;
  // Saved, so that Cancel's putting modified back is seen.
  f.typed = "weapon.yaml";
  w.saveAsItem.action!();
  const was = w.modified;
  check(!was, "saved: not modified");

  w.weaponButton.click();
  let D = w.weapon!;
  check(
    D !== undefined &&
      D.attr === a &&
      D.help.page === 81 &&
      D.level.value === 4 &&
      D.primary.disabled &&
      D.primary.checked,
    "Weapon...: its dialog, ? at p. 81, its Level; the only one, the primary",
  );
  check(
    D.title.textContent === "Weapon Attack (p. 81, PDF 83)",
    "its name, with both pages",
  );
  check(
    shows(D.damage, a.damage) &&
      shows(D.points, a.points) &&
      C.value(a.damage) === 60 &&
      C.value(a.points) === 16,
    "its damage and points",
  );

  const A = D.abilities;
  const Dis = D.disabilities;
  chooseItem(A, kind(R.Ability, "Accurate"));
  check(
    A.help.page === 83 && A.spinner.value === 1,
    "an Ability chosen: ? at its page, its slots",
  );
  A.addButton.click();
  check(
    A.lines.count() === 1 &&
      holds(A.lines, 0, "Accurate") &&
      holds(A.lines, 0, "1 slot") &&
      holds(A.lines, 0, "p. 83, PDF 85") &&
      C.value(a.damage) === 45 &&
      shows(D.damage, a.damage) &&
      w.modified,
    "Add: listed, with its slots and both pages; the damage follows",
  );

  chooseItem(Dis, kind(R.Disability, "Melee"));
  check(Dis.spinner.value === 2, "Melee: its 2 slots");
  Dis.spinner.setValue(1);
  Dis.text.value = " sword ";
  Dis.addButton.click();
  const m = a.disabilities as Ch.Mod | undefined;
  check(
    m !== undefined &&
      m.countsAs === 1 &&
      holds(Dis.lines, 0, "Melee (sword)") &&
      holds(Dis.lines, 0, "1 slot") &&
      C.value(a.damage) === 60,
    "counting as 1: counts-as, its detail, the damage",
  );

  A.lines.select(0);
  check(A.item() === kind(R.Ability, "Accurate"), "a line selected: loaded");
  A.spinner.setValue(2);
  A.changeButton.click();
  check(
    holds(A.lines, 0, "Accurate x2") &&
      holds(A.lines, 0, "2 slots") &&
      C.value(a.damage) === 45,
    "Change: twice, x2",
  );

  D.setLevel(5);
  check(
    a.level === 5 &&
      C.value(a.damage) === 60 &&
      C.value(a.points) === 20 &&
      shows(D.points, a.points) &&
      holds(p.lines, 0, "5 Weapon Attack: Sword") &&
      holds(p.lines, 0, "20 pts"),
    "the Level: damage, points, and the list, follow",
  );
  D.damage.type("50");
  check(
    a.damage.overridden &&
      C.value(a.damage) === 50 &&
      shows(D.damage, a.damage),
    "the damage overridden",
  );
  D.setGunner(true);
  check(
    a.differentGunner &&
      C.value(a.points) === 25 &&
      D.warnings.find("Different Gunner") >= 0,
    "a different gunner: +5, and warned on a character",
  );

  D.cancel.click();
  check(
    w.weapon === undefined &&
      !w.dialogs.open &&
      a.level === 4 &&
      a.abilities === undefined &&
      a.disabilities === undefined &&
      !a.damage.overridden &&
      !a.differentGunner &&
      C.value(a.damage) === 60 &&
      C.value(a.points) === 16 &&
      w.modified === was &&
      holds(p.lines, 0, "4 Weapon Attack: Sword"),
    "Cancel: everything as it was",
  );

  w.weaponButton.click();
  D = w.weapon!;
  chooseItem(D.disabilities, kind(R.Disability, "Melee"));
  D.disabilities.spinner.setValue(1);
  D.disabilities.addButton.click();
  chooseItem(D.abilities, kind(R.Ability, "Area Effect"));
  D.abilities.addButton.click();
  D.subjectIn.value = " Spear ";
  D.abilities.lines.select(0);
  D.abilities.removeButton.click();
  check(D.abilities.lines.count() === 0 && a.abilities === undefined, "Remove");
  chooseItem(D.abilities, kind(R.Ability, "Area Effect"));
  D.abilities.addButton.click();
  D.ok.click();
  check(
    w.weapon === undefined &&
      !w.dialogs.open &&
      a.subject === "Spear" &&
      a.abilities !== undefined &&
      a.disabilities?.countsAs === 1 &&
      C.value(a.damage) === 60 &&
      holds(p.lines, 0, "4 Weapon Attack: Spear") &&
      w.modified,
    "OK: kept, the subject taken",
  );

  chooseItem(p, wa);
  p.spinner.setValue(4);
  p.text.value = "Bow";
  p.addButton.click();
  const a2 = a.next as Ch.Attr;
  check(
    a.isPrimary && C.value(a2.points) === 2,
    "a second at the same Level: 2 points",
  );
  p.lines.select(0);
  w.weaponButton.click();
  D = w.weapon!;
  check(
    !D.primary.disabled && D.primary.checked,
    "two: primary can be changed",
  );
  before = f.tells;
  D.setPrimary(false);
  check(
    f.tells === before + 1 && a.isPrimary && D.primary.checked,
    "unmarked: still the primary, and said why",
  );
  D.disabilities.lines.select(0);
  D.disabilities.spinner.setValue(2);
  D.disabilities.changeButton.click();
  check(
    a.disabilities?.countsAs === 0,
    "Melee changed to its own 2 slots: counts-as left out",
  );
  D.cancel.click();
  check(
    a.disabilities !== undefined &&
      a.disabilities.countsAs === 1 &&
      C.value(a.damage) === 60 &&
      !a.primary,
    "Cancel: a changed Disability as it was",
  );
  p.lines.select(1);
  w.weaponButton.click();
  D = w.weapon!;
  D.setPrimary(true);
  check(
    a2.primary &&
      a2.isPrimary &&
      !a.isPrimary &&
      C.value(a2.points) === 16 &&
      C.value(a.points) === 2 &&
      holds(p.lines, 0, "2 pts"),
    "the second marked: the primary, priced so, and the first a secondary",
  );
  D.ok.click();

  const n = f.downloads.length;
  f.typed = "weapon.yaml";
  w.saveAsItem.action!();
  const r =
    f.downloads.length === n + 1
      ? Ch.loadAll(f.downloads.at(-1)!.text, "weapon.yaml")
      : undefined;
  const es = r?.ok ? r.es : undefined;
  const b = es?.[0]?.attrs;
  check(
    b !== undefined &&
      b.disabilities?.countsAs === 1 &&
      b.next?.primary === true &&
      !b.primary,
    "saved and loaded again: counts-as 1, the primary",
  );
  done();
});

test("the dialog: Escape cancels it; Weapon... again does nothing while open", () => {
  const { check, done } = checker();
  const p = w.attrPanel;
  const a = w.entity.attrs as Ch.Attr;
  p.lines.select(0);
  w.weaponButton.click();
  const D = w.weapon!;
  D.setLevel(6);
  check(a.level === 6, "the Level set");
  w.weaponButton.click();
  check(w.weapon === D, "Weapon... while it is open: the same dialog");
  w.dialogs.escape();
  check(
    w.weapon === undefined && !w.dialogs.open && a.level === 4,
    "Escape: cancelled, the Level as it was",
  );
  done();
});

test("an attack's override, refused text: said so, the computed number used", () => {
  const { check, done } = checker();
  const a = w.entity.attrs as Ch.Attr;
  w.attrPanel.lines.select(0);
  w.weaponButton.click();
  const D = w.weapon!;
  const before = f.tells;
  D.points.type("lots");
  check(
    f.tells === before + 1 &&
      f.told ===
        "Not a number for the points: a whole number. The computed number is used." &&
      !a.points.overridden,
    "said so, no override",
  );
  D.ok.click();
  done();
});
