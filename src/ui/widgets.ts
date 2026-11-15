// What the page shares with its dialogs: the number boxes, the ? buttons,
// a spinner and the lists, the port of besm2_cg_po's Besm2Widgets,
// copied from ova_cg_web's src/ui/widgets.ts where it fits. The Panel
// (a list and its editor) comes with the list tabs, Phase 8.
//
// besm2_cg_po's PLAN.md, A3 `overrides`: beside every number the
// program computes is an empty entry box. A NumberBox is both: the
// computed number, shown read-only, and the box, whose text is the
// override in effect ("" for none). Where its number lives is its
// Target, which the Window gives for each kind of number (a Stat's
// points, the ACV, ...), so the box reads and sets the model, never a
// copy.
//
// A HelpButton, "?", opens the rulebook at a printed page, through
// openPage, which the Window gives (the PDF's page is the printed one
// + 2, rules.pdfIndex).

import * as C from "../core/calc.ts";

/** An element of doc, of class cls, holding text. Copied from ova_cg_web. */
export function el<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  cls?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const e = doc.createElement(tag);
  if (cls !== undefined) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** A heading's label, bold (Besm2Window's Label). Copied from ova_cg_web. */
export function bold(doc: Document, text: string): HTMLElement {
  return el(doc, "div", "heading", text);
}

/** A button labelled label doing act. Copied from ova_cg_web. */
export function button(
  doc: Document,
  label: string,
  act: () => void,
): HTMLButtonElement {
  const b = el(doc, "button", undefined, label);
  b.type = "button";
  b.addEventListener("click", act);
  return b;
}

// ---- Spinner ----

/**
 * Spinner is a bounded integer, FLTK's Spinner: an <input type=number>,
 * its value kept within min and max. Copied from ova_cg_web.
 */
export class Spinner {
  readonly input: HTMLInputElement;
  min: number;
  max: number;
  private v = 0;
  /** After the user changes it */
  onChanged: ((v: number) => void) | undefined = undefined;

  /** A spinner from min to max showing value. */
  constructor(doc: Document, min: number, max: number, value: number) {
    this.min = min;
    this.max = max;
    this.input = el(doc, "input", "spinner");
    this.input.type = "number";
    this.input.step = "1";
    this.input.addEventListener("change", () => this.typed());
    this.setBounds(min, max);
    this.setValue(value);
  }

  /** The user's text, or a step of its arrows, taken. */
  private typed(): void {
    const v = Number.parseInt(this.input.value, 10);
    if (Number.isNaN(v)) this.setValue(this.v);
    else this.spin(v);
  }

  /** spin sets the value, as the user does: for tests. */
  spin(v: number): void {
    const old = this.v;
    this.setValue(v);
    if (this.v !== old) this.onChanged?.(this.v);
  }

  /** The spinner's value. */
  get value(): number {
    return this.v;
  }

  /** setValue sets the value, kept within the bounds. */
  setValue(v: number): void {
    this.v = Math.max(this.min, Math.min(this.max, v));
    this.input.value = String(this.v);
  }

  /** setBounds sets the bounds, the value kept within them. */
  setBounds(min: number, max: number): void {
    this.min = min;
    this.max = max;
    this.input.min = String(min);
    this.input.max = String(max);
    this.setValue(this.v);
  }

  enable(): void {
    this.input.disabled = false;
  }

  disable(): void {
    this.input.disabled = true;
  }

  /** Whether the user can change it (FLTK's Active). */
  get active(): boolean {
    return !this.input.disabled;
  }
}

// ---- NumberBox ----

/**
 * Where a NumberBox's number lives (Besm2Widgets.Target): get is the
 * number, put sets it to n (the Window's own, as Ch.useStat).
 */
export interface Target {
  get(): C.Num;
  put(n: C.Num): void;
}

/** A NumberBox's tooltips (Besm2Widgets: the Output's, and Tooltip). */
export const ShownTooltip = "computed";
export const EntryTooltip = "empty: use the computed value";

