// save-files.ts OUT: what the page saves of each fixture, for
// test/files.sh (PLAN.md, Phase 3.4). Each fixture of testdata/fmt,
// testdata/cg and test/data/save, read as besm2_calc_po --fill reads it,
// is saved as OUT/{fmt,cg,save}/NAME.yaml when every entity loads (when
// --fill would write it), and not at all otherwise; window.yaml given
// each testdata/cg/campaign*.yaml, as --campaign does (notices.test.ts),
// as OUT/cg/window.with-CAMPAIGN.yaml.
//
// Run with node from the repo's top directory.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import * as Ch from "../src/core/character.ts";
import * as Save from "../src/core/save.ts";

function usage(): never {
  console.error("usage: save-files.ts OUT");
  process.exit(2);
}
const out: string = process.argv[2] ?? usage();

function text(path: string): string {
  return readFileSync(path, "utf8");
}

/** The file at path, read: ok when every entity loaded (none at all,
 *  --fill writes `[]`). */
function load(path: string): { ok: boolean; es: Ch.Entity[] | undefined } {
  const r = Ch.readStream(text(path), path.slice(path.lastIndexOf("/") + 1));
  return { ok: r.results.every((x) => x.entity !== undefined), es: r.es };
}

function write(path: string, es: Ch.Entity[] | undefined): void {
  const s = Save.saveAll(es);
  if (!s.ok) throw new Error(`${path}: ${s.msg}`);
  writeFileSync(path, s.text);
}

let n = 0;
const dirs: [string, string][] = [
  ["testdata/fmt", "fmt"],
  ["testdata/cg", "cg"],
  ["test/data/save", "save"],
];
for (const [dir, to] of dirs) {
  mkdirSync(`${out}/${to}`, { recursive: true });
  for (const f of readdirSync(dir).sort()) {
    if (!f.endsWith(".yaml")) continue;
    const r = load(`${dir}/${f}`);
    if (!r.ok) continue;
    write(`${out}/${to}/${f}`, r.es);
    n++;
  }
}

for (const f of readdirSync("testdata/cg").sort()) {
  if (!f.startsWith("campaign") || !f.endsWith(".yaml")) continue;
  const c = Ch.loadCampaign(text(`testdata/cg/${f}`), f);
  if (!c.ok) continue;
  const { ok, es } = load("testdata/cg/window.yaml");
  if (!ok || es === undefined) continue;
  for (const e of es) if (!e.isMecha) Ch.takeCreation(e, c.from);
  Ch.computeAll(es);
  write(`${out}/cg/window.with-${f}`, es);
  n++;
}
console.log(`# save-files: ${n} files saved into ${out}`);
