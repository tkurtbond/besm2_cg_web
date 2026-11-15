// Each fixture read here says what besm2_calc_po --check and --fill say
// of it on standard error (test/golden/{fmt,cg}/NAME.{check,fill}.err;
// no file: nothing), line for line: its problems, "besm2_calc_po: "
// and, without a polibfyaml error, "error processing "; then its
// notices, "NAME: KIND: TEXT"; and with --fill and a problem, that the
// file wasn't written. besm2_calc_po's Besm2CalcMain.ProcessOne, which
// this follows. window.with-CAMPAIGN is --campaign CAMPAIGN.yaml on
// window.yaml (tools/golden.sh), its UseCampaign ported here.
//
// A syntax error is compared by its file, line and column, but its words
// only where the port takes libfyaml's (PLAN.md, Phase 3.1, 2026-11-15).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import * as Ch from "../../src/core/character.ts";
import * as Save from "../../src/core/save.ts";

const Program = "besm2_calc_po";

const syntax = /^(besm2_calc_po: [^:]+:\d+:\d+: error: )(.*)$/;
const libfyamls = [
  "duplicate key",
  "tab character may not be used as indentation",
];

/** l, with a syntax error's words left out unless they are libfyaml's. */
function words(l: string): string {
  const m = syntax.exec(l);
  return m === null || libfyamls.includes(m[2]!) ? l : m[1]!;
}

// e's creation as save would write it, to compare (CreationText).
function creationText(e: Ch.Entity): string {
  const x = Ch.newCharacter();
  Ch.takeCreation(x, e);
  return Save.toText(Ch.one(x))!;
}

// Each character of es given campaign's creation, from the file named
// file; a difference notice for each whose own differed (UseCampaign).
function useCampaign(es: Ch.Entity[], campaign: Ch.Entity, file: string) {
  const want = creationText(campaign);
  for (const e of es)
    if (!e.isMecha) {
      if (creationText(e) !== want)
        Ch.addNotice(
          Ch.Difference,
          `${e.label}: creation differs from the campaign's, ${file}, which is used`,
        );
      Ch.takeCreation(e, campaign);
    }
  Ch.computeAll(es);
}

function lines(
  name: string,
  fill: boolean,
  campaign?: { from: Ch.Entity; file: string },
): string[] {
  const { results, es } = Ch.readStream(text(name), base(name));
  if (campaign !== undefined && es !== undefined)
    useCampaign(es, campaign.from, campaign.file);
  const r: string[] = [];
  let problems = false;
  for (const x of results)
    if (x.entity === undefined) {
      problems = true;
      r.push(
        `${Program}: ${x.yerr === undefined ? "error processing " : ""}${Ch.problem(x, base(name))}`,
      );
    }
  for (const n of Ch.notices) {
    const kind =
      n.kind === Ch.Difference
        ? "difference"
        : n.kind === Ch.Error
          ? "error"
          : "warning";
    r.push(`${base(name)}: ${kind}: ${n.text}`);
  }
  if (fill && problems)
    r.push(
      `${Program}: ${base(name)}: not written, since an entity didn't load`,
    );
  return r;
}

function base(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

function text(path: string): string {
  return readFileSync(path, "utf8");
}

for (const d of ["fmt", "cg"]) {
  for (const f of readdirSync(`testdata/${d}`).sort()) {
    if (!f.endsWith(".yaml")) continue;
    const n = f.slice(0, -".yaml".length);
    for (const mode of ["check", "fill"]) {
      const g = `test/golden/${d}/${n}.${mode}.err`;
      const want = existsSync(g)
        ? text(g)
            .split("\n")
            .filter((l) => l !== "")
        : [];
      test(`${d}/${n} --${mode}: the notices of besm2_calc_po`, () => {
        assert.deepEqual(
          lines(`testdata/${d}/${f}`, mode === "fill").map(words),
          want.map(words),
        );
      });
    }
  }
}

// --campaign CAMPAIGN.yaml --MODE window.yaml: a campaign that doesn't
// load is besm2_calc_po's only line; one that does is used.
for (const f of readdirSync("testdata/cg").sort()) {
  if (!f.startsWith("campaign") || !f.endsWith(".yaml")) continue;
  const n = `window.with-${f.slice(0, -".yaml".length)}`;
  for (const mode of ["check", "fill"]) {
    const g = `test/golden/cg/${n}.${mode}.err`;
    const want = existsSync(g)
      ? text(g)
          .split("\n")
          .filter((l) => l !== "")
      : [];
    test(`cg/${n} --${mode}: the notices of besm2_calc_po`, () => {
      const c = Ch.loadCampaign(text(`testdata/cg/${f}`), f);
      const got = c.ok
        ? lines("testdata/cg/window.yaml", mode === "fill", {
            from: c.from,
            file: f,
          })
        : [`${Program}: ${c.msg}`];
      assert.deepEqual(got, want);
    });
  }
}
