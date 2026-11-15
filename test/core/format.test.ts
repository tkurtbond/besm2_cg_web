// The formatters (PLAN.md, Phase 4), against two oracles:
//
// - pobesm2_fmt2's golden cases (test/golden/fmt2/golden.cases, run as
//   its test/golden.sh runs them), byte for byte: Besm2Fmt's main is
//   ported here as fmt2, with its options (Besm2Cli) and the modes
//   golden.sh has: stdout, all, stdin and file.
// - besm2_calc_po's formats of each fixture of testdata/{fmt,cg}
//   (test/golden/{fmt,cg}/NAME.ID.out and .err, and the status file):
//   read as character reads, saved, and each entity of the saved
//   document loaded and formatted, as Besm2CalcMain.FormatFile does.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import * as Ch from "../../src/core/character.ts";
import * as Cfg from "../../src/core/config.ts";
import { config, resetConfig } from "../../src/core/config.ts";
import * as Entities from "../../src/core/entities.ts";
import { parseStream, type YamlError } from "../../src/core/fyaml.ts";
import * as Grid from "../../src/core/grid.ts";
import * as Hmm from "../../src/core/hmm.ts";
import * as Out from "../../src/core/out.ts";
import * as RawMs from "../../src/core/rawms.ts";
import * as Save from "../../src/core/save.ts";
import * as Terse from "../../src/core/terse.ts";

function text(path: string): string {
  return readFileSync(path, "utf8");
}

/** The options of Besm2Cli that the cases use, set in config from
 *  their defaults. */
function setOptions(flags: string[]): void {
  resetConfig();
  for (let i = 0; i < flags.length; i++) {
    const arg = (): string => {
      const a = flags[++i];
      if (a === undefined) throw new Error(`${flags[i - 1]} needs a value`);
      return a;
    };
    switch (flags[i]) {
      case "-1":
        config.oneTable = true;
        config.headSep = "-";
        break;
      case "-B":
        config.boldHead = false;
        break;
      case "-b":
        config.bolding = true;
        break;
      case "-D":
        config.omitEntityDescription = true;
        break;
      case "-H":
        config.format = Cfg.Hmm;
        config.hmmOutput = true;
        break;
      case "-L":
        config.hmmDepth = Number(arg());
        break;
      case "-R":
        config.hmmRoot = arg();
        break;
      case "-S":
        config.hmmSeparate = true;
        break;
      case "-i":
        config.italicizing = true;
        break;
      case "-l":
        config.level = true;
        break;
      case "-M":
        config.emDash = true;
        break;
      case "-m":
        config.format = Cfg.RawMs;
        break;
      case "-n":
        config.unicodeMinus = false;
        break;
      case "-o":
        config.outputFile = arg();
        break;
      case "-p":
        config.pageAfterDescription = true;
        break;
      case "-s":
        config.showSubtotals = true;
        break;
      case "-t":
        config.format = Cfg.Terse;
        break;
      case "-U":
        config.subunderliner = arg();
        break;
      case "-u":
        config.underliner = arg();
        break;
      case "-w":
        config.tableWidth = Math.max(25, Number(arg()));
        break;
      default:
        throw new Error(`no such option here: ${flags[i]}`);
    }
  }
}

/** Besm2Fmt.ProcessDocument's and Besm2CalcMain.Format's dispatch. */
function format(e: Entities.Entity, count: number): void {
  switch (config.format) {
    case Cfg.Terse:
      return Terse.processEntity(e, count);
    case Cfg.Grid:
      return Grid.processEntity(e, count);
    case Cfg.Hmm:
      return Hmm.processEntity(e, count);
    case Cfg.RawMs:
      return RawMs.processEntity(e, count);
  }
}

// ---- pobesm2_fmt2's golden cases ----

/** What a run wrote: standard output, standard error, both in the order
 *  written (as 2>&1 to one file), the -o file's, and its status. */
interface Run {
  stdout: string;
  stderr: string;
  both: string;
  file: string;
  status: number;
}

/** Besm2Fmt's Main on the files given, each {text, source}, with the
 *  options already set. Besm2Out keeps its output, taken (flushed) to
 *  standard output, or the -o file, wherever the Oberon flushes. */
