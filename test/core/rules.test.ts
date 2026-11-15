// The checks of besm2_cg_po's test/TestRules.Mod, with its labels: what
// rules must be whatever the tables of besm2_cg_po's rules/ say: how many
// items of each kind (its PLAN.md, A2), names found once, pages in their
// chapter's span and PDF pages at + 2, the label format (AGENTS.md), the
// aliases, the options' shape, and the small tables (Table 2-4, p. 117;
// Table 4-7, p. 166) at a few places. Every item's numbers are checked
// by the listing's equality with besm2_cg_po's (below), which its
// tools/check-rules.py checks against rules/*.tsv and check-pages.py
// against the PDF's headings.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as R from "../../src/core/rules.ts";
import { listRules } from "../../tools/listrules.ts";

const notes: string[] = [];
function note(name: string, what: string): void {
  notes.push(`${name}: ${what}`);
}
function check(ok: boolean, label: string): void {
  test(label, () =>
    assert.ok(
      ok,
      notes.length > 0 ? `${label}\n  ${notes.join("\n  ")}` : label,
    ),
  );
}

// Counts
check(R.count(R.Stat) === 3, "3 Stats");
check(R.count(R.Attribute) === 76, "76 Attributes (pp. 20-81)");
check(R.count(R.MechaAttribute) === 13, "13 Mecha Attributes (pp. 93-99)");
check(R.count(R.Defect) === 38, "38 Defects (pp. 101-113)");
check(R.count(R.MechaDefect) === 10, "10 Mecha-Only Defects (pp. 114-116)");
check(R.count(R.Skill) === 52, "52 Skills (pp. 120-128)");
check(R.count(R.Ability) === 34, "34 Weapon Attack Abilities (pp. 83-89)");
check(
  R.count(R.Disability) === 21,
  "21 Weapon Attack Disabilities (pp. 89-92)",
);

// Each kind's printed pages.
const span: Record<R.Kind, [number, number]> = {
  [R.Stat]: [15, 15],
  [R.Attribute]: [20, 81],
  [R.MechaAttribute]: [93, 99],
  [R.Defect]: [101, 113],
  [R.MechaDefect]: [114, 116],
  [R.Skill]: [120, 128],
  [R.Ability]: [83, 89],
  [R.Disability]: [89, 92],
};

// Items
{
  let found = true;
  let pages = true;
  let order = true;
  let kinds = true;
  let opts = true;
  for (const k of R.kinds) {
    const [first, last] = span[k];
    let prev = first;
    for (let i = 0; i < R.count(k); i++) {
      const it = R.get(k, i);
      if (it.kind !== k) {
        kinds = false;
        note(it.name, "of another kind");
      }
      // Found by its name, in any case, as itself; Stealth is two
      const f = R.find(it.name);
      if (
        f !== it &&
        !(
          it.name === "Stealth" &&
          k === R.Skill &&
          f !== undefined &&
          f.kind === R.Attribute
        )
      ) {
        found = false;
        note(it.name, "find gives another item");
      }
      if (R.findKind(k, it.name) !== it) {
        found = false;
        note(it.name, "findKind gives another item");
      }
      if (it.page < first || it.page > last) {
        pages = false;
        note(it.name, "page outside its chapter");
      }
      if (R.pdfPage(it) !== it.page + 2) {
        pages = false;
        note(it.name, "PDF page is not page + 2");
      }
      if (it.page < prev) {
        order = false;
        note(it.name, "before the item it follows");
      }
      prev = it.page;
      // An Attribute costing 0 a Level has its cost from its choices: a
      // required one, or those it adds up (Environmental Control)
      if (k === R.Attribute || k === R.MechaAttribute) {
        let required = false;
        let adds = false;
        for (const o of it.option) {
          if (o.group > 0) {
            required = true;
            if (!o.perLevel || o.amount <= 0) {
              opts = false;
              note(it.name, "a required choice not a cost a Level");
            }
          }
          if (o.perLevel && o.amount > 0) adds = true;
          if (o.maxTimes < 1 || o.label === "") {
            opts = false;
            note(it.name, "an option without a label or times");
          }
        }
        if (it.cost === 0 && !adds && !R.hasFlag(it, R.GmCost)) {
          opts = false;
          note(it.name, "costs nothing");
        }
        if (required && it.cost !== 0) {
          opts = false;
          note(it.name, "a cost and a required choice");
        }
        if (
          it.maxLevel !== 2 &&
          it.maxLevel !== 6 &&
          it.maxLevel !== R.Unlimited
        ) {
          opts = false;
          note(it.name, "a highest Level not 2, 6 or unlimited");
        }
      }
    }
  }
  check(kinds, "every item is of the kind it is listed under");
  check(found, "every item is found by its name");
  check(pages, "every page is in its chapter, and its PDF page is page + 2");
  check(order, "the items are in the book's order");
  check(
    opts,
    "each Attribute's cost is its own or its choices', and its Levels 2, 6 or unlimited",
  );
}

