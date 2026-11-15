// The Attributes, Defects and Skills tabs' lists and their editors, the
// port of besm2_cg_po's Besm2ItemPanel (its PLAN.md, Part B, step 7),
// after ova_cg_web's src/ui/traitpanel.ts. Each tab is a widgets.Panel:
// lines of the entity's items, one a line ("2 Own a Big Mecha: Walker",
// "8 pts", "p. 59, PDF 61"), and under them the <select> of names, each
// with both its pages, the Spinner for the Level (a Defect's rank), the
// text field for the subject (a Skill's specialisations), and the ?
// button, which opens the rulebook at the chosen name's page.
//
// - AttrPanel offers the Attributes, then, after a divider, the Mecha
//   Attributes; under the subject, the details, and the chosen
//   Attribute's options (its choices that change its cost, p. 16, PDF
//   18), each a line: "(x)" one of a required choice, the first by
//   default, "[x]" one that is taken or not, "N x" one taken N times; +
//   and - take it once more, or once less.
// - DefectPanel offers the Defects, then the Mecha Defects; under the
//   subject, the details.
// - SkillPanel offers the Skills, then the entity's house Skills
//   (`creation: house-skills`), "(house rule)", which have no page; its
//   text field is the specialisations, separated by commas; under it the
//   genre, whose Table 2-4 (p. 119, PDF 121) prices them.
//
// Each edit goes to the model (character's newAttr, changeAttr, ...),
// then the host's compute computes every entity again; then the lines
// are filled again and changed, the Window's, shows the numbers. Nothing
// here holds the only copy of anything but what the user is still
// choosing (an AttrPanel's options, until Add or Change). An item's
// points have no box here, as in besm2_cg_po: an override a file gives
// is kept, and saved.

import * as C from "../core/calc.ts";
import * as Ch from "../core/character.ts";
import * as R from "../core/rules.ts";
import { join, trim } from "../core/text.ts";
import {
  button,
  el,
  HelpButton,
  inputText,
  labelled,
  Lines,
  Panel,
} from "./widgets.ts";

/** A Level's or rank's highest on the spinner (MaxLevel). */
export const MaxLevel = 99;
/** The lines' columns: the points', and the page's (PointsW, PageW). */
const PointsW = 60;
const PageW = 125;
/** An AttrPanel's options, in px (OptionRows of 4). */
const OptionsH = 110;
const HouseLabel = " (house rule)";

/** What a panel needs of the Window: its tell, compute and openPage. */
export interface Host {
  /** Shows a message. */
  tell(text: string): void;
  /** Computes every entity again, after a change. */
  compute(): void;
  /** The rulebook, if it can be opened (Besm2Widgets.openPage). */
  openPage(): ((page: number) => void) | undefined;
}

// ---- Text ----

/** " " and name, ": " and subject if any, " (" details ")" if any
 *  (AddName). */
function nameText(
  name: string,
  subject: string | undefined,
  details: string | undefined,
): string {
  let r = " ";
  r += trim(name) === "" ? '""' : trim(name);
  if (subject !== undefined) r += ": " + subject;
  if (details !== undefined && details !== "") r += " (" + details + ")";
  return r;
}

/** The points and unit, and it's pages ("" for none): a line's columns
 *  (AddColumns). */
function columns(points: number, unit: string, it: R.Item | undefined) {
  return [`${points} ${unit}`, it === undefined ? "" : R.pageText(it)];
}

/** A Level as the file wrote it, or the number. */
function levelText(x: {
  levelIsText: boolean;
  levelText: string;
  level: number;
}): string {
  return x.levelIsText ? x.levelText : String(x.level);
}

/** Where l (a calc list from first) is, from 0 (LineOf). */
function lineOf<T extends { next: T | undefined }>(
  first: T | undefined,
  l: T,
): number {
  let i = 0;
  for (let p = first; p !== undefined && p !== l; p = p.next) i++;
  return i;
}

// ---- What every list does ----

/** ItemPanel is what every list has: the entity whose items it lists. */
export abstract class ItemPanel extends Panel {
  entity: Ch.Entity | undefined = undefined;
  protected readonly host: Host;

