// The Preview tab: the file's entities as the formatters print them, to
// copy or save; the port of besm2_cg_po's Besm2Preview (its PLAN.md,
// Part B, step 11).
//
// The entities as they stand, all of the file's, in order, as the
// formatters would print the file the page saves, in the format chosen:
// reST grid tables, terse reST, groff tbl in a `.. raw:: ms` block, or
// an h-m-m outline, with pobesm2_fmt2's default options (PLAN.md, open
// question 3). The text is made as besm2_calc_po makes it: the entities
// saved in memory (save.saveAll), loaded by entities.load and printed by
// the formatters, so it is what besm2_calc_po, or pobesm2_fmt2, prints
// for the saved file. Copy puts all of it on the clipboard; Save...
// downloads it.
//
// The Window owns the entities: it shows them here (show) when the tab
// is shown and after each change while it is. Where the page differs
// from the Oberon: Save... asks for the name with the Window's askText
// and downloads, as Save As... does, so there is no file that can't be
// written; and Copy goes through the Window's copyText, which a test
// replaces, since the browser may refuse it (copyToClipboard, copied
// from ova_cg_web's markdowntab.ts).

import type * as Ch from "../core/character.ts";
import { resetConfig } from "../core/config.ts";
import * as Entities from "../core/entities.ts";
import { parseStream, stringName } from "../core/fyaml.ts";
import * as GridOut from "../core/grid.ts";
import * as HmmOut from "../core/hmm.ts";
import * as Out from "../core/out.ts";
import * as RawMsOut from "../core/rawms.ts";
import * as Save from "../core/save.ts";
import * as TerseOut from "../core/terse.ts";
import { trim } from "../core/text.ts";
import { button, el } from "./widgets.ts";

/** The formats, in the select's order. */
export const Grid = 0;
export const Terse = 1;
export const RawMs = 2;
export const Hmm = 3;

/** The formats' names, in the select's order (Build). */
export const formatNames = [
  "reST grid tables",
  "terse reST",
  "groff tbl in raw ms",
  "h-m-m outline",
] as const;

/** What Copy says when the browser won't copy. */
export const CantCopy =
  "The browser won't let the page copy: select the preview and copy it.";

/** What the tab needs of the Window. */
export interface Host {
  tell(text: string): void;
  /** Asks for a line of text (ok false: cancelled). */
  askText(
    prompt: string,
    text: string,
    then: (text: string, ok: boolean) => void,
  ): void;
  download(name: string, text: string): void;
  copyText(text: string): void;
}

function formatEntity(e: Entities.Entity, f: number, count: number): void {
  switch (f) {
    case Grid:
      return GridOut.processEntity(e, count);
    case Terse:
      return TerseOut.processEntity(e, count);
    case RawMs:
      return RawMsOut.processEntity(e, count);
    case Hmm:
      return HmmOut.processEntity(e, count);
  }
  throw new Error(`no format ${f}`);
}

export type Made = { ok: true; text: string } | { ok: false; msg: string };

/** es in format f, as besm2_calc_po formats a file of them, or why they
 *  couldn't be saved or loaded again (Text). */
export function text(es: readonly Ch.Entity[], f: number): Made {
  const saved = Save.saveAll(es);
  if (!saved.ok) return saved;
  // The page sets no option; a test of the formatters may have.
  resetConfig();
  const s = parseStream(saved.text, stringName);
  const d = s.docs[0];
  const yerr = s.err ?? d?.resolve();
  const root = d?.root();
  if (yerr !== undefined || root === undefined || !root.isSequence()) {
    // What save writes, entities reads: a programmer's error.
    throw new Error(
      "the entities as saved don't read: " + (yerr?.msg ?? "no sequence"),
    );
  }
  Out.toRope();
  let count = 0;
  for (const item of root.items) {
    const x = Entities.load(item);
    if (!x.ok) {
      Out.takeRope();
      let r = `entity ${count + 1} as saved doesn't load`;
      const msg = x.yerr !== undefined ? trim(x.yerr.msg) : x.msg;
      if (msg !== "") r += ": " + msg;
      return { ok: false, msg: r };
    }
    formatEntity(x.entity, f, ++count);
  }
  return { ok: true, text: Out.takeRope() ?? "" };
}

/** The extension of format f's files: .rst for the reST ones (raw ms is
 *  a reST directive), .hmm for the outline (Extension). */
export function extension(f: number): string {
  return f === Hmm ? ".hmm" : ".rst";
}

/**
 * previewName is the file name text gives for format f's text, as
 * fileName gives an entities file's: trimmed, without a directory (a "/"
 * or "\\" becomes "_"), ending in the format's extension unless it does
 * already; "" for no text.
 */
export function previewName(text: string, f: number): string {
  const t = text.trim().replace(/[/\\]/g, "_");
  if (t === "") return "";
  const ext = extension(f);
  return t.toLowerCase().endsWith(ext) ? t : t + ext;
}

