// Padding, word wrapping, grid-table rows, emphasis: the port of
// besm2_cg_po's Besm2Layout (pobesm2_fmt2's, the Ada
// BESM2_Fmt.Text_Layout): fixed-width padding, greedy word wrap, and
// the bordered "|...|...|" rows of a reST grid table, which
// besm2-rst.scm builds from SRFI 166. Rows and separators are written
// to out; config supplies the table width and the flags the emphasis
// functions and minusGlyph follow. The Oberon's NIL rope, the empty
// one, is "" here (undefined is taken as "" where a caller may pass
// it).

import { config } from "./config.ts";
import * as Out from "./out.ts";
import { displayLength } from "./text.ts";

export const LeftAlign = 0;
export const RightAlign = 1;
export type Align = 0 | 1;

/** besm2-rst.scm's *num-width*: the widest of "LEVEL", "VALUE" and
 *  "POINTS" (6), plus the 4 its main always adds for the "**" around a
 *  bold header cell, even under -B/--no-bold-head. Ported as is. */
export const NumWidth = 10;

/** r padded with blanks to width characters (displayLength, not
 *  bytes), on the right for LeftAlign, on the left for RightAlign;
 *  unchanged if already that wide or wider: never truncated. */
export function pad(
  r: string | undefined,
  width: number,
  align: Align,
): string {
  const s = r ?? "";
  const n = width - displayLength(s);
  const fill = n > 0 ? " ".repeat(n) : "";
  return align === RightAlign ? fill + s : s + fill;
}

/** r wrapped greedily to width characters: words separated by runs of
 *  blank, tab, line feed or carriage return, joined by one blank. A
 *  word longer than width gets a line of its own and overruns. An
 *  empty r gives one empty line, since a table row needs a line. Line
 *  feeds from a "details: |" block scalar are breaks like any other,
 *  or they would break the row's borders. */
export function wordWrap(r: string | undefined, width: number): string[] {
  const lines: string[] = [];
  let cur: string | undefined;
  let curLen = 0;
  for (const word of (r ?? "").split(/[ \t\n\r]+/)) {
    if (word === "") continue;
    const wordLen = displayLength(word);
    if (cur === undefined) {
      cur = word;
      curLen = wordLen;
    } else if (curLen + 1 + wordLen <= width) {
      cur += " " + word;
      curLen += 1 + wordLen;
    } else {
      lines.push(cur);
      cur = word;
      curLen = wordLen;
    }
  }
  lines.push(cur ?? "");
  return lines;
}

/** The width of the last, wrapped, column of a row of numColumns
 *  columns, as besm2-rst.scm's separator-line computes it. */
function wrapWidth(numColumns: number): number {
  return config.tableWidth - 2 - (numColumns - 1) * (NumWidth + 1);
}

/** Writes one row of a grid table: one or more "|...|...|" lines. All
 *  columns but the last are NumWidth wide; the last is wrapped to the
 *  rest of the table width, and on its continuation lines the others
 *  are blank. besm2-rst.scm's row2 and row3. */
export function putRow(cols: readonly (string | undefined)[]): void {
  const wrap = wrapWidth(cols.length);
  const lines = wordWrap(cols[cols.length - 1], wrap);
  lines.forEach((line, l) => {
    Out.char("|");
    for (let c = 0; c < cols.length - 1; c++) {
      if (l === 0) Out.string(pad(cols[c], NumWidth, LeftAlign));
      else Out.repeat(" ", NumWidth);
      Out.char("|");
    }
    Out.string(pad(line, wrap, LeftAlign));
    Out.char("|");
    Out.ln();
  });
}

/** A row of two or three columns; undefined is an empty column. */
export function row2(a: string | undefined, b: string | undefined): void {
  putRow([a, b]);
}

export function row3(
  a: string | undefined,
  b: string | undefined,
  c: string | undefined,
): void {
  putRow([a, b, c]);
}

/** Writes one "+---+---+...+" line: numColumns - 1 segments of NumWidth
 *  fill characters, then one taking the rest of the table width. */
export function separatorLine(numColumns: number, fill: string): void {
  Out.char("+");
  for (let c = 1; c <= numColumns - 1; c++) {
    Out.repeat(fill, NumWidth);
    Out.char("+");
  }
  Out.repeat(fill, wrapWidth(numColumns));
  Out.char("+");
  Out.ln();
}

/** Writes one "| ... |" line spanning the table: besm2-rst.scm's
 *  empty, between sections under -1/--one. */
export function emptyRow(): void {
  Out.char("|");
  Out.repeat(" ", config.tableWidth - 2);
  Out.char("|");
  Out.ln();
}

// ---- Emphasis ----

/** Always "**...**": besm2-rst.scm's bold. "" gives "****". */
export function bold(r: string | undefined): string {
  return "**" + (r ?? "") + "**";
}

/** Always "*...*": besm2-rst.scm's italics. "" gives "**". */
export function italics(r: string | undefined): string {
  return "*" + (r ?? "") + "*";
}

/** Bold under -b/--bold: besm2-rst.scm's bolding. */
export function bolding(r: string | undefined): string {
  return config.bolding ? bold(r) : (r ?? "");
}

/** Italic under -i/--italics: besm2-rst.scm's italicizing. */
export function italicizing(r: string | undefined): string {
  return config.italicizing ? italics(r) : (r ?? "");
}

/** Bold under -b, else italic under -i: besm2-rst.scm's emphasizing,
 *  for the names of attributes, defects and skills. */
export function emphasizing(r: string | undefined): string {
  if (config.bolding) return bold(r);
  if (config.italicizing) return italics(r);
  return r ?? "";
}

/** Bold unless -B/--no-bold-head: besm2-rst.scm's hbolding, for grid
 *  table header cells. */
export function hbolding(r: string | undefined): string {
  return config.boldHead ? bold(r) : (r ?? "");
}

/** The sign for a negative number this program writes itself: U+2212
 *  MINUS SIGN, or "-" under -n/--no-unicode-minus. */
export function minusGlyph(): string {
  return config.unicodeMinus ? "−" : "-";
}

/** MULTIPLICATION SIGN (U+00D7), or "x" under -n/--no-unicode-minus:
 *  the "×2" of a Weapon Attack Ability or Disability taken twice
 *  (besm2_cg_po's PLAN.md, A4; p. 92, PDF 94). */
export function timesGlyph(): string {
  return config.unicodeMinus ? "×" : "x";
}

/** What follows an overridden number in the terse and grid formats: a
 *  backslash and "*", so that reST doesn't read the "*" as the start of
 *  emphasis. */
export function overrideMark(): string {
  return "\\*";
}

/** The entity's notes, if any, as a reST bullet list after a bold
 *  "Notes:" paragraph, one note per item, the lines after a note's
 *  first indented two blanks so it stays one item: the terse, grid and
 *  raw ms formats all end an entity with this. */
export function notes(l: readonly string[]): void {
  if (l.length === 0) return;
  Out.string(bold("Notes:"));
  Out.ln();
  Out.ln();
  for (const s of l) {
    Out.string("- ");
    Out.string(s.replaceAll("\n", "\n  "));
    Out.ln();
  }
  Out.ln();
}
