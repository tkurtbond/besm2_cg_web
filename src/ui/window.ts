// The page: its menus, tabs, title and entities, the port of
// besm2_cg_po's Besm2Window, laid out as ova_cg_web's src/ui/window.ts.
//
// One column, at least 640 px wide, as besm2_cg_po's window is 640 x
// 800 at least: a title line, the menu bar with the entities' <select>
// at its right (besm2_cg_po's Choice, ChoiceW wide), and seven tabs,
// Character, Attributes, Defects, Skills, Mecha, Background and
// Preview, the first shown when the page opens.
//
// A file holds characters and mecha, the entities, in the file's order,
// of which one, entity, is shown. Every change marks the file modified,
// and the title says so with " *".
//
// What would wait for the user (a message, a question, a file chooser,
// a line of text, a download) goes through a function field (tell, ask,
// confirm, chooseFile, askText, download), each taking a callback for
// its answer where it has one, so a test can answer it (besm2_cg_po's
// tell, ask, confirm, choosePath, askText; PLAN.md, "Files in the
// browser"). The clipboard's copyText comes with the Preview tab
// (Phase 12), and the rulebook's openPage and openTab with Phase 13.
//
// The Character tab (Phase 7) shows the entity's name, tagline and
// size, its Stats, derived values, points and warnings; every number
// comes from calc.compute, through changed.
//
// A menu item whose phase hasn't come has no action and stays disabled
// (PLAN.md, "Build order"). The other tabs are empty until their phases
// fill them.

import * as C from "../core/calc.ts";
import * as Ch from "../core/character.ts";
import * as R from "../core/rules.ts";
import * as Save from "../core/save.ts";
import * as Warnings from "../core/warnings.ts";
import { wordWrap } from "../core/layout.ts";
import { join, trim } from "../core/text.ts";
import * as dialogs from "./dialogs.ts";
import { keyMatches, MenuBar, MenuItem, Separator, type Key } from "./menu.ts";
import { Background } from "./background.ts";
import { AttrPanel, DefectPanel, SkillPanel, type Host } from "./itempanel.ts";
import {
  bold,
  el,
  HelpButton,
  Lines,
  NumberBox,
  setText,
  Spinner,
  type Target,
} from "./widgets.ts";

export const Title = dialogs.Title;
export type Answer = dialogs.Answer;
export const { SaveFirst, Discard, Cancel } = dialogs;

/** The entities' <select>'s width, besm2_cg_po's ChoiceW. */
export const ChoiceW = 250;
/** Characters on a line of the notices (Besm2Window's NoticeWidth). */
export const NoticeWidth = 80;

/** The points lines, on the Character tab and each list tab. */
export const CharacterPoints = 0;
export const BonusPoints = 1;
export const SkillPoints = 2;
export const NPointLines = 3;

/** The list tabs, which show the points and warnings too (Phase 8). */
export const AttributesList = 0;
export const DefectsList = 1;
export const SkillsList = 2;
export const MechaList = 3;
export const NLists = 4;
/** The Background tab's index in tabNames. */
const BackgroundTab = 5;
/** A list tab's lines, in px; the browser grows with the page (CSS). */
const ListH = 200;

/** Where the rulebook tells of Character Points: p. 13, PDF 15. */
export const CharacterPointsPage = 13;
/** The Stat's value, 1 to 12: p. 16, PDF 18. */
const StatValuePage = 16;

const statNames = ["Body", "Mind", "Soul"] as const;
/** The derived values' boxes, in Ch.ACV .. Ch.AR's order. */
const derivedNames = ["ACV", "DCV", "HP", "EP", "SV", "AR"] as const;

/** The tabs, in order (Besm2Window.Build). */
export const tabNames = [
  "Character",
  "Attributes",
  "Defects",
  "Skills",
  "Mecha",
  "Background",
  "Preview",
] as const;

/**
 * The menus' keys (PLAN.md, "Keys"): besm2_cg_po's where the browsers
 * let a page have them, else Alt+Shift with the same key.
 */
function ctrl(code: string, shift = false): Key {
  return { code, ctrl: true, alt: false, shift };
}
function altShift(code: string): Key {
  return { code, ctrl: false, alt: true, shift: true };
}
export const keys = {
  new: altShift("KeyN"),
  open: ctrl("KeyO"),
  save: ctrl("KeyS"),
  saveAs: ctrl("KeyS", true),
  next: altShift("PageDown"),
  previous: altShift("PageUp"),
} as const;

/** The entity a file shows first: the first that isn't a mecha, or the
 *  first (First). */
export function first(es: readonly Ch.Entity[]): number {
  const i = es.findIndex((e) => !e.isMecha);
  return i < 0 ? 0 : i;
}

export class Window {
  readonly doc: Document;
  readonly dialogs: dialogs.Dialogs;

