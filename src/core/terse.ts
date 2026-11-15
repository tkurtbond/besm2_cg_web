// The terse format (-t/--terse): the port of besm2_cg_po's Besm2Terse
// (pobesm2_fmt2's; the Ada BESM2_Fmt.Format_Terse, after besm2-rst.scm's
// process-entity-terse). Each section is one paragraph: a bold heading,
// " — ", and the items separated by ", ".

import { config } from "./config.ts";
import type * as E from "./entities.ts";
import * as L from "./layout.ts";
import * as Out from "./out.ts";
import { int, utf8 } from "./text.ts";

/** r, with overrideMark after it if marked (an overridden number). */
function mark(r: string, marked: boolean): string {
  return marked ? r + L.overrideMark() : r;
}

/** "N CP" for points, "N BP" for a negative number (bonus points), or
 *  "N MP"/"N MBP" for a mecha: the number always without a sign, and
 *  with overrideMark after it if marked. */
function labelPoints(points: number, mecha: boolean, marked: boolean): string {
  const r = mark(int(Math.abs(points)), marked) + " ";
  if (mecha) return r + (points < 0 ? "MBP" : "MP");
  return r + (points < 0 ? "BP" : "CP");
}

/** "NAME LEVEL", "NAME — LEVEL" under -M/--em-dash, with "Level "
 *  before LEVEL under -l/--level. */
function nameAndLevel(name: string, level: string): string {
  return (
    name +
    (config.emDash ? " — " : " ") +
    (config.level ? "Level " : "") +
    level
  );
}

/** r, then " (", details and ". " if there are any, the points, and
 *  ")": the end of an attribute or a defect. */
function withDetails(
  r: string,
  details: string | undefined,
  points: number,
  mecha: boolean,
  marked: boolean,
): string {
  return (
    r +
    " (" +
    (details !== undefined ? details + ". " : "") +
    labelPoints(points, mecha, marked) +
    ")"
  );
}

// ---- Items: besm2-rst.scm's process-stat-terse and friends ----

function stat(s: E.Stat, mecha: boolean): string {
  return `${s.name} ${s.value} (${labelPoints(s.points, mecha, s.pointsMark)})`;
}

function derived(d: E.Derived): string {
  let r = d.name + " " + mark(d.value, d.valueMark);
  if (d.alternatives.length > 0) r += " (" + d.alternatives.join(", ") + ")";
  return r;
}

function attribute(a: E.Attribute, mecha: boolean): string {
  return withDetails(
    L.emphasizing(nameAndLevel(a.name, a.level)),
    a.markedDetails,
    a.points,
    mecha,
    a.pointsMark,
  );
}

function defect(d: E.Defect, mecha: boolean): string {
  return withDetails(
    L.emphasizing(d.name),
    d.details,
    d.points,
    mecha,
    d.pointsMark,
  );
}

function skill(s: E.Skill): string {
  let r = L.emphasizing(nameAndLevel(s.name, s.level)) + " (";
  if (s.specialisations.length > 0) r += s.specialisations.join(", ") + ". ";
  return r + mark(int(s.points), s.pointsMark) + " SP)";
}

// ---- Sections ----

/** The items, formatted by kind, separated by ", ", then a blank
 *  line. */
function items(l: readonly string[]): void {
  Out.string(l.join(", "));
  Out.ln();
  Out.ln();
}

/** " (N CP)" or the like after a section heading, under
 *  -s/--subtotals. */
function subtotal(points: number, mecha: boolean): void {
  if (config.showSubtotals) {
    Out.string(" (");
    Out.string(labelPoints(points, mecha, false));
    Out.char(")");
  }
}

/** Writes e. entityNo is 1 for the first entity of a file, 2 for the
 *  second, and so on: entities after the first are underlined with
 *  -U/--subunderliner's character, if given. */
export function processEntity(e: E.Entity, entityNo: number): void {
  if (e.name !== undefined) {
    const header =
      e.name + " (" + labelPoints(e.entityTotal, e.mecha, false) + ")";
    const underline =
      entityNo > 1 && config.subunderliner !== undefined
        ? config.subunderliner
        : config.underliner;
    Out.string(header);
    Out.ln();
    // As long as the header in bytes, not characters, as in the Ada
    // version (Header'Length).
    Out.repeat(underline, utf8(header).length);
    Out.ln();
    Out.ln();
  } else {
    Out.string(labelPoints(e.entityTotal, e.mecha, false));
    Out.ln();
    Out.ln();
  }

  if (e.tagline !== undefined) {
    Out.string(L.italics(e.tagline));
    Out.ln();
    Out.ln();
  }

  if (e.description !== undefined && !config.omitEntityDescription) {
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
    Out.string(L.bold("Statistics"));
    subtotal(e.statsTotal, e.mecha);
    Out.string(" — ");
    Out.ln();
    items(e.stats.map((s) => stat(s, e.mecha)));
  }

  if (e.derived.length > 0) {
    // No line break after this heading, unlike the others.
    Out.string(L.bold("Derived Values"));
    Out.string(" — ");
    items(e.derived.map(derived));
  }

  if (e.attributes.length > 0) {
    Out.string(L.bold(e.mecha ? "Mecha Sub-Attributes" : "Attributes"));
    subtotal(e.attributesTotal, e.mecha);
    Out.string(" — ");
    Out.ln();
    items(e.attributes.map((a) => attribute(a, e.mecha)));
  }

  if (e.defects.length > 0) {
    Out.string(L.bold(e.mecha ? "Mecha Defects" : "Defects"));
    subtotal(e.defectsTotal, e.mecha);
    Out.string(" — ");
    Out.ln();
    items(e.defects.map((d) => defect(d, e.mecha)));
  }

  if (e.skills.length > 0) {
    Out.string(L.bold("Skills"));
    if (config.showSubtotals) {
      Out.string(" (");
      Out.string(int(e.skillsTotal));
      Out.string(" SP)");
    }
    Out.string(" — ");
    Out.ln();
    items(e.skills.map(skill));
  }

  L.notes(e.notes);
}
