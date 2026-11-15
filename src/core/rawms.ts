// Raw groff tbl tables (-m/--raw-ms-tables): the port of besm2_cg_po's
// Besm2RawMs (pobesm2_fmt2's; the Ada BESM2_Fmt.Format_Raw_Ms, after
// besm2-rst.scm's process-entity-raw-ms). The name, tagline,
// description and size are plain reST, as in the grid format; the
// sections are then one tbl table in a ".. raw:: ms" block, with tbl's
// own markup ("\fB" bold, "T{"/"T}" text blocks). tbl wraps the columns
// itself, so none of layout's column layout is used here.

import { config } from "./config.ts";
import type * as E from "./entities.ts";
import { expandDerivedName, withList } from "./grid.ts";
import * as L from "./layout.ts";
import * as Out from "./out.ts";
import { int, utf8 } from "./text.ts";

/** Indents the groff lines into the ".. raw:: ms" block. */
const RawPrefix = "   ";

// ---- Output ----

/** RawPrefix, then s, then a newline. */
function line(s: string): void {
  Out.string(RawPrefix);
  Out.string(s);
  Out.ln();
}

/** troff bold, for the table: besm2-rst.scm's tbold, which leaves an
 *  empty string empty. Not layout's bold, which is reST's "**". */
function tbold(r: string): string {
  return r === "" ? "" : "\\fB" + r + "\\fP";
}

/** The cells of a row, joined with tbl's "#" separator; undefined is
 *  an empty cell. */
function row2(a: string | undefined, b: string): void {
  line((a ?? "") + "#" + b);
}

function row3(a: string | undefined, b: string, c: string): void {
  line((a ?? "") + "#" + b + "#" + c);
}

/** A total row: blank first column, then bold points and bold label. */
function totalRow(points: string, label: string): void {
  row3(undefined, tbold(points), tbold(label));
}

/** A row whose last cell is a "T{ ... T}" text block, so tbl can wrap
 *  it, after one other column or two. */
function textRow2(a: string, text: string): void {
  line(a + "#T{");
  line(text);
  line("T}");
}

function textRow3(a: string | undefined, b: string, text: string): void {
  line((a ?? "") + "#" + b + "#T{");
  line(text);
  line("T}");
}

/** The start of a section: ".T&" before every section but the first,
 *  which gets the "=" rule above the table instead, then the column
 *  format. */
function startSection(format: string, seen: { first: boolean }): void {
  if (seen.first) line(".T&");
  line(format);
  if (!seen.first) {
    seen.first = true;
    line("=");
  }
}

// ---- Numbers ----

const points = int;

/** A defect's points, always negative, with minusGlyph for the sign.
 *  reST never sees it inside a tbl text block, so unlike the grid
 *  format there is no backslash. */
function defectPoints(n: number): string {
  return L.minusGlyph() + points(Math.abs(n));
}

/** A total that may be negative, with minusGlyph for the sign. */
function signedPoints(n: number): string {
  return n < 0 ? defectPoints(n) : points(n);
}

// ---- Cell text: besm2-rst.scm's process-derived-raw-ms and friends ----

/** r with every line feed made a blank: besm2-rst.scm's
 *  space-to-newline, misleadingly named. A block scalar's newline
 *  can't be left inside a tbl text block. */
function spaceToNewline(r: string | undefined): string | undefined {
  return r?.replaceAll("\n", " ");
}

/** "NAME (DETAILS)", or just NAME if there are no details. */
function withDetails(name: string, details: string | undefined): string {
  return details === undefined ? name : name + " (" + details + ")";
}

// ---- processEntity ----

/** Writes e. entityNo is 1 for the first entity of a file, 2 for the
 *  second, and so on: entities after the first are underlined with
 *  -U/--subunderliner's character, if given. */