  constructor(
    doc: Document,
    host: Host,
    kind: R.Kind,
    second: R.Kind | -1,
    title: string,
    spinLabel: string,
    textLabel: string,
    height: number,
  ) {
    super(
      doc,
      kind,
      second,
      title,
      spinLabel,
      textLabel,
      height,
      () => host.openPage(),
      PointsW,
      PageW,
    );
    this.host = host;
    this.spinner.setBounds(1, MaxLevel);
    this.spinner.setValue(1);
  }

  protected level(): number {
    return this.spinner.value;
  }

  protected noName(): number {
    this.host.tell("Choose a name first.");
    return -1;
  }

  /** The controls emptied, nothing chosen (Blank). */
  blank(): void {
    this.chooseIndex(-1);
    this.spinner.setValue(1);
    this.text.value = "";
  }

  /** The entity's whose this is, now there is one. */
  protected get e(): Ch.Entity {
    return this.entity!;
  }
}

// ---- Attributes ----

/** Whether option i of it counts: taken, or the first of a required
 *  choice none of whose options is taken (Counts). */
function counts(it: R.Item, times: readonly number[], i: number): boolean {
  if (times[i]! > 0) return true;
  const g = it.option[i]!.group;
  if (g <= 0) return false;
  let first = true;
  for (let j = 0; j < it.option.length; j++) {
    if (it.option[j]!.group === g) {
      if (times[j]! > 0) return false;
      if (j < i) first = false;
    }
  }
  return first;
}

export class AttrPanel extends ItemPanel {
  /** shown[i]: line i's */
  private shown: Ch.Attr[] = [];
  readonly details: HTMLInputElement;
  readonly options: Lines;
  readonly plus: HTMLButtonElement;
  readonly minus: HTMLButtonElement;
  /** The options being chosen: of optItem, the item chosen, taken
   *  times[i] times; loaded, the Attribute loaded last (undefined: none). */
  private optItem: R.Item | undefined = undefined;
  readonly times: number[] = new Array<number>(R.MaxOptions).fill(0);
  private loaded: Ch.Attr | undefined = undefined;

  constructor(doc: Document, host: Host, height: number) {
    super(
      doc,
      host,
      R.Attribute,
      R.MechaAttribute,
      "Attributes",
      "Level",
      "subject",
      height,
    );
    this.details = el(doc, "input", "panel-text");
    this.details.type = "text";
    this.options = new Lines(doc, "options", OptionsH, 80);
    this.plus = button(doc, "+", () => this.stepChosen(1));
    this.plus.title = "take the option chosen once more";
    this.plus.setAttribute("aria-label", "Take the option once more");
    this.minus = button(doc, "-", () => this.stepChosen(-1));
    this.minus.title = "take it once less";
    this.minus.setAttribute("aria-label", "Take the option once less");
    const details = el(doc, "div", "panel-row");
    details.append(labelled(doc, "details", this.details));
    const options = el(doc, "div", "panel-row options-row");
    const steps = el(doc, "div", "option-steps");
    steps.append(this.plus, this.minus);
    options.append(
      el(doc, "span", "options-label", "options"),
      this.options.element,
      steps,
    );
    this.extra.append(details, options);
    this.showOptions(-1);
  }

  /** The Attribute on line i; undefined for none (AttrAt). */
  attrAt(i: number): Ch.Attr | undefined {
    return this.shown[i];
  }

  protected fill(): string[][] {
    this.shown = [];
    const rows: string[][] = [];
    if (this.entity === undefined) return rows;
    for (let a = this.entity.attrs; a !== undefined; a = a.next) {
      const x = a as Ch.Attr;
      this.shown.push(x);
      rows.push([
        levelText(x) + nameText(x.name, x.subject, x.details),
        ...columns(C.value(x.points), "pts", x.item),
      ]);
    }
    return rows;
  }