// Finding
{
  let it = R.find("highly skilled");
  check(it !== undefined && it.name === "Highly Skilled", "Find ignores case");
  check(
    R.find("Natural Attack") === undefined,
    "Find gives NIL for a name the book doesn't have",
  );
  check(
    R.find("Weapon") === R.find("Weapon Attack"),
    "Find: Weapon is Weapon Attack (BESM 2nd edition)",
  );
  check(
    R.find("Hanger Queen") === R.find("Hangar Queen"),
    "Find: Hanger Queen is Hangar Queen",
  );
  check(
    R.find("Accessories") === R.find("Features or Accessories"),
    "Find: Accessories",
  );
  check(
    R.find("features") === R.find("Features or Accessories"),
    "Find: Features, in any case",
  );
  check(
    R.find("Electronic Counter-Measures (ECM)") === R.find("ECM"),
    "Find: the heading's full name",
  );
  check(
    R.find("Unarmed Defence") === R.find("Unarmed Defense"),
    "Find: Unarmed Defence",
  );
  it = R.findKind(R.Skill, "Stealth");
  check(
    it !== undefined && it.page === 125,
    "FindKind: Stealth the Skill (p. 125)",
  );
  it = R.find("Stealth");
  check(
    it !== undefined && it.kind === R.Attribute && it.page === 73,
    "Find: Stealth the Attribute (p. 73)",
  );
  check(
    R.findKind(R.Defect, "Weapon") === undefined,
    "FindKind: an alias of another kind isn't found",
  );
}

function must(it: R.Item | undefined): R.Item {
  if (it === undefined) throw new Error("an item the tables must have");
  return it;
}

// Labels
check(
  R.label(must(R.find("Highly Skilled"))) === "Highly Skilled (p. 42, PDF 44)",
  "Label: Highly Skilled (p. 42, PDF 44)",
);
check(
  R.label(must(R.findKind(R.Ability, "Accurate"))) ===
    "Accurate (p. 83, PDF 85)",
  "Label: Accurate (p. 83, PDF 85)",
);
check(
  R.labelOf("Weapon") === "Weapon (p. 81, PDF 83)",
  "LabelOf keeps the name as written: Weapon (p. 81, PDF 83)",
);
check(
  R.labelOf("Natural Attack") === "Natural Attack (p. ?)",
  "LabelOf: Natural Attack (p. ?)",
);
check(R.pageText(undefined) === "p. ?", "PageText of NIL: p. ?");
check(
  R.pageText(R.find("Wind Powered")) === "p. 116, PDF 118",
  "PageText: p. 116, PDF 118",
);
check(
  R.pageLabel("Secondary Attacks", R.AlternateAttacksPage) ===
    "Secondary Attacks (p. 82, PDF 84)",
  "PageLabel: a rule's page",
);
check(R.pdfPage(undefined) === 0, "PdfPage of NIL is 0");
check(R.pdfIndex(R.StagedStatCostPage) === 168, "PdfIndex: p. 166 is PDF 168");

