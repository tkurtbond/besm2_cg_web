// Each fixture read here says what besm2_calc_po --check and --fill say
// of it on standard error (test/golden/{fmt,cg}/NAME.{check,fill}.err;
// no file: nothing), line for line: its problems, "besm2_calc_po: "
// and, without a polibfyaml error, "error processing "; then its
// notices, "NAME: KIND: TEXT"; and with --fill and a problem, that the
// file wasn't written. besm2_calc_po's Besm2CalcMain.ProcessOne, which
// this follows. --campaign (window.with-*) needs save, Phase 3.3.
//
// A syntax error is compared by its file, line and column, but its words
// only where the port takes libfyaml's (PLAN.md, Phase 3.1, 2026-11-15).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import * as Ch from "../../src/core/character.ts";

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

function lines(name: string, fill: boolean): string[] {
  const { results } = Ch.readStream(text(name), base(name));
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
