// The Creation dialog: the campaign's numbers and options, besm2_cg_po's
// A4 `creation`; the port of its Besm2Creation (its PLAN.md, Part B,
// step 10), opened and closed as the Weapon Attack dialog is.
//
// Character > Creation... edits the `creation` of the character shown (of
// a mecha, its owner's, which prices it): its Character Points (p. 13,
// PDF 15), Background Points (p. 130, PDF 132), genre (Table 2-4, p. 119,
// PDF 121), the GM's Skill Points (p. 117, PDF 119), and the options:
// Staged Stat Cost (Table 4-7, p. 166, PDF 168), a ceiling on each Stat
// (p. 16, PDF 18) and on the Bonus Points (p. 100, PDF 102), Auto-Fire
// counted as 1 slot (p. 84, PDF 86), and a ceiling and a floor on the
// Character Points the Stats cost in all (p. 16, PDF 18). Each row has
// both its pages and a ? button. A number has a checkbox: off, the key
// isn't written, and no limit is checked; its spinner keeps what it held,
// and one never set starts at a default (the GM's Skill Points: the
// rule's number, shown while it is off).
//
// Copy from takes the whole `creation`, house Skills too, from another
// character of the file (Ch.takeCreation), so that a campaign's
// characters share it; Load Campaign... takes it from a campaign file, or
// the first character of a file of entities, and Save Campaign...
// downloads it as a campaign file, for the GM to hand the players.
//
// The dialog changes the model as the user works, and changed, the
// Window's, computes every entity again and shows them; Cancel puts back
// the creation and the Skills' points as they were when it opened. It
// doesn't wait: the constructor shows it, and OK or Cancel calls done.

import * as C from "../core/calc.ts";
import * as Ch from "../core/character.ts";
import * as R from "../core/rules.ts";
import * as Save from "../core/save.ts";
import { trim } from "../core/text.ts";
import type { Dialogs } from "./dialogs.ts";
import { bold, button, el, HelpButton, Spinner } from "./widgets.ts";

// The defaults of a number never set.
const DefaultCharacterPoints = 40; // p. 13's example campaign
const DefaultStatCeiling = 10;
const DefaultBonusCeiling = 8; // p. 100, PDF 102: no more than eight Defects
const DefaultStatPointsCeiling = 24; // p. 16, PDF 18: 12 to 24
const DefaultStatPointsFloor = 12;
const MaxPoints = 999;
const MaxBackground = 3;
const MaxBonus = 99;
const CharacterPointsPage = 13; // Step 1
const StatCeilingPage = 16; // Step 3: the GM's ceiling or floor
const AutoFirePage = 84;

/** What the dialog needs of the Window. */
export interface Host {
  readonly doc: Document;
  readonly dialogs: Dialogs;
  /** Shows a message (tell). */
  tell(text: string): void;
  /** Computes every entity again and shows them, after a change
   *  (changed). */
  changed(): void;
  /** The rulebook's opener, if any (Besm2Widgets.openPage). */
  openPage(): ((page: number) => void) | undefined;
  /** Asks for a campaign file and reads it; then(text, name) once read,
   *  never if cancelled or unreadable (said why) (chooseCampaign, to
   *  load). */
  chooseCampaign(then: (text: string, name: string) => void): void;
  /** Asks for the name to save a campaign as; then(name), never if
   *  cancelled (chooseCampaign, to save). */
  nameCampaign(then: (name: string) => void): void;
  /** Downloads text as the file name. */
  download(name: string, text: string): void;
}

/** A row: its checkbox or label, named with both pages, and its ?. */
interface Row {
  element: HTMLElement;
  check: HTMLInputElement | undefined;
  label: HTMLElement;
}

