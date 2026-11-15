// Prints src/core/rules.ts's tables, one item a line, for the checks:
// the port of besm2_cg_po's test/ListRules.Mod, whose output
// (test/golden/rules.txt) it must equal byte for byte
// (test/core/rules.test.ts).
//
// For every item a line of tab-separated fields:
//   KIND PAGE PDF NAME COST MAX MINCOST FLAGS SLOTS ALTSLOTS MAXTIMES SKILLCOSTS
// KIND is stat, attribute, mecha-attribute, defect, mecha-defect, skill,
// ability or disability; MAX and MAXTIMES are "unlimited" for Unlimited;
// FLAGS the flags' names, comma-separated; SKILLCOSTS a Skill's eight
// costs in Table 2-4's order, comma-separated. Then a line
// "alias<TAB>ALIAS<TAB>NAME" for each alias, and
// "exclude<TAB>NAME<TAB>NAME" for each pair of Weapon Abilities and
// Disabilities that don't go together, and "section<TAB>PAGE<TAB>HEADING"
// for each of the rules' pages (StatsPage, ...) with the heading it is
// checked against. besm2_cg_po's tools/check-rules.py compares it with
// its rules/*.tsv (make test), and tools/check-pages.py with the PDF's
// headings (make check-pages).
import * as R from "../src/core/rules.ts";

const kindNames = [
  "stat",
  "attribute",
  "mecha-attribute",
  "defect",
  "mecha-defect",
  "skill",
  "ability",
  "disability",
];

const flagNames: [number, string][] = [
  [R.Subject, "subject"],
  [R.MechaOnly, "mecha-only"],
  [R.GmCost, "gm-cost"],
  [R.Special, "special"],
  [R.NeedsDetail, "needs-detail"],
  [R.NotPersonalGear, "not-personal-gear"],
];

function num(n: number): string {
  return n === R.Unlimited ? "unlimited" : String(n);
}

export function listRules(): string {
  let out = "";
  for (const k of R.kinds)
    for (let i = 0; i < R.count(k); i++) {
      const it = R.get(k, i);
      const flags = flagNames
        .filter(([f]) => R.hasFlag(it, f))
        .map(([, n]) => n)
        .join(",");
      const costs = it.kind === R.Skill ? it.skillCost.join(",") : "";
      out +=
        [
          kindNames[it.kind],
          it.page,
          R.pdfPage(it),
          it.name,
          num(it.cost),
          num(it.maxLevel),
          num(it.minCost),
          flags,
          num(it.slots),
          num(it.altSlots),
          num(it.maxTimes),
          costs,
        ].join("\t") + "\n";
    }
  for (let i = 0; i < R.aliasCount(); i++) {
    const a = R.getAlias(i);
    out += `alias\t${a.alias}\t${a.item.name}\n`;
  }
  for (let k = R.Ability; k <= R.Disability; k++)
    for (let i = 0; i < R.count(k as R.Kind); i++) {
      const it = R.get(k as R.Kind, i);
      for (let g = k; g <= R.Disability; g++)
        for (let j = 0; j < R.count(g as R.Kind); j++) {
          const other = R.get(g as R.Kind, j);
          if ((g > k || j > i) && R.excludes(it, other))
            out += `exclude\t${it.name}\t${other.name}\n`;
        }
    }
  const section = (page: number, heading: string): void => {
    out += `section\t${page}\t${heading}\n`;
  };
  section(R.StatsPage, "Step 3: Assign Stats");
  section(R.AttributesPage, "Step 4: Character Attributes");
  section(R.AlternateAttacksPage, "Alternate Attacks");
  section(R.WeaponAbilitiesPage, "Weapon Attack Abilities");
  section(R.WeaponDisabilitiesPage, "Attack Disabilities");
  section(R.MechaAttributesPage, "Mecha-Only Attributes");
  section(R.DefectsPage, "Step 5: Character Defects");
  section(R.MechaDefectsPage, "Mecha-Only Defects");
  section(R.SkillsPage, "Step 6: Skill System");
  section(R.SkillsPage, "Skill Point Costs");
  section(R.DerivedValuesPage, "Step 7: Derived Values");
  section(R.ShockValuePage, "Shock Value (Optional)");
  section(R.BackgroundPointsPage, "Step 8: Background Points");
  section(R.StagedStatCostPage, "Staged Stat Cost — Optional Rule");
  return out;
}

if (import.meta.main) process.stdout.write(listRules());