export function processEntity(e: E.Entity, entityNo: number): void {
  let paragraphSeen = false;
  const seen = { first: false };

  if (e.name !== undefined) {
    const underline =
      entityNo > 1 && config.subunderliner !== undefined
        ? config.subunderliner
        : config.underliner;
    Out.string(e.name);
    Out.ln();
    // As long as the name in bytes, as in the Ada version.
    Out.repeat(underline, utf8(e.name).length);
    Out.ln();
    Out.ln();
  }

  if (e.tagline !== undefined) {
    paragraphSeen = true;
    Out.string(L.italics(e.tagline));
    Out.ln();
    Out.ln();
  }

  if (!config.omitEntityDescription && e.description !== undefined) {
    paragraphSeen = true;
    Out.string(e.description);
    Out.ln();
    Out.ln();
    if (config.pageAfterDescription) {
      Out.string(".. raw:: ms");
      Out.ln();
      Out.ln();
      Out.string("   .bp");
      Out.ln();
      Out.ln();
    }
  }

  if (e.size !== undefined) {
    paragraphSeen = true;
    Out.string(L.bold("Size:"));
    Out.char(" ");
    Out.string(e.size);
    Out.ln();
    Out.ln();
  }

  Out.string(".. raw:: ms");
  Out.ln();
  Out.ln();

  // groff from here on. With no paragraph before it, the table gets an
  // ".LP" of its own.
  if (!paragraphSeen) line(".LP");
  line(".TS");
  line("tab(#) ;");

  if (e.stats.length > 0) {
    startSection("c c lx .", seen);
    row3(tbold("VALUE"), tbold("POINTS"), tbold("STAT"));
    for (const s of e.stats) row3(s.value, points(s.points), s.name);
    if (config.showSubtotals) totalRow(points(e.statsTotal), "STATS TOTAL");
    Out.ln();
  }

  if (e.derived.length > 0) {
    startSection("c l sx .", seen);
    row2(tbold("VALUE"), tbold("DERIVED VALUE"));
    for (const d of e.derived)
      textRow2(d.value, withList(expandDerivedName(d.name), d.alternatives));
    Out.ln();
  }

  if (e.attributes.length > 0) {
    startSection("c c lx .", seen);
    row3(tbold("LEVEL"), tbold("POINTS"), tbold("ATTRIBUTE"));
    for (const a of e.attributes)
      textRow3(
        a.level,
        points(a.points),
        withDetails(a.name, spaceToNewline(a.details)),
      );
    if (config.showSubtotals)
      totalRow(points(e.attributesTotal), "ATTRIBUTES TOTAL");
    Out.ln();
  }

  if (e.defects.length > 0) {
    startSection("c c lx .", seen);
    row3(undefined, tbold("POINTS"), tbold("DEFECT"));
    for (const df of e.defects)
      textRow3(
        undefined,
        defectPoints(df.points),
        withDetails(df.name, spaceToNewline(df.details)),
      );
    if (config.showSubtotals)
      totalRow(signedPoints(e.defectsTotal), "DEFECTS TOTAL");
    Out.ln();
  }

  if (e.skills.length > 0) {
    startSection("c c lx .", seen);
    row3(tbold("LEVEL"), tbold("POINTS"), tbold("SKILL"));
    for (const sk of e.skills)
      textRow3(
        sk.level,
        points(sk.points),
        withList(sk.name, sk.specialisations),
      );
    if (config.showSubtotals)
      totalRow(points(e.skillsTotal), "SKILL POINTS TOTAL");
    Out.ln();
  }

  // The total row has three columns, so it needs a format of its own
  // when there was no section, or the last was the derived values' two.
  if (
    !seen.first ||
    (e.derived.length > 0 &&
      e.attributes.length === 0 &&
      e.defects.length === 0 &&
      e.skills.length === 0)
  )
    startSection("c c lx .", seen);
  totalRow(signedPoints(e.entityTotal), "TOTAL");
  line("=");
  line(".TE");
  // The blank line ends the raw block before the next entity's name.
  Out.ln();

  L.notes(e.notes);
}