export class CreationDialog {
  readonly host: Host;
  /** Whose creation is edited */
  readonly target: Ch.Entity;
  readonly title: HTMLElement;
  readonly pointsOn: HTMLInputElement;
  readonly skillOn: HTMLInputElement;
  readonly stagedOn: HTMLInputElement;
  readonly statOn: HTMLInputElement;
  readonly bonusOn: HTMLInputElement;
  readonly autoFireOn: HTMLInputElement;
  readonly statPointsCeilingOn: HTMLInputElement;
  readonly statPointsFloorOn: HTMLInputElement;
  readonly pointsIn: Spinner;
  readonly backgroundIn: Spinner;
  readonly skillIn: Spinner;
  readonly statIn: Spinner;
  readonly bonusIn: Spinner;
  readonly statPointsCeilingIn: Spinner;
  readonly statPointsFloorIn: Spinner;
  /** Option 0: none, then rules' genres */
  readonly genre: HTMLSelectElement;
  readonly summary: HTMLElement;
  /** others[i]: option i */
  readonly copyChoice: HTMLSelectElement;
  readonly copyButton: HTMLButtonElement;
  readonly loadButton: HTMLButtonElement;
  readonly saveButton: HTMLButtonElement;
  readonly ok: HTMLButtonElement;
  readonly cancel: HTMLButtonElement;
  /** Each row's label, with both pages, by its control: for tests */
  readonly labels = new Map<HTMLElement, string>();

  /** The file's other characters */
  private readonly others: Ch.Entity[] = [];
  // What was there when it opened, for Cancel.
  private readonly savedCreation: C.Creation;
  private readonly savedKeys: ReadonlySet<number>;
  private readonly savedHas: boolean;
  private readonly savedSkills: Ch.SkillMark[];
  // The keys and `creation` to keep: at open, or after a copy.
  private baseKeys: ReadonlySet<number>;
  private baseHas: boolean;
  /** show is setting the controls */
  private showing = false;
  private readonly done: (ok: boolean) => void;
  private close: () => void = () => {};
  /** Whether it is open: false once OK or Cancel has closed it */
  open = true;