  /** The options' lines again, line i selected (-1: none) (ShowOptions). */
  private showOptions(i: number): void {
    const it = this.optItem;
    if (it === undefined || it.option.length === 0) {
      this.options.set([], -1);
      this.options.deactivate();
      this.plus.disabled = true;
      this.minus.disabled = true;
      return;
    }
    this.options.activate();
    this.plus.disabled = false;
    this.minus.disabled = false;
    const rows = it.option.map((o, j) => {
      let r: string;
      if (o.group > 0) r = counts(it, this.times, j) ? "(x) " : "( ) ";
      else if (o.maxTimes === 1) r = this.times[j]! > 0 ? "[x] " : "[ ] ";
      else r = `${this.times[j]} x `;
      let amount = (o.amount >= 0 ? "+" : "") + String(o.amount);
      if (o.perLevel) amount += " a Level";
      return [r + o.label, amount];
    });
    this.options.set(rows, i);
  }

  /** After the <select> changes: the options of the name chosen, none
   *  taken, unless it is the loaded Attribute's, whose are shown. */
  protected override chosen(): void {
    super.chosen();
    const it = this.item();
    if (it !== this.optItem) {
      this.times.fill(0);
      if (this.loaded !== undefined && this.loaded.item === it) {
        for (let i = 0; i < R.MaxOptions; i++) {
          this.times[i] = this.loaded.times[i]!;
        }
      }
      this.optItem = it;
    }
    this.showOptions(-1);
  }

  /** Option line i taken once more (step 1) or once less (-1): of a
   *  choice, the one taken, the others not (Step). */
  step(i: number, step: number): void {
    const it = this.optItem;
    if (it === undefined || i < 0 || i >= it.option.length) return;
    const o = it.option[i]!;
    if (o.group !== 0) {
      if (step > 0) {
        it.option.forEach((p, j) => {
          if (p.group === o.group) this.times[j] = 0;
        });
        this.times[i] = 1;
      } else this.times[i] = 0;
    } else if (step > 0) {
      if (this.times[i]! < o.maxTimes) this.times[i]!++;
    } else if (this.times[i]! > 0) this.times[i]!--;
    this.showOptions(i);
  }

  /** + and -: on the option selected (OptionButton's Callback). */
  private stepChosen(step: number): void {
    const i = this.options.selected();
    if (i >= 0) this.step(i, step);
    else this.host.tell("Choose an option first.");
  }

  protected load(i: number): void {
    const a = this.shown[i]!;
    this.loaded = a;
    this.optItem = a.item;
    for (let j = 0; j < R.MaxOptions; j++) this.times[j] = a.times[j]!;
    this.choose(a.item);
    this.spinner.setValue(a.level);
    this.text.value = a.subject ?? "";
    this.details.value = a.details ?? "";
  }

  override blank(): void {
    this.loaded = undefined;
    super.blank();
    this.details.value = "";
  }

  private takeOptions(a: Ch.Attr): void {
    if (a.item !== undefined && a.item === this.optItem) {
      for (let i = 0; i < R.MaxOptions; i++) a.times[i] = this.times[i]!;
    }
  }

  protected add(): number {
    const it = this.item();
    if (it === undefined) return this.noName();
    const a = Ch.newAttr(
      it,
      this.level(),
      inputText(this.text),
      inputText(this.details),
    );
    this.takeOptions(a);
    Ch.insertAttr(this.e, a);
    this.host.compute();
    return lineOf(this.e.attrs, a as C.Attr);
  }

  /** A name the rules don't have stays, if none is chosen. */
  protected change(i: number): number {
    const a = this.shown[i]!;
    const b = Ch.changeAttr(
      this.e,
      a,
      this.item() ?? a.item,
      this.level(),
      inputText(this.text),
      inputText(this.details),
    );
    this.takeOptions(b);
    this.host.compute();
    return lineOf(this.e.attrs, b as C.Attr);
  }

  protected remove(i: number): boolean {
    Ch.removeAttr(this.e, this.shown[i]!);
    this.host.compute();
    this.blank();
    return true;
  }

