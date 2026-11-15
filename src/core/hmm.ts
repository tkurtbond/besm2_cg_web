// The h-m-m outline format (-H/--hmm): the port of besm2_cg_po's
// Besm2Hmm (pobesm2_fmt2's; the Ada BESM2_Fmt.Format_Hmm, after
// besm2-rst.scm's process-entity-hmm). A tab-indented outline, one node
// per line; the items are the terse format's, with details flattened
// onto one line and no override marks. Indentation starts from
// -L/--hmm-depth for every entity; the -R/--hmm-root line is written
// once per run, by the caller.

import { config } from "./config.ts";
import type * as E from "./entities.ts";
import * as L from "./layout.ts";
import * as Out from "./out.ts";
import { int } from "./text.ts";

function indent(depth: number): void {
  Out.repeat("\t", depth);
}

/** r with every line feed made a blank: besm2-rst.scm's all-one-line.
 *  An h-m-m node is one line. */
export function allOneLine(r: string): string {
  return r.replaceAll("\n", " ");
}

/** "N CP", "N BP", "N MP" or "N MBP", as in terse. */
function labelPoints(points: number, mecha: boolean): string {
  const r = int(Math.abs(points)) + " ";
  if (mecha) return r + (points < 0 ? "MBP" : "MP");
  return r + (points < 0 ? "BP" : "CP");
}

/** "NAME LEVEL" (with -M's " — " and -l's "Level "), emphasized under
 *  -b or -i; only name and level, in skills too (besm-tools b04abb5). */
function nameAndLevel(name: string, level: string): string {
  return L.emphasizing(
    name +
      (config.emDash ? " — " : " ") +
      (config.level ? "Level " : "") +
      level,
  );
}

/** r, then " (", the details, flattened, and ". " if there are any,
 *  the points, and ")". */
function withDetails(
  r: string,
  details: string | undefined,
  points: number,
  mecha: boolean,
): string {
  return (
    r +
    " (" +
    (details !== undefined ? allOneLine(details) + ". " : "") +
    labelPoints(points, mecha) +
    ")"
  );
}

// ---- Items: besm2-rst.scm's process-stat-hmm and friends ----

function stat(s: E.Stat, mecha: boolean): string {
  return `${s.name} ${s.value} (${labelPoints(s.points, mecha)})`;
}

function derived(d: E.Derived): string {
  let r = d.name + " " + d.value;
  if (d.alternatives.length > 0) r += " (" + d.alternatives.join(", ") + ")";
  return r;
}

function attribute(a: E.Attribute, mecha: boolean): string {
  return withDetails(nameAndLevel(a.name, a.level), a.details, a.points, mecha);
}

function defect(d: E.Defect, mecha: boolean): string {
  return withDetails(L.emphasizing(d.name), d.details, d.points, mecha);
}

function skill(s: E.Skill): string {
  let r = nameAndLevel(s.name, s.level) + " (";
  if (s.specialisations.length > 0) r += s.specialisations.join(", ") + ". ";
  return r + int(s.points) + " SP)";
}

// ---- Sections ----

/** The items on one line at depth, separated by sep, or each on its
 *  own line at depth under -S/--hmm-separate. */
function items(l: readonly string[], depth: number, sep: string): void {
  indent(depth);
  l.forEach((x, i) => {
    if (i > 0) {
      if (config.hmmSeparate) {
        Out.ln();
        indent(depth);
      } else Out.string(sep);
    }
    Out.string(x);
  });
  Out.ln();
}

/** A section heading at depth, in bold. */
function heading(depth: number, text: string): void {
  indent(depth);
  Out.string(L.bold(text));
}

/** " (N CP)" or the like, under -s/--subtotals. */
function subtotal(points: number, mecha: boolean): void {
  if (config.showSubtotals) {
    Out.string(" (");
    Out.string(labelPoints(points, mecha));
    Out.char(")");
  }
}

/** Writes e. entityNo is unused (an outline has no underlined headers)
 *  and taken so that every format is called the same way. */
export function processEntity(e: E.Entity, _entityNo: number): void {
  const d1 = config.hmmDepth + 1; // the entity
  const d2 = d1 + 1; // its sections
  const d3 = d2 + 1; // their items

  indent(d1);
  if (e.name !== undefined) {
    Out.string(e.name);
    Out.string(" (");
    Out.string(labelPoints(e.entityTotal, e.mecha));
    Out.char(")");
  } else Out.string(labelPoints(e.entityTotal, e.mecha));
  Out.ln();

  if (e.tagline !== undefined) {
    indent(d2);
    Out.string(L.italics(allOneLine(e.tagline)));
    Out.ln();
  }

  if (!config.omitEntityDescription && e.description !== undefined) {
    indent(d2);
    Out.string(allOneLine(e.description));
    Out.ln();
  }

  if (e.size !== undefined) {
    indent(d2);
    Out.string(L.bold("Size:"));
    Out.char(" ");
    Out.string(e.size);
    Out.ln();
  }

  if (e.stats.length > 0) {
    heading(d2, "Statistics");
    subtotal(e.statsTotal, e.mecha);
    Out.ln();
    items(
      e.stats.map((s) => stat(s, e.mecha)),
      d3,
      ", ",
    );
  }

  if (e.derived.length > 0) {
    heading(d2, "Derived Values");
    Out.ln();
    items(e.derived.map(derived), d3, ", ");
  }

  if (e.attributes.length > 0) {
    heading(d2, e.mecha ? "Mecha Sub-Attributes" : "Attributes");
    subtotal(e.attributesTotal, e.mecha);
    Out.ln();
    items(
      e.attributes.map((a) => attribute(a, e.mecha)),
      d3,
      ", ",
    );
  }

  if (e.defects.length > 0) {
    heading(d2, e.mecha ? "Mecha Defects" : "Defects");
    subtotal(e.defectsTotal, e.mecha);
    Out.ln();
    items(
      e.defects.map((d) => defect(d, e.mecha)),
      d3,
      ", ",
    );
  }

  if (e.skills.length > 0) {
    heading(d2, "Skills");
    if (config.showSubtotals) {
      Out.string(" (");
      Out.string(int(e.skillsTotal));
      Out.string(" SP)");
    }
    Out.ln();
    items(e.skills.map(skill), d3, ", ");
  }

  // The notes, joined with "; " (a note may hold commas), or one per
  // node under -S/--hmm-separate.
  if (e.notes.length > 0) {
    heading(d2, "Notes");
    Out.ln();
    items(e.notes.map(allOneLine), d3, "; ");
  }
}
