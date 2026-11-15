// Phase 6: files on the page, on happy-dom with fakes for what would
// wait for the user. Ports besm2_cg_po's TestWindow SaveFirst, Files,
// Bare and Notices (test/TestWindow.Mod), with their labels where they
// apply, and adapts ova_cg_web's test/ui/files.test.ts: a download in
// place of a file written, and a new file with a name saved as it
// without asking (PLAN.md, "Files in the browser"). A change is made to
// the entity and marked, as an edit's handler does (changed, below;
// test/ui/character.test.ts types into the fields themselves). What only a browser does (the
// download itself, the file chooser after a dialog, a drop,
// beforeunload's question) is test/browser/files.spec.ts's.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as C from "../../src/core/calc.ts";
import * as Ch from "../../src/core/character.ts";
import {
  Cancel,
  Discard,
  fileName,
  NoticeWidth,
  SaveFirst,
  Title,
  type Window,
} from "../../src/ui/window.ts";
import { checker, DATA_DIR, load, newWindow, settled } from "./setup.ts";

const golden = (name: string) =>
  readFileSync(`test/golden/cg/${name}.fill.yaml`, "utf8");

/** changed changes the entity shown with f and marks it, as an edit on
 *  the page does (the Character tab's handlers); f calls Ch.useStat or useDerived
 *  for a Stat or derived value, as they will. */
function changed(w: Window, f: (e: Ch.Entity) => void): void {
  f(w.entity);
  w.modified = true;
  Ch.computeAll(w.entities);
  w.showAll();
}

/** The entities a saved text holds, loaded again; undefined if not. */
function reload(text: string | undefined): Ch.Entity[] | undefined {
  if (text === undefined) return undefined;
  const r = Ch.loadAll(text, "saved.yaml");
  return r.ok ? r.es : undefined;
}

test("fileName", () => {
  const cases: [string, string][] = [
    ["Kei", "Kei.yaml"],
    ["  Kei  ", "Kei.yaml"],
    ["Kei.yaml", "Kei.yaml"],
    ["Kei.YML", "Kei.YML"],
    ["Kei.txt", "Kei.txt.yaml"],
    ["Sazza/Fraz", "Sazza_Fraz.yaml"],
    ["a\\b", "a_b.yaml"],
    ["", ""],
    ["   ", ""],
  ];
  for (const [text, want] of cases) {
    assert.equal(fileName(text), want, JSON.stringify(text));
  }
});

test("SaveFirst", () => {
  const { w, f } = newWindow();
  const { check, done } = checker();
  changed(w, (e) => {
    e.name = "Kei Tanaka";
    e.stat[C.Body] = 5;
    Ch.useStat(e, C.Body);
    C.override(e.hp, 99);
    C.override(e.ar, 3);
  });
  let e = w.entity;
  f.answer = Cancel;
  w.newItem.action!();
  check(
    f.asked === 1 && f.question === "Save the changes to Kei Tanaka first?",
    "File > New with changes asks to save them first, naming the character",
  );
  check(w.entity === e && w.modified, "Cancel: the character stays, changed");

  // A new file with a name saves as it, without asking; one without asks
  // for a name, and cancelling that cancels the save.
  const name = e.name;
  e.name = undefined;
  f.answer = SaveFirst;
  f.typed = undefined;
  f.asked = 0;
  w.newItem.action!();
  check(
    f.asked === 1 && f.texts === 1 && w.entity === e && w.modified,
    "Save, and Save As cancelled: it stays",
  );
  check(f.suggested === "", "no name: nothing suggested");
  f.typed = "  ";
  f.asked = 0;
  w.newItem.action!();
  check(
    f.told === "The file needs a name." && w.entity === e && w.modified,
    "a blank name: said so, and it stays",
  );
  e.name = name;

  f.asked = 0;
  f.texts = 0;
  w.newItem.action!();
  check(
    f.asked === 1 &&
      f.texts === 0 &&
      w.entity !== e &&
      w.file === undefined &&
      !w.modified &&
      w.entity.stat[C.Body] === 1,
    "Save, and a file chosen: saved, then a new character",
  );
  check(
    f.downloads.length === 1 && f.downloads[0]!.name === "Kei Tanaka.yaml",
    "downloaded as the character's name",
  );
  const es = reload(f.downloads[0]?.text);
  check(
    es !== undefined &&
      es.length === 1 &&
      es[0]!.name === "Kei Tanaka" &&
      es[0]!.stat[C.Body] === 5,
    "the file saved holds the character",
  );
  check(
    es !== undefined &&
      es[0]!.hp.overridden &&
      C.value(es[0]!.hp) === 99 &&
      es[0]!.ar.overridden &&
      C.value(es[0]!.ar) === 3 &&
      !es[0]!.sv.overridden,
    "with its overrides, and only those",
  );

  changed(w, (x) => {
    x.stat[C.Mind] = 3;
    Ch.useStat(x, C.Mind);
  });
  f.answer = Discard;
  f.asked = 0;
  e = w.entity;
  w.newItem.action!();
  check(
    f.asked === 1 &&
      f.question === "Save the changes to the character first?" &&
      w.entity !== e &&
      !w.modified,
    "Don't save: a new character, unnamed in the question",
  );
  w.newItem.action!();
  check(f.asked === 1, "unchanged, File > New doesn't ask");
  check(f.downloads.length === 1, "and nothing more downloaded");
  done();
});

