// The window's Mecha tab: a character's Own a Big Mecha and their mecha,
// or a mecha's owners; the port of besm2_cg_po's Besm2MechaPanel (its
// PLAN.md, Part B, step 9).
//
// On a character, a line for each Own a Big Mecha (p. 59, PDF 61): its
// Level and subject, the Mecha Points it gives, and the mecha its
// subject names (besm2_cg_po's PLAN.md A4) with what that spends of all
// its owners give, or that no mecha of that name is in the file. On a
// mecha, a line for each Own a Big Mecha in the file that names it, with
// its character and the Mecha Points it gives, or that none does. A
// mecha two characters name is priced by the last of them in the file
// (calc.compute), so the others' lines say they don't count.
//
// Show goes to the line's mecha, or its owner; New Mecha makes the
// line's mecha, named by its subject (or asked for, which then becomes
// the subject), adds it to the file and shows it. With one line, it is
// the line meant even if not selected. What the Window does goes
// through the host (show, add, tell, askText), as the Oberon's
// procedure variables.

import * as C from "../core/calc.ts";
import * as Ch from "../core/character.ts";
import * as R from "../core/rules.ts";
import { trim } from "../core/text.ts";
import { bold, button, el, HelpButton, Lines } from "./widgets.ts";

/** The Mecha Points column, and the mecha's, in px. */
const PointsW = 70;
const MechaW = 300;

/** What the tab needs of the Window. */
export interface Host {
  tell(text: string): void;
  /** Asks for a line of text (ok false: cancelled). */
  askText(
    prompt: string,
    text: string,
    then: (text: string, ok: boolean) => void,
  ): void;
  /** Shows e. */
  show(e: Ch.Entity): void;
  /** Adds e to the file, last, and shows it. */
  add(e: Ch.Entity): void;
  openPage(): ((page: number) => void) | undefined;
}

/** A line: the Own a Big Mecha attr of owner. */
interface Line {
  owner: Ch.Entity;
  attr: Ch.Attr;
}

const ownABigMecha = (() => {
  const it = R.find("Own a Big Mecha");
  if (it === undefined) throw new Error("no Own a Big Mecha");
  return it;
})();

/** What an entity is called: its name, or "(no name)" (NameOf). */
function nameOf(e: C.Entity | undefined): string {
  const n = (e as Ch.Entity | undefined)?.name;
  if (n !== undefined && trim(n) !== "") return trim(n);
  return "(no name)";
}

/** "2 Own a Big Mecha: Walker", as the Attributes list shows it
 *  (AttrText). */
function attrText(a: Ch.Attr): string {
  let r = a.level + " Own a Big Mecha";
  if (a.subject !== undefined && a.subject !== "") r += ": " + a.subject;
  return r;
}

export class MechaPanel {
  readonly element: HTMLElement;
  readonly list: Lines;
  readonly showButton: HTMLButtonElement;
  readonly newButton: HTMLButtonElement;
  /** How many lines are Own a Big Mecha's: 0 for a line that only says
   *  none */
  n = 0;
  private lines: Line[] = [];
  private entities: Ch.Entity[] = [];
  private entity: Ch.Entity | undefined = undefined;
  private readonly host: Host;

  /** The tab's widgets (Build). */
  constructor(doc: Document, host: Host, height: number) {
    this.host = host;
    const label = R.label(ownABigMecha);
    this.list = new Lines(doc, label, height, PointsW, MechaW);
    this.list.element.classList.add("mecha-lines");
    const help = new HelpButton(doc, ownABigMecha.page, () => host.openPage());
    const head = el(doc, "div", "heading-row");
    head.append(bold(doc, label), help.button);
    this.showButton = button(doc, "Show Mecha", () => this.showAction());
    this.showButton.title = "show the mecha of the line chosen, or its owner";
    this.newButton = button(doc, "New Mecha", () => this.newAction());
    this.newButton.title =
      "add the mecha the Own a Big Mecha chosen names to the file";
    const mechaHelp = new HelpButton(doc, R.MechaAttributesPage, () =>
      host.openPage(),
    );
    mechaHelp.button.title = R.pageLabel(
      "Mecha Attributes",
      R.MechaAttributesPage,
    );
    const buttons = el(doc, "div", "panel-row");
    buttons.append(this.showButton, this.newButton, mechaHelp.button);
    this.element = el(doc, "div", "mecha-panel");
    this.element.append(head, this.list.element, buttons);
  }

