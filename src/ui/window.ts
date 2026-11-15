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
// A menu item whose phase hasn't come has no action and stays disabled
// (PLAN.md, "Build order"). The tabs are empty until their phases fill
// them.

import * as Ch from "../core/character.ts";
import * as Save from "../core/save.ts";
import { trim } from "../core/text.ts";
import * as dialogs from "./dialogs.ts";
import { keyMatches, MenuBar, MenuItem, Separator, type Key } from "./menu.ts";

export const Title = dialogs.Title;
export type Answer = dialogs.Answer;
export const { SaveFirst, Discard, Cancel } = dialogs;

/** The entities' <select>'s width, besm2_cg_po's ChoiceW. */
export const ChoiceW = 250;

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

  /** The fields being set from the entity: no change to report
   *  (besm2_cg_po's showing). */
  filling = false;

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
    this.newItem = item("New", keys.new);
    this.newFromCampaignItem = item("New from Campaign...");
    this.openItem = item("Open...", keys.open);
    this.saveItem = item("Save", keys.save);
    this.saveAsItem = item("Save As...", keys.saveAs);
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

    doc.addEventListener("keydown", (e) => this.key(e));
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
   * Window.downloadText, which there downloads the text under the name,
   * byte for byte, in headless Chromium 158 and Firefox 159; Phase 6
   * tests it here.
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