  readonly menu: MenuBar;
  readonly newItem: MenuItem;
  readonly newFromCampaignItem: MenuItem;
  readonly openItem: MenuItem;
  readonly saveItem: MenuItem;
  readonly saveAsItem: MenuItem;
  readonly creationItem: MenuItem;
  readonly addCharacterItem: MenuItem;
  readonly addMechaItem: MenuItem;
  readonly duplicateItem: MenuItem;
  readonly removeItem: MenuItem;
  readonly moveUpItem: MenuItem;
  readonly moveDownItem: MenuItem;
  readonly nextItem: MenuItem;
  readonly previousItem: MenuItem;
  readonly rulebookItem: MenuItem;
  readonly choosePdfItem: MenuItem;

  /** The file's entities, by number and name; current chosen. */
  readonly entityIn: HTMLSelectElement;
  readonly titleLine: HTMLElement;
  /** The tabs' buttons and panels, in tabNames' order. */
  readonly tabs: HTMLButtonElement[] = [];
  readonly panels: HTMLElement[] = [];

  /**
   * The file's entities, in order, and the one shown, entities[current];
   * the name of the file they came from or were saved to (besm2_cg_po's
   * path: a page knows a file's name, not where it is), undefined for
   * none; and whether any has changed since.
   */
  entities: Ch.Entity[] = [];
  current = 0;
  entity!: Ch.Entity;
  file: string | undefined = undefined;
  modified = false;

  /**
   * What would wait for the user; a test sets its own. tell shows a
   * message; ask asks whether to save first; confirm asks question, yes
   * naming the button that does it; chooseFile asks for a file of the
   * types accept names, calling then only if one is chosen; askText
   * asks for a line of text, showing text to begin with (ok false:
   * cancelled); download hands text to the browser as the file name.
   */
  tell: (text: string) => void;
  ask: (question: string, answer: (a: Answer) => void) => void;
  confirm: (question: string, yes: string, then: (ok: boolean) => void) => void;
  chooseFile: (accept: string, then: (f: File) => void) => void;
  askText: (
    prompt: string,
    text: string,
    then: (text: string, ok: boolean) => void,
  ) => void;
  download: (name: string, text: string) => void;

  /**
   * openPage opens the rulebook at a printed page: the ? buttons'. Phase
   * 13 gives it; until then a ? does nothing, as Besm2Widgets' openPage
   * NIL.
   */
  openPage: ((page: number) => void) | undefined = undefined;

  /** The fields being set from the entity: no change to report
   *  (besm2_cg_po's showing). */
  filling = false;

  // The Character tab (BuildCharacterTab).
  readonly nameIn: HTMLInputElement;
  readonly sizeIn: HTMLInputElement;
  readonly taglineIn: HTMLInputElement;
  /** Each Stat's value, and its points */
  readonly statValue: Spinner[] = [];
  readonly statPoints: NumberBox[] = [];
  /** The derived values, by Ch.ACV .. Ch.AR */
  readonly derived: NumberBox[] = [];
  /** The points lines, by CharacterPoints .. SkillPoints */
  readonly points: HTMLElement[] = [];
  readonly warnings: Lines;
  /** Each list tab's points lines and warnings, by AttributesList ..
   *  MechaList: the list tabs' phase builds them (BuildTotals). */
  readonly tabPoints: HTMLElement[][] = [];
  readonly tabWarnings: Lines[] = [];
  /** The list tabs' panels (BuildLists), and the Background tab. */
  readonly attrPanel: AttrPanel;
  readonly defectPanel: DefectPanel;
  readonly skillPanel: SkillPanel;
  readonly background: Background;

