// What a file says that its numbers don't: aliases, ranges, deprecated
// keys. The port of besm2_cg_po's Besm2Check.
//
// besm2_calc_po's --check reports, besides the numbers that disagree
// with the rules (character's differences),
// - as an error, every `points` or `value` outside -999..999 (e.g.
//   "Hero: stats/Body: points 2147483647 is outside -999..999"), the
//   overflow the formatters don't catch;
// - as a warning, every YAML alias, which besm2_fmt doesn't resolve and
//   the Oberon ports do;
// - as warnings, `enhancements` and `limiters` (4E's shapes, deprecated
//   for 2E files), `different-gunner` on a character (it is a mecha's
//   weapon's, p. 82, PDF 84), and empty strings and lists.
// They are looked for on the file's nodes, not on what character made
// of them, since an alias exists only before the document is resolved,
// and an empty string only as written.
//
// An anchor (&name) no alias names changes nothing, so only aliases are
// reported.
//
// Messages name the entity (its name, or "entity N"), the section, and
// the item by its name ("stats/Body", "attributes/Weapon Attack: Gun");
// an alias, which has a place in the file, by its path and its line and
// column. The page puts the file's name in front.
//
// The paths here are the Oberon's ropes, in which empty and none are
// the same (NIL): "" is no path, as there.

import { type Node } from "./fyaml.ts";
import { trim } from "./text.ts";

// What a note is: character's Notice kinds.
export const Difference = 0;
export const Warning = 1;
export const Error = 2;
export type Kind = typeof Difference | typeof Warning | typeof Error;
// The range of a number --check accepts.
export const Low = -999;
export const High = 999;

/** Takes each thing found, of kind Warning or Error. */
export type Note = (kind: Kind, text: string) => void;

// ---- Aliases ----

/** Every alias in n, a node of a document not yet resolved, to note, as
 *  "PATH (line L, column C): an alias, star and name in brackets, ...". */
export function aliases(n: Node | undefined, note: Note): void {
  if (n === undefined) return;
  if (n.isAlias()) {
    let r = n.path();
    const m = n.location();
    if (m !== undefined) r += ` (line ${m.line}, column ${m.column})`;
    r += `: an alias (*${n.scalar()}), which besm2_fmt doesn't resolve and the Oberon-2 programs do`;
    note(Warning, r);
  } else if (n.isSequence()) {
    for (const item of n.items) aliases(item, note);
  } else if (n.isMapping()) {
    for (const p of n.pairs) {
      aliases(p.key, note);
      aliases(p.value, note);
    }
  }
}

// ---- An entity ----

/** path/key, or key alone at the top (path ""). */
function sub(path: string, key: string): string {
  return path === "" ? key : `${path}/${key}`;
}

/** "LABEL: PATH: text", or "LABEL: text" for the entity itself. */
function say(
  label: string,
  note: Note,
  kind: Kind,
  path: string,
  text: string,
): void {
  note(kind, path === "" ? `${label}: ${text}` : `${label}: ${path}: ${text}`);
}

/** An item's name for messages: "Body", "Weapon Attack: Gun", or its
 *  index when it has none. */
function itemName(m: Node, i: number): string {
  let r = "";
  const v = m.value("name");
  if (v !== undefined && v.isScalar()) r = trim(v.scalar());
  if (r === "") r = String(i);
  const s = m.value("subject");
  if (s !== undefined && s.isScalar()) r += `: ${trim(s.scalar())}`;
  return r;
}

/** Every empty string and empty list or mapping in n, at path: a list's
 *  mappings named by itemName, its other items by index. */
function empties(
  label: string,
  n: Node | undefined,
  path: string,
  note: Note,
): void {
  if (n === undefined) return;
  if (n.isScalar()) {
    if (trim(n.scalar()) === "")
      say(label, note, Warning, path, "an empty string");
  } else if (n.isSequence()) {
    if (n.length() === 0) say(label, note, Warning, path, "an empty list");
    else
      n.items.forEach((item, i) => {
        const w = item.isMapping() ? itemName(item, i) : String(i);
        empties(label, item, sub(path, w), note);
      });
  } else if (n.isMapping()) {
    if (n.length() === 0) say(label, note, Warning, path, "an empty mapping");
    else
      for (const p of n.pairs)
        if (p.key.isScalar())
          empties(label, p.value, sub(path, p.key.scalar()), note);
  }
}

/** The value of m's key as an integer, if it is one (64 bits). */
function intValue(m: Node, key: string): bigint | undefined {
  const v = m.value(key);
  if (v === undefined || !v.isScalar() || !v.isInteger()) return undefined;
  const r = v.longIntValue();
  return r.ok ? r.value : undefined;
}

function range(m: Node, where: string, key: string, note: Note): void {
  const i = intValue(m, key);
  if (i !== undefined && (i < BigInt(Low) || i > BigInt(High)))
    note(Error, `${where}: ${key} ${i} is outside ${Low}..${High}`);
}

/** The items of section key of entity m. */
function section(
  label: string,
  m: Node,
  key: string,
  isMecha: boolean,
  note: Note,
): void {
  const s = m.value(key);
  if (s === undefined || !s.isSequence()) return;
  s.items.forEach((item, i) => {
    if (!item.isMapping()) return;
    const where = sub(key, itemName(item, i));
    const r = `${label}: ${where}`;
    range(item, r, "points", note);
    range(item, r, "value", note);
    if (item.hasKey("enhancements"))
      say(
        label,
        note,
        Warning,
        where,
        "enhancements are 4th Edition's, deprecated for 2nd Edition files",
      );
    if (item.hasKey("limiters"))
      say(
        label,
        note,
        Warning,
        where,
        "limiters are 4th Edition's, deprecated for 2nd Edition files",
      );
    if (!isMecha && item.hasKey("different-gunner"))
      say(
        label,
        note,
        Warning,
        where,
        "different-gunner on a character: it is for a mecha's weapons (p. 82, PDF 84)",
      );
  });
}

/** What entity m, called name in messages, says that --check reports
 *  besides its numbers. */
export function entity(m: Node | undefined, name: string, note: Note): void {
  if (m === undefined || !m.isMapping()) return;
  let isMecha = false;
  const v = m.value("mecha");
  if (v !== undefined && v.isScalar()) {
    const b = v.booleanValue();
    isMecha = b.ok && b.value;
  }
  section(name, m, "stats", isMecha, note);
  section(name, m, "derived", isMecha, note);
  section(name, m, "attributes", isMecha, note);
  section(name, m, "defects", isMecha, note);
  section(name, m, "skills", isMecha, note);
  empties(name, m, "", note);
}
