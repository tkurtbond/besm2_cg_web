// Where the formatters' output goes: the port of besm2_cg_po's Besm2Out
// (pobesm2_fmt2's).
//
// The Oberon writes to standard output, or to a file for -o, through a
// buffer, and ToRope keeps the output in a rope instead until TakeRope,
// so the window can show a character formatted. A page has neither
// standard output nor files, so here the output is always kept: toRope
// starts afresh and takeRope hands over what was written (undefined,
// the Oberon's NIL, for nothing). A test of pobesm2_fmt2's command line
// takes the output where the Oberon flushes it, before an error goes to
// standard error. The Oberon's buffer, Flush, ToFile and Close have no
// counterpart.

let kept: string[] = [];

export function char(c: string): void {
  kept.push(c);
}

export function string(s: string): void {
  kept.push(s);
}

/** Writes r; nothing for undefined, the Oberon's NIL. */
export function rope(r: string | undefined): void {
  if (r !== undefined) kept.push(r);
}

/** A line feed, as Ada.Text_IO.New_Line writes. */
export function ln(): void {
  kept.push("\n");
}

/** c, n times; nothing if n <= 0. */
export function repeat(c: string, n: number): void {
  if (n > 0) kept.push(c.repeat(n));
}

/** Keeps output from now on afresh, for takeRope. */
export function toRope(): void {
  kept = [];
}

/** What was written since toRope (undefined for nothing); the next
 *  output is kept from scratch. */
export function takeRope(): string | undefined {
  const r = kept.join("");
  kept = [];
  return r === "" ? undefined : r;
}