  /** Shows e's Attributes, nothing selected; a mecha is offered the
   *  Mecha Attributes first (Show). */
  show(e: Ch.Entity): void {
    if (e.isMecha) this.offer(R.MechaAttribute, R.Attribute);
    else this.offer(R.Attribute, R.MechaAttribute);
    this.entity = e;
    this.refresh(-1);
    this.blank();
  }
}

// ---- Defects ----

export class DefectPanel extends ItemPanel {
  private shown: Ch.Defect[] = [];
  readonly details: HTMLInputElement;

  constructor(doc: Document, host: Host, height: number) {
    super(
      doc,
      host,
      R.Defect,
      R.MechaDefect,
      "Defects",
      "rank",
      "subject",
      height,
    );
    this.details = el(doc, "input", "panel-text");
    this.details.type = "text";
    const row = el(doc, "div", "panel-row");
    row.append(labelled(doc, "details", this.details));
    this.extra.append(row);
  }

  defectAt(i: number): Ch.Defect | undefined {
    return this.shown[i];
  }

  protected fill(): string[][] {
    this.shown = [];
    const rows: string[][] = [];
    if (this.entity === undefined) return rows;
    for (let d = this.entity.defects; d !== undefined; d = d.next) {
      const x = d as Ch.Defect;
      this.shown.push(x);
      rows.push([
        String(x.rank) + nameText(x.name, x.subject, x.details),
        ...columns(-C.value(x.points), "BP", x.item),
      ]);
    }
    return rows;
  }

  protected load(i: number): void {
    const d = this.shown[i]!;
    this.choose(d.item);
    this.spinner.setValue(d.rank);
    this.text.value = d.subject ?? "";
    this.details.value = d.details ?? "";
  }

  override blank(): void {
    super.blank();
    this.details.value = "";
  }

  protected add(): number {
    const it = this.item();
    if (it === undefined) return this.noName();
    const d = Ch.newDefect(
      it,
      this.level(),
      inputText(this.text),
      inputText(this.details),
    );
    Ch.insertDefect(this.e, d);
    this.host.compute();
    return lineOf(this.e.defects, d as C.Defect);
  }

  protected change(i: number): number {
    const d = this.shown[i]!;
    const b = Ch.changeDefect(
      this.e,
      d,
      this.item() ?? d.item,
      this.level(),
      inputText(this.text),
      inputText(this.details),
    );
    this.host.compute();
    return lineOf(this.e.defects, b as C.Defect);
  }

  protected remove(i: number): boolean {
    Ch.removeDefect(this.e, this.shown[i]!);
    this.host.compute();
    this.blank();
    return true;
  }

  /** Shows e's Defects; a mecha is offered the Mecha Defects first. */
  show(e: Ch.Entity): void {
    if (e.isMecha) this.offer(R.MechaDefect, R.Defect);
    else this.offer(R.Defect, R.MechaDefect);
    this.entity = e;
    this.refresh(-1);
    this.blank();
  }
}

// ---- Skills ----

export class SkillPanel extends ItemPanel {
  private shown: Ch.Skill[] = [];
  /** Option 0 is none, then rules' genres. */
  readonly genre: HTMLSelectElement;
  readonly genreHelp: HelpButton;

  constructor(doc: Document, host: Host, height: number) {
    super(doc, host, R.Skill, -1, "Skills", "Level", "specialisations", height);
    this.genre = el(doc, "select", "genre");
    const names = ["(none)"];
    for (let g = 0; g < R.NGenres; g++) names.push(R.genreName(g));
    this.genre.replaceChildren(
      ...names.map((n) => el(doc, "option", undefined, n)),
    );
    this.genre.selectedIndex = 0;
    this.genre.addEventListener("change", () => this.genreChosen());
    this.genreHelp = new HelpButton(doc, R.SkillCostsPage, () =>
      host.openPage(),
    );
    this.genreHelp.button.title =
      R.pageLabel("Table 2-4", R.SkillCostsPage) +
      ": the Skills' costs by genre";
    const row = el(doc, "div", "panel-row");
    row.append(labelled(doc, "genre", this.genre), this.genreHelp.button);
    this.extra.append(row);
  }

  skillAt(i: number): Ch.Skill | undefined {
    return this.shown[i];
  }