  /** The Window on doc, in its #app, with a new character (Build). */
  constructor(doc: Document) {
    this.doc = doc;
    const app = doc.getElementById("app");
    if (app === null) throw new Error("the page has no #app");
    const d = new dialogs.Dialogs(doc);
    this.dialogs = d;
    this.tell = (text) => d.tell(text);
    this.ask = (q, answer) => d.ask(q, answer);
    this.confirm = (q, yes, then) => d.confirm(q, yes, then);
    this.askText = (p, text, then) => d.askText(p, text, then);
    this.chooseFile = (accept, then) => this.fileDialog(accept, then);
    this.download = (name, text) => this.downloadText(name, text);

    const item = (label: string, key?: Key, action?: () => void) =>
      new MenuItem(doc, label, key, action);
    // File: Quit has no counterpart (closing the tab is quitting).
    this.newItem = item("New", keys.new, () => this.newAction());
    this.newFromCampaignItem = item("New from Campaign...");
    this.openItem = item("Open...", keys.open, () => this.open());
    this.saveItem = item("Save", keys.save, () => this.save(() => {}));
    this.saveAsItem = item("Save As...", keys.saveAs, () =>
      this.saveAs(() => {}),
    );
    this.creationItem = item("Creation...");
    this.addCharacterItem = item("Add Character", undefined, () =>
      this.addCharacter(),
    );
    this.addMechaItem = item("Add Mecha", undefined, () =>
      this.append(Ch.newMecha(undefined)),
    );
    this.duplicateItem = item("Duplicate", undefined, () => this.duplicate());
    this.removeItem = item("Remove...", undefined, () => this.remove());
    this.moveUpItem = item("Move Up", undefined, () => this.move(-1));
    this.moveDownItem = item("Move Down", undefined, () => this.move(1));
    this.nextItem = item("Next", keys.next, () => this.step(1));
    this.previousItem = item("Previous", keys.previous, () => this.step(-1));
    // Rulebook: Viewer... has no counterpart (the browser's viewer).
    this.rulebookItem = item("Open");
    this.choosePdfItem = item("Choose PDF...");
    this.menu = new MenuBar(doc, [
      {
        label: "File",
        items: [
          this.newItem,
          this.newFromCampaignItem,
          this.openItem,
          this.saveItem,
          this.saveAsItem,
        ],
      },
      {
        label: "Character",
        items: [
          this.creationItem,
          Separator,
          this.addCharacterItem,
          this.addMechaItem,
          this.duplicateItem,
          this.removeItem,
          Separator,
          this.moveUpItem,
          this.moveDownItem,
          Separator,
          this.nextItem,
          this.previousItem,
        ],
      },
      {
        label: "Rulebook",
        items: [this.rulebookItem, Separator, this.choosePdfItem],
      },
    ]);

    this.titleLine = doc.createElement("div");
    this.titleLine.className = "title-line";
    this.titleLine.setAttribute("aria-hidden", "true"); // document.title says it

    this.entityIn = doc.createElement("select");
    this.entityIn.className = "entities";
    this.entityIn.setAttribute("aria-label", "Character or mecha shown");
    this.entityIn.title = "the character or mecha shown, of the file's";
    this.entityIn.addEventListener("change", () => this.entityChosen());
    const bar = doc.createElement("header");
    bar.className = "bar";
    bar.append(this.menu.element, this.entityIn);

    const tablist = doc.createElement("div");
    tablist.className = "tabs";
    tablist.setAttribute("role", "tablist");
    const panels = doc.createElement("div");
    panels.className = "panels";
    tabNames.forEach((name, i) => {
      const t = doc.createElement("button");
      t.type = "button";
      t.className = "tab";
      t.id = "tab-" + name.toLowerCase();
      t.setAttribute("role", "tab");
      t.textContent = name;
      const p = doc.createElement("section");
      p.className = "panel";
      p.id = "panel-" + name.toLowerCase();
      p.setAttribute("role", "tabpanel");
      p.setAttribute("aria-labelledby", t.id);
      t.setAttribute("aria-controls", p.id);
      t.addEventListener("click", () => this.showTab(i));
      t.addEventListener("keydown", (e) => this.tabKey(i, e));
      tablist.append(t);
      panels.append(p);
      this.tabs.push(t);
      this.panels.push(p);
    });
    app.replaceChildren(this.titleLine, bar, tablist, panels);

    // BuildCharacterTab.
    this.nameIn = this.textInput("name-in");
    this.sizeIn = this.textInput("size-in");
    this.taglineIn = this.textInput("tagline-in");
    this.warnings = new Lines(doc, "Warnings", 0);
    this.buildCharacterTab(this.panels[0]!);
    // BuildLists.
    const host: Host = {
      tell: (text) => this.tell(text),
      compute: () => {
        Ch.relink(this.entities);
        Ch.computeAll(this.entities);
      },
      openPage: () => this.openPage,
    };
    this.attrPanel = new AttrPanel(doc, host, ListH);
    this.defectPanel = new DefectPanel(doc, host, ListH);
    this.skillPanel = new SkillPanel(doc, host, ListH);
    const lists = [this.attrPanel, this.defectPanel, this.skillPanel];
    lists.forEach((l, i) => {
      l.changed = () => this.changed();
      const p = this.panels[i + 1]!;
      p.classList.add("list-tab");
      p.append(l.element);
      this.buildTotals(p);
    });
    this.background = new Background(doc, {
      tell: (text) => this.tell(text),
      filling: () => this.filling,
    });
    this.background.changed = () => {
      this.modified = true;
      this.showTitle();
    };
    this.panels[BackgroundTab]!.append(this.background.element);

    doc.addEventListener("keydown", (e) => this.key(e));
    doc.addEventListener("dragover", (e) => this.dragOver(e));
    doc.addEventListener("drop", (e) => this.drop(e));
    doc.defaultView?.addEventListener("beforeunload", (e) =>
      this.beforeUnload(e),
    );
    this.showTab(0);
    this.take(Ch.one(Ch.newCharacter()), undefined);
  }

  // ---- Title ----

  showTitle(): void {
    let t = Title;
    if (this.file !== undefined) t += " - " + this.file;
    if (this.entities.length > 1) {
      t += ` (${this.current + 1} of ${this.entities.length})`;
    }
    if (this.modified) t += " *";
    this.doc.title = t;
    this.titleLine.textContent = t;
  }

  // ---- The numbers, the points and the warnings ----

  /** showWarnings shows the warnings, on the Character tab and each
   *  list tab (ShowWarnings). */
  showWarnings(): void {
    const rows: string[][] = [];
    for (let w = this.entity.warnings; w !== undefined; w = w.next) {
      rows.push([Warnings.text(this.entity, w)]);
    }
    this.warnings.set(rows, -1);
    for (const l of this.tabWarnings) l.set(rows, -1);
  }