export class Preview {
  readonly element: HTMLElement;
  /** The text shown; undefined until the tab is first shown, or when it
   *  couldn't be made. */
  text: string | undefined = undefined;
  readonly format: HTMLSelectElement;
  /** Selectable, monospaced. */
  readonly display: HTMLPreElement;
  readonly copy: HTMLButtonElement;
  readonly save: HTMLButtonElement;
  /** The entities shown. */
  private entities: readonly Ch.Entity[] | undefined = undefined;
  /** Save...'s suggestion, without its extension; undefined: none. */
  private base: string | undefined = undefined;
  private readonly host: Host;

  /** The tab's widgets (Build). */
  constructor(doc: Document, host: Host) {
    this.host = host;
    this.format = el(doc, "select", "preview-format");
    for (const n of formatNames) {
      const o = el(doc, "option");
      o.textContent = n;
      this.format.append(o);
    }
    this.format.selectedIndex = Grid;
    this.format.title =
      "how to print the file's characters and mecha, as the formatters do";
    this.format.addEventListener("change", () => this.formatAction());
    const label = el(doc, "label", "preview-label");
    label.append("Format:", this.format);
    this.copy = button(doc, "Copy", () => this.copyAction());
    this.copy.title = "put the whole text on the clipboard";
    this.save = button(doc, "Save...", () => this.saveAction());
    this.save.title = "download the text as a file";
    const row = el(doc, "div", "row");
    row.append(label, this.copy, this.save);
    this.display = el(doc, "pre", "preview-text");
    this.display.tabIndex = 0;
    this.display.setAttribute("aria-label", "Preview text");
    this.element = el(doc, "div", "preview-tab");
    this.element.append(row, this.display);
  }

  /** Shows es (b: the name to suggest to Save..., without its
   *  extension; undefined: none) in the format chosen (Show). */
  show(es: readonly Ch.Entity[], b: string | undefined): void {
    this.entities = es;
    this.base = b;
    const r = text(es, this.format.selectedIndex);
    this.text = r.ok ? r.text : undefined;
    this.display.textContent = r.ok ? r.text : `(no preview: ${r.msg})`;
  }

  /** Format: the entities shown again, the other way (FormatAction). */
  private formatAction(): void {
    if (this.entities !== undefined) this.show(this.entities, this.base);
  }

  /** Copy: the whole text on the clipboard (CopyAction). */
  copyAction(): void {
    if (this.text !== undefined) this.host.copyText(this.text);
  }

  /**
   * Save...: the text downloaded under the name the user gives, BASE.rst
   * or BASE.hmm suggested (SaveAction). Cancelled, nothing is saved and
   * nothing said.
   */
  saveAction(): void {
    const t = this.text;
    if (t === undefined) return;
    const f = this.format.selectedIndex;
    const suggested = this.base === undefined ? "" : previewName(this.base, f);
    this.host.askText("Save the preview as:", suggested, (typed, ok) => {
      if (!ok) return;
      const name = previewName(typed, f);
      if (name === "") {
        this.host.tell("The file needs a name.");
        return;
      }
      this.host.download(name, t);
    });
  }

  /** For tests: the format chosen, as if by the user (SetFormat). */
  setFormat(f: number): void {
    this.format.selectedIndex = f;
    this.formatAction();
  }
}

/**
 * copyToClipboard puts text on the clipboard, calling failed if the
 * browser won't. Copied from ova_cg_web's markdowntab.ts, where it was
 * seen to work: it tries navigator.clipboard.writeText, then, refused,
 * a hidden <textarea> holding text, focused and selected, and
 * document.execCommand("copy"). On file://, after a click, headless
 * Firefox 159 and Chromium 158's full build take writeText; Chromium
 * 158's headless shell refuses it, and the fallback works in all three
 * (ova_cg_web, under Playwright).
 */
export function copyToClipboard(
  doc: Document,
  text: string,
  failed: () => void,
): void {
  const clipboard = doc.defaultView?.navigator.clipboard;
  if (clipboard?.writeText === undefined) {
    if (!copyBySelection(doc, text)) failed();
    return;
  }
  clipboard.writeText(text).then(
    () => {},
    () => {
      if (!copyBySelection(doc, text)) failed();
    },
  );
}

/** copyToClipboard's fallback; it says whether it copied. */
function copyBySelection(doc: Document, text: string): boolean {
  const t = el(doc, "textarea", "copy-buffer");
  t.value = text;
  t.readOnly = true;
  const focused = doc.activeElement;
  doc.body.append(t);
  t.focus();
  t.select();
  let ok = false;
  try {
    ok = doc.execCommand("copy");
  } catch {
    ok = false;
  }
  t.remove();
  if (focused instanceof doc.defaultView!.HTMLElement) focused.focus();
  return ok;
}
