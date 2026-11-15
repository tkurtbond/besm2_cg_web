// Phase 11: the Creation dialog and campaigns on happy-dom. Ports
// besm2_cg_po's TestWindow Creation and NewFromCampaign
// (test/TestWindow.Mod) with their labels, in their order. A file chosen
// is a fixture of testdata/cg/ (setup.ts's chooseFile), read as a File,
// so a load waits until it has settled. Values from the DOM are compared
// with check only, never equal or deepEqual (AGENTS.md).

import { test } from "node:test";
import * as C from "../../src/core/calc.ts";
import * as Ch from "../../src/core/character.ts";
import * as R from "../../src/core/rules.ts";
import { CharacterPoints, Discard, type Window } from "../../src/ui/window.ts";
import { checker, chooseIn, newWindow, settled, take } from "./setup.ts";

const CreationFile = "window-creation.yaml"; // TestWindow's CreationPath
const CampaignFile = "window-campaign.yaml"; // and CampaignPath

/** Whether points line i says want, red or not (Line). */
function line(w: Window, i: number, want: string, red: boolean): boolean {
  const b = w.points[i]!;
  return b.textContent === want && b.classList.contains("red") === red;
}

/** Whether a and b hold the same keys. */
function sameKeys(a: ReadonlySet<number>, b: ReadonlySet<number>): boolean {
  return a.size === b.size && [...a].every((k) => b.has(k));
}

/** Whether the menus have a before b. */
function before(w: Window, a: unknown, b: unknown): boolean {
  const items: unknown[] = w.menu.items();
  const i = items.indexOf(a);
  return i >= 0 && i < items.indexOf(b);
}