  /** Edits the creation of e, or of its owner if e is a mecha (which
   *  must have one); es is the file's entities, the others of which may
   *  be copied from. done is called after OK or Cancel, ok true for OK
   *  (Edit). */
  constructor(
    host: Host,
    e: Ch.Entity,
    es: readonly Ch.Entity[],
    done: (ok: boolean) => void,
  ) {
    this.host = host;
    if (e.isMecha) {
      if (e.owner === undefined) throw new Error("a mecha with no owner");
      this.target = e.owner as Ch.Entity;
    } else this.target = e;
    const t = this.target;
    this.done = done;
    this.savedCreation = Ch.copyCreation(t.creation);
    this.savedKeys = new Set(t.creationKeys);
    this.savedHas = t.hasCreation;
    this.savedSkills = Ch.saveSkills(t);
    this.baseKeys = this.savedKeys;
    this.baseHas = this.savedHas;
    for (const o of es) if (o !== t && !o.isMecha) this.others.push(o);
    const doc = host.doc;

    let heading = "The creation of ";
    const name = t.name === undefined ? "" : trim(t.name);
    heading += name === "" ? "the character (no name)" : name;
    if (e.isMecha) heading += ", which prices the mecha";
    this.title = bold(doc, heading);

    const rows: HTMLElement[] = [];
    const spinner = (lo: number, hi: number, value: number): Spinner => {
      const s = new Spinner(doc, lo, hi, value);
      s.onChanged = () => this.take();
      return s;
    };
    const add = (
      name: string,
      page: number,
      checked: boolean,
      control?: HTMLElement,
    ): Row => {
      const text = R.pageLabel(name, page);
      const help = new HelpButton(doc, page, () => host.openPage());
      help.button.title = text;
      const element = el(doc, "div", "creation-row");
      let check: HTMLInputElement | undefined = undefined;
      const label = el(doc, "label", "creation-label");
      if (checked) {
        check = el(doc, "input");
        check.type = "checkbox";
        check.addEventListener("change", () => this.take());
        label.append(check, text);
        this.labels.set(check, text);
      } else {
        label.append(text);
        if (control !== undefined) this.labels.set(control, text);
      }
      const cell = el(doc, "span", "creation-control");
      if (control !== undefined) {
        // The control sits outside the <label>, so it is named for
        // itself.
        control.setAttribute("aria-label", text);
        cell.append(control);
      }
      element.append(label, cell, help.button);
      rows.push(element);
      return { element, check, label };
    };

    this.pointsIn = spinner(1, MaxPoints, DefaultCharacterPoints);
    this.pointsOn = add(
      "Character Points",
      CharacterPointsPage,
      true,
      this.pointsIn.input,
    ).check!;
    this.backgroundIn = spinner(0, MaxBackground, 0);
    add(
      "Background Points",
      R.BackgroundPointsPage,
      false,
      this.backgroundIn.input,
    );
    this.genre = el(doc, "select", "genre");
    const names = ["(none)"];
    for (let g = 0; g < R.NGenres; g++) names.push(R.genreName(g));
    this.genre.replaceChildren(
      ...names.map((n) => {
        const o = el(doc, "option");
        o.textContent = n;
        return o;
      }),
    );
    this.genre.addEventListener("change", () => this.take());
    add("Genre, Table 2-4", R.SkillCostsPage, false, this.genre);
    this.skillIn = spinner(0, MaxPoints, 0);
    this.skillOn = add(
      "The GM's Skill Points",
      R.SkillsPage,
      true,
      this.skillIn.input,
    ).check!;
    this.stagedOn = add(
      "Staged Stat Cost, Table 4-7",
      R.StagedStatCostPage,
      true,
    ).check!;
    this.statIn = spinner(1, C.MaxStat, DefaultStatCeiling);
    this.statOn = add(
      "A ceiling on each Stat",
      StatCeilingPage,
      true,
      this.statIn.input,
    ).check!;
    this.bonusIn = spinner(1, MaxBonus, DefaultBonusCeiling);
    this.bonusOn = add(
      "A ceiling on the Bonus Points",
      R.DefectsPage,
      true,
      this.bonusIn.input,
    ).check!;
    this.autoFireOn = add(
      "Auto-Fire counts as 1 slot",
      AutoFirePage,
      true,
    ).check!;
    this.statPointsCeilingIn = spinner(1, MaxPoints, DefaultStatPointsCeiling);
    this.statPointsCeilingOn = add(
      "A ceiling on the Stats' total cost",
      StatCeilingPage,
      true,
      this.statPointsCeilingIn.input,
    ).check!;
    this.statPointsFloorIn = spinner(1, MaxPoints, DefaultStatPointsFloor);
    this.statPointsFloorOn = add(
      "A floor on the Stats' total cost",
      StatCeilingPage,
      true,
      this.statPointsFloorIn.input,
    ).check!;

    this.summary = el(doc, "div", "creation-summary");

    this.copyChoice = el(doc, "select", "copy-choice");
    this.copyChoice.replaceChildren(
      ...this.others.map((o) => {
        const opt = el(doc, "option");
        const n = o.name === undefined ? "" : trim(o.name);
        opt.textContent = n === "" ? "(no name)" : n;
        return opt;
      }),
    );
    this.copyChoice.setAttribute("aria-label", "Copy from");
    this.copyButton = button(doc, "Copy", () => this.copyAction());
    this.copyButton.title =
      "the whole creation, house Skills too, of the character chosen";
    if (this.others.length === 0) {
      this.copyChoice.disabled = true;
      this.copyButton.disabled = true;
    }
    const copyLabel = el(doc, "span", "", "Copy from");
    const copyRow = el(doc, "div", "panel-row");
    copyRow.append(copyLabel, this.copyChoice, this.copyButton);
    this.loadButton = button(doc, "Load Campaign...", () => this.loadAction());
    this.loadButton.title =
      "the whole creation of a campaign file, or of the first character of a file";
    this.saveButton = button(doc, "Save Campaign...", () => this.saveAction());
    this.saveButton.title =
      "the whole creation, as a campaign file to hand the players";
    const fileRow = el(doc, "div", "panel-row");
    fileRow.append(this.loadButton, this.saveButton);

    this.ok = host.dialogs.button("OK", () => this.okAction(), true);
    this.cancel = host.dialogs.button("Cancel", () => this.cancelAction());

    const grid = el(doc, "div", "creation-rows");
    grid.append(...rows);
    this.show();
    this.close = host.dialogs.modal(
      [this.title, grid, this.summary, copyRow, fileRow],
      [this.ok, this.cancel],
      this.pointsOn,
      () => this.cancelAction(),
      "Creation",
      "creation-dialog",
    );
  }

  /** The points as computed: "Character Points: 33 spent of 40.  Skill
   *  Points: 15 spent of 20." (ShowSummary). */
  private showSummary(): void {
    const t = this.target;
    let r = `Character Points: ${t.spent} spent`;
    if (t.available > 0) r += ` of ${t.available}`;
    else r += " (no limit set)";
    r += `.  Skill Points: ${t.skillSpent} spent of ${t.skillPoints}.`;
    this.summary.textContent = r;
  }

