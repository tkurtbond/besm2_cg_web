// Padding, word wrapping, grid-table rows, emphasis: the port of
// besm2_cg_po's Besm2Layout (pobesm2_fmt2's). For now only the glyphs,
// which entities needs; the rest comes with the formatters (PLAN.md,
// Phase 4).

import { config } from "./config.ts";

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