test("Creation", async () => {
  const { w, f } = newWindow();
  const { check, done } = checker();
  check(
    w.creationItem.label === "Creation..." &&
      w.creationItem.key === undefined &&
      before(w, w.creationItem, w.addCharacterItem),
    "Character > Creation..., first",
  );
  f.answer = Discard;
  take(w, "window.yaml", CreationFile);
  const walker = w.entities[0]!;
  const pilot = w.entities[1]!;
  const dr = pilot.skills!;
  const keys = new Set(pilot.creationKeys);
  const was = w.modified;
  check(walker.isMecha && !w.creationItem.disabled, "active on a character");

  chooseIn(w.entityIn, 0);
  check(!w.creationItem.disabled, "and on a mecha with an owner");
  w.creationItem.action!();
  let D = w.creation!;
  check(
    D !== undefined &&
      D.target === pilot &&
      D.title.textContent === "The creation of Pilot, which prices the mecha",
    "a mecha's: its owner's creation",
  );
  D.cancelAction();
  chooseIn(w.entityIn, 1);

  w.creationItem.action!();
  D = w.creation!;
  check(
    D !== undefined &&
      D.target === pilot &&
      D.title.textContent === "The creation of Pilot",
    "Creation...: the dialog",
  );
  check(
    D.labels.get(D.pointsOn) === "Character Points (p. 13, PDF 15)" &&
      D.labels.get(D.stagedOn) ===
        "Staged Stat Cost, Table 4-7 (p. 166, PDF 168)" &&
      D.labels.get(D.statOn) === "A ceiling on each Stat (p. 16, PDF 18)" &&
      D.labels.get(D.autoFireOn) ===
        "Auto-Fire counts as 1 slot (p. 84, PDF 86)",
    "each row with both pages",
  );
  check(
    D.pointsOn.checked &&
      D.pointsIn.value === 20 &&
      D.genre.selectedIndex === R.ModernMilitary + 1 &&
      D.skillOn.checked &&
      D.skillIn.value === 20 &&
      D.backgroundIn.value === 0 &&
      !D.stagedOn.checked &&
      !D.statOn.checked &&
      D.statIn.input.disabled &&
      D.statIn.value === 10 &&
      !D.bonusOn.checked &&
      D.bonusIn.value === 8 &&
      !D.autoFireOn.checked,
    "the file's creation shown; the numbers not set at their defaults, inactive",
  );
  check(
    !D.statPointsCeilingOn.checked &&
      D.statPointsCeilingIn.input.disabled &&
      D.statPointsCeilingIn.value === 24 &&
      !D.statPointsFloorOn.checked &&
      D.statPointsFloorIn.input.disabled &&
      D.statPointsFloorIn.value === 12 &&
      D.labels.get(D.statPointsCeilingOn) ===
        "A ceiling on the Stats' total cost (p. 16, PDF 18)" &&
      D.labels.get(D.statPointsFloorOn) ===
        "A floor on the Stats' total cost (p. 16, PDF 18)",
    "the Stats' total: no limits, the spinners at their defaults",
  );
  check(
    D.copyChoice.disabled &&
      D.copyButton.disabled &&
      !D.loadButton.disabled &&
      !D.saveButton.disabled,
    "no other character to copy from; a campaign to load or save",
  );
  check(
    D.summary.textContent ===
      "Character Points: 20 spent of 20.  Skill Points: 8 spent of 20.",
    "the points",
  );

  D.setCharacterPoints(true, 25);
  check(
    pilot.available === 25 &&
      w.modified &&
      line(
        w,
        CharacterPoints,
        "Character Points: Stats 13 + Attributes 8 - Bonus Points 1 = 20 of 25",
        false,
      ),
    "Character Points 25: the window follows",
  );
  D.setStatPointsCeiling(true, 12);
  check(
    pilot.creation.statPointsCeiling === 12 &&
      pilot.creationKeys.has(Ch.StatPointsCeilingKey) &&
      C.hasWarning(pilot, C.StatPointsAbove, undefined) &&
      !D.statPointsCeilingIn.input.disabled &&
      line(
        w,
        CharacterPoints,
        "Character Points: Stats 13 + Attributes 8 - Bonus Points 1 = 20 of 25; Stats at most 12",
        true,
      ),
    "a ceiling of 12 on the Stats' total: 13 is above it, in red",
  );
  D.setStatPointsCeiling(true, 13);
  D.setStatPointsFloor(true, 14);
  check(
    !C.hasWarning(pilot, C.StatPointsAbove, undefined) &&
      C.hasWarning(pilot, C.StatPointsBelow, undefined) &&
      pilot.creationKeys.has(Ch.StatPointsFloorKey) &&
      line(
        w,
        CharacterPoints,
        "Character Points: Stats 13 + Attributes 8 - Bonus Points 1 = 20 of 25; Stats at least 14, at most 13",
        true,
      ),
    "a floor of 14: 13 is below it",
  );
  D.setStatPointsFloor(true, 13);
  check(
    !C.hasWarning(pilot, C.StatPointsBelow, undefined) &&
      line(
        w,
        CharacterPoints,
        "Character Points: Stats 13 + Attributes 8 - Bonus Points 1 = 20 of 25; Stats at least 13, at most 13",
        false,
      ),
    "13 at both: within them",
  );
  D.setBackgroundPoints(2);
  check(
    pilot.available === 27 && pilot.creationKeys.has(Ch.BackgroundPointsKey),
    "Background Points 2: 27",
  );
  D.setGenre(R.Cyberpunk);
  check(
    C.value(dr.points) === 6 &&
      w.skillPanel.genre.selectedIndex === R.Cyberpunk + 1 &&
      D.summary.textContent ===
        "Character Points: 20 spent of 27.  Skill Points: 6 spent of 20.",
    "Cyberpunk: Driving 3 a Level, and the Skills tab's genre follows",
  );
  D.setSkillPoints(false, 0);
  check(
    pilot.creation.skillPoints === C.Unset &&
      !pilot.creationKeys.has(Ch.SkillPointsKey) &&
      D.skillIn.input.disabled &&
      D.skillIn.value === 20 &&
      pilot.skillPoints === 20,
    "the GM's Skill Points off: the rule's 20, shown",
  );
  D.setStatCeiling(true, 4);
  check(
    pilot.creation.statCeiling === 4 &&
      C.hasWarning(pilot, C.StatRange, undefined) &&
      !D.statIn.input.disabled,
    "a ceiling of 4: Body 5 is above it",
  );
  D.setBonusCeiling(true, 1);
  check(
    pilot.creation.bonusCeiling === 1 &&
      !C.hasWarning(pilot, C.OverBonusCeiling, undefined),
    "a Bonus Point ceiling of 1",
  );
  D.setStaged(true);
  check(
    pilot.creation.stagedStatCost &&
      C.value(pilot.statPoints[C.Body]!) === R.stagedStatCost(5),
    "Staged Stat Cost",
  );
  D.setAutoFireOne(true);
  check(
    pilot.creation.autoFireSlots === 1 &&
      pilot.creationKeys.has(Ch.AutoFireSlotsKey),
    "Auto-Fire as 1 slot",
  );
  D.cancel.click();
  const c0 = pilot.creation;
  check(
    w.creation === undefined &&
      !w.dialogs.open &&
      c0.characterPoints === 20 &&
      c0.backgroundPoints === 0 &&
      c0.genre === R.ModernMilitary &&
      c0.skillPoints === 20 &&
      c0.statCeiling === 0 &&
      c0.bonusCeiling === 0 &&
      !c0.stagedStatCost &&
      c0.autoFireSlots === 3 &&
      c0.statPointsCeiling === 0 &&
      c0.statPointsFloor === 0 &&
      sameKeys(pilot.creationKeys, keys) &&
      C.value(dr.points) === 8 &&
      w.skillPanel.genre.selectedIndex === R.ModernMilitary + 1 &&
      w.modified === was &&
      line(
        w,
        CharacterPoints,
        "Character Points: Stats 13 + Attributes 8 - Bonus Points 1 = 20 of 20",
        false,
      ),
    "Cancel: everything as it was",
  );

  w.creationItem.action!();
  D = w.creation!;
  D.setCharacterPoints(false, 0);
  check(
    pilot.available === 0 &&
      !pilot.creationKeys.has(Ch.CharacterPointsKey) &&
      D.pointsIn.input.disabled &&
      D.pointsIn.value === 20,
    "Character Points off: no limit; the spinner keeps 20",
  );
  D.setStaged(true);
  D.setStaged(false);
  check(
    !pilot.creationKeys.has(Ch.StagedStatCostKey),
    "an option turned on and off again: not written",
  );
  D.setBackgroundPoints(1);
  D.ok.click();
  check(
    w.creation === undefined &&
      !w.dialogs.open &&
      w.modified &&
      pilot.creation.backgroundPoints === 1,
    "OK: kept",
  );
  w.saveItem.action!();
  const saved = f.downloads.at(-1);
  const r =
    saved !== undefined ? Ch.loadAll(saved.text, CreationFile) : undefined;
  const c = r?.ok ? r.es : undefined;
  check(
    saved?.name === CreationFile &&
      c !== undefined &&
      c[1]!.creation.characterPoints === 0 &&
      c[1]!.creation.backgroundPoints === 1 &&
      c[1]!.creation.genre === R.ModernMilitary &&
      sameKeys(
        c[1]!.creationKeys,
        new Set([Ch.BackgroundPointsKey, Ch.GenreKey, Ch.SkillPointsKey]),
      ),
    "saved and loaded again: no Character Points, Background Points 1",
  );

  w.addCharacterItem.action!();
  const added = w.entity;
  check(
    added !== pilot &&
      added.creation.genre === R.ModernMilitary &&
      added.creation.backgroundPoints === 1 &&
      sameKeys(added.creationKeys, pilot.creationKeys) &&
      added.hasCreation,
    "Add Character: the shown one's creation",
  );
  w.creationItem.action!();
  D = w.creation!;
  // The Oberon's Choice counts one more than its entries.
  check(
    !D.copyChoice.disabled &&
      D.copyChoice.options.length === 1 &&
      D.copyChoice.options[0]!.textContent === "Pilot",
    "Copy from: the other character",
  );
  D.setGenre(R.Cyberpunk);
  D.setCharacterPoints(true, 50);
  D.copy(0);
  check(
    added.creation.genre === R.ModernMilitary &&
      added.creation.characterPoints === 0 &&
      D.genre.selectedIndex === R.ModernMilitary + 1 &&
      !D.pointsOn.checked,
    "Copy: Pilot's creation, shown",
  );
  f.chosen = "campaign.yaml";
  D.loadAction();
  await settled();
  check(
    added.creation.characterPoints === 40 &&
      added.creation.statPointsCeiling === 6 &&
      added.creation.statPointsFloor === 4 &&
      D.statPointsCeilingOn.checked &&
      D.statPointsCeilingIn.value === 6 &&
      D.statPointsFloorOn.checked &&
      D.statPointsFloorIn.value === 4 &&
      D.pointsIn.value === 40,
    "Load Campaign...: a campaign file's creation, shown",
  );
  f.chosen = "window.yaml";
  D.loadAction();
  await settled();
  check(
    added.creation.characterPoints === 20 &&
      added.creation.backgroundPoints === 0 &&
      D.pointsOn.checked &&
      D.pointsIn.value === 20 &&
      added.creation.statPointsCeiling === 0 &&
      !D.statPointsCeilingOn.checked &&
      !D.statPointsFloorOn.checked,
    "Load Campaign... of a character file: its first character's whole creation",
  );
  f.chosen = "creation.yaml";
  D.loadAction();
  await settled();
  D.setBackgroundPoints(0);
  check(
    added.creation.genre === R.Cyberpunk &&
      added.creationKeys.has(Ch.StagedStatCostKey) &&
      !added.creationKeys.has(Ch.BackgroundPointsKey),
    "a copy's options kept as it wrote them, off too",
  );
  D.setStatPointsCeiling(true, 30);
  f.typed = CampaignFile;
  const n = f.downloads.length;
  D.saveAction();
  const campaign = f.downloads.at(-1)!;
  const lc =
    f.downloads.length === n + 1
      ? Ch.loadCampaign(campaign.text, campaign.name)
      : undefined;
  check(
    f.suggested === "campaign.yaml" &&
      campaign.name === CampaignFile &&
      lc !== undefined &&
      lc.ok &&
      lc.from.creation.genre === R.Cyberpunk &&
      lc.from.creation.statPointsCeiling === 30 &&
      sameKeys(lc.from.creationKeys, added.creationKeys),
    "Save Campaign...: written, and loads again as it was",
  );
  f.chosen = "window.yaml";
  D.loadAction();
  await settled();
  let tells = f.tells;
  f.chosen = "mecha.yaml";
  D.loadAction();
  await settled();
  check(
    f.tells === tells + 1 && added.creation.characterPoints === 20,
    "a file of only mecha: said so, nothing copied",
  );
  // besm2_cg_po's is a file that isn't there; a page's file input only
  // gives files that are, so here it is one that is refused.
  tells = f.tells;
  f.chosen = "campaign-extra.yaml";
  D.loadAction();
  await settled();
  check(
    f.tells === tells + 1 &&
      f.told === 'campaign-extra.yaml: /: "players" is not one of creation' &&
      added.creation.characterPoints === 20,
    "a file that won't load: said so",
  );
  f.chosen = undefined;
  D.loadAction();
  await settled();
  check(
    added.creation.characterPoints === 20,
    "the file chooser cancelled: nothing",
  );
  tells = f.tells;
  f.typed = undefined;
  D.saveAction();
  check(
    f.tells === tells && f.downloads.length === n + 1,
    "Save Campaign... cancelled: nothing",
  );
  f.typed = " ";
  D.saveAction();
  check(
    f.tells === tells + 1 &&
      f.told === "The file needs a name." &&
      f.downloads.length === n + 1,
    "Save Campaign... with no name: said so, nothing",
  );
  D.ok.click();
  check(
    pilot.creation.backgroundPoints === 1,
    "Pilot's own creation not changed by the copy",
  );

  w.addMechaItem.action!();
  check(
    w.entity.isMecha && w.entity.owner === undefined && w.creationItem.disabled,
    "a mecha with no owner: inactive",
  );
  tells = f.tells;
  w.creationAction();
  check(
    f.tells === tells + 1 &&
      f.told ===
        "This mecha has no owner in the file, whose creation would price it." &&
      w.creation === undefined,
    "and Creation... on it: said why",
  );
  chooseIn(w.entityIn, 0);
  done();
});

