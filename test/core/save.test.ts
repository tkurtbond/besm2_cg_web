// save against besm2_calc_po --fill, its oracle (AGENTS.md, "Testing
// policy"): each fixture of testdata/ that --fill writes, loaded and
// saved, is byte for byte its test/golden/{fmt,cg}/NAME.fill.yaml, and
// window.yaml given campaign.yaml (--campaign) its
// window.with-campaign.fill.yaml; this repo's test/data/save/, every
// kind of string a save writes, its test/golden/save/NAME.fill.yaml.
// Each save loads again with no problem and saves the same bytes, but
// where libfyaml 0.8's emitter loses a space (folds.yaml, PLAN.md,
// Phase 3.3), as besm2_calc_po does; it notes nothing the file it was
// made from didn't (an override is still one, an empty string still
// warned of; an alias is gone).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import * as Ch from "../../src/core/character.ts";
import * as Save from "../../src/core/save.ts";

function text(path: string): string {
  return readFileSync(path, "utf8");
}

interface Fill {
  ok: boolean; // every entity loaded: --fill writes the file
  es: Ch.Entity[] | undefined;
  notes: string[];
}

/** t, a file named name, read as --fill reads it (ProcessOne). */
function fill(t: string, name: string): Fill {
  const r = Ch.readStream(t, name);
  return {
    ok: r.results.every((x) => x.entity !== undefined),
    es: r.es,
    notes: Ch.notices.map((n) => n.text),
  };
}

/** saved, made from a file that noted from, loads again with no
 *  problem, nothing new to note, and saves as saved. */
function again(saved: string, from: readonly string[], label: string): void {
  test(`${label}: loads again, nothing new noted, the same bytes`, () => {
    const r = fill(saved, "saved.yaml");
    assert.ok(r.ok);
    assert.deepEqual(
      r.notes.filter((n) => !from.includes(n)),
      [],
    );
    assert.equal(Save.toText(r.es), saved);
  });
}

const fixtures: [string, string][] = [];
for (const d of ["fmt", "cg"])
  for (const f of readdirSync(`testdata/${d}`).sort())
    if (f.endsWith(".yaml"))
      fixtures.push([
        `testdata/${d}/${f}`,
        `test/golden/${d}/${f.slice(0, -5)}`,
      ]);
for (const f of readdirSync("test/data/save").sort())
  if (f.endsWith(".yaml"))
    fixtures.push([
      `test/data/save/${f}`,
      `test/golden/save/${f.slice(0, -5)}`,
    ]);

for (const [path, golden] of fixtures) {
  const want = existsSync(`${golden}.fill.yaml`)
    ? text(`${golden}.fill.yaml`)
    : undefined;
  const f = fill(text(path), path.slice(path.lastIndexOf("/") + 1));
  test(`${path}: saved as besm2_calc_po --fill writes it`, () => {
    assert.equal(f.ok ? Save.toText(f.es) : undefined, want);
  });
  // folds.yaml, of libfyaml's lost spaces, doesn't come back the same.
  if (want !== undefined && !path.endsWith("/folds.yaml"))
    again(want, f.notes, path);
}

// folds.yaml: what besm2_calc_po --fill makes of its own --fill, and of
// that, which the port makes too (seen 2026-11-15, besm2_calc_po
// 42e58e1): each loses a space where a fold's next line starts with
// one, "words  two" becoming "words two", then "wordstwo"; the third
// saves the same bytes.
{
  const first = text("test/golden/save/folds.fill.yaml");
  const r2 = fill(first, "folds.fill.yaml");
  const second = r2.ok ? Save.toText(r2.es) : undefined;
  const r3 = fill(second ?? "", "folds.fill.yaml");
  const third = r3.ok ? Save.toText(r3.es) : undefined;
  test("folds.yaml saved again, and again: libfyaml's lost spaces lost", () => {
    assert.ok(second !== undefined && third !== undefined);
    assert.ok(!first.includes(" wordstwo"));
    assert.ok(second.includes(" words wordstwo\\\n"));
    assert.ok(third.includes(" wordstwospaces\n"));
  });
  if (third !== undefined)
    again(third, r3.notes, "folds.yaml saved a third time");
}

// --campaign campaign.yaml --fill window.yaml (besm2_calc_po's
// UseCampaign, as notices.test.ts ports it).
{
  const c = Ch.loadCampaign(text("testdata/cg/campaign.yaml"), "campaign.yaml");
  const es = fill(text("testdata/cg/window.yaml"), "window.yaml").es;
  test("window.yaml with campaign.yaml: saved as --campaign --fill writes it", () => {
    assert.ok(c.ok && es !== undefined);
    for (const e of es) if (!e.isMecha) Ch.takeCreation(e, c.from);
    Ch.computeAll(es);
    assert.equal(
      Save.toText(es),
      text("test/golden/cg/window.with-campaign.fill.yaml"),
    );
  });
}

// ---- Campaign files ----

test("saveCampaign: only `creation`, in block style", () => {
  const c = Ch.loadCampaign(text("testdata/cg/campaign.yaml"), "campaign.yaml");
  assert.ok(c.ok);
  const s = Save.saveCampaign(c.from);
  assert.ok(s.ok);
  assert.equal(
    s.text,
    "creation:\n  character-points: 40\n  genre: Modern Military\n  options:\n    stat-points-ceiling: 6\n    stat-points-floor: 4\n",
  );
});

test("saveCampaign of no creation: an empty mapping", () => {
  const s = Save.saveCampaign(Ch.newCharacter());
  assert.ok(s.ok);
  assert.equal(s.text, "creation: {}\n");
});

// ---- Duplicate keys ----

test("two unknown keys the same once read: not built, said why", () => {
  // Keys libfyaml reads as different and the Raw holds the same: a
  // literal "a" and a double-quoted one aren't, so build one by hand.
  const r = Ch.loadAll("- name: X\n  zz: 1\n", "x.yaml");
  assert.ok(r.ok);
  const e = r.es[0]!;
  e.extra.push({ ...e.extra[0]! });
  assert.equal(Save.toText(r.es), undefined);
  assert.deepEqual(Save.saveAll(r.es), {
    ok: false,
    msg: "the entities' YAML couldn't be built (a duplicate key)",
  });
  assert.equal(Save.copy(r.es, 0), undefined);
});

test("no entities: an empty sequence", () => {
  assert.equal(Save.toText([]), "[]\n");
  assert.equal(Save.toText(undefined), "[]\n");
});

test("a genre key with no genre: genre left out (Besm2Save's Creation)", () => {
  const e = Ch.newCharacter();
  const c = Ch.copyCreation(e.creation);
  c.characterPoints = 30;
  Ch.setCreation(
    e,
    c,
    new Set([Ch.CharacterPointsKey, Ch.GenreKey, Ch.SkillPointsKey]),
    false,
  );
  const s = Save.saveCampaign(e);
  assert.ok(s.ok);
  assert.equal(s.text, "creation:\n  character-points: 30\n");
});