/** A computed number and the box for its override. */
export class NumberBox {
  /** Its label, above it; "" for none */
  readonly label: string;
  readonly element: HTMLElement;
  /** The computed number */
  readonly shown: HTMLElement;
  /** The override: "" for none */
  readonly entry: HTMLInputElement;
  /** undefined: none */
  target: Target | undefined = undefined;
  /**
   * After the user leaves the box having changed it: the override set
   * from its text, or (ok false) the text refused, and the box emptied.
   */
  changed: ((b: NumberBox, ok: boolean) => void) | undefined = undefined;
  /** The box's text as display last set it */
  private taken = "";

  /**
   * A number box labelled label, above it (OpenNumberBox); no label
   * shown for "". name names it for a screen reader, label by default.
   */
  constructor(doc: Document, label: string, name = label) {
    this.label = label;
    this.element = el(doc, "span", "number-box above");
    this.shown = el(doc, "span", "number-shown");
    this.shown.title = ShownTooltip;
    this.entry = el(doc, "input", "number-override");
    this.entry.type = "text";
    this.entry.title = EntryTooltip;
    this.entry.setAttribute("aria-label", name + " override");
    // FLTK's WhenRelease + WhenEnterKey: the text is taken on leaving
    // the box changed, and on Enter. Enter's default is stopped: a
    // message opened by take moves the focus to its OK button, and the
    // same key press would then press it, closing the message unseen
    // (ova_cg_web, seen in Chromium and Firefox).
    this.entry.addEventListener("change", () => this.take());
    this.entry.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      this.take();
    });
    const pair = el(doc, "span", "number-pair");
    pair.append(this.shown, this.entry);
    if (label !== "") {
      this.element.append(el(doc, "span", "number-label", label));
    }
    this.element.append(pair);
  }

  /** display shows the target's number: computed, and its override (Display). */
  display(): void {
    this.taken = "";
    const t = this.target;
    if (t !== undefined) {
      const n = t.get();
      this.shown.textContent = C.computedText(n);
      if (n.overridden) this.taken = C.text(n);
    } else {
      this.shown.textContent = "";
    }
    this.entry.value = this.taken;
  }

  /**
   * take reads the box's text into its target's override (an empty box
   * clears it); text that isn't a number is refused, and the override
   * cleared (Take). Nothing if the text is as display left it, as
   * FLTK's WhenRelease without WhenNotChanged.
   */
  take(): void {
    const t = this.target;
    if (t === undefined || this.entry.value === this.taken) return;
    const n = t.get();
    const ok = C.parse(this.entry.value, n);
    if (!ok) C.clear(n);
    t.put(n);
    this.display();
    this.changed?.(this, ok);
  }

  /** type types text into the box and leaves it, as the user does: for tests. */
  type(text: string): void {
    this.entry.value = text;
    this.take();
  }

  /** activate and deactivate: whether the user can override it. */
  activate(): void {
    this.entry.disabled = false;
    this.element.classList.remove("inactive");
  }

  deactivate(): void {
    this.entry.disabled = true;
    this.element.classList.add("inactive");
  }

  get active(): boolean {
    return !this.entry.disabled;
  }

  show(): void {
    this.element.hidden = false;
  }

  hide(): void {
    this.element.hidden = true;
  }

  get visible(): boolean {
    return !this.element.hidden;
  }

  /**
   * shows says whether the box shows n: its computed number, and its
   * override or "" (TestWindow's Shows): for tests.
   */
  shows(n: C.Num): boolean {
    const want = n.overridden ? C.text(n) : "";
    return (
      this.shown.textContent === C.computedText(n) && this.entry.value === want
    );
  }
}

// ---- HelpButton ----

/** HelpButton is a "?" button that opens the rulebook at its page. */
export class HelpButton {
  readonly button: HTMLButtonElement;
  /** The printed page; 0: nothing to show */
  page: number;

  /**
   * A ? button showing page (0: none yet), through openPage, if it gives
   * one (Besm2Widgets.openPage may be NIL).
   */
  constructor(
    doc: Document,
    page: number,
    openPage: () => ((page: number) => void) | undefined,
  ) {
    this.page = page;
    this.button = button(doc, "?", () => {
      const open = openPage();
      if (this.page > 0 && open !== undefined) open(this.page);
    });
    this.button.className = "help";
    this.button.title = "open the rulebook at this page";
    this.button.setAttribute("aria-label", "The rulebook at this page");
  }
}

