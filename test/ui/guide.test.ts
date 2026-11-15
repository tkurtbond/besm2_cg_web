// Phase 14's guide panel on happy-dom, copied from ova_cg_web's
// test/ui/guide.test.ts with besm2's items, pages and targets: Help >
// Guide and its check, Back, Next, Close and the step list, the step
// kept, the ? buttons with both pages, Show me and the Window's targets,
// the guide naming the page's controls as the page does, and no change
// to the character. The page's own: besm2_cg_po has no counterpart. The
// panel's place at each width is test/browser/guide.spec.ts's.
//
// DOM nodes are compared with assert.ok(a === b), never assert.equal
// (AGENTS.md: a failure would print happy-dom's whole window).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as guide from "../../src/core/guide.ts";
import * as rules from "../../src/core/rules.ts";
import { about } from "../../src/ui/version.ts";
import { Separator } from "../../src/ui/menu.ts";
import { HelpMenu, Title, tabNames } from "../../src/ui/window.ts";
import { checker, chooseIn, newWindow, press } from "./setup.ts";

/** Three steps, with an item, a page and two Show me's. */
const small = guide.parse(
  [
    "# Small",
    "## One",
    "Choose [](item:Flight), see [Limits](page:StatsPage).",
    "[Show me](show:attributes)",
    "## Two",
    "- [Show me](show:skills)",
    "",
    "## Three, [](item:Flight)",
    "1. Done.",
  ].join("\n") + "\n",
);

const real = guide.parse(readFileSync("src/guide/guide.md", "utf8"));

function opened(g = small) {
  const r = newWindow(g);
  const p = r.w.guidePanel;
  assert.ok(p !== undefined, "a panel");
  return { ...r, p };
}

test("no guide: Help > Guide disabled, no panel", () => {
  const { w, doc } = newWindow();
  assert.ok(w.guideItem.disabled, "disabled");
  assert.ok(w.guidePanel === undefined, "no panel");
  assert.ok(doc.getElementById("guide") === null, "none on the page");
});

test("Help > Guide opens and closes it, its check following", () => {
  const { w, p, doc } = opened();
  const { check, done } = checker();
  check(w.menu.menus[HelpMenu]!.label === "Help", "the Help menu");
  check(
    w.menu.menus[HelpMenu]!.items[0] === w.guideItem &&
      w.menu.menus[HelpMenu]!.items[1] === w.aboutItem,
    "Guide, then About",
  );
  check(
    w.guideItem.checkable && w.guideItem.key === undefined,
    "checkable, no key",
  );
  check(!p.open && !w.guideItem.checked, "shut as the page opens");
  w.nameIn.focus();
  w.menu.top(HelpMenu).click();
  w.guideItem.button.click();
  check(p.open && w.guideItem.checked, "opened, checked");
  check(w.menu.current === -1, "the menu shut");
  check(doc.activeElement === p.stepHeading(), "on the step's heading");
  w.guideItem.button.click();
  check(!p.open && !w.guideItem.checked, "Guide again: shut, unchecked");
  w.guideItem.button.click();
  check(p.open && w.guideItem.checked, "and open again");
  p.close.click();
  check(!p.open && !w.guideItem.checked, "Close: shut, unchecked");
  check(doc.activeElement === w.nameIn, "the focus back where it was");
  w.toggleGuide();
  p.folded = true;
  w.toggleGuide();
  w.toggleGuide();
  check(!p.folded, "opening unfolds it");
  done();
});

test("Back and Next, at the ends, and the list", () => {
  const { p } = opened();
  const { check, done } = checker();
  const at = (i: number, label: string) => {
    check(p.step === i, label + ": step");
    check(
      p.stepButtons.every(
        (b, j) => (b.getAttribute("aria-current") === "step") === (i === j),
      ),
      label + ": marked in the list",
    );
    const title = guide.plainText(small.steps[i]!.title);
    check(
      p.stepHeading().textContent.startsWith(title),
      label + ": its heading",
    );
    check(p.stepButtons[i]!.textContent === title, label + ": its title");
    check(
      p.where.textContent === `Step ${String(i + 1)} of 3`,
      label + ": where",
    );
    check(p.back.disabled === (i === 0), label + ": Back");
    check(p.next.disabled === (i === 2), label + ": Next");
  };
  at(0, "first");
  p.next.click();
  at(1, "Next");
  p.next.click();
  at(2, "Next to the last");
  p.next.click();
  at(2, "Next at the last does nothing");
  p.back.click();
  at(1, "Back");
  p.back.click();
  p.back.click();
  at(0, "Back at the first does nothing");
  p.stepButtons[2]!.click();
  at(2, "the list jumps");
  p.stepButtons[1]!.click();
  at(1, "and back");
  assert.throws(() => p.showStep(3), /no step 3 of 3/);
  done();
});