function fmt2(files: { text: string; source: string }[]): Run {
  const run: Run = { stdout: "", stderr: "", both: "", file: "", status: 0 };
  let errorsReported = false;
  const flush = (): void => {
    const r = Out.takeRope();
    if (r === undefined) return;
    if (config.outputFile !== undefined) run.file += r;
    else {
      run.stdout += r;
      run.both += r;
    }
  };
  const err = (s: string): void => {
    run.stderr += s;
    run.both += s;
  };
  const report = (source: string, msg: string): void => {
    errorsReported = true;
    flush();
    err(`besm2_fmt: error processing ${source}: ${msg}\n`);
  };
  const reportYaml = (e: YamlError): void => {
    errorsReported = true;
    flush();
    err(`besm2_fmt: ${e.msg}`);
  };

  Out.toRope();
  if (config.hmmOutput && config.hmmRoot !== undefined) {
    Out.repeat("\t", config.hmmDepth);
    Out.rope(config.hmmRoot);
    Out.ln();
  }
  for (const { text, source } of files) {
    const s = parseStream(text, source);
    let count = 0;
    let ended = false;
    for (const d of s.docs) {
      // A FyamlStreams stream resolves each document as it reads it: a
      // resolve error is the stream's, and ends the file.
      const yerr = d.resolve();
      if (yerr !== undefined) {
        reportYaml(yerr);
        ended = true;
        break;
      }
      const root = d.root();
      if (root === undefined || !root.isSequence()) {
        report(
          source,
          `expected a top-level YAML sequence of entities in ${source}`,
        );
        continue;
      }
      for (const item of root.items) {
        const x = Entities.load(item);
        if (!x.ok) {
          if (x.yerr !== undefined) reportYaml(x.yerr);
          else report(source, x.msg);
        } else format(x.entity, ++count);
      }
    }
    if (!ended && s.err !== undefined) reportYaml(s.err);
  }
  flush();
  run.status = errorsReported ? 1 : 0;
  return run;
}

