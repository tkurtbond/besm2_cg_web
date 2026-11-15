// The Preview tab (PLAN.md, Phase 12): besm2_cg_po's TestWindow.Preview,
// check for check, with Save... downloading where the Oberon writes a
// file; and every fixture's preview, in each format, against
// besm2_calc_po's format of it (test/golden/{fmt,cg}/NAME.ID.out).
//
// It writes obj/preview/preview.yaml and the preview of it in each format
// (preview-grid.rst, preview-terse.rst, preview-rawms.rst, preview.hmm),
// which test/preview.sh compares with besm2_calc_po's and pobesm2_fmt2's
// output for that file, as besm2_cg_po's test/preview.sh does.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as Ch from "../../src/core/character.ts";
import * as Save from "../../src/core/save.ts";
import * as Pv from "../../src/ui/preview.ts";
import { Discard, PreviewTab } from "../../src/ui/window.ts";
import { checker, newWindow, take } from "./setup.ts";

const OUT = "obj/preview/";

function fill(input: HTMLInputElement, text: string): void {
  input.value = text;
  input.dispatchEvent(new input.ownerDocument.defaultView!.Event("input"));
}

function contains(s: string | undefined, part: string): boolean {
  return s !== undefined && s.includes(part);
}

test("Preview", () => {
  const { check, done } = checker();
  const { w, f } = newWindow();
  const pv = w.preview;
  const displayed = (): boolean =>
    pv.text !== undefined && pv.display.textContent === pv.text;
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  f.answer = Discard;
  w.newItem.action!();
  check(pv.text === undefined, "Preview: nothing made before the tab is shown");
  w.showTab(PreviewTab);
  check(pv.text !== undefined && displayed(), "shown: made, and displayed");
  check(
    pv.format.selectedIndex === Pv.Grid &&
      pv.format.options[0]?.textContent === "reST grid tables" &&
      pv.format.options.length === 4,
    "four formats, grid tables first",
  );
  f.typed = undefined;
  f.suggested = "x";
  pv.saveAction();
  check(
    f.suggested === "",
    "Save... for a new character without a name or file: nothing suggested",
  );

  take(w, "window.yaml", "preview.yaml");
  check(
    contains(pv.text, "Pilot") && contains(pv.text, "Walker") && displayed(),
    "a file opened: all its entities, shown",
  );
  fill(w.nameIn, "Test Pilot");
  check(
    contains(pv.text, "Test Pilot") && displayed(),
    "the name typed: the preview follows",
  );
  fill(w.taglineIn, "Previewed");
  check(contains(pv.text, "Previewed"), "the tagline too");
  const saved = Save.saveAll(w.entities);
  assert.ok(saved.ok, "the entities save");
  writeFileSync(OUT + "preview.yaml", saved.text);

  /** Save... answered with name: what it downloaded, or undefined. */
  const saveAs = (name: string | undefined): string | undefined => {
    f.typed = name;
    const n = f.downloads.length;
    pv.saveAction();
    const d = f.downloads[n];
    if (d === undefined || name === undefined) return undefined;
    const want = Pv.previewName(name, pv.format.selectedIndex);
    check(d.name === want, `Save... as ${name}: downloaded as ${want}`);
    writeFileSync(OUT + d.name, d.text);
    return d.text;
  };

  check(
    saveAs(undefined) === undefined && f.suggested === "preview.rst",
    "Save...: the file's name, .rst",
  );
  check(saveAs("preview-grid.rst") === pv.text, "Save...: the text shown");
  let before = pv.text;
  pv.setFormat(Pv.Terse);
  check(
    pv.text !== undefined &&
      pv.text !== before &&
      contains(pv.text, "Test Pilot") &&
      displayed(),
    "terse: another text",
  );
  saveAs("preview-terse.rst");
  pv.setFormat(Pv.RawMs);
  check(
    contains(pv.text, ".. raw:: ms") && displayed(),
    "raw ms: a raw ms block",
  );
  saveAs("preview-rawms.rst");
  pv.setFormat(Pv.Hmm);
  saveAs(undefined);
  check(
    contains(pv.text, "Test Pilot") &&
      f.suggested === "preview.hmm" &&
      displayed(),
    "h-m-m: suggested as .hmm",
  );
  saveAs("preview.hmm");
  check(
    saveAs("typed") !== undefined && f.downloads.at(-1)?.name === "typed.hmm",
    "a name typed without the extension: given it",
  );

  before = pv.text;
  w.showTab(0);
  fill(w.nameIn, "Hidden Pilot");
  check(pv.text === before, "the tab not shown: not made again");
  w.showTab(PreviewTab);
  check(contains(pv.text, "Hidden Pilot"), "shown again: made again");

  pv.copyAction();
  check(
    f.copied.length === 1 && f.copied[0] === pv.text,
    "Copy: text on the clipboard",
  );
  // In place of the Oberon's file that can't be written: a blank name,
  // and Save... cancelled.
  let n = f.downloads.length;
  let i = f.tells;
  saveAs("  ");
  check(
    f.downloads.length === n &&
      f.tells === i + 1 &&
      f.told === "The file needs a name.",
    "Save... with a blank name: said so, nothing saved",
  );
  n = f.downloads.length;
  i = f.tells;
  saveAs(undefined);
  check(
    f.downloads.length === n && f.tells === i,
    "Save... cancelled: nothing saved, nothing said",
  );
  pv.setFormat(Pv.Grid);
  w.showTab(0);
  done();
});

test("previewName", () => {
  const { check, done } = checker();
  check(Pv.previewName("", Pv.Grid) === "", "no text: no name");
  check(Pv.previewName("  ", Pv.Hmm) === "", "blanks: no name");
  check(
    Pv.previewName(" a/b\\c ", Pv.Terse) === "a_b_c.rst",
    "trimmed, no directory",
  );
  check(Pv.previewName("x.RST", Pv.RawMs) === "x.RST", "the extension kept");
  check(Pv.previewName("x.rst", Pv.Hmm) === "x.rst.hmm", "another's added to");
  done();
});

// Each fixture whose entities all load (besm2_calc_po then formats them,
// status 0), previewed in each format: what besm2_calc_po prints for it.
const formats: [number, string][] = [
  [Pv.Grid, "grid"],
  [Pv.Terse, "t"],
  [Pv.RawMs, "m"],
  [Pv.Hmm, "H"],
];
for (const d of ["fmt", "cg"]) {
  const status = new Map<string, number>();
  for (const l of readFileSync(`test/golden/${d}/status`, "utf8").split("\n")) {
    const [n, m, s] = l.split(" ");
    if (s !== undefined) status.set(`${n} ${m}`, Number(s));
  }
  for (const file of readdirSync(`testdata/${d}`).sort()) {
    if (!file.endsWith(".yaml")) continue;
    const n = file.slice(0, -".yaml".length);
    if (!formats.every(([, id]) => status.get(`${n} ${id}`) === 0)) continue;
    test(`${d}/${n}: previewed as besm2_calc_po formats it`, () => {
      const r = Ch.readStream(
        readFileSync(`testdata/${d}/${file}`, "utf8"),
        file,
      );
      assert.ok(
        r.results.every((x) => x.entity !== undefined),
        "it loads",
      );
      for (const [fmt, id] of formats) {
        const g = `test/golden/${d}/${n}.${id}.out`;
        const want = existsSync(g) ? readFileSync(g, "utf8") : "";
        const made = Pv.text(r.es ?? [], fmt);
        assert.ok(made.ok, `${id}: made`);
        assert.equal(made.text, want, `${id}: as besm2_calc_po prints it`);
      }
    });
  }
}
