// The Background tab: the entity's description and its notes, the port
// of besm2_cg_po's Besm2Background (its PLAN.md, Part B, step 7). The
// description (`description:`) is a <textarea>; the notes (`notes:`,
// its PLAN.md A4) are short lines, never priced, listed in a Lines,
// with an input and Add, Change and Remove.
//
// The Window owns the entities and the file: it builds this tab, shows
// an entity here (show), and is told of each change (changed). A
// message goes through the host's tell, which a test replaces. Every
// change goes into the entity at once, as the user types; nothing here
// holds the only copy.

import type * as Ch from "../core/character.ts";
import { trim } from "../core/text.ts";
import {
  bold,
  button,
  el,
  inputText,
  labelled,
  Lines,
  setText,
} from "./widgets.ts";

/** What the tab needs of the Window. */
export interface Host {
  tell(text: string): void;
  /** Whether the Window is filling the page from the entity. */
  filling(): boolean;
}

export class Background {
  private entity: Ch.Entity | undefined = undefined;
  private readonly host: Host;
  readonly description: HTMLTextAreaElement;
  /** The notes, in order */
  readonly notes: Lines;
  readonly noteIn: HTMLInputElement;
  readonly addNote: HTMLButtonElement;
  readonly changeNote: HTMLButtonElement;
  readonly removeNote: HTMLButtonElement;
  readonly element: HTMLElement;
  /** Set by the Window: called after every change the user makes here. */
  changed: (() => void) | undefined = undefined;

  constructor(doc: Document, host: Host) {
    this.host = host;
    this.description = el(doc, "textarea", "description");
    this.description.setAttribute("aria-label", "Description");
    this.description.addEventListener("input", () => this.typed());
    this.notes = new Lines(doc, "Notes", 0);
    this.notes.onSelect = (i) => this.noteChosen(i);
    this.noteIn = el(doc, "input", "panel-text");
    this.noteIn.type = "text";
    this.addNote = button(doc, "Add", () => this.noteButton(this.addNote));
    this.changeNote = button(doc, "Change", () =>
      this.noteButton(this.changeNote),
    );
    this.removeNote = button(doc, "Remove", () =>
      this.noteButton(this.removeNote),
    );
    const input = el(doc, "div", "panel-row");
    input.append(labelled(doc, "note", this.noteIn));
    const buttons = el(doc, "div", "panel-row panel-buttons");
    buttons.append(this.addNote, this.changeNote, this.removeNote);
    this.element = el(doc, "div", "background");
    this.element.append(
      bold(doc, "Description"),
      this.description,
      bold(doc, "Notes"),
      this.notes.element,
      input,
      buttons,
    );
  }

  // ---- The description ----

  /** The text, trimmed as the loader trims it, so what is saved loads
   *  the same; blank is empty, but a key the entity had stays
   *  (DescriptionBuffer's Modified). */
  private typed(): void {
    if (this.host.filling() || this.entity === undefined) return;
    const e = this.entity;
    e.description = setText(e.description, trim(this.description.value));
    this.changed?.();
  }

  // ---- The notes ----

  private noteList(): string[] {
    return this.entity?.notes ?? [];
  }

  /** The notes listed again, line i selected (-1: none) and in the
   *  input (ShowNotes). */
  private showNotes(i: number): void {
    const l = this.noteList();
    this.notes.set(
      l.map((n) => [n]),
      i,
    );
    this.noteIn.value = i >= 0 && i < l.length ? l[i]! : "";
  }

  /** A note selected: it is put in the input (NotesAction). */
  private noteChosen(i: number): void {
    const l = this.noteList();
    if (i >= 0 && i < l.length) this.noteIn.value = l[i]!;
  }

  /** The notes again, line skip (from 0; -1: none) left out, and text
   *  put at line at (-1: none; beyond the last: last) (Rebuild). */
  private rebuild(skip: number, at: number, text: string): void {
    const e = this.entity!;
    const old = e.notes ?? [];
    const l: string[] = [];
    old.forEach((n, i) => {
      if (i === at) l.push(text);
      if (i !== skip) l.push(n);
    });
    if (at >= old.length) l.push(text);
    e.notes = e.notes !== undefined || l.length > 0 ? l : undefined;
  }

  /** Add puts the note last; Change and Remove need a line selected
   *  (NoteButtonAction). */
  private noteButton(b: HTMLButtonElement): void {
    if (this.entity === undefined) return;
    let line = this.notes.selected();
    let text = "";
    if (b === this.addNote || b === this.changeNote) {
      const t = inputText(this.noteIn);
      if (t === undefined) {
        this.host.tell("Type the note first.");
        return;
      }
      text = t;
    }
    if (b === this.addNote) {
      this.rebuild(-1, this.noteList().length, text);
      line = this.noteList().length - 1;
    } else if (line < 0) {
      this.host.tell("Choose a note first.");
      return;
    } else if (b === this.changeNote) this.rebuild(line, line, text);
    else {
      this.rebuild(line, -1, "");
      line = -1;
    }
    this.showNotes(line);
    this.changed?.();
  }

  // ---- Showing an entity ----

  show(e: Ch.Entity): void {
    this.entity = e;
    this.description.value = e.description ?? "";
    this.showNotes(-1);
  }
}