  /** The spinners enabled where their checkbox is on; the GM's Skill
   *  Points, while off, the rule's number (ShowEnabled). */
  private showEnabled(): void {
    const enable = (s: Spinner, on: boolean) => {
      if (on) s.enable();
      else s.disable();
    };
    enable(this.pointsIn, this.pointsOn.checked);
    enable(this.skillIn, this.skillOn.checked);
    enable(this.statIn, this.statOn.checked);
    enable(this.bonusIn, this.bonusOn.checked);
    enable(this.statPointsCeilingIn, this.statPointsCeilingOn.checked);
    enable(this.statPointsFloorIn, this.statPointsFloorOn.checked);
    if (!this.skillOn.checked) this.skillIn.setValue(this.target.skillPoints);
    this.showSummary();
  }

  /** The controls set from the target's creation; the spinners of the
   *  numbers not set keep what they hold (Show). */
  private show(): void {
    this.showing = true;
    const c = this.target.creation;
    const number = (
      b: HTMLInputElement,
      s: Spinner,
      n: number,
      on: boolean,
    ) => {
      b.checked = on;
      if (on) s.setValue(n);
    };
    number(
      this.pointsOn,
      this.pointsIn,
      c.characterPoints,
      c.characterPoints > 0,
    );
    this.backgroundIn.setValue(c.backgroundPoints);
    this.genre.selectedIndex = c.genre + 1;
    number(
      this.skillOn,
      this.skillIn,
      c.skillPoints,
      c.skillPoints !== C.Unset,
    );
    this.stagedOn.checked = c.stagedStatCost;
    number(this.statOn, this.statIn, c.statCeiling, c.statCeiling > 0);
    number(this.bonusOn, this.bonusIn, c.bonusCeiling, c.bonusCeiling > 0);
    this.autoFireOn.checked = c.autoFireSlots === 1;
    number(
      this.statPointsCeilingOn,
      this.statPointsCeilingIn,
      c.statPointsCeiling,
      c.statPointsCeiling > 0,
    );
    number(
      this.statPointsFloorOn,
      this.statPointsFloorIn,
      c.statPointsFloor,
      c.statPointsFloor > 0,
    );
    this.showEnabled();
    this.showing = false;
  }

  /** The target's creation made from the controls, and everything
   *  computed again. A number turned off is no key (no limit); an option
   *  turned off, or Background Points of 0, is written only if it was
   *  (Take). */
  private take(): void {
    if (this.showing || !this.open) return;
    const t = this.target;
    const c = Ch.copyCreation(t.creation);
    const k = new Set(t.creationKeys);
    // k with key in it if on, or if it was among the keys to keep (Key).
    const key = (key: number, on: boolean) => {
      if (on || this.baseKeys.has(key)) k.add(key);
      else k.delete(key);
    };
    // A number: its spinner's if on, else off, and its key so.
    const number = (
      key: number,
      b: HTMLInputElement,
      s: Spinner,
      off: number,
    ): number => {
      if (b.checked) k.add(key);
      else k.delete(key);
      return b.checked ? s.value : off;
    };
    c.characterPoints = number(
      Ch.CharacterPointsKey,
      this.pointsOn,
      this.pointsIn,
      0,
    );
    c.backgroundPoints = this.backgroundIn.value;
    key(Ch.BackgroundPointsKey, c.backgroundPoints !== 0);
    c.genre = this.genre.selectedIndex - 1;
    if (c.genre !== C.NoGenre) k.add(Ch.GenreKey);
    else k.delete(Ch.GenreKey);
    c.skillPoints = number(
      Ch.SkillPointsKey,
      this.skillOn,
      this.skillIn,
      C.Unset,
    );
    c.stagedStatCost = this.stagedOn.checked;
    key(Ch.StagedStatCostKey, c.stagedStatCost);
    c.statCeiling = number(Ch.StatCeilingKey, this.statOn, this.statIn, 0);
    c.bonusCeiling = number(Ch.BonusCeilingKey, this.bonusOn, this.bonusIn, 0);
    c.autoFireSlots = this.autoFireOn.checked ? 1 : C.BookAutoFireSlots;
    key(Ch.AutoFireSlotsKey, this.autoFireOn.checked);
    c.statPointsCeiling = number(
      Ch.StatPointsCeilingKey,
      this.statPointsCeilingOn,
      this.statPointsCeilingIn,
      0,
    );
    c.statPointsFloor = number(
      Ch.StatPointsFloorKey,
      this.statPointsFloorOn,
      this.statPointsFloorIn,
      0,
    );
    Ch.setCreation(t, c, k, this.baseHas);
    this.host.changed();
    this.showEnabled();
  }

