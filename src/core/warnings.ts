// A calc warning as a line for the page: what it is about, and the
// rule's pages. The port of besm2_cg_po's Besm2Warnings (its PLAN.md,
// Part B, step 6: the Character tab's Warnings list).
//
// Each line names what the warning is about, as the file names it with
// its pages ("Weapon Attack: Gun (p. 81, PDF 83)"), and the condition in
// a few words with the numbers and the rule's pages: names, numbers,
// limits and pages only, never the rulebook's words (AGENTS.md). The
// pages are those calc's codes give.

import * as C from "./calc.ts";
import * as Ch from "./character.ts";
import * as R from "./rules.ts";
import { trim } from "./text.ts";

const CharacterPointsPage = 13; // Step 1: the campaign's Character Points
const StatLimitsPage = 16; // Step 3: 1 to 12, one Stat at 12, the GM's ceiling or floor
const MaxStat = 12;
const MaxDefects = 8;
const MaxSkillLevel = 6;

function need(it: R.Item | undefined, name: string): R.Item {
  if (it === undefined) throw new Error(`warnings: no ${name} in rules`);
  return it;
}

const highlySkilled = need(R.find("Highly Skilled"), "Highly Skilled");
const unskilled = need(R.find("Unskilled"), "Unskilled");
const ownABigMecha = need(R.find("Own a Big Mecha"), "Own a Big Mecha");
const noDamage = need(R.findKind(R.Disability, "No Damage"), "No Damage");

function pages(page: number): string {
  return ` (${R.pagesText(page)})`;
}

/** name, ": " subject if it has a non-blank one, and it's pages, "(p.
 *  ?)" for undefined. */
function name(
  n: string,
  subject: string | undefined,
  it: R.Item | undefined,
): string {
  let r = trim(n) === "" ? '""' : trim(n);
  if (subject !== undefined && trim(subject) !== "") r += `: ${trim(subject)}`;
  return r + (it === undefined ? " (p. ?)" : pages(it.page));
}

function attrName(a: C.Attr): string {
  if (a instanceof Ch.Attr) return name(a.name, a.subject, a.item);
  if (a.item !== undefined) return R.label(a.item);
  return "an attribute (p. ?)";
}

function defectName(d: C.Defect): string {
  if (d instanceof Ch.Defect) return name(d.name, d.subject, d.item);
  if (d.item !== undefined) return R.label(d.item);
  return "a defect (p. ?)";
}

/** A house Skill is the campaign's: no page. */
function skillName(s: C.Skill): string {
  if (s instanceof Ch.Skill) {
    if (s.house !== undefined && s.item === undefined)
      return `${trim(s.name) === "" ? '""' : trim(s.name)} (the campaign's)`;
    return name(s.name, undefined, s.item);
  }
  if (s.item !== undefined) return R.label(s.item);
  return "a skill (p. ?)";
}

function modName(m: C.Mod): string {
  if (m instanceof Ch.Mod) return name(m.name, undefined, m.item);
  if (m.item !== undefined) return R.label(m.item);
  return "an ability (p. ?)";
}

function statName(i: number): string {
  const n =
    i === C.Body
      ? "Body"
      : i === C.Mind
        ? "Mind"
        : i === C.Soul
          ? "Soul"
          : "a Stat";
  return n + pages(R.StatsPage);
}

/** What w is about, then ": ". */
function subject(w: C.Warning): string {
  let r = "";
  if (w.attr !== undefined) r += `${attrName(w.attr)}: `;
  else if (w.defect !== undefined) r += `${defectName(w.defect)}: `;
  else if (w.skill !== undefined) r += `${skillName(w.skill)}: `;
  else if (w.stat >= 0) r += `${statName(w.stat)}: `;
  if (w.mod !== undefined) r += `${modName(w.mod)}: `;
  return r;
}

/** "Level 7 is outside 1 to 6" */
function outside(what: string, n: number, max: number): string {
  return `${what} ${n} is outside 1 to ${max === R.Unlimited ? "any" : max}`;
}

/** "spent 40 Character Points of 35 (p. 13, PDF 15)" */
function spent(s: number, of: number, what: string, page: number): string {
  return `spent ${s} ${what} of ${of}${pages(page)}`;
}