  /** setLines sets points line i to r, red if red, on the Character tab
   *  and each list tab (SetLines). */
  private setLines(i: number, r: string, red: boolean): void {
    const set = (b: HTMLElement) => {
      b.textContent = r;
      b.classList.toggle("red", red);
    };
    set(this.points[i]!);
    for (const t of this.tabPoints) set(t[i]!);
  }

  /**
   * showPoints shows the points: "Character Points: Stats 15 +
   * Attributes 22 - Bonus Points 4 = 33 of 35" (with "; Stats at least
   * 18, at most 24" for a campaign's limits on the Stats' total) (Mecha
   * Points for a mecha, without Stats), "Bonus Points: 4 (ceiling:
   * none)", "Skill Points: 15 of 20"; each red when it is over its limit
   * (ShowPoints).
   */
  showPoints(): void {
    const e = this.entity;
    const c = e.creation;
    let r: string;
    if (e.isMecha) r = "Mecha Points: ";
    else r = `Character Points: Stats ${e.statTotal} + `;
    r += `Attributes ${e.attrTotal} - Bonus Points ${e.bonusPoints} = ${e.spent}`;
    if (e.available > 0) r += ` of ${e.available}`;
    else if (e.isMecha && e.owner === undefined) r += " (no owner in the file)";
    else r += " (no limit set)";
    if (!e.isMecha && (c.statPointsFloor > 0 || c.statPointsCeiling > 0)) {
      r += "; Stats ";
      if (c.statPointsFloor > 0) {
        r += `at least ${c.statPointsFloor}`;
        if (c.statPointsCeiling > 0) r += ", ";
      }
      if (c.statPointsCeiling > 0) r += `at most ${c.statPointsCeiling}`;
    }
    const has = (code: number) => C.hasWarning(e, code, undefined);
    this.setLines(
      CharacterPoints,
      r,
      has(C.OverCharacterPoints) ||
        has(C.OverMechaPoints) ||
        has(C.StatPointsAbove) ||
        has(C.StatPointsBelow),
    );
    r = `Bonus Points: ${e.bonusPoints} (ceiling: `;
    r += c.bonusCeiling > 0 ? String(c.bonusCeiling) : "none";
    r += ")";
    this.setLines(BonusPoints, r, has(C.OverBonusCeiling));
    r = `Skill Points: ${e.skillSpent} of ${e.skillPoints}`;
    this.setLines(SkillPoints, r, has(C.OverSkillPoints));
  }

  /**
   * showNumbers shows every number again: the Stats only on a character,
   * a mecha has none (p. 59, PDF 61); ACV, DCV, EP and SV likewise; AR
   * only with armour, or an override of it (ShowNumbers). The Mecha
   * tab's refresh comes with it (Phase 10).
   */
  showNumbers(): void {
    const e = this.entity;
    for (let i = 0; i < C.NStats; i++) {
      this.statValue[i]!.setValue(e.stat[i]!);
      this.statPoints[i]!.display();
      if (e.isMecha) {
        this.statValue[i]!.disable();
        this.statPoints[i]!.deactivate();
      } else {
        this.statValue[i]!.enable();
        this.statPoints[i]!.activate();
      }
    }
    for (let i = Ch.ACV; i <= Ch.AR; i++) this.derived[i]!.display();
    for (let i = Ch.ACV; i <= Ch.SV; i++) {
      if (e.isMecha && i !== Ch.HP) this.derived[i]!.hide();
      else this.derived[i]!.show();
    }
    if (e.hasAR || e.ar.overridden) this.derived[Ch.AR]!.show();
    else this.derived[Ch.AR]!.hide();
    this.showPoints();
    this.showWarnings();
  }

  /** changed follows any change to an entity: computed again and shown
   *  (Changed). */
  changed(): void {
    Ch.relink(this.entities); // an edit may have named a mecha
    Ch.computeAll(this.entities);
    this.modified = true;
    this.showTitle();
    this.showNumbers();
  }

  /** boxName is what a number box is for, in its message (BoxName). */
  private boxName(b: NumberBox): string {
    if (b.label !== "") return b.label;
    const i = this.statPoints.indexOf(b);
    return i < 0 ? "" : statNames[i] + "'s points";
  }

  /** numberChanged follows a number box's text taken; refused text is
   *  said so (NumberChanged). */
  private numberChanged(b: NumberBox, ok: boolean): void {
    if (!ok) {
      const label = this.boxName(b);
      let msg = "Not a number";
      if (label !== "") msg += " for " + label;
      msg += ": a whole number. The computed number is used.";
      this.tell(msg);
    }
    this.changed();
  }

  /** statAction follows Stat i's spinner (StatAction). */
  private statAction(i: number): void {
    if (this.filling) return;
    this.entity.stat[i] = this.statValue[i]!.value;
    Ch.useStat(this.entity, i);
    this.changed();
  }

  // ---- Text ----