test("Files", async () => {
  const { w, f, doc } = newWindow();
  const { check, done } = checker();
  const title = () => doc.title;

  f.chosen = "window.yaml";
  w.openItem.action!();
  await settled();
  const e = w.entity;
  check(f.accepted === ".yaml,.yml", "Open... asks for a YAML file");
  check(
    w.entities.length === 2 &&
      w.current === 1 &&
      e.name === "Pilot" &&
      w.entities[0]!.isMecha,
    "File > Open: every entity, the first character shown, after the mecha",
  );
  check(
    f.tells === 0 && !w.modified,
    "a file the rules agree with: nothing said, unchanged",
  );
  check(
    title() === Title + " - window.yaml (2 of 2)",
    "the title names the file, and which of its entities is shown",
  );
  check(w.file === "window.yaml", "and the path is kept");

  w.saveItem.action!();
  check(
    f.downloads.length === 1 &&
      f.downloads[0]!.name === "window.yaml" &&
      f.texts === 0,
    "File > Save, unchanged: as the file's name, without asking",
  );
  check(
    f.downloads[0]?.text === golden("window"),
    "the bytes besm2_calc_po --fill writes",
  );

  changed(w, (x) => {
    x.stat[C.Body] = 6;
    Ch.useStat(x, C.Body);
  });
  check(title() === Title + " - window.yaml (2 of 2) *", "changed: *");
  f.typed = "window-two";
  w.saveAsItem.action!();
  check(f.suggested === "window.yaml", "Save As... suggests the file's name");
  check(
    w.file === "window-two.yaml" && !w.modified,
    "File > Save As: saved, to the file now shown",
  );
  check(
    title() === Title + " - window-two.yaml (2 of 2)",
    "and the title names it",
  );
  let es = reload(f.downloads.at(-1)?.text);
  check(
    f.downloads.at(-1)?.name === "window-two.yaml" &&
      es !== undefined &&
      es.length === 2 &&
      es[0]!.name === "Walker" &&
      es[0]!.isMecha &&
      es[1]!.name === "Pilot" &&
      es[1]!.stat[C.Body] === 6 &&
      C.value(es[1]!.statPoints[C.Body]!) === 6,
    "every entity saved, in order, with the change",
  );
  changed(w, (x) => {
    x.stat[C.Soul] = 5;
    Ch.useStat(x, C.Soul);
  });
  f.typed = undefined;
  f.texts = 0;
  w.saveItem.action!();
  es = reload(f.downloads.at(-1)?.text);
  check(
    !w.modified &&
      f.texts === 0 &&
      f.downloads.at(-1)?.name === "window-two.yaml" &&
      es !== undefined &&
      es[1]!.stat[C.Soul] === 5,
    "File > Save: to the same file, without asking",
  );
  f.typed = undefined;
  const n = f.downloads.length;
  w.saveAsItem.action!();
  check(
    f.downloads.length === n && w.file === "window-two.yaml",
    "Save As... cancelled: nothing saved",
  );

  changed(w, (x) => {
    x.stat[C.Soul] = 4;
    Ch.useStat(x, C.Soul);
  });
  f.answer = Cancel;
  f.asked = 0;
  f.chooses = 0;
  f.chosen = "bare.yaml";
  w.openItem.action!();
  await settled();
  check(
    f.asked === 1 &&
      f.question === "Save the changes to window-two.yaml first?" &&
      f.chooses === 0 &&
      w.entity.name === "Pilot",
    "File > Open with changes asks first; Cancel: nothing opened",
  );
  f.answer = Discard;
  w.openItem.action!();
  await settled();
  check(w.entity.name === "Bare" && !w.modified, "Don't save: opened");
  check(
    title() === Title + " - bare.yaml",
    "the title names it, of one entity",
  );

  // Bare: a file's entity with no Stats or derived values gets the ones
  // changed.
  const b = w.entity;
  check(
    b.fromFile && b.stats === undefined && b.derived === undefined,
    "a file's character without Stats or derived values",
  );
  w.saveItem.action!();
  check(
    f.downloads.at(-1)?.text === golden("bare"),
    "saved unchanged: what besm2_calc_po --fill writes",
  );
  changed(w, (x) => {
    x.stat[C.Mind] = 3;
    Ch.useStat(x, C.Mind);
    C.override(x.ep, 7);
    Ch.useDerived(x, Ch.EP);
  });
  f.typed = "bare-two.yaml";
  w.saveAsItem.action!();
  es = reload(f.downloads.at(-1)?.text);
  check(
    es !== undefined &&
      es[0]!.stats !== undefined &&
      es[0]!.stat[C.Mind] === 3 &&
      es[0]!.derived !== undefined &&
      es[0]!.ep.overridden &&
      C.value(es[0]!.ep) === 7,
    "saves the Stat and the derived value changed",
  );
  done();
});

