// What this program needs of text that JavaScript's strings don't have:
// the port of besm2_cg_po's Besm2Text (itself pobesm2_fmt2's).
//
// The Oberon adds to Ropes decimal integers, the width of UTF-8 text in
// characters, the Ada version's trimming and case folding, a growable
// list of ropes with Join and a stable sort, and a flat copy. Here a
// list is a plain string[], and the flat copy (Chars) isn't needed.
//
// The Oberon's empty rope is NIL, so "" and absent can't be told apart
// there; here they can, and absence is undefined (AGENTS.md). Trim and
// Join give "" where the Oberon gives NIL.

/** i in decimal, with a leading "-" if negative and no blanks. */
export function int(i: number): string {
  return String(i);
}

/** The number of characters in s: not its length in UTF-16 units, nor
 *  the Oberon's in bytes. The Oberon counts every byte that isn't a
 *  UTF-8 continuation byte, which is the number of code points, as
 *  this is. The grid tables' column widths are measured with it. */
export function displayLength(s: string): number {
  return [...s].length;
}

/** s without leading and trailing blanks, tabs, line feeds and carriage
 *  returns: all four, since a YAML literal block scalar ("details: |")
 *  ends with a line feed. Not String.prototype.trim, which strips more
 *  (form feeds, non-breaking spaces, ...). */
export function trim(s: string): string {
  let i = 0;
  let j = s.length;
  while (i < j && " \t\n\r".includes(s[i]!)) i++;
  while (j > i && " \t\n\r".includes(s[j - 1]!)) j--;
  return i === 0 && j === s.length ? s : s.slice(i, j);
}

// ---- Case-insensitive order ----

/** s's UTF-8 bytes, by hand: core uses no global that the browser and
 *  Node don't both have in ES2022's library (TextEncoder isn't). From
 *  ova_cg_web's entities.ts. A lone surrogate is encoded as its code
 *  unit, as JavaScript's for..of gives it. */
export function utf8(s: string): number[] {
  const b: number[] = [];
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c < 0x80) b.push(c);
    else if (c < 0x800) b.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    else if (c < 0x10000)
      b.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    else
      b.push(
        0xf0 | (c >> 18),
        0x80 | ((c >> 12) & 0x3f),
        0x80 | ((c >> 6) & 0x3f),
        0x80 | (c & 0x3f),
      );
  }
  return b;
}

/** s's UTF-8 bytes with every byte lowered as the Ada To_Lower lowers
 *  it, which names are sorted by: A..Z, and also the Latin-1 capitals
 *  C0..DE but D7. In UTF-8 those are lead bytes, so this doesn't lower
 *  non-ASCII letters, but it does move names starting with some of
 *  them relative to others, as in the Ada version.
 *
 *  The Oberon's FoldCI gives a rope of those bytes, which may not be
 *  UTF-8; here they are a string of one character per byte
 *  (U+0000..U+00FF), so that === and < compare them as Ropes.Compare
 *  does, bytewise. It is for comparing, not showing; for ASCII it is s
 *  lowered. (ova_cg_web's foldCI.) */
export function foldCI(s: string): string {
  let r = "";
  for (const c of utf8(s)) {
    const lower =
      (c >= 0x41 && c <= 0x5a) || (c >= 0xc0 && c <= 0xde && c !== 0xd7);
    r += String.fromCharCode(lower ? c + 32 : c);
  }
  return r;
}

/** Whether a comes before b ignoring case, as the Ada CI_Less: both
 *  folded, then compared byte by byte, a proper prefix first. To sort,
 *  fold each name once, as sortCI does. */
export function lessCI(a: string, b: string): boolean {
  return foldCI(a) < foldCI(b);
}

// ---- Lists ----

/** The items joined with sep between them; "" for none. */
export function join(l: readonly string[], sep: string): string {
  return l.join(sep);
}

/** Sorts l by lessCI, in place. An insertion sort, as the Oberon's:
 *  stable, and the lists here are a handful of items. Each item is
 *  folded once, into keys. */
export function sortCI(l: string[]): void {
  sortByKey(l, l.map(foldCI));
}

/** Sorts l in place by keys (one for each item, compared with <), with
 *  a stable insertion sort: SortCI's, and Besm2Entities' SortByName's. */
export function sortByKey<T>(l: T[], keys: string[]): void {
  for (let i = 1; i < l.length; i++) {
    const x = l[i]!;
    const k = keys[i]!;
    let j = i;
    while (j > 0 && k < keys[j - 1]!) {
      l[j] = l[j - 1]!;
      keys[j] = keys[j - 1]!;
      j--;
    }
    l[j] = x;
    keys[j] = k;
  }
}