  /**
   * rename gives a mecha's new name, name, to the subject of each Own a
   * Big Mecha tied to it, so they stay tied; not a blank one (Rename).
   */
  private rename(m: Ch.Entity, name: string | undefined): void {
    if (name === undefined || name === "") return;
    for (const e of this.entities) {
      for (let a = e.attrs; a !== undefined; a = a.next) {
        if (a.mecha === m) (a as Ch.Attr).subject = name;
      }
    }
  }

  /** textAction follows the name, tagline or size typed (TextAction). */
  private textAction(input: HTMLInputElement): void {
    if (this.filling) return;
    const e = this.entity;
    const text = trim(input.value);
    if (input === this.nameIn) {
      e.name = setText(e.name, text);
      if (e.isMecha) this.rename(e, e.name);
      this.changed(); // the Mecha tab, and the ties
      this.showEntities();
    } else if (input === this.taglineIn) {
      e.tagline = setText(e.tagline, text);
    } else if (input === this.sizeIn) {
      e.size = setText(e.size, text);
    }
    this.modified = true;
    this.showTitle();
  }

  // ---- Building the Character tab ----

  /** A text input that follows every change (TextInput's WhenChanged). */
  private textInput(id: string): HTMLInputElement {
    const i = el(this.doc, "input", "text-in");
    i.type = "text";
    i.id = id;
    i.addEventListener("input", () => this.textAction(i));
    return i;
  }

  /** A ? button at page (Help). */
  private help(page: number): HTMLElement {
    return new HelpButton(this.doc, page, () => this.openPage).button;
  }

  /** A label for input, text. */
  private labelFor(input: HTMLInputElement, text: string): HTMLElement {
    const l = el(this.doc, "label", "field-label", text);
    l.htmlFor = input.id;
    return l;
  }

  /** The Stat i's row: its name, spinner, points and ? (StatRow). */
  private statRow(grid: HTMLElement, i: number): void {
    const doc = this.doc;
    const name = statNames[i]!;
    const s = new Spinner(doc, 0, 99, 1);
    s.input.title = `the Stat's value: 1 to 12 (${R.pagesText(StatValuePage)})`;
    s.input.setAttribute("aria-label", name);
    s.onChanged = () => this.statAction(i);
    this.statValue[i] = s;
    const b = new NumberBox(doc, "", name + "'s points");
    b.target = this.statTarget(i);
    b.changed = (b, ok) => this.numberChanged(b, ok);
    this.statPoints[i] = b;
    grid.append(
      el(doc, "span", "stat-name", R.pageLabel(name, R.StatsPage)),
      s.input,
      b.element,
      this.help(R.StatsPage),
    );
  }

  /** Stat i's points, of the entity shown (StatNumber). */
  private statTarget(i: number): Target {
    return {
      get: () => this.entity.statPoints[i]!,
      put: (n) => {
        this.entity.statPoints[i] = n;
        Ch.useStat(this.entity, i);
      },
    };
  }

  /** The derived value of slot, of the entity shown (DerivedNumber). */
  private derivedTarget(slot: number): Target {
    const key = (["acv", "dcv", "hp", "ep", "sv", "ar"] as const)[slot]!;
    return {
      get: () => this.entity[key],
      put: (n) => {
        this.entity[key] = n;
        Ch.useDerived(this.entity, slot);
      },
    };
  }

  /** The Character tab, in p (BuildCharacterTab). */
  private buildCharacterTab(p: HTMLElement): void {
    const doc = this.doc;
    const names = el(doc, "div", "character-names");
    names.append(
      this.labelFor(this.nameIn, "Name"),
      this.nameIn,
      this.labelFor(this.sizeIn, "Size"),
      this.sizeIn,
      this.labelFor(this.taglineIn, "Tagline"),
      this.taglineIn,
    );

    const stats = el(doc, "div", "stats");
    stats.append(
      bold(doc, "Stats"),
      el(doc, "span", "column-head", "Value"),
      el(doc, "span", "column-head", "Points"),
      el(doc, "span"),
    );
    for (let i = 0; i < C.NStats; i++) this.statRow(stats, i);

    const heading = (name: string, page: number): HTMLElement => {
      const h = el(doc, "div", "row heading-row");
      h.append(bold(doc, R.pageLabel(name, page)), this.help(page));
      return h;
    };
    const derived = el(doc, "div", "row derived");
    derivedNames.forEach((label, slot) => {
      const b = new NumberBox(doc, label);
      b.target = this.derivedTarget(slot);
      b.changed = (b, ok) => this.numberChanged(b, ok);
      this.derived[slot] = b;
      derived.append(b.element);
    });

    const points = el(doc, "div", "points");
    for (let i = 0; i < NPointLines; i++) {
      this.points[i] = el(doc, "div", "points-line");
      points.append(this.points[i]!);
    }

    const warnings = el(doc, "div", "warnings");
    const wl = el(doc, "div", "warnings-label", "Warnings");
    warnings.append(wl, this.warnings.element);

    p.classList.add("character-tab");
    p.append(
      names,
      stats,
      heading("Derived values", R.DerivedValuesPage),
      derived,
      heading("Points", CharacterPointsPage),
      points,
      warnings,
    );
  }