test("the dialog: Escape cancels it; Creation... again does nothing while open", () => {
  const { w, f } = newWindow();
  const { check, done } = checker();
  f.answer = Discard;
  take(w, "window.yaml");
  chooseIn(w.entityIn, 1);
  const pilot = w.entity;
  w.creationItem.action!();
  const D = w.creation!;
  check(
    D.title.textContent === "The creation of Pilot" &&
      D.loadButton.title !== "" &&
      w.dialogs.open,
    "open",
  );
  D.setCharacterPoints(true, 30);
  check(pilot.available === 30 && w.modified, "Character Points 30");
  w.creationAction();
  check(w.creation === D, "Creation... while it is open: the same dialog");
  w.dialogs.escape();
  check(
    w.creation === undefined &&
      !w.dialogs.open &&
      pilot.available === 20 &&
      !w.modified,
    "Escape: cancelled, the Character Points as they were",
  );
  done();
});

test("a new character with no name: its title says so", () => {
  const { w } = newWindow();
  const { check, done } = checker();
  w.creationItem.action!();
  const D = w.creation!;
  check(
    D.title.textContent === "The creation of the character (no name)" &&
      D.summary.textContent ===
        "Character Points: 3 spent (no limit set).  Skill Points: 0 spent of " +
          w.entity.skillPoints +
          ".",
    "no name; no limit set",
  );
  D.ok.click();
  check(!w.modified, "OK with nothing changed: not modified");
  done();
});