// Numbers
{
  let it = must(R.find("Highly Skilled"));
  check(
    it.cost === 1 && it.maxLevel === R.Unlimited,
    "Highly Skilled: 1 a Level, no highest Level",
  );
  it = must(R.find("Weapon Attack"));
  check(
    it.cost === 4 && R.hasFlag(it, R.Subject),
    "Weapon Attack: 4 a Level, names its weapon",
  );
  it = must(R.find("Own a Big Mecha"));
  check(
    it.cost === 4 &&
      it.minCost === 1 &&
      it.option.length === 1 &&
      it.option[0]?.amount === -1 &&
      it.option[0]?.maxTimes === R.Unlimited,
    "Own a Big Mecha: 4 a Level, -1 for each Less Powerful, at least 1",
  );
  it = must(R.find("Environmental Control"));
  check(
    it.cost === 0 && it.option.length === 9,
    "Environmental Control: 9 choices",
  );
  it = must(R.find("Flight"));
  const o0 = it.option[0];
  const o2 = it.option[2];
  check(
    o0 !== undefined &&
      o2 !== undefined &&
      o0.amount === 4 &&
      o0.perLevel &&
      o0.group === 1 &&
      o2.amount === -1 &&
      !o2.perLevel &&
      o2.group < 0,
    "Flight: 4 a Level hovering, -1 on the total as a skimmer",
  );
  it = must(R.find("A.I."));
  check(
    it.kind === R.MechaAttribute && R.hasFlag(it, R.MechaOnly) && it.cost === 2,
    "A.I.: Mecha Only, 2 a Level",
  );
  it = must(R.find("Mechanical Transformation"));
  check(
    !R.hasFlag(it, R.MechaOnly),
    "Mechanical Transformation: not Mecha Only",
  );
  it = must(R.find("Diminutive"));
  check(
    it.cost === 3 && it.maxLevel === 2 && R.hasFlag(it, R.Special),
    "Diminutive: 3 BP a rank, 2 ranks, Special",
  );
  it = must(R.find("Awkward Size"));
  check(it.maxLevel === 6, "Awkward Size: 6 ranks");
  it = must(R.find("Ageism"));
  check(
    it.cost === 1 && it.maxLevel === 2 && !R.hasFlag(it, R.Special),
    "Ageism: 1 BP a rank, 2 ranks, Normal",
  );
  it = must(R.find("Crew Requirement"));
  check(
    it.kind === R.MechaDefect && it.maxLevel === 6,
    "Crew Requirement: a Mecha-Only Defect of 6 ranks",
  );
  it = must(R.find("Contagious"));
  check(
    it.slots === 3 && it.maxTimes === 2 && R.hasFlag(it, R.NeedsDetail),
    "Contagious: 3 slots, twice",
  );
  it = must(R.find("Soul Attack"));
  check(
    it.slots === 5 && it.altSlots === 2 && R.hasFlag(it, R.NotPersonalGear),
    "Soul Attack: 5 slots, 2 with No Damage",
  );
  it = must(R.find("Area Effect"));
  check(it.maxTimes === R.Unlimited, "Area Effect: as often as wanted");
  it = must(R.find("Exposed (Mecha Only)"));
  check(
    it.kind === R.Disability && R.hasFlag(it, R.MechaOnly),
    "Exposed (Mecha Only): a Mecha Only Disability",
  );
  check(
    R.excludes(R.find("Melee"), R.find("Stoppable")) &&
      R.excludes(R.find("Stoppable"), R.find("Melee")),
    "Excludes: Melee and Stoppable, either way",
  );
  check(
    !R.excludes(R.find("Accurate"), R.find("Aura")),
    "Excludes: not Accurate and Aura",
  );
}

// Tables
{
  let it = must(R.findKind(R.Skill, "Driving"));
  check(
    it.skillCost[R.HotRodsAndGuns] === 6 && it.skillCost[R.Cyberpunk] === 3,
    "Table 2-4: Driving 3 Cyberpunk, 6 Hot Rods and Guns",
  );
  it = must(R.find("Heavy Weapons"));
  check(
    it.skillCost[R.TeenageRomance] === R.NotOffered,
    "Table 2-4: no Heavy Weapons in Teenage Romance",
  );
  it = must(R.find("Computers"));
  check(
    it.skillCost[R.MedievalFantasy] === R.NotOffered,
    "Table 2-4: no Computers in Medieval Fantasy",
  );
  let ok = true;
  for (let g = 0; g < R.NGenres; g++) {
    const s = R.genreName(g);
    if (R.findGenre(s) !== g) {
      ok = false;
      note(s, "not found");
    }
  }
  check(ok, "every genre is found by its name");
  check(
    R.findGenre("modern military") === R.ModernMilitary,
    "FindGenre ignores case",
  );
  check(
    R.findGenre("Western") === -1,
    "FindGenre: -1 for a genre Table 2-4 doesn't have",
  );
  check(
    R.genreName(R.HotRodsAndGuns) === "Hot Rods and Guns",
    "GenreName: Hot Rods and Guns",
  );
  let total = 0;
  for (let g = 1; g <= 12; g++) total += R.stagedStatCost(g);
  check(
    R.stagedStatCost(5) === 5 &&
      R.stagedStatCost(6) === 7 &&
      R.stagedStatCost(9) === 14 &&
      R.stagedStatCost(12) === 24 &&
      total === 117,
    "Table 4-7: Staged Stat Costs 5, 7, 14, 24",
  );
}

// Beyond TestRules: what the port adds.

// The listing carries besm2_cg_po's check-rules.py (rules/*.tsv) and
// check-pages.py (the PDF) over: the same tables print the same bytes.
test("tools/listrules.ts prints besm2_cg_po's listing (test/golden/rules.txt)", () => {
  const golden = readFileSync(
    new URL("../golden/rules.txt", import.meta.url),
    "utf8",
  );
  const got = listRules();
  if (got !== golden) {
    const g = golden.split("\n");
    const o = got.split("\n");
    const i = o.findIndex((line, n) => line !== g[n]);
    assert.fail(`line ${i + 1} differs:\n  golden: ${g[i]}\n  port:   ${o[i]}`);
  }
});

// sameName ignores ASCII case only, as the Oberon's Lower does.
check(
  R.sameName("Ab", "aB") && !R.sameName("Ab", "Abc") && !R.sameName("É", "é"),
  "sameName: ASCII case only",
);
test("stagedStatCost refuses a Stat outside 1-12", () => {
  assert.throws(() => R.stagedStatCost(0));
  assert.throws(() => R.stagedStatCost(13));
});
