// Phase 5's shell on happy-dom: the menus' items and keys (besm2_cg_po's
// TestWindow Basics, and ova_cg_go's TestShortcuts, with their labels),
// what the keys and the menus do, the title and the entities' <select>,
// the Character menu's list of entities (TestWindow's Several, without
// what the Mecha tab and Save add: test/ui/mecha.test.ts's and
// files.test.ts's), and the tabs. What the browsers do themselves (focus, a real Escape) is
// test/browser/shell.spec.ts's.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as Ch from "../../src/core/character.ts";
import { keyText } from "../../src/ui/menu.ts";
import { ChoiceW, keys, tabNames, Title } from "../../src/ui/window.ts";
import { checker, chooseIn, newWindow, press, take } from "./setup.ts";

const SeveralFile = "window-several.yaml"; // TestWindow's SeveralPath

test("TestShortcuts", () => {
  const { w } = newWindow();
  const { check, done } = checker();
  const seen = new Set<string>();
  const reserved = ["A", "C", "V", "X", "Z", "Y"];
  // Keys the browsers keep for themselves, whatever a page does
  // (PLAN.md, "Keys").
  const browsers = [
    "Ctrl+N",
    "Ctrl+T",
    "Ctrl+W",
    "Ctrl+Q",
    "Ctrl+PgDn",
    "Ctrl+PgUp",
    "Ctrl+Shift+N",
    "Ctrl+Shift+T",
    "Ctrl+Shift+W",
  ];
  for (const it of w.menu.items()) {
    if (it.key === undefined) continue;
    const name = keyText(it.key);
    check(!seen.has(name), "no two items share a key: " + name);
    seen.add(name);
    for (const k of reserved) {
      check(
        !(it.key.ctrl && name.endsWith("+" + k)) || it.key.shift,
        "no item takes an entry's key: " + name,
      );
    }
    check(!browsers.includes(name), "no item takes a browser's key: " + name);
  }
  done();
});

test("Basics", () => {
  const { w, doc } = newWindow();
  const { check, done } = checker();
  const item = (
    it: { label: string; key?: { code: string } },
    label: string,
    key: string | undefined,
  ) =>
    it.label === label &&
    (it.key === undefined
      ? key === undefined
      : key === keyText(it.key as Parameters<typeof keyText>[0]));
  check(doc.title === Title, "the window's title");
  check(
    item(w.newItem, "New", "Alt+Shift+N") &&
      item(w.newFromCampaignItem, "New from Campaign...", undefined) &&
      item(w.openItem, "Open...", "Ctrl+O") &&
      item(w.saveItem, "Save", "Ctrl+S") &&
      item(w.saveAsItem, "Save As...", "Ctrl+Shift+S"),
    "File: New, New from Campaign..., Open..., Save, Save As..., with Alt+Shift+N, Ctrl+O, S, Shift+S",
  );
  check(
    item(w.rulebookItem, "Open", undefined) &&
      item(w.choosePdfItem, "Choose PDF...", undefined),
    "Rulebook: Open, Choose PDF...",
  );
  check(
    item(w.nextItem, "Next", "Alt+Shift+PgDn") &&
      item(w.previousItem, "Previous", "Alt+Shift+PgUp") &&
      item(w.removeItem, "Remove...", undefined),
    "the Character menu, Next and Previous on Alt+Shift+PgDn and PgUp",
  );
  check(
    w.menu
      .items()
      .map((it) => it.label)
      .join("|") ===
      "New|New from Campaign...|Open...|Save|Save As..." +
        "|Creation...|Add Character|Add Mecha|Duplicate|Remove...|Move Up|Move Down|Next|Previous" +
        "|Open|Choose PDF..." +
        "|Guide|About",
    "the menus' items, in besm2_cg_po's order, then the page's own Help",
  );
  check(
    w.menu.element.querySelectorAll(".menu-separator").length === 4,
    "Character's three dividers and Rulebook's one",
  );
  check(
    w.entityIn.title === "the character or mecha shown, of the file's",
    "the Choice's tooltip",
  );
  check(ChoiceW === 250, "ChoiceW");
  done();
});