  // ---- Copy from ----

  /** The target's creation from's; what to keep is now from's
   *  (CopyFrom). */
  private copyFrom(from: Ch.Entity): void {
    const t = this.target;
    Ch.takeCreation(t, from);
    this.baseKeys = new Set(t.creationKeys);
    this.baseHas = t.hasCreation;
    this.host.changed();
    this.show();
  }

  /** Copy (CopyAction). */
  copyAction(): void {
    const i = this.copyChoice.selectedIndex;
    const from = this.others[i];
    if (i >= 0 && from !== undefined) this.copyFrom(from);
    else
      this.host.tell("There is no other character in the file to copy from.");
  }

  /** Load Campaign...: the creation of a campaign file the user chooses,
   *  or of the first character of a file of entities (LoadAction). */
  loadAction(): void {
    this.host.chooseCampaign((text, name) => {
      if (!this.open) return;
      const r = Ch.loadCampaign(text, name);
      if (r.ok) this.copyFrom(r.from);
      else this.host.tell(r.msg);
    });
  }

  /** Save Campaign...: the creation as it stands, downloaded as a
   *  campaign file named as the user says (SaveAction). */
  saveAction(): void {
    this.host.nameCampaign((name) => {
      if (!this.open) return;
      const r = Save.saveCampaign(this.target);
      if (r.ok) this.host.download(name, r.text);
      else this.host.tell(r.msg);
    });
  }

  // ---- Closing ----

  private finish(ok: boolean): void {
    this.open = false;
    this.close();
    this.done(ok);
  }

  /** OK (OkAction). */
  okAction(): void {
    if (this.open) this.finish(true);
  }

  /** Cancel: everything put back as it was (CancelAction). */
  cancelAction(): void {
    if (!this.open) return;
    Ch.restoreCreation(
      this.target,
      this.savedCreation,
      this.savedKeys,
      this.savedHas,
      this.savedSkills,
    );
    this.host.changed();
    this.finish(false);
  }

  // For tests: each control as if set by the user; Copy from the other
  // character n (0: the first).

  private setNumber(b: HTMLInputElement, s: Spinner, on: boolean, n: number) {
    this.showing = true;
    b.checked = on;
    if (on) s.setValue(n);
    this.showing = false;
    this.take();
  }

  /** on false: no Character Points, so no limit; n is then ignored. */
  setCharacterPoints(on: boolean, n: number): void {
    this.setNumber(this.pointsOn, this.pointsIn, on, n);
  }

  setBackgroundPoints(n: number): void {
    this.backgroundIn.setValue(n);
    this.take();
  }

  /** g: a rules genre, or C.NoGenre. */
  setGenre(g: number): void {
    this.genre.selectedIndex = g + 1;
    this.take();
  }

  setSkillPoints(on: boolean, n: number): void {
    this.setNumber(this.skillOn, this.skillIn, on, n);
  }

  setStaged(on: boolean): void {
    this.stagedOn.checked = on;
    this.take();
  }

  setStatCeiling(on: boolean, n: number): void {
    this.setNumber(this.statOn, this.statIn, on, n);
  }

  setBonusCeiling(on: boolean, n: number): void {
    this.setNumber(this.bonusOn, this.bonusIn, on, n);
  }

  setAutoFireOne(on: boolean): void {
    this.autoFireOn.checked = on;
    this.take();
  }

  setStatPointsCeiling(on: boolean, n: number): void {
    this.setNumber(this.statPointsCeilingOn, this.statPointsCeilingIn, on, n);
  }

  setStatPointsFloor(on: boolean, n: number): void {
    this.setNumber(this.statPointsFloorOn, this.statPointsFloorIn, on, n);
  }

  copy(n: number): void {
    this.copyChoice.selectedIndex = n;
    this.copyAction();
  }
}
