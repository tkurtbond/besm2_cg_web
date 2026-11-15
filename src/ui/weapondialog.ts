// The Weapon Attack dialog: its Level, Abilities, Disabilities, primary,
// damage and points, the port of besm2_cg_po's Besm2WeaponDialog (its
// PLAN.md, Part B, step 8), laid out as ova_cg_web's attack dialog
// (src/ui/attack.ts), whose opening and closing it copies.
//
// A Weapon Attack (p. 81, PDF 83) of the entity shown: its subject and
// details, its Level, whether it is the primary attack and has a
// different gunner (p. 82, PDF 84), and its Weapon Abilities (p. 83, PDF
// 85) and Disabilities (p. 89, PDF 91), each a Panel: a line its name
// ("Melee x2 (sword)"), its slots, and both its pages; the <select> of
// names, the spinner for the slots it counts as in all (`counts-as`; it
// starts at the name's slots taken once, and is saved only when it
// differs), and the text field for its detail. Under them its damage and
// points, each with its override box, and its warnings.
//
// The dialog changes the model as the user works, and changed, the
// Window's, computes every entity again and shows them, so the numbers
// it shows are calc's; Cancel puts back what was there when it opened.
// The subject and details are taken on OK. It doesn't wait: edit shows
// it, and OK or Cancel calls done. Personal Gear (p. 83, PDF 85) isn't
// offered: the YAML has no key for it.

import * as C from "../core/calc.ts";
import * as Ch from "../core/character.ts";
import * as R from "../core/rules.ts";
import * as Warnings from "../core/warnings.ts";
import { trim } from "../core/text.ts";
import type { Dialogs } from "./dialogs.ts";
import {
  bold,
  el,
  HelpButton,
  inputText,
  labelled,
  Lines,
  NumberBox,
  Panel,
  Spinner,
} from "./widgets.ts";

/** The dialog's lists' height, in px (PanelH). */
const PanelH = 200;
const MaxSlots = 99;
/** The slots' and pages' columns, in px (SlotsW, PageW). */
const SlotsW = 70;
const PageW = 125;
const MaxLevel = 99;

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
}

/** A copy of n. */
function copyNum(n: C.Num): C.Num {
  return Object.assign(new C.Num(), n);
}

/** A copy of a's own fields, its numbers and options its own, for
 *  putting back (saved := a^). */
function saveAttr(a: Ch.Attr): Ch.Attr {
  const s = Object.assign(new Ch.Attr(), a);
  s.points = copyNum(a.points);
  s.damage = copyNum(a.damage);
  s.times = [...a.times];
  return s;
}

/** a made as saved was, but for its place in the list (attr^ := saved). */
function restoreAttr(a: Ch.Attr, saved: Ch.Attr): void {
  const next = a.next;
  const rec = a as unknown as Record<string, unknown>;
  for (const k of Object.keys(rec)) if (!(k in saved)) delete rec[k];
  Object.assign(a, saved);
  a.next = next;
}

/** The Abilities' or the Disabilities' list and editor (ModPanel). */
export class ModPanel extends Panel {
  private readonly d: WeaponDialog;
  readonly ability: boolean;
  /** shown[i]: line i's */
  private shown: Ch.Mod[] = [];

  constructor(doc: Document, d: WeaponDialog, ability: boolean) {
    super(
      doc,
      ability ? R.Ability : R.Disability,
      -1,
      ability ? "Abilities" : "Disabilities",
      "slots",
      "detail",
      PanelH,
      () => d.host.openPage(),
      SlotsW,
      PageW,
    );
    this.d = d;
    this.ability = ability;
    this.spinner.setBounds(1, MaxSlots);
    this.spinner.setValue(1);
    this.chooseIndex(-1);
  }

  /** The list edited: the attack's Abilities or Disabilities. */
  private list(): C.Mod | undefined {
    const a = this.d.attr;
    return this.ability ? a.abilities : a.disabilities;
  }

  protected fill(): string[][] {
    this.shown = [];
    const rows: string[][] = [];
    for (let m = this.list(); m !== undefined; m = m.next) {
      const x = m as Ch.Mod;
      this.shown.push(x);
      const name = trim(x.name);
      let line = name === "" ? '""' : name;
      if (C.times(x) > 1) line += " x" + String(C.times(x));
      if (x.detail !== undefined) line += " (" + x.detail + ")";
      rows.push([
        line,
        String(x.slots) + (x.slots === 1 ? " slot" : " slots"),
        x.item !== undefined ? R.pageText(x.item) : "",
      ]);
    }
    return rows;
  }

  private lineOf(m: C.Mod): number {
    let i = 0;
    for (let l = this.list(); l !== undefined && l !== m; l = l.next) i++;
    return i;
  }