/** An extglob of golden.sh's (`*`, `@(a|b)`) as an anchored regexp. */
function globRegExp(g: string): RegExp {
  let r = "";
  for (let i = 0; i < g.length; i++) {
    const c = g[i]!;
    if (c === "@" && g[i + 1] === "(") {
      r += "(?:";
      i++;
    } else if (c === "*") r += ".*";
    else if (c === "|" || c === ")") r += c;
    else r += c.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${r}$`);
}

// The glob's order: bash sorts a glob's matches by the locale's
// collation (en_US.UTF-8, where the goldens were made), so that
// FV2021-Coleopteran-2e comes between enyon-boase-2e and notes-2e.
const collator = new Intl.Collator("en-US");
const fixtures = readdirSync("testdata/fmt")
  .filter((f) => f.endsWith(".yaml"))
  .map((f) => f.slice(0, -".yaml".length))
  .sort(collator.compare);

test("fmt2: the glob's order is bash's", () => {
  assert.deepEqual(
    fixtures.filter((f) => f.endsWith("-2e")),
    [
      "composite-2e",
      "composite-multi-doc-2e",
      "empty-items-2e",
      "empty-strings-2e",
      "enyon-boase-2e",
      "FV2021-Coleopteran-2e",
      "notes-2e",
      "sections-2e",
      "synthetic-2e",
    ],
  );
});

let nCases = 0;
for (const line of text("test/golden/fmt2/golden.cases").split("\n")) {
  if (line === "" || line.startsWith("#")) continue;
  const [ref, id, pattern, ...flags] = line.trim().split(/\s+/);
  if (ref === undefined || id === undefined || pattern === undefined)
    throw new Error(`golden.cases: bad line: ${line}`);
  const modes = ref.split(":").slice(1);
  const re = globRegExp(pattern);
  const matched = fixtures.filter((f) => re.test(f));
  test(`fmt2: ${pattern} matches some fixture`, () => {
    assert.ok(matched.length > 0);
  });
  const groups = modes.includes("all") ? [matched] : matched.map((f) => [f]);
  for (const g of groups) {
    const golden = modes.includes("all")
      ? `test/golden/fmt2/${id}.out`
      : `test/golden/fmt2/${g[0]}.${id}.out`;
    const label = modes.includes("all") ? id : `${g[0]} ${id}`;
    nCases++;
    test(`fmt2: ${label} (${flags.join(" ")})`, () => {
      setOptions(modes.includes("file") ? [...flags, "-o", "o"] : flags);
      const files = g.map((f) => ({
        text: text(`testdata/fmt/${f}.yaml`),
        source: modes.includes("stdin") ? "(stdin)" : `test/data/${f}.yaml`,
      }));
      const r = fmt2(files);
      let got = modes.includes("stdout") ? r.stdout : r.both;
      if (modes.includes("file")) got += `==== -o file ====\n${r.file}`;
      if (r.status === 1) got += "==== exit 1 ====\n";
      assert.equal(got, text(golden));
      resetConfig();
    });
  }
}
test("fmt2: every golden case was tried", () => {
  assert.ok(nCases >= 500, `${nCases} cases`);
});

// ---- besm2_calc_po's formats of each fixture ----

const ids: [string, string[]][] = [
  ["grid", []],
  ["t", ["-t"]],
  ["m", ["-m"]],
  ["H", ["-H"]],
  ["H-S", ["-H", "-S"]],
  ["1", ["-1"]],
  ["b", ["-b"]],
  ["l", ["-l"]],
];

// A syntax error is compared by its file, line and column, but its words
// only where the port takes libfyaml's (notices.test.ts).
const syntax = /^(besm2_calc_po: [^:]+:\d+:\d+: error: )(.*)$/;
const libfyamls = [
  "duplicate key",
  "tab character may not be used as indentation",
];
function words(l: string): string {
  const m = syntax.exec(l);
  return m === null || libfyamls.includes(m[2]!) ? l : m[1]!;
}

/** Besm2CalcMain's ProcessOne in a format mode, on the file at path
 *  named source: its FormatFile. */
function calcFormat(
  path: string,
  source: string,
): { out: string; err: string[]; status: number } {
  const { results, es } = Ch.readStream(text(path), source);
  const err: string[] = [];
  let failed = false;
  Out.toRope();
  let items: IterableIterator<import("../../src/core/fyaml.ts").Node> = [][
    Symbol.iterator
  ]();
  if (es !== undefined) {
    const t = Save.toText(es);
    assert.ok(t !== undefined, `${source}: the entities' YAML is built`);
    const s = parseStream(t, source);
    assert.ok(s.err === undefined && s.docs.length === 1, "saved: parsed");
    items = s.docs[0]!.root()!.items[Symbol.iterator]();
  }
  let count = 0;
  for (const r of results) {
    if (r.entity === undefined) {
      failed = true;
      err.push(
        `besm2_calc_po: ${r.yerr === undefined ? "error processing " : ""}${Ch.problem(r, source)}`,
      );
      continue;
    }
    const item = items.next();
    assert.ok(!item.done, `${source}: entity ${count + 1} saved`);
    const x = Entities.load(item.value);
    assert.ok(x.ok, `${source}: entity ${count + 1} as saved loads`);
    format(x.entity, ++count);
  }
  return { out: Out.takeRope() ?? "", err, status: failed ? 1 : 0 };
}

for (const d of ["fmt", "cg"]) {
  const status = new Map<string, number>();
  for (const l of text(`test/golden/${d}/status`).split("\n")) {
    const [n, m, s] = l.split(" ");
    if (s !== undefined) status.set(`${n} ${m}`, Number(s));
  }
  for (const f of readdirSync(`testdata/${d}`).sort()) {
    if (!f.endsWith(".yaml")) continue;
    const n = f.slice(0, -".yaml".length);
    for (const [id, flags] of ids) {
      if (!status.has(`${n} ${id}`)) continue; // a campaign file
      test(`${d}/${n} (${id}): as besm2_calc_po formats it`, () => {
        setOptions(flags);
        const r = calcFormat(`testdata/${d}/${f}`, f);
        const g = `test/golden/${d}/${n}.${id}`;
        const want = (x: string): string =>
          existsSync(`${g}.${x}`) ? text(`${g}.${x}`) : "";
        assert.equal(r.out, want("out"));
        assert.deepEqual(
          r.err.map(words),
          want("err")
            .split("\n")
            .filter((l) => l !== "")
            .map(words),
        );
        assert.equal(r.status, status.get(`${n} ${id}`));
        resetConfig();
      });
    }
  }
}
