// reST grid tables, the default format: the port of besm2_cg_po's
// Besm2Grid (pobesm2_fmt2's; the Ada BESM2_Fmt.Format_Grid, after
// besm2-rst.scm's process-entity). Each section of an entity is a reST
// grid table laid out by layout. row2, row3, sep2 and so on are
// besm2-rst.scm's helpers of the same names.

import { config } from "./config.ts";
import type * as E from "./entities.ts";
import * as L from "./layout.ts";
import * as Out from "./out.ts";
import { int, utf8 } from "./text.ts";

// ---- besm2-rst.scm's row and separator helpers ----

// An undefined column is an empty cell.
const row2 = L.row2;
const row3 = L.row3;

function sep2(): void {
  L.separatorLine(2, "-");
}

function sep3(): void {
  L.separatorLine(3, "-");
}

function headsep2(): void {
  L.separatorLine(2, config.headSep);
}

function headsep3(): void {
  L.separatorLine(3, config.headSep);
}

/** After a section: a row of the one table under -1/--one, else a
 *  blank line between tables. */
function emptyOrBlankLine(): void {
  if (config.oneTable) L.emptyRow();
  else Out.ln();
}

/** hbolding, for header and total cells. */
const h = L.hbolding;

// ---- Numbers ----

const points = int;

/** r, with overrideMark after it if marked (an overridden number). */
function mark(r: string, marked: boolean): string {
  return marked ? r + L.overrideMark() : r;
}

/** A defect's points, always negative, with a backslash before the
 *  sign, since reST would otherwise take a leading "-" for a bullet;
 *  besm2-rst.scm adds it whatever the sign. The sign is minusGlyph. */
export function defectPoints(n: number): string {
  return "\\" + L.minusGlyph() + points(Math.abs(n));
}

/** A total that may be negative, with minusGlyph for the sign. */
export function signedPoints(n: number): string {
  return n < 0 ? L.minusGlyph() + points(Math.abs(n)) : points(n);
}

// ---- Cell text: besm2-rst.scm's process-derived and friends ----

const derivedNames: Record<string, string> = {
  ACV: "Attack Combat Value",
  DCV: "Defence Combat Value",
  DM: "Damage Multiplier",
  HP: "Health Points",
  EP: "Energy Points",
  SV: "Shock Value",
  AR: "Armour Rating",
};

/** besm2-rst.scm's derived-abbreviations. Only the grid and raw ms
 *  formats expand them; the terse output keeps "ACV" and so on. */
export function expandDerivedName(name: string): string {
  return Object.hasOwn(derivedNames, name) ? derivedNames[name]! : name;
}

/** "NAME (TEXT)". */
function parens(name: string, text: string): string {
  return name + " (" + text + ")";
}

/** "NAME (DETAILS)", or just NAME if there are no details. */
function withDetails(name: string, details: string | undefined): string {
  return details === undefined ? name : parens(name, details);
}

/** "NAME (A, B)", or just NAME if l has no items. The test is the
 *  number of items, as in besm2-rst.scm: a list of one empty string
 *  gives "NAME ()". */
export function withList(name: string, l: readonly string[]): string {
  return l.length === 0 ? name : parens(name, l.join(", "));
}

// ---- processEntity ----

/** Writes e. entityNo is 1 for the first entity of a file, 2 for the
 *  second, and so on: entities after the first are underlined with
 *  -U/--subunderliner's character, if given. */
export function processEntity(e: E.Entity, entityNo: number): void {
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
    Out.string(L.italics(e.tagline));
    Out.ln();
    Out.ln();
  }

  if (!config.omitEntityDescription && e.description !== undefined) {
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
    Out.string(L.bold("Size:"));
    Out.char(" ");
    Out.string(e.size);
    Out.ln();
    Out.ln();
  }

  if (e.stats.length > 0) {
    sep3();
    row3(h("VALUE"), h("POINTS"), h("STAT"));
    headsep3();
    for (const s of e.stats) {
      row3(s.value, mark(points(s.points), s.pointsMark), s.name);
      sep3();
    }
    if (config.showSubtotals) {
      row3(undefined, h(points(e.statsTotal)), h("STATS TOTAL"));
      sep3();
    }
    emptyOrBlankLine();
  }

  if (e.derived.length > 0) {
    sep2();
    row2(h("VALUE"), h("DERIVED VALUE"));
    headsep2();
    for (const d of e.derived) {
      row2(
        mark(d.value, d.valueMark),
        withList(expandDerivedName(d.name), d.alternatives),
      );
      sep2();
    }
    emptyOrBlankLine();
  }

  if (e.attributes.length > 0) {
    sep3();
    row3(h("LEVEL"), h("POINTS"), h("ATTRIBUTE"));
    headsep3();
    for (const a of e.attributes) {
      row3(
        a.level,
        mark(points(a.points), a.pointsMark),
        withDetails(a.name, a.markedDetails),
      );
      sep3();
    }
    if (config.showSubtotals) {
      row3(undefined, h(points(e.attributesTotal)), h("ATTRIBUTES TOTAL"));
      sep3();
    }
    emptyOrBlankLine();
  }

  if (e.defects.length > 0) {
    sep3();
    row3(undefined, h("POINTS"), h("DEFECT"));
    headsep3();
    for (const df of e.defects) {
      row3(
        undefined,
        mark(defectPoints(df.points), df.pointsMark),
        withDetails(df.name, df.details),
      );
      sep3();
    }
    if (config.showSubtotals) {
      row3(undefined, h(signedPoints(e.defectsTotal)), h("DEFECTS TOTAL"));
      sep3();
    }
    emptyOrBlankLine();
  }

  if (e.skills.length > 0) {
    sep3();
    row3(h("LEVEL"), h("POINTS"), h("SKILL"));
    headsep3();
    for (const sk of e.skills) {
      row3(
        sk.level,
        mark(points(sk.points), sk.pointsMark),
        withList(sk.name, sk.specialisations),
      );
      sep3();
    }
    if (config.showSubtotals) {
      row3(undefined, h(points(e.skillsTotal)), h("SKILL POINTS TOTAL"));
      sep3();
    }
    emptyOrBlankLine();
  }

  // The grand total: always shown, and followed by a plain blank line
  // even under -1/--one, as in besm2-rst.scm.
  sep3();
  row3(undefined, h(signedPoints(e.entityTotal)), h("TOTAL"));
  sep3();
  Out.ln();

  L.notes(e.notes);
}