test("Steps unfolds the list, and choosing a step folds it", () => {
  const { w, p, doc } = opened();
  const { check, done } = checker();
  w.openGuide();
  const expanded = () => p.stepsButton.getAttribute("aria-expanded");
  check(!p.listShown && p.stepList.hidden === true, "folded at first");
  check(expanded() === "false", "Steps says so");
  check(p.stepsButton.textContent === "Steps", "called Steps");
  p.stepsButton.click();
  check(p.listShown && p.stepList.hidden === false, "Steps: unfolded");
  check(expanded() === "true", "Steps says that");
  p.stepsButton.click();
  check(!p.listShown, "Steps again: folded");
  p.stepsButton.click();
  p.stepButtons[2]!.click();
  check(p.step === 2, "a step chosen");
  check(!p.listShown && expanded() === "false", "and the list folded");
  check(doc.activeElement === p.stepHeading(), "on the step's heading");
  p.stepsButton.click();
  p.next.click();
  p.back.click();
  check(p.listShown, "Back and Next leave it as it is");
  done();
});

test("the step kept, closed and opened", () => {
  const { w, p } = opened();
  w.openGuide();
  p.stepButtons[2]!.click();
  w.closeGuide();
  w.openGuide();
  assert.equal(p.step, 2);
});

test("names with their pages, and ? at the page", () => {
  const { p, f } = opened();
  const names = [...p.body.querySelectorAll(".guide-name")].map(
    (e) => e.textContent,
  );
  const flight = rules.find("Flight")!;
  assert.deepEqual(names, [
    rules.label(flight),
    rules.pageLabel("Limits", rules.StatsPage),
  ]);
  assert.deepEqual(names, ["Flight (p. 33, PDF 35)", "Limits (p. 15, PDF 17)"]);
  const helps = [...p.body.querySelectorAll("button.help")];
  assert.equal(helps.length, 2, "a ? for each");
  const pages: number[] = [];
  for (const h of helps) {
    (h as HTMLButtonElement).click();
    pages.push(f.page);
  }
  assert.deepEqual(pages, [flight.page, rules.StatsPage]);
  assert.deepEqual(
    helps.map((h) => h.getAttribute("aria-label")),
    ["The rulebook at p. 33, PDF 35", "The rulebook at p. 15, PDF 17"],
  );
  // The steps' list shows a title's text only: no button in a button.
  // Step Three's title has an item, which its heading gives a ?.
  for (const b of p.stepButtons)
    assert.ok(b.querySelector("button") === null, "a button in a step's title");
  p.showStep(2);
  assert.equal(p.stepHeading().querySelectorAll("button.help").length, 1);
});