test("NewCharacter", () => {
  const { w, doc } = newWindow();
  const { check, done } = checker();
  const e = w.entity;
  check(
    w.entities.length === 1 &&
      w.current === 0 &&
      !e.isMecha &&
      w.file === undefined &&
      !w.modified,
    "a new character: one, no file, unchanged",
  );
  check(doc.title === Title, "the title alone");
  check(w.titleLine.textContent === Title, "the title line says the same");
  check(
    [...w.entityIn.options].map((o) => o.textContent).join("|") ===
      "1. (no name)",
    "a new character has no name",
  );
  const enabled = w.menu
    .items()
    .filter((it) => !it.disabled)
    .map((it) => it.label)
    .join("|");
  check(
    enabled ===
      "New|New from Campaign...|Open...|Save|Save As..." +
        "|Creation...|Add Character|Add Mecha|Duplicate|Open|Choose PDF..." +
        "|About",
    "a lone character: the rest greyed until there are more, and Guide with no guide: " +
      enabled,
  );
  done();
});

test("the keys do the menus' items", () => {
  const { w, f, doc } = newWindow();
  take(w, "window.yaml", SeveralFile);
  const { check, done } = checker();
  const prev = press(doc, {
    key: "PageUp",
    code: "PageUp",
    altKey: true,
    shiftKey: true,
  });
  check(prev.defaultPrevented && w.current === 0, "Alt+Shift+PgUp: Previous");
  const next = press(doc, {
    key: "PageDown",
    code: "PageDown",
    altKey: true,
    shiftKey: true,
  });
  check(next.defaultPrevented && w.current === 1, "Alt+Shift+PgDn: Next");
  const last = press(doc, {
    key: "PageDown",
    code: "PageDown",
    altKey: true,
    shiftKey: true,
  });
  check(
    last.defaultPrevented && w.current === 1,
    "Next at the last: nothing, but prevented",
  );
  const s = press(doc, { key: "s", code: "KeyS", ctrlKey: true });
  check(s.defaultPrevented, "Ctrl+S prevented, though Save is disabled");
  const cmd = press(doc, { key: "s", code: "KeyS", metaKey: true });
  check(cmd.defaultPrevented, "Command+S is Ctrl+S");
  const plain = press(doc, { key: "s", code: "KeyS" });
  check(!plain.defaultPrevented, "S alone is left alone");
  const extra = press(doc, {
    key: "O",
    code: "KeyO",
    ctrlKey: true,
    shiftKey: true,
  });
  check(!extra.defaultPrevented, "Ctrl+Shift+O is not Ctrl+O");
  const ctrlPg = press(doc, { key: "PageUp", code: "PageUp", ctrlKey: true });
  check(
    !ctrlPg.defaultPrevented && w.current === 1,
    "Ctrl+PgUp is the browser's",
  );
  check(f.tells === 0 && f.chooses === 0, "nothing told, nothing chosen");
  done();
});

test("the keys wait while a dialog is open", () => {
  const { w, doc } = newWindow();
  take(w, "window.yaml", SeveralFile);
  w.dialogs.tell("a message");
  const k = { key: "PageUp", code: "PageUp", altKey: true, shiftKey: true };
  const p = press(doc, k);
  assert.ok(
    p.defaultPrevented && w.current === 1,
    "Alt+Shift+PgUp does nothing under a dialog, but is prevented",
  );
  press(doc, { key: "Escape" });
  assert.ok(!w.dialogs.open, "Escape closes the dialog");
  press(doc, k);
  // Through a function: the assert above narrowed w.current to 1.
  const current = (): number => w.current;
  assert.ok(current() === 0, "then Alt+Shift+PgUp is Previous");
});

