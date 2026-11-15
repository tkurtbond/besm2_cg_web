// The page on happy-dom, under plain Node: a Window built into a fresh
// document, and fakes in place of what would wait for the user, as
// besm2_cg_po's TestWindow sets its Tell, Ask, Confirm, ChoosePath,
// AskText and Besm2Widgets.openPage. Adapted from ova_cg_web's
// test/ui/setup.ts, with the fields the Window has. The real dialogs are
// tested in dialogs.test.ts, and in the browsers by
// test/browser/shell.spec.ts; the rulebook by rulebook.test.ts.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Window as HappyWindow } from "happy-dom";
import * as Ch from "../../src/core/character.ts";
import { Cancel, Window, type Answer } from "../../src/ui/window.ts";

/** besm2_cg_po's test/data, copied by make golden. */
export const DATA_DIR = "testdata/cg/";

/** What answers for the user, and what it was asked. */
export interface Fakes {
  tells: number; // how many messages were shown
  told: string; // the last
  answer: Answer; // what ask answers,
  asked: number; // and how often it was asked
  question: string; // what ask or confirm asked last
  yes: boolean; // what confirm answers,
  confirmed: number; // and how often it was asked
  chosen: string | undefined; // the fixture chooseFile gives; undefined: cancelled
  file: File | undefined; // or, if not undefined, this file
  accepted: string; // the types chooseFile was last asked for
  chooses: number; // how often chooseFile was asked
  typed: string | undefined; // what askText answers; undefined: cancelled
  texts: number; // how often askText was asked,
  suggested: string; // and the text it began with last
  downloads: { name: string; text: string }[];
  copied: string[]; // what copyText was given, in order
  page: number; // the last page openPage was asked for; 0: none
  tabs: string[]; // the URLs openTab opened, in order
  blocked: boolean; // whether openTab is refused
}

/** A fresh document with the page's #app, on happy-dom. */
export function newDocument(): { happy: HappyWindow; doc: Document } {
  const happy = new HappyWindow({ url: "file:///besm2_cg_web.html" });
  happy.document.body.innerHTML = '<main id="app"></main>';
  return { happy, doc: happy.document as unknown as Document };
}

/** A Window with fakes. */
export function newWindow(): {
  w: Window;
  f: Fakes;
  doc: Document;
  happy: HappyWindow;
} {
  const { happy, doc } = newDocument();
  const w = new Window(doc);
  const f: Fakes = {
    tells: 0,
    told: "",
    answer: Cancel,
    asked: 0,
    question: "",
    yes: false,
    confirmed: 0,
    chosen: undefined,
    file: undefined,
    accepted: "",
    chooses: 0,
    typed: undefined,
    texts: 0,
    suggested: "",
    downloads: [],
    copied: [],
    page: 0,
    tabs: [],
    blocked: false,
  };
  w.tell = (text) => {
    f.tells++;
    f.told = text;
  };
  w.ask = (q, answer) => {
    f.asked++;
    f.question = q;
    answer(f.answer);
  };
  w.confirm = (q, _yes, then) => {
    f.confirmed++;
    f.question = q;
    then(f.yes);
  };
  w.chooseFile = (accept, then) => {
    f.chooses++;
    f.accepted = accept;
    if (f.file !== undefined) {
      then(f.file);
      return;
    }
    if (f.chosen === undefined) return;
    const text = readFileSync(DATA_DIR + f.chosen, "utf8");
    then(new happy.File([text], f.chosen) as unknown as File);
  };
  w.askText = (_p, text, then) => {
    f.texts++;
    f.suggested = text;
    if (f.typed === undefined) then("", false);
    else then(f.typed, true);
  };
  w.download = (name, text) => f.downloads.push({ name, text });
  w.copyText = (text) => f.copied.push(text);
  w.openPage = (p) => (f.page = p);
  w.openTab = (url) => {
    if (f.blocked) return false;
    f.tabs.push(url);
    return true;
  };
  return { w, f, doc, happy };
}

/**
 * take shows the fixture name's entities as if opened from a file named
 * as, without the notices load would tell; each must load.
 */
export function take(w: Window, name: string, as = name): void {
  const r = Ch.readStream(readFileSync(DATA_DIR + name, "utf8"), name);
  assert.ok(
    r.es !== undefined && r.results.every((x) => x.entity !== undefined),
    name + " loads",
  );
  w.take(r.es, as);
}

/** load opens the fixture name, as File > Open... would. */
export function load(w: Window, name: string): boolean {
  return w.load(readFileSync(DATA_DIR + name, "utf8"), name);
}

/** settled waits until a file's text, being read, has been loaded. */
export function settled(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 20));
}

/** A key pressed on target (the focused element, by default). */
export function press(
  doc: Document,
  init: KeyboardEventInit,
  target?: Element | null,
): KeyboardEvent {
  const view = doc.defaultView as unknown as typeof globalThis;
  const e = new view.KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  (target ?? doc.activeElement ?? doc.body).dispatchEvent(e);
  return e;
}

/** check collects a failed check's label, as besm2_cg_po's Check. */
export function checker(): {
  check: (ok: boolean, label: string) => void;
  done: () => void;
} {
  const failures: string[] = [];
  return {
    check: (ok, label) => {
      if (!ok) failures.push(label);
    },
    done: () => assert.deepEqual(failures, []),
  };
}

/** chooseIn chooses option i of s as the user does: a change event. */
export function chooseIn(s: HTMLSelectElement, i: number): void {
  s.selectedIndex = i;
  s.dispatchEvent(new s.ownerDocument.defaultView!.Event("change"));
}