  /** A list tab's points lines and warnings, under its panel, in p
   *  (BuildTotals). */
  private buildTotals(p: HTMLElement): void {
    const doc = this.doc;
    const points = el(doc, "div", "points");
    const lines: HTMLElement[] = [];
    for (let i = 0; i < NPointLines; i++) {
      lines.push(el(doc, "div", "points-line"));
    }
    points.append(...lines);
    this.tabPoints.push(lines);
    const l = new Lines(doc, "Warnings", 0);
    this.tabWarnings.push(l);
    const warnings = el(doc, "div", "warnings");
    warnings.append(el(doc, "div", "warnings-label", "Warnings"), l.element);
    p.append(points, warnings);
  }

  // ---- Tabs ----

  /** The tab shown, an index into tabNames. */
  get tabShown(): number {
    return this.tabs.findIndex(
      (t) => t.getAttribute("aria-selected") === "true",
    );
  }

  showTab(i: number): void {
    this.tabs.forEach((t, j) => {
      t.setAttribute("aria-selected", String(i === j));
      t.tabIndex = i === j ? 0 : -1;
      this.panels[j]!.hidden = i !== j;
    });
  }

  /** The tab bar's keys: Left, Right, Home and End choose a tab. */
  private tabKey(i: number, e: KeyboardEvent): void {
    const n = this.tabs.length;
    let j: number;
    switch (e.key) {
      case "ArrowRight":
        j = (i + 1) % n;
        break;
      case "ArrowLeft":
        j = (i + n - 1) % n;
        break;
      case "Home":
        j = 0;
        break;
      case "End":
        j = n - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    this.showTab(j);
    this.tabs[j]!.focus();
  }

  // ---- Keys ----

  /**
   * key is a key pressed anywhere on the page: a menu item's, which it
   * does if it can. The browser's own use of the key is prevented even
   * when the item is disabled, so the key never does something else
   * there. While a dialog is open the keys do nothing, but are still
   * prevented: Ctrl+S under a dialog mustn't save the web page. (Copied
   * from ova_cg_web's Window.key.)
   */
  private key(e: KeyboardEvent): void {
    if (e.defaultPrevented) return;
    for (const it of this.menu.items()) {
      if (it.key === undefined || !keyMatches(it.key, e)) continue;
      e.preventDefault();
      if (this.dialogs.open) return;
      this.menu.close(false);
      if (!it.disabled) it.action?.();
      return;
    }
  }

  // ---- Several entities ----

  /**
   * entityLabel is entity i's label in the <select>: its number and
   * name, " (mecha)" for a mecha (EntityLabel).
   */
  entityLabel(i: number): string {
    const e = this.entities[i]!;
    const name = e.name === undefined ? "" : trim(e.name);
    let r = `${i + 1}. ${name === "" ? "(no name)" : name}`;
    if (e.isMecha) r += " (mecha)";
    return r;
  }

  /**
   * showEntities lists the entities again, current chosen, and the
   * Character menu's items are active where they can do something
   * (ShowEntities).
   */
  showEntities(): void {
    const doc = this.doc;
    const options = this.entities.map((_, i) => {
      const o = doc.createElement("option");
      o.textContent = this.entityLabel(i);
      return o;
    });
    const filling = this.filling;
    this.filling = true;
    this.entityIn.replaceChildren(...options);
    this.entityIn.selectedIndex = this.current;
    this.filling = filling;
    const n = this.entities.length;
    const e = this.entity;
    this.creationItem.disabled = e.isMecha && e.owner === undefined;
    this.removeItem.disabled = n <= 1;
    this.moveUpItem.disabled = this.current === 0;
    this.previousItem.disabled = this.current === 0;
    this.moveDownItem.disabled = this.current === n - 1;
    this.nextItem.disabled = this.current === n - 1;
  }

  /** showEntity shows entity i (ShowEntity). */
  showEntity(i: number): void {
    this.current = i;
    this.entity = this.entities[i]!;
    Ch.relink(this.entities);
    Ch.computeAll(this.entities);
    this.showAll();
  }

  private entityChosen(): void {
    if (this.filling) return;
    const i = this.entityIn.selectedIndex;
    if (i >= 0 && i < this.entities.length && i !== this.current) {
      this.showEntity(i);
    }
  }

  /** append adds e after the last entity, and shows it (Append). */
  private append(e: Ch.Entity): void {
    this.entities.push(e);
    this.modified = true;
    this.showEntity(this.entities.length - 1);
  }

  /**
   * addCharacter is Character > Add Character: a new one, last, with the
   * creation of the one shown (of a mecha, its owner's), so it is in the
   * same campaign (AddCharacterAction).
   */
  private addCharacter(): void {
    const e = Ch.newCharacter();
    if (!this.entity.isMecha) Ch.takeCreation(e, this.entity);
    else if (this.entity.owner !== undefined) {
      Ch.takeCreation(e, this.entity.owner as Ch.Entity);
    }
    this.append(e);
  }

  /**
   * duplicate is Character > Duplicate: a copy of the one shown, last. A
   * mecha's copy has its name, so is tied to no one until renamed
   * (DuplicateAction).
   */
  private duplicate(): void {
    const e = Save.copy(this.entities, this.current);
    if (e === undefined) this.tell("It couldn't be copied.");
    else this.append(e);
  }

  /**
   * remove is Character > Remove...: the one shown, once the user says
   * so; not the only one, since a file holds at least one. The one after
   * it is shown, or the one before if it was last (RemoveAction).
   */
  private remove(): void {
    if (this.entities.length <= 1) return;
    const e = this.entity;
    const name = e.name === undefined ? "" : trim(e.name);
    let q = "Remove ";
    if (name !== "") q += name;
    else if (e.isMecha) q += "this mecha";
    else q += "this character";
    q += " from the file?";
    this.confirm(q, "Remove", (ok) => {
      if (!ok) return;
      const i = this.current;
      this.entities.splice(i, 1);
      this.modified = true;
      this.showEntity(i === this.entities.length ? i - 1 : i);
    });
  }

  /**
   * move swaps the one shown with the one d after it, and it is still
   * shown. The order can change which character prices a mecha two name
   * (Move).
   */
  private move(d: number): void {
    const j = this.current + d;
    if (j < 0 || j >= this.entities.length) return;
    const es = this.entities;
    [es[this.current], es[j]] = [es[j]!, es[this.current]!];
    this.modified = true;
    this.showEntity(j);
  }

  /** step shows the entity d after the one shown, if there is one:
   *  Next and Previous, which don't wrap. */
  private step(d: number): void {
    const j = this.current + d;
    if (j >= 0 && j < this.entities.length) this.showEntity(j);
  }

  /** showAll shows the entity again, everywhere (ShowAll). */
  showAll(): void {
    this.filling = true;
    const e = this.entity;
    this.nameIn.value = e.name ?? "";
    this.taglineIn.value = e.tagline ?? "";
    this.sizeIn.value = e.size ?? "";
    this.attrPanel.show(e);
    this.defectPanel.show(e);
    this.skillPanel.show(e);
    this.background.show(e);
    this.showNumbers();
    this.showEntities();
    this.showTitle();
    this.filling = false;
  }

  // ---- Files ----

  /** take shows the entities es, from the file named file (undefined:
   *  none), unchanged (Take). */
  take(es: Ch.Entity[], file: string | undefined): void {
    this.entities = es;
    this.current = first(es);
    this.entity = es[this.current]!;
    this.file = file;
    this.modified = false;
    Ch.computeAll(es);
    this.showAll();
  }

  /**
   * adopt shows es, just loaded by Ch.loadAll from the file named file,
   * and says what the file gives that the rules compute differently, and
   * so are kept as overrides, and the rest it found (Ch.notices), each
   * naming its entity, wrapped at NoticeWidth (Adopt).
   */
  adopt(es: Ch.Entity[], file: string): void {
    const notices = Ch.notices;
    this.take(es, file);
    if (notices.length === 0) return;
    let r =
      "Numbers the file gives differently from the rules,\n" +
      "kept as overrides, and what else it has:";
    for (const n of notices) {
      r += "\n" + join(wordWrap(n.text, NoticeWidth), "\n  ");
    }
    this.tell(r);
  }

  /**
   * load opens the entities in text, the file named file's contents;
   * false, said why, if it can't, and nothing else changes (Load).
   */
  load(text: string, file: string): boolean {
    const r = Ch.loadAll(text, file);
    if (!r.ok) {
      this.tell(r.msg);
      return false;
    }
    this.adopt(r.es, file);
    return true;
  }

  /** loadFile opens f, as load; false, said why, if it can't be read.
   *  Copied from ova_cg_web's Window.loadFile. */
  async loadFile(f: File): Promise<boolean> {
    let text: string;
    try {
      text = await f.text();
    } catch (e) {
      this.tell(`${f.name} couldn't be read: ${String(e)}`);
      return false;
    }
    return this.load(text, f.name);
  }

  /**
   * saveTo downloads the entities as the file named name, which they are
   * then saved as; false, said why, if they can't be saved (SaveTo).
   */
  saveTo(name: string): boolean {
    const r = Save.saveAll(this.entities);
    if (!r.ok) {
      this.tell(r.msg);
      return false;
    }
    this.download(name, r.text);
    this.file = name;
    this.modified = false;
    this.showTitle();
    return true;
  }

  /** The name a save suggests: the file's, else the first entity's. */
  private suggested(): string {
    return this.file ?? fileName(this.entities[0]!.name ?? "");
  }

  /**
   * saveAs asks for a file name and saves as it; then(saved). It
   * suggests the file's name, else the first entity's (SaveAs, as
   * ova_cg_web's).
   */
  saveAs(then: (saved: boolean) => void): void {
    this.askText("Save the characters as:", this.suggested(), (text, ok) => {
      if (!ok) {
        then(false);
        return;
      }
      const name = fileName(text);
      if (name === "") {
        this.tell("The file needs a name.");
        then(false);
        return;
      }
      then(this.saveTo(name));
    });
  }

  /**
   * save saves as the file's name; a new file as the first entity's
   * name, or, with no name, asks for one; then(saved) (Save; besm2_cg_po
   * asks for a new file's path, a page needs only a name, PLAN.md
   * "Files in the browser").
   */
  save(then: (saved: boolean) => void): void {
    const name = this.suggested();
    if (name === "") this.saveAs(then);
    else then(this.saveTo(name));
  }

  /**
   * mayLeave calls then once the entities may be put away: saved, or the
   * user doesn't want them saved; never if the user cancels. The
   * question names the file, or the character if it is the only one and
   * has no file (MayLeave).
   */
  mayLeave(then: () => void): void {
    if (!this.modified) {
      then();
      return;
    }
    let q = "Save the changes to ";
    if (this.file !== undefined) q += this.file;
    else if (this.entities.length > 1) q += "the characters";
    else if (this.entity.name !== undefined) q += this.entity.name;
    else q += "the character";
    q += " first?";
    this.ask(q, (a) => {
      switch (a) {
        case SaveFirst:
          this.save((ok) => {
            if (ok) then();
          });
          break;
        case Discard:
          then();
          break;
      }
    });
  }

  /** newCharacter is a new character (NewCharacter; the campaign comes
   *  with Phase 11). */
  newCharacter(): Ch.Entity {
    return Ch.newCharacter();
  }

  /** newAction is File > New (NewAction). */
  newAction(): void {
    this.mayLeave(() => this.take(Ch.one(this.newCharacter()), undefined));
  }

  /** open is File > Open... (OpenAction). */
  open(): void {
    this.mayLeave(() =>
      this.chooseFile(".yaml,.yml", (f) => {
        void this.loadFile(f);
      }),
    );
  }

  /**
   * dropped opens files, dropped on the page, as Open... would; one file
   * only. While a dialog is open a drop does nothing. Copied from
   * ova_cg_web's Window.dropped.
   */
  dropped(files: readonly File[]): void {
    if (this.dialogs.open) return;
    if (files.length !== 1) {
      this.tell("Drop one file on the page to open it.");
      return;
    }
    const f = files[0]!;
    this.mayLeave(() => {
      void this.loadFile(f);
    });
  }

  /**
   * A drag bringing files is taken, for drop. Dropped files are always
   * taken, so the browser never opens one in place of the page.
   */
  private dragOver(e: DragEvent): void {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer!.dropEffect = this.dialogs.open ? "none" : "copy";
  }

  private drop(e: DragEvent): void {
    if (!hasFiles(e)) return;
    e.preventDefault();
    this.dropped([...e.dataTransfer!.files]);
  }

  /**
   * Closing or reloading the page with changes: the browser asks, in its
   * own words. ova_cg_web found preventDefault alone brings up the
   * question in headless Chromium 158 and Firefox 159 once the page has
   * had a click; test/browser/files.spec.ts checks it here.
   */
  private beforeUnload(e: BeforeUnloadEvent): void {
    if (this.modified) e.preventDefault();
  }

  /**
   * fileDialog is chooseFile's: a file input, never put in the page,
   * clicked; then(f) once a file is chosen. A cancelled choice calls
   * nothing. Copied from ova_cg_web's Window.fileDialog, whose finding
   * is: Firefox fires the input's cancel event even before a change that
   * brings a file (headless Firefox with Playwright 1.65's file chooser,
   * 2026-11-07), so cancel can't be taken as an answer; and an input
   * out of the page opens the chooser and gets its change in headless
   * Chromium and Firefox.
   */
  private fileDialog(accept: string, then: (f: File) => void): void {
    const input = this.doc.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.addEventListener("change", () => {
      const f = input.files?.[0];
      if (f !== undefined) then(f);
    });
    input.click();
  }

  /**
   * downloadText is download's: a link to a Blob of text, clicked, the
   * Blob let go a minute later. Copied from ova_cg_web's
   * Window.downloadText. It downloads the text under the name, byte for
   * byte, in headless Chromium and Firefox (test/browser/files.spec.ts,
   * Playwright's browsers, 2026-11-15).
   */
  private downloadText(name: string, text: string): void {
    const view = this.doc.defaultView;
    if (view === null) throw new Error("the document has no window");
    const url = view.URL.createObjectURL(
      new view.Blob([text], { type: "application/yaml" }),
    );
    const a = this.doc.createElement("a");
    a.href = url;
    a.download = name;
    a.hidden = true;
    this.doc.body.append(a);
    a.click();
    a.remove();
    view.setTimeout(() => view.URL.revokeObjectURL(url), 60_000);
  }
}

/**
 * fileName is the file name text gives: trimmed, without a directory (a
 * "/" or "\\" becomes "_"), ending in .yaml unless it ends in .yaml or
 * .yml already; "" for no text. Copied from ova_cg_web's fileName.
 */
export function fileName(text: string): string {
  const t = text.trim().replace(/[/\\]/g, "_");
  if (t === "") return "";
  return /\.ya?ml$/i.test(t) ? t : t + ".yaml";
}

/** hasFiles says whether a drag brings files. */
function hasFiles(e: DragEvent): boolean {
  return e.dataTransfer?.types.includes("Files") ?? false;
}