test("Show me: its tab, its control focused and highlighted", () => {
  const { w, p, doc } = opened();
  w.openGuide();
  w.showTab(3);
  const show = p.body.querySelector<HTMLButtonElement>("button.guide-show")!;
  assert.equal(show.dataset.target, "attributes");
  show.click();
  assert.equal(w.tabShown, 1, "the Attributes tab");
  assert.ok(
    doc.activeElement === w.attrPanel.choice,
    "on the Attributes' name",
  );
  assert.ok(
    w.attrPanel.choice.classList.contains("guide-shown"),
    "highlighted",
  );
  p.next.click();
  p.body.querySelector<HTMLButtonElement>("button.guide-show")!.click();
  assert.equal(w.tabShown, 3, "the Skills tab");
  assert.ok(doc.activeElement === w.skillPanel.choice, "on the Skills' name");
  assert.throws(() => w.showTarget("nothing"), /isn't a target/);
});

test("every target shows its tab or menu and focuses its control", async () => {
  const { w, doc } = newWindow();
  const { check, done } = checker();
  // Every one is enabled on a new character: none of them waits for a
  // line chosen, as ova_cg_web's perks-flaws does.
  const disabled: string[] = [];
  for (const [name, t] of w.targets) {
    w.showTab(t.tab === 0 ? 4 : 0);
    w.menu.close(false);
    w.showTarget(name);
    if (t.tab !== undefined)
      check(w.tabShown === t.tab, `${name}: ${tabNames[t.tab]!} shown`);
    // Where it is, from the page, not from the list.
    const tab = w.panels.findIndex((p) => p.contains(t.element));
    const menu = w.menu.menus.findIndex((_, i) =>
      w.menu.popup(i).contains(t.element),
    );
    check(tab === (t.tab ?? -1), `${name}: on its tab`);
    check(menu === (t.menu ?? -1), `${name}: in its menu`);
    check(
      t.menu === undefined ? w.menu.current === -1 : w.menu.current === t.menu,
      `${name}: its menu`,
    );
    // happy-dom focuses any element; the browsers only these.
    check(
      t.element.matches("button, input, select, textarea, [tabindex]"),
      `${name}: focusable in a browser`,
    );
    const off = (t.element as HTMLButtonElement).disabled === true;
    check(off === disabled.includes(name), `${name}: disabled as expected`);
    if (!off) check(doc.activeElement === t.element, `${name}: focused`);
    check(t.element.classList.contains("guide-shown"), `${name}: highlighted`);
  }
  await new Promise((r) => setTimeout(r, 1600));
  for (const [name, t] of w.targets)
    check(
      !t.element.classList.contains("guide-shown"),
      `${name}: for a moment`,
    );
  done();
});

test("the guide's every Show me names a target", () => {
  const { w } = newWindow(real);
  const missing = guide.targets(real).filter((t) => !w.targets.has(t));
  assert.deepEqual(missing, []);
  assert.ok(guide.targets(real).length > 0, "the guide has a Show me");
});

/** Every bold run's text in g: the controls its steps name. */
function bold(g: guide.Guide): string[] {
  const out: string[] = [];
  const walk = (rs: readonly guide.Inline[]) => {
    for (const r of rs)
      if (r.kind === "strong") out.push(guide.plainText(r.content));
      else if (r.kind === "emphasis") walk(r.content);
  };
  for (const s of g.steps)
    for (const b of s.blocks)
      if (b.kind === "paragraph") walk(b.content);
      else for (const it of b.items) walk(it);
  return out;
}

test("the guide's controls are called what the page calls them", () => {
  const { w, p, doc } = opened(real);
  // The dialogs' controls as well: Creation..., and Weapon... on a
  // Weapon Attack added.
  const wa = rules.find("Weapon Attack")!;
  const i = [...w.attrPanel.choice.options].findIndex(
    (o) => o.textContent === rules.label(wa),
  );
  chooseIn(w.attrPanel.choice, i);
  w.attrPanel.addButton.click();
  w.weaponButton.click();
  assert.ok(w.weapon !== undefined, "the Weapon dialog");
  w.creationItem.action!();
  assert.ok(w.creation !== undefined, "the Creation dialog");
  const shown = new Set<string>();
  for (const e of doc.body.querySelectorAll("*")) {
    if (p.body.contains(e)) continue; // the guide's text itself
    let own = "";
    for (const n of e.childNodes) if (n.nodeType === 3) own += n.textContent;
    if (own.trim() !== "") shown.add(own.trim());
    const a = e.getAttribute("aria-label");
    if (a !== null) shown.add(a);
  }
  const menus = new Map(
    w.menu.menus.map((m) => [
      m.label,
      m.items.map((it) => (it === Separator ? "" : it.label)),
    ]),
  );
  const { check, done } = checker();
  for (const b of bold(real)) {
    const path = b.split(" > ");
    if (path.length === 2)
      check(menus.get(path[0]!)?.includes(path[1]!) === true, `menu "${b}"`);
    else
      check(
        b === "Show me" ||
          shown.has(b) ||
          // A name with its pages: "Character Points (p. 13, PDF 15)"
          [...shown].some((s) => s.startsWith(`${b} (p. `)),
        `"${b}" on the page`,
      );
  }
  done();
});

test("Escape leaves the panel open", () => {
  const { w, p, doc } = opened();
  w.openGuide();
  press(doc, { key: "Escape" });
  p.next.focus();
  press(doc, { key: "Escape" });
  assert.ok(p.open);
});

test("the guide is no change", () => {
  const { w, p, doc } = opened(real);
  w.openGuide();
  for (let i = 0; i < real.steps.length; i++) p.showStep(i);
  for (const b of p.body.querySelectorAll<HTMLButtonElement>("button"))
    b.click();
  w.closeGuide();
  assert.equal(w.modified, false);
  assert.equal(doc.title, Title);
});

test("Help > About says the version", () => {
  const { w, f } = newWindow();
  w.aboutItem.button.click();
  assert.equal(f.told, about());
});