// ---- Lists ----

/**
 * Lines is a list of lines, each of columns: the first the name, the
 * others right of it, at widths; a column right of the name may be
 * hidden. A listbox: a click selects a line, and so do Up, Down, Home
 * and End once the list has the focus. Copied from ova_cg_web; FLTK's
 * Browser and HoldBrowser.
 */
export class Lines {
  readonly element: HTMLElement;
  private readonly doc: Document;
  private rows: string[][] = [];
  private readonly widths: number[];
  private readonly hidden: boolean[];
  private sel = -1;
  /** After the user selects line i */
  onSelect: ((i: number) => void) | undefined = undefined;

  /** A list of height px (0: as tall as its lines), its columns at widths. */
  constructor(
    doc: Document,
    label: string,
    height: number,
    ...widths: number[]
  ) {
    this.doc = doc;
    this.widths = widths;
    this.hidden = widths.map(() => false);
    this.element = el(doc, "div", "lines");
    this.element.setAttribute("role", "listbox");
    this.element.setAttribute("aria-label", label);
    this.element.tabIndex = 0;
    if (height > 0) this.element.style.height = height + "px";
    this.element.addEventListener("keydown", (e) => this.key(e));
  }

  private key(e: KeyboardEvent): void {
    const n = this.rows.length;
    if (n === 0) return;
    let i: number;
    switch (e.key) {
      case "ArrowDown":
        i = Math.min(n - 1, this.sel + 1);
        break;
      case "ArrowUp":
        i = this.sel < 0 ? 0 : Math.max(0, this.sel - 1);
        break;
      case "Home":
        i = 0;
        break;
      case "End":
        i = n - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    this.select(i);
  }

  /** set shows rows, line sel selected (-1: none), without calling onSelect. */
  set(rows: string[][], sel: number): void {
    const doc = this.doc;
    this.rows = rows;
    this.element.replaceChildren(
      ...rows.map((row, i) => {
        const line = el(doc, "div", "line");
        line.setAttribute("role", "option");
        line.append(el(doc, "span", "line-name", row[0]));
        this.widths.forEach((w, j) => {
          const c = el(doc, "span", "line-column", row[j + 1] ?? "");
          c.style.width = w + "px";
          c.hidden = this.hidden[j]!;
          line.append(c);
        });
        line.addEventListener("click", () => this.select(i));
        return line;
      }),
    );
    this.mark(sel >= 0 && sel < rows.length ? sel : -1);
  }

  /** mark shows line i selected (-1: none). */
  private mark(i: number): void {
    this.sel = i;
    [...this.element.children].forEach((line, j) => {
      line.setAttribute("aria-selected", String(i === j));
    });
    const line = this.element.children[i];
    if (line !== undefined && "scrollIntoView" in line) {
      line.scrollIntoView({ block: "nearest" });
    }
  }

  /** How many lines there are. */
  count(): number {
    return this.rows.length;
  }

  /** The line selected; -1 for none. */
  selected(): number {
    return this.sel;
  }

  /** showColumn shows or hides the column at widths[i], from the next set. */
  showColumn(i: number, on: boolean): void {
    this.hidden[i] = !on;
  }

  /** line is line i's columns shown joined by tabs; "" past the end: for tests. */
  line(i: number): string {
    const row = this.rows[i];
    if (row === undefined) return "";
    const cols = [row[0]!];
    row.slice(1).forEach((s, j) => {
      if (j >= this.hidden.length || !this.hidden[j]) cols.push(s);
    });
    return cols.join("\t");
  }

  /** The selected line's text; "" for none: for tests. */
  selectedLine(): string {
    return this.line(this.sel);
  }

  /**
   * select selects line i, as a click does; onSelect runs even if it
   * was selected already, as FLTK's callback did.
   */
  select(i: number): void {
    if (i < 0 || i >= this.rows.length) return;
    this.mark(i);
    this.onSelect?.(i);
  }

  /** find is the last line holding text; -1 if none: for tests. */
  find(text: string): number {
    for (let i = this.rows.length - 1; i >= 0; i--) {
      if (this.line(i).includes(text)) return i;
    }
    return -1;
  }
}