  /** The ? button turns to the name's page, or its kind's for none; the
   *  slots start at the name's, taken once (Chosen). */
  protected override chosen(): void {
    super.chosen();
    const it = this.item();
    if (it === undefined) {
      this.help.page = this.ability
        ? R.WeaponAbilitiesPage
        : R.WeaponDisabilitiesPage;
    } else if (this.d !== undefined) {
      this.spinner.setValue(C.onceSlots(this.d.entity, it));
    }
  }

  protected load(i: number): void {
    const m = this.shown[i]!;
    this.choose(m.item);
    this.spinner.setValue(m.slots);
    this.text.value = m.detail ?? "";
  }

  protected add(): number {
    const it = this.item();
    if (it === undefined) {
      this.d.host.tell("Choose a name first.");
      return -1;
    }
    const m = Ch.newMod(
      this.d.entity,
      it,
      this.spinner.value,
      inputText(this.text),
    );
    Ch.insertMod(this.d.attr, this.ability, m);
    this.d.recompute();
    return this.lineOf(m);
  }

  /** A name the rules don't have stays, if none is chosen. */
  protected change(i: number): number {
    const m = this.shown[i]!;
    Ch.changeMod(
      this.d.entity,
      m,
      this.item(),
      this.spinner.value,
      inputText(this.text),
    );
    this.d.recompute();
    return this.lineOf(m);
  }

  protected remove(i: number): boolean {
    Ch.removeMod(this.d.attr, this.ability, this.shown[i]!);
    this.d.recompute();
    this.chooseIndex(-1);
    this.text.value = "";
    return true;
  }
}

export class WeaponDialog {
  readonly host: Host;
  readonly entity: Ch.Entity;
  /** What is edited */
  readonly attr: Ch.Attr;
  readonly title: HTMLElement;
  readonly help: HelpButton;
  readonly level: Spinner;
  readonly subjectIn: HTMLInputElement;
  readonly detailsIn: HTMLInputElement;
  readonly primary: HTMLInputElement;
  readonly gunner: HTMLInputElement;
  readonly abilities: ModPanel;
  readonly disabilities: ModPanel;
  readonly damage: NumberBox;
  readonly points: NumberBox;
  readonly warnings: Lines;
  readonly ok: HTMLButtonElement;
  readonly cancel: HTMLButtonElement;

  private readonly saved: Ch.Attr;
  private readonly savedAbilities: C.Mod | undefined;
  private readonly savedDisabilities: C.Mod | undefined;
  /** Each of the entity's Attributes' primary, in order */
  private readonly savedPrimary: boolean[] = [];
  private readonly done: (ok: boolean) => void;
  private close: () => void = () => {};
  /** Whether it is open: false once OK or Cancel has closed it */
  open = true;

  /** Edits a, a Weapon Attack of e; done is called after OK or Cancel,
   *  ok true for OK (Edit). */
  constructor(
    host: Host,
    e: Ch.Entity,
    a: Ch.Attr,
    done: (ok: boolean) => void,
  ) {
    if (!a.weapon) throw new Error("not a Weapon Attack");
    this.host = host;
    this.entity = e;
    this.attr = a;
    this.done = done;
    this.saved = saveAttr(a);
    this.savedAbilities = Ch.copyMods(a.abilities);
    this.savedDisabilities = Ch.copyMods(a.disabilities);
    for (let p = e.attrs; p !== undefined; p = p.next) {
      this.savedPrimary.push(p.primary);
    }
    const doc = host.doc;

    this.title = bold(doc, R.label(a.item!));
    this.help = new HelpButton(doc, a.item!.page, () => host.openPage());
    this.level = new Spinner(doc, 1, MaxLevel, a.level);
    this.level.onChanged = () => this.levelAction();
    this.subjectIn = el(doc, "input", "panel-text");
    this.subjectIn.type = "text";
    this.subjectIn.value = a.subject ?? "";
    this.detailsIn = el(doc, "input", "panel-text");
    this.detailsIn.type = "text";
    this.detailsIn.value = a.details ?? "";
    const check = (label: string, act: () => void) => {
      const b = el(doc, "input");
      b.type = "checkbox";
      b.addEventListener("change", act);
      const l = el(doc, "label", "check");
      l.append(b, label);
      return { b, l };
    };
    const primary = check("the primary attack", () => this.primaryAction());
    const gunner = check("a different gunner (a mecha's)", () =>
      this.gunnerAction(),
    );
    this.primary = primary.b;
    this.gunner = gunner.b;
    this.abilities = new ModPanel(doc, this, true);
    this.disabilities = new ModPanel(doc, this, false);
    this.damage = this.numberBox(
      "damage",
      () => this.attr.damage,
      (n) => {
        this.attr.damage = n;
      },
    );
    this.points = this.numberBox(
      "points",
      () => this.attr.points,
      (n) => {
        this.attr.points = n;
      },
    );
    this.warnings = new Lines(doc, "Warnings", 0);
    this.ok = host.dialogs.button("OK", () => this.okAction(), true);
    this.cancel = host.dialogs.button("Cancel", () => this.cancelAction());

    const top = el(doc, "div", "panel-row");
    top.append(
      this.title,
      this.help.button,
      labelled(doc, "Level", this.level.input),
    );
    const texts = el(doc, "div", "panel-row");
    texts.append(
      labelled(doc, "subject", this.subjectIn),
      labelled(doc, "details", this.detailsIn),
    );
    const checks = el(doc, "div", "panel-row");
    checks.append(primary.l, gunner.l);
    const mods = el(doc, "div", "columns");
    mods.append(this.abilities.element, this.disabilities.element);
    const numbers = el(doc, "div", "panel-row numbers");
    numbers.append(this.damage.element, this.points.element);
    const warnings = el(doc, "div", "warnings");
    warnings.append(bold(doc, "Warnings"), this.warnings.element);

    this.abilities.refresh(-1);
    this.disabilities.refresh(-1);
    this.showNumbers();
    this.close = host.dialogs.modal(
      [top, texts, checks, mods, numbers, warnings],
      [this.ok, this.cancel],
      this.level.input,
      () => this.cancelAction(),
      "Weapon Attack",
      "weapon-dialog",
    );
  }