test("NewFromCampaign", async () => {
  const { w, f } = newWindow();
  const { check, done } = checker();
  check(
    w.newFromCampaignItem.label === "New from Campaign..." &&
      w.newFromCampaignItem.key === undefined &&
      before(w, w.newItem, w.newFromCampaignItem) &&
      before(w, w.newFromCampaignItem, w.openItem),
    "File > New from Campaign..., after New",
  );
  f.answer = Discard;
  const first = w.entity;
  f.chosen = undefined;
  w.newFromCampaignItem.action!();
  await settled();
  check(
    w.entity === first &&
      w.campaign === undefined &&
      f.accepted === ".yaml,.yml",
    "cancelled: nothing",
  );
  let tells = f.tells;
  f.chosen = "campaign-zero.yaml";
  w.newFromCampaignItem.action!();
  await settled();
  check(
    f.tells === tells + 1 && w.entity === first && w.campaign === undefined,
    "a file that won't load: said so, nothing",
  );
  f.chosen = "campaign.yaml";
  w.newFromCampaignItem.action!();
  await settled();
  const e = w.entity;
  check(
    w.campaign !== undefined &&
      e !== first &&
      w.entities.length === 1 &&
      e.hasCreation &&
      !e.isMecha &&
      e.creation.characterPoints === 40 &&
      e.creation.genre === R.ModernMilitary &&
      e.creation.statPointsCeiling === 6 &&
      e.creation.statPointsFloor === 4 &&
      sameKeys(e.creationKeys, w.campaign.creationKeys) &&
      !w.modified,
    "a campaign: a new character in it",
  );
  check(
    line(
      w,
      CharacterPoints,
      "Character Points: Stats 3 + Attributes 0 - Bonus Points 0 = 3 of 40; Stats at least 4, at most 6",
      true,
    ),
    "its Stats below the campaign's floor",
  );
  w.creationItem.action!();
  const D = w.creation!;
  D.setCharacterPoints(true, 30);
  D.setStatPointsFloor(false, 0);
  D.ok.click();
  check(
    e.creation.characterPoints === 30 &&
      w.campaign!.creation.characterPoints === 40 &&
      w.campaign!.creation.statPointsFloor === 4,
    "copied, not linked: the campaign unchanged by an edit",
  );
  tells = f.asked;
  w.newItem.action!();
  check(
    w.entity !== e &&
      f.asked === tells + 1 &&
      w.entity.creation.characterPoints === 40 &&
      w.entity.creation.statPointsFloor === 4,
    "File > New afterwards: in the campaign",
  );
  w.campaign = undefined;
  w.newItem.action!();
  check(w.entity.creation.statPointsCeiling === 0, "no campaign: no limits");
  done();
});