test("Notices", async () => {
  const { w, f } = newWindow();
  const { check, done } = checker();
  f.chosen = "differs.yaml";
  f.answer = Discard;
  w.openItem.action!();
  await settled();
  const e = w.entity;
  check(
    f.tells === 1 &&
      !w.modified &&
      e.statPoints[C.Body]!.overridden &&
      C.value(e.statPoints[C.Body]!) === 9,
    "a number the rules give differently: kept as an override, and said so",
  );
  check(
    f.told.indexOf("points is 9 in the file, 4 by the rules") > 0,
    "the notice says both numbers",
  );
  check(
    f.told.startsWith(
      "Numbers the file gives differently from the rules,\n" +
        "kept as overrides, and what else it has:\n",
    ),
    "said as besm2_cg_po says it",
  );
  const lines = f.told.split("\n");
  const longest = Math.max(...lines.map((l) => [...l].length));
  check(longest <= NoticeWidth && lines.length >= 4, "its lines wrapped at 80");
  check(
    lines.slice(3).every((l) => l.startsWith("  ")),
    "a notice's next lines indented",
  );
  w.saveItem.action!();
  check(
    f.downloads[0]?.text === golden("differs"),
    "saved: what besm2_calc_po --fill writes, the override kept",
  );
  done();
});

test("a file's mistakes, and one that can't be read", async () => {
  const { w, f, happy } = newWindow();
  const { check, done } = checker();
  assert.ok(load(w, "window.yaml"));
  const e = w.entity;
  check(!w.load("name: [\n", "bad.yaml"), "a broken file: not loaded");
  check(
    f.tells === 1 && f.told.startsWith("bad.yaml"),
    "and said so, naming it",
  );
  check(w.entity === e && w.file === "window.yaml", "nothing else changes");
  check(!w.load("", "empty.yaml"), "an empty file: not loaded");
  check(f.tells === 2 && w.entity === e, "and said so");

  const bad = new happy.File(["x"], "gone.yaml") as unknown as File;
  bad.text = () => Promise.reject(new Error("gone"));
  check(!(await w.loadFile(bad)), "a file that can't be read: not loaded");
  check(
    f.told === "gone.yaml couldn't be read: Error: gone" && w.entity === e,
    "and said so",
  );
  done();
});

test("drops", async () => {
  const { w, f, happy } = newWindow();
  const { check, done } = checker();
  const file = (name: string) =>
    new happy.File(
      [readFileSync(DATA_DIR + name, "utf8")],
      name,
    ) as unknown as File;
  w.dropped([file("window.yaml"), file("bare.yaml")]);
  check(
    f.told === "Drop one file on the page to open it." && w.file === undefined,
    "two files: said, nothing opened",
  );
  w.dropped([file("window.yaml")]);
  await settled();
  check(w.file === "window.yaml" && w.entity.name === "Pilot", "one: opened");

  changed(w, (x) => {
    x.stat[C.Body] = 6;
    Ch.useStat(x, C.Body);
  });
  f.answer = Cancel;
  f.asked = 0;
  w.dropped([file("bare.yaml")]);
  await settled();
  check(
    f.asked === 1 && w.file === "window.yaml",
    "with changes: asks first; Cancel: nothing opened",
  );

  w.dialogs.tell("a dialog");
  f.asked = 0;
  const tells = f.tells;
  w.dropped([file("bare.yaml")]);
  w.dropped([]);
  await settled();
  check(
    f.asked === 0 && f.tells === tells && w.file === "window.yaml",
    "under a dialog: nothing",
  );
  done();
});