test("Several", () => {
  const { w, f, doc } = newWindow();
  const { check, done } = checker();
  const choice = (i: number) => w.entityIn.options[i]?.textContent;
  const off = (it: { disabled: boolean }) => it.disabled;
  const titleIs = (rest: string) => doc.title === Title + rest;

  take(w, "window.yaml", SeveralFile);
  const walker = w.entities[0]!;
  const pilot = w.entities[1]!;
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
  check(walker.owner === pilot, "the mecha tied to its owner");

  chooseIn(w.entityIn, 0);
  check(
    w.current === 0 &&
      w.entity === walker &&
      titleIs(" - window-several.yaml (1 of 2)") &&
      off(w.moveUpItem) &&
      off(w.previousItem) &&
      !off(w.nextItem) &&
      !w.modified,
    "the Choice: the mecha shown, unchanged",
  );

  w.addMechaItem.button.click();
  const hopper = w.entity;
  check(
    w.entities.length === 3 &&
      w.current === 2 &&
      hopper.isMecha &&
      hopper.name === undefined &&
      choice(2) === "3. (no name) (mecha)" &&
      titleIs(" - window-several.yaml (3 of 3) *"),
    "Add Mecha: a new mecha, last; no owner, so no Creation...",
  );

  chooseIn(w.entityIn, 0);
  w.duplicateItem.button.click();
  const copy = w.entity;
  check(
    w.entities.length === 4 &&
      w.current === 3 &&
      copy !== walker &&
      copy.name === "Walker" &&
      copy.owner === undefined &&
      walker.owner === pilot,
    "Duplicate: the copy last, shown; a mecha of a name already tied, so no owner",
  );
  w.moveUpItem.button.click();
  w.moveUpItem.button.click();
  w.moveUpItem.button.click();
  check(
    w.current === 0 &&
      w.entities[0] === copy &&
      w.entities[1] === walker &&
      copy.owner === pilot &&
      walker.owner === undefined &&
      choice(0) === "1. Walker (mecha)" &&
      off(w.moveUpItem),
    "Move Up: swapped, still shown; the first of the name is the one tied",
  );
  f.yes = false;
  w.removeItem.button.click();
  check(
    f.confirmed === 1 &&
      f.question === "Remove Walker from the file?" &&
      w.entities.length === 4,
    "Remove..., cancelled: asked, nothing removed",
  );
  f.yes = true;
  w.removeItem.button.click();
  check(
    w.entities.length === 3 &&
      w.current === 0 &&
      w.entity === walker &&
      walker.owner === pilot,
    "Remove: gone, the one after shown, the other tied again",
  );

  w.nextItem.button.click();
  check(w.entity === pilot, "Next");
  w.previousItem.button.click();
  check(w.entity === walker, "Previous");
  w.moveDownItem.button.click();
  check(
    w.entities[1] === walker && w.entities[0] === pilot && w.current === 1,
    "Move Down: swapped, still shown",
  );

  chooseIn(w.entityIn, 2);
  w.removeItem.button.click();
  check(
    f.question === "Remove this mecha from the file?" &&
      w.entities.length === 2 &&
      w.current === 1 &&
      w.entity === walker,
    "a mecha with no name: this mecha; the last removed: the one before shown",
  );

  chooseIn(w.entityIn, 1);
  w.addCharacterItem.button.click();
  const added = w.entity;
  check(
    w.entities.length === 3 &&
      w.current === 2 &&
      !added.isMecha &&
      added.hasCreation &&
      added.creation.characterPoints === 20 &&
      added.creation.skillPoints === 20 &&
      added.creation !== pilot.creation,
    "Add Character from a mecha: a new one, last, with its owner's creation, copied",
  );
  w.removeItem.button.click();
  check(
    f.question === "Remove this character from the file?" &&
      w.entities.length === 2,
    "a character with no name: this character",
  );

  chooseIn(w.entityIn, 0);
  w.duplicateItem.button.click();
  const pcopy = w.entity;
  check(
    w.entities.length === 3 &&
      pcopy.name === "Pilot" &&
      pcopy !== pilot &&
      walker.owner === pcopy,
    "a character duplicated: its copy, last, prices their mecha",
  );
  check(f.tells === 0, "nothing told");
  done();
});

test("a lone entity: Remove does nothing", () => {
  const { w, f } = newWindow();
  w.take(Ch.one(Ch.newMecha("Lone")), undefined);
  assert.ok(
    w.removeItem.disabled && w.entityLabel(0) === "1. Lone (mecha)",
    "one: Remove off",
  );
  w.removeItem.button.click();
  assert.ok(
    f.confirmed === 0 && w.entities.length === 1,
    "a click on it: nothing asked",
  );
  assert.ok(w.creationItem.disabled, "a mecha with no owner: Creation... off");
});