  /** The entity's house Skills, in order (More). */
  override more(): number {
    let n = 0;
    // The Panel's constructor asks before entity is set.
    if (this.entity === undefined) return n;
    for (
      let h = this.entity.creation.houseSkills;
      h !== undefined;
      h = h.next
    ) {
      n++;
    }
    return n;
  }

  protected override moreLabels(): string[] {
    const l: string[] = [];
    if (this.entity === undefined) return l;
    for (
      let h = this.entity.creation.houseSkills;
      h !== undefined;
      h = h.next
    ) {
      l.push(trim((h as Ch.HouseSkill).name) + HouseLabel);
    }
    return l;
  }

  /** The house Skill chosen; undefined for none, or a rulebook Skill
   *  (House). */
  house(): C.HouseSkill | undefined {
    let i = this.choiceIndex() - this.offered();
    if (i < 0 || this.entity === undefined) return undefined;
    let h = this.entity.creation.houseSkills;
    while (h !== undefined && i > 0) {
      h = h.next;
      i--;
    }
    return h;
  }

  private chooseHouse(h: C.HouseSkill): void {
    let i = 0;
    let l = this.e.creation.houseSkills;
    while (l !== undefined && l !== h) {
      i++;
      l = l.next;
    }
    this.chooseIndex(l !== undefined ? this.offered() + i : -1);
  }

  protected fill(): string[][] {
    this.shown = [];
    const rows: string[][] = [];
    if (this.entity === undefined) return rows;
    for (let s = this.entity.skills; s !== undefined; s = s.next) {
      const x = s as Ch.Skill;
      this.shown.push(x);
      const cols = columns(
        C.value(x.points),
        "SP",
        x.house !== undefined ? undefined : x.item,
      );
      if (x.house !== undefined) cols[1] = "house rule";
      rows.push([
        levelText(x) +
          nameText(x.name, undefined, join(x.specialisations ?? [], ", ")),
        ...cols,
      ]);
    }
    return rows;
  }

  protected load(i: number): void {
    const s = this.shown[i]!;
    if (s.house !== undefined) this.chooseHouse(s.house);
    else this.choose(s.item);
    this.spinner.setValue(s.level);
    this.text.value = join(s.specialisations ?? [], ", ");
  }

  /** The specialisations typed, separated by commas (Specs). */
  private specs(): string[] {
    const r = inputText(this.text);
    return r === undefined ? [] : r.split(",");
  }

  protected add(): number {
    const it = this.item();
    const h = this.house();
    if (it === undefined && h === undefined) return this.noName();
    const s = Ch.newSkill(it, h, this.level(), this.specs());
    Ch.insertSkill(this.e, s);
    this.host.compute();
    return lineOf(this.e.skills, s as C.Skill);
  }

  protected change(i: number): number {
    const s = this.shown[i]!;
    let it = this.item();
    let h = this.house();
    if (it === undefined && h === undefined) {
      it = s.item;
      h = s.house;
    }
    const b = Ch.changeSkill(this.e, s, it, h, this.level(), this.specs());
    this.host.compute();
    return lineOf(this.e.skills, b as C.Skill);
  }

  protected remove(i: number): boolean {
    Ch.removeSkill(this.e, this.shown[i]!);
    this.host.compute();
    this.blank();
    return true;
  }

  /** The genre shown: option 0 is none (ShowGenre). */
  private showGenre(): void {
    this.genre.selectedIndex = this.e.creation.genre + 1;
  }

  /** Another genre chosen: every Skill priced again (GenreChoice's
   *  Callback; Table 2-4, p. 119, PDF 121). */
  private genreChosen(): void {
    if (this.entity === undefined) return;
    Ch.setGenre(this.entity, this.genre.selectedIndex - 1);
    this.host.compute();
    this.refresh(this.lines.selected());
    this.changed?.();
  }

  /** Lists e's Skills, offering its house Skills; nothing selected
   *  (Show). */
  show(e: Ch.Entity): void {
    this.entity = e;
    this.refill();
    this.showGenre();
    this.refresh(-1);
    this.blank();
  }
}