/** w, a warning of e's last compute, as one line. */
export function text(e: C.Entity, w: C.Warning): string {
  const r = subject(w);
  const stat = w.stat >= 0 && w.stat < C.NStats;
  switch (w.code) {
    case C.UnknownItem:
      return (
        r +
        (w.mod !== undefined ? "not a Weapon Ability" : "not a name") +
        " the rulebook has: it costs nothing unless its points are given"
      );
    case C.LevelRange:
      if (w.attr !== undefined)
        return (
          r +
          outside("Level", w.attr.level, w.attr.item?.maxLevel ?? R.Unlimited)
        );
      if (w.defect !== undefined)
        return (
          r +
          outside(
            "rank",
            w.defect.rank,
            w.defect.item?.maxLevel ?? R.Unlimited,
          ) +
          pages(R.DefectsPage)
        );
      if (w.skill !== undefined)
        return (
          r +
          outside("Level", w.skill.level, MaxSkillLevel) +
          pages(R.SkillsPage)
        );
      return r;
    case C.StatRange: {
      let s = r + (stat ? String(e.stat[w.stat]) : "");
      const v = stat ? e.stat[w.stat]! : 0;
      if (
        e.creation.statCeiling > 0 &&
        stat &&
        v > e.creation.statCeiling &&
        v <= MaxStat
      )
        s += ` is above the campaign's ceiling of ${e.creation.statCeiling}`;
      else s += ` is outside 1 to ${MaxStat}${pages(StatLimitsPage)}`;
      return s;
    }
    case C.TwoAtTwelve:
      return `${r}more than one Stat at ${MaxStat}${pages(StatLimitsPage)}`;
    case C.TooManyDefects:
      return `${r}more than ${MaxDefects} Defects${pages(R.DefectsPage)}`;
    case C.OverCharacterPoints:
      return (
        r + spent(e.spent, e.available, "Character Points", CharacterPointsPage)
      );
    case C.OverSkillPoints:
      return (
        r + spent(e.skillSpent, e.skillPoints, "Skill Points", R.SkillsPage)
      );
    case C.OverMechaPoints:
      return r + spent(e.spent, e.available, "Mecha Points", ownABigMecha.page);
    case C.Excluded:
      return `${r}can't go with an earlier Ability or Disability of the attack`;
    case C.TooOften:
      return (
        r +
        (w.mod !== undefined
          ? "taken more times than it may be"
          : "an option taken more times than it may be")
      );
    case C.OptionClash:
      return `${r}two options of one choice`;
    case C.NotOffered:
      return `${r}not offered in ${R.genreName(e.creation.genre)} (Table 2-4, ${R.pagesText(R.SkillCostsPage)})`;
    case C.LowDamage: {
      const a = w.attr!;
      return (
        `${r}damage ${C.value(a.damage)}` +
        (a.personalGear
          ? " is under 5 a Level as Personal Gear"
          : " is under 15 a Level") +
        pages(R.AlternateAttacksPage) +
        `, without ${R.label(noDamage)}`
      );
    }
    case C.NotPersonalGear:
      return `${r}not for a Personal Gear weapon${pages(R.WeaponAbilitiesPage)}`;
    case C.MechaOnly:
      return `${r}for mecha only`;
    case C.OverBonusCeiling:
      return `${r}the Defects give ${e.bonusPoints} Bonus Points, above the campaign's ceiling of ${e.creation.bonusCeiling}`;
    case C.SecondaryAbove:
      return `${r}a secondary Weapon Attack above its primary's Level${pages(R.AlternateAttacksPage)}`;
    case C.GunnerNotMecha:
      return `${r}a Different Gunner on a character's weapon; it is a mecha's${pages(R.AlternateAttacksPage)}`;
    case C.SkilledAndUnskilled:
      return `${r}${R.label(highlySkilled)} with ${R.label(unskilled)}`;
    case C.NoGenreSet:
      return `${r}Skills${pages(R.SkillsPage)}, but no genre to price them by (Table 2-4, ${R.pagesText(R.SkillCostsPage)})`;
    case C.NoCost:
      return `${r}its cost is the GM's: give its points`;
    case C.StatPointsAbove:
      return `${r}the Stats cost ${e.statTotal} Character Points, above the campaign's ceiling of ${e.creation.statPointsCeiling}${pages(StatLimitsPage)}`;
    case C.StatPointsBelow:
      return `${r}the Stats cost ${e.statTotal} Character Points, below the campaign's floor of ${e.creation.statPointsFloor}${pages(StatLimitsPage)}`;
  }
  return `${r}warning ${w.code}`;
}