  /** How many of the entity's Attributes are Weapon Attacks. */
  private weapons(): number {
    let n = 0;
    for (let a = this.entity.attrs; a !== undefined; a = a.next) {
      if (a.weapon) n++;
    }
    return n;
  }

  /** The attack's numbers, flags and warnings, as computed (ShowNumbers). */
  private showNumbers(): void {
    this.damage.display();
    this.points.display();
    this.primary.checked = this.attr.isPrimary;
    this.primary.disabled = this.weapons() <= 1;
    this.gunner.checked = this.attr.differentGunner;
    const rows: string[][] = [];
    for (let w = this.entity.warnings; w !== undefined; w = w.next) {
      if (w.attr === this.attr) rows.push([Warnings.text(this.entity, w)]);
    }
    this.warnings.set(rows, -1);
  }

  /** The Window's changed, then the numbers shown (Recompute). */
  recompute(): void {
    this.host.changed();
    this.showNumbers();
  }

  // ---- Numbers ----

  private numberBox(
    label: string,
    get: () => C.Num,
    put: (n: C.Num) => void,
  ): NumberBox {
    const b = new NumberBox(this.host.doc, label);
    b.target = { get, put };
    b.changed = (b, ok) => {
      if (!ok) {
        this.host.tell(
          "Not a number for the " +
            b.label +
            ": a whole number. The computed number is used.",
        );
      }
      this.recompute();
    };
    return b;
  }

  // ---- The attack's own controls ----

  private levelAction(): void {
    const a = this.attr;
    Ch.changeAttr(
      this.entity,
      a,
      a.item,
      this.level.value,
      a.subject,
      a.details,
    );
    this.recompute();
  }

  /** Marking it primary unmarks the others; unmarking it leaves the
   *  first of the highest Level the primary (p. 82, PDF 84), which may
   *  be it. */
  private primaryAction(): void {
    Ch.setPrimary(this.entity, this.attr, this.primary.checked);
    this.recompute();
    if (this.attr.isPrimary && !this.attr.primary) {
      this.host.tell(
        "It is still the primary: unless another is marked, the first Weapon Attack of the highest Level is.",
      );
    }
  }

  private gunnerAction(): void {
    this.attr.differentGunner = this.gunner.checked;
    this.recompute();
  }

  // ---- Closing ----

  private finish(ok: boolean): void {
    this.open = false;
    this.close();
    this.done(ok);
  }

  /** OK: the subject and details taken; a level written as text stays
   *  so if the Level wasn't changed (OkAction). */
  okAction(): void {
    if (!this.open) return;
    const a = this.attr;
    const s = this.saved;
    Ch.changeAttr(
      this.entity,
      a,
      a.item,
      a.level,
      inputText(this.subjectIn),
      inputText(this.detailsIn),
    );
    a.levelIsText = s.levelIsText && a.level === s.level;
    if (a.levelIsText) a.levelText = s.levelText;
    this.host.changed();
    this.finish(true);
  }

  /** Cancel: everything put back as it was (CancelAction). */
  cancelAction(): void {
    if (!this.open) return;
    const a = this.attr;
    restoreAttr(a, this.saved);
    a.abilities = this.savedAbilities;
    a.disabilities = this.savedDisabilities;
    let i = 0;
    for (
      let p = this.entity.attrs;
      p !== undefined && i < this.savedPrimary.length;
      p = p.next
    ) {
      p.primary = this.savedPrimary[i++]!;
    }
    this.host.changed();
    this.finish(false);
  }

  // For tests: the Level, primary and different gunner as if set.

  setLevel(n: number): void {
    this.level.spin(n);
  }

  setPrimary(on: boolean): void {
    this.primary.checked = on;
    this.primaryAction();
  }

  setGunner(on: boolean): void {
    this.gunner.checked = on;
    this.gunnerAction();
  }
}
