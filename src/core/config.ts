// The formatters' options: the port of besm2_cg_po's Besm2Config (the
// Ada BESM2_Fmt.Config, besm2-rst.scm's top-level *star* variables).
//
// The Oberon's are module variables that Besm2Cli sets from the command
// line. An importer can't assign an exported let, so here they are the
// fields of one object, config, which the output modules read. The page
// uses only the defaults (PLAN.md, open question 3); the tests set
// others, for pobesm2_fmt2's golden cases, and resetConfig puts the
// defaults back. A CHAR is a one-character string, and the Oberon's
// "0X = not given" is undefined, as is a NIL rope beside its hasX flag.

// Output formats. Grid (reST grid tables) is the default.
export const Grid = 0;
export const Terse = 1;
export const Hmm = 2;
export const RawMs = 3;
export type Format = 0 | 1 | 2 | 3;

export interface Config {
  format: Format;
  oneTable: boolean; // -1/--one
  boldHead: boolean; // on; -B/--no-bold-head clears it
  bolding: boolean; // -b/--bold
  omitEntityDescription: boolean; // -D/--omit-description
  debugging: boolean; // -d/--debug
  hmmOutput: boolean; // set by -H with format
  hmmSeparate: boolean; // -S/--hmm-separate
  italicizing: boolean; // -i/--italics
  level: boolean; // -l/--level
  emDash: boolean; // -M/--em-dash
  pageAfterDescription: boolean; // -p/--page
  showSubtotals: boolean; // -s/--subtotals
  /** On: negative numbers get U+2212 MINUS SIGN; -n/--no-unicode-minus
   *  clears it, for ASCII "-". The Ada version's default. */
  unicodeMinus: boolean;
  hmmDepth: number; // -L/--hmm-depth, >= 0
  tableWidth: number; // -w/--width
  hmmRoot?: string; // -R/--hmm-root; "" still writes a root line
  outputFile?: string; // -o/--output; undefined: standard output
  underliner: string; // -u/--underliner
  subunderliner?: string; // -U/--subunderliner; undefined: not given
  /** The fill of the separator under a table's header row: "=", or "-"
   *  under -1/--one. */
  headSep: string;
}

function defaults(): Config {
  return {
    format: Grid,
    oneTable: false,
    boldHead: true,
    bolding: false,
    omitEntityDescription: false,
    debugging: false,
    hmmOutput: false,
    hmmSeparate: false,
    italicizing: false,
    level: false,
    emDash: false,
    pageAfterDescription: false,
    showSubtotals: false,
    unicodeMinus: true,
    hmmDepth: 0,
    tableWidth: 60,
    underliner: "-",
    headSep: "=",
  };
}

export const config: Config = defaults();

/** Puts every option back to its default. */
export function resetConfig(): void {
  const d = defaults();
  for (const k of Object.keys(config) as (keyof Config)[]) delete config[k];
  Object.assign(config, d);
}