  /** Line i's columns: on a character, the Own a Big Mecha, its Mecha
   *  Points, and its mecha's; on a mecha, the character and its Own a
   *  Big Mecha, its Mecha Points, and whether it counts (Text). */
  private text(i: number): string[] {
    const e = this.entity!;
    const { owner, attr: a } = this.lines[i]!;
    const first = e.isMecha ? nameOf(owner) + ": " + attrText(a) : attrText(a);
    const mp = C.mechaPoints(a) + " MP";
    const m = a.mecha;
    let r = "";
    if (e.isMecha) {
      if (m!.owner !== owner) {
        r = "not counted: " + nameOf(m!.owner) + " owns it";
      }
    } else if (m !== undefined && m.owner !== e) {
      r = nameOf(m) + " is " + nameOf(m.owner) + "'s: not counted";
    } else if (m !== undefined) {
      r = `${nameOf(m)} spends ${m.spent} of ${m.available}`;
      if (m.spent > m.available) r += ": over";
    } else if (a.subject !== undefined && trim(a.subject) !== "") {
      r = "no mecha of that name in the file";
    } else {
      r = "no subject: no mecha";
    }
    return [first, mp, r];
  }

  /** The lines again, line line selected (-1: none) (Fill). */
  private fill(line: number): void {
    this.lines = [];
    this.n = 0;
    const e = this.entity;
    if (e === undefined) {
      this.list.set([], -1);
      return;
    }
    if (e.isMecha) {
      for (const o of this.entities) {
        if (o.isMecha) continue;
        for (let a = o.attrs; a !== undefined; a = a.next) {
          if (a.item === ownABigMecha && a.mecha === e) {
            this.lines.push({ owner: o, attr: a as Ch.Attr });
          }
        }
      }
    } else {
      for (let a = e.attrs; a !== undefined; a = a.next) {
        if (a.item === ownABigMecha) {
          this.lines.push({ owner: e, attr: a as Ch.Attr });
        }
      }
    }
    this.n = this.lines.length;
    const rows = this.lines.map((_, i) => this.text(i));
    if (this.n === 0) {
      let r: string;
      if (e.isMecha) {
        r =
          "No character in the file owns this mecha: give one " +
          R.label(ownABigMecha);
        if (e.name !== undefined && trim(e.name) !== "") {
          r += " with the subject " + trim(e.name);
        }
        r += ".";
      } else {
        r = "No " + R.label(ownABigMecha) + ": add it on the Attributes tab.";
      }
      rows.push([r]);
    }
    this.list.set(rows, line >= 0 && line < this.n ? line : -1);
    this.showButton.textContent = e.isMecha ? "Show Owner" : "Show Mecha";
    this.newButton.disabled = e.isMecha;
    this.showButton.disabled = this.n === 0;
  }

  /** Shows entity e of es (Show). */
  show(es: Ch.Entity[], e: Ch.Entity): void {
    this.entities = es;
    this.entity = e;
    this.fill(-1);
  }

  /** The lines again, after a change elsewhere, keeping the one
   *  selected (Refresh). */
  refresh(): void {
    this.fill(this.list.selected());
  }

  /** The line meant: the one selected, or the only one; -1 for none,
   *  said why (Meant). */
  private meant(): number {
    const line = this.list.selected();
    if (line >= 0 && line < this.n) return line;
    if (this.n === 1) return 0;
    if (this.n === 0) {
      if (this.entity!.isMecha) {
        this.host.tell("No character in the file owns this mecha.");
      } else {
        this.host.tell(
          "Give the character " +
            R.label(ownABigMecha) +
            " on the Attributes tab first.",
        );
      }
    } else this.host.tell("Choose an Own a Big Mecha first.");
    return -1;
  }

  /** Show Mecha, Show Owner (ShowAction). */
  showAction(): void {
    const i = this.meant();
    if (i < 0) return;
    const { owner, attr } = this.lines[i]!;
    if (this.entity!.isMecha) this.host.show(owner);
    else if (attr.mecha !== undefined) this.host.show(attr.mecha as Ch.Entity);
    else {
      this.host.tell(
        "That Own a Big Mecha's mecha isn't in the file: New Mecha makes it.",
      );
    }
  }

  /** New Mecha (NewAction). */
  newAction(): void {
    if (this.entity === undefined || this.entity.isMecha) return;
    const i = this.meant();
    if (i < 0) return;
    const a = this.lines[i]!.attr;
    if (a.mecha !== undefined) {
      this.host.tell(
        "That Own a Big Mecha has its mecha already: Show Mecha shows it.",
      );
      return;
    }
    const name = a.subject === undefined ? "" : trim(a.subject);
    if (name !== "") {
      this.host.add(Ch.newMecha(name));
      return;
    }
    this.host.askText(
      "The mecha's name (the Own a Big Mecha's subject):",
      "",
      (text, ok) => {
        if (!ok) return;
        const t = trim(text);
        if (t === "") {
          this.host.tell("A mecha is found by its name: give one.");
          return;
        }
        a.subject = t;
        this.host.add(Ch.newMecha(t));
      },
    );
  }
}