test("the menus by keyboard", () => {
  const { w, doc } = newWindow();
  const { check, done } = checker();
  const tops = [0, 1, 2].map((i) => w.menu.top(i));
  check(
    tops.map((t) => t.tabIndex).join() === "0,-1,-1",
    "one menu in the tab order",
  );
  // A lone new character: of the Character menu, Creation..., Add
  // Character, Add Mecha and Duplicate are enabled.
  tops[1]!.focus();
  press(doc, { key: "ArrowDown" });
  check(
    w.menu.current === 1 && !w.menu.popup(1).hidden,
    "Down opens Character",
  );
  check(doc.activeElement === w.creationItem.button, "on Creation...");
  press(doc, { key: "ArrowDown" });
  check(doc.activeElement === w.addCharacterItem.button, "on Add Character");
  press(doc, { key: "ArrowDown" });
  press(doc, { key: "ArrowDown" });
  check(doc.activeElement === w.duplicateItem.button, "Down to Duplicate");
  press(doc, { key: "ArrowDown" });
  check(
    doc.activeElement === w.creationItem.button,
    "Down wraps to Creation...",
  );
  press(doc, { key: "ArrowUp" });
  check(doc.activeElement === w.duplicateItem.button, "Up wraps to Duplicate");
  press(doc, { key: "Escape" });
  check(
    w.menu.current === -1 && w.menu.popup(1).hidden === true,
    "Escape shuts it",
  );
  check(doc.activeElement === tops[1], "back on the bar");
  press(doc, { key: "ArrowLeft" });
  check(doc.activeElement === tops[0], "Left along the bar, shut");
  press(doc, { key: "ArrowDown" });
  press(doc, { key: "ArrowRight" });
  check(
    w.menu.current === 1 && w.menu.popup(0).hidden === true,
    "Right: Character open, File shut",
  );
  press(doc, { key: "ArrowRight" });
  check(
    w.menu.current === 2 && tops[2]!.tabIndex === 0 && tops[1]!.tabIndex === -1,
    "Right: Rulebook open, the one in the tab order",
  );
  press(doc, { key: "Escape" });
  check(w.menu.current === -1, "Escape shuts it");
  tops[1]!.click();
  check(w.menu.current === 1, "a click opens Character");
  w.removeItem.button.click();
  check(w.menu.current === 1, "a disabled item does nothing");
  w.addMechaItem.button.click();
  check(
    w.menu.current === -1 && w.entities.length === 2,
    "an item chosen does it, and shuts the menu",
  );
  done();
});

test("the tabs", () => {
  const { w, doc } = newWindow();
  const { check, done } = checker();
  const shown = () => w.panels.map((p) => (p.hidden ? "-" : "x")).join("");
  // Through a function: a check on w.tabShown itself would narrow it.
  const tab = (): number => w.tabShown;
  check(
    w.tabs.map((t) => t.textContent).join("|") === tabNames.join("|"),
    "the seven tabs, in order",
  );
  check(tab() === 0 && shown() === "x------", "Character first, alone");
  w.tabs[3]!.click();
  check(tab() === 3, "a click: Skills");
  w.tabs[3]!.focus();
  press(doc, { key: "ArrowRight" });
  check(
    tab() === 4 && doc.activeElement === w.tabs[4] && shown() === "----x--",
    "Right: Mecha, its panel alone",
  );
  press(doc, { key: "End" });
  check(tab() === 6, "End: Preview");
  press(doc, { key: "ArrowRight" });
  check(tab() === 0, "Right wraps");
  press(doc, { key: "ArrowLeft" });
  check(tab() === 6, "Left wraps");
  press(doc, { key: "Home" });
  check(tab() === 0, "Home");
  check(
    w.tabs.map((t) => t.tabIndex).join() === "0,-1,-1,-1,-1,-1,-1",
    "one tab in the tab order",
  );
  check(
    w.panels.every(
      (p, i) => p.getAttribute("aria-labelledby") === w.tabs[i]!.id,
    ),
    "each panel labelled by its tab",
  );
  done();
});

test("the keys' names", () => {
  assert.equal(keyText(keys.saveAs), "Ctrl+Shift+S");
  assert.equal(keyText(keys.next), "Alt+Shift+PgDn");
  assert.equal(keyText(keys.new), "Alt+Shift+N");
});
