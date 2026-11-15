// Phase 15: every fixture in testdata/ (besm2_cg_po's, in cg/, and
// pobesm2_fmt2's, in fmt/) opened in a real browser, headless, as the
// user opens one (File > Open...). Each of its characters and mecha is
// shown in turn and each tab looked at, with no request and no console
// error. Adapted from ova_cg_web's test/browser/fixtures.spec.ts.
//
// Which fixtures open is besm2_calc_po's answer: a fixture opens when
// its --fill succeeds (test/golden/*/status) with entities to write,
// and the page says something in a dialog when --fill said something
// (a non-empty .fill.err) or refused it. A file with no entities, which
// --fill writes as `[]`, the page refuses, saying so, as besm2_cg_po's
// window does (Besm2Character.Mod's Load; character.ts's load). What
// it says is test/ui's and test/files.sh's.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { openFile, PAGE_URL, watch } from "./page.ts";
import { tabNames } from "../../src/ui/window.ts";

const title = "BESM2ER Character Generator";

interface Fixture {
  path: string;
  /** besm2_calc_po --fill succeeded, with entities */
  opens: boolean;
  /** besm2_calc_po --fill said something, or the page refuses it */
  told: boolean;
}

/** The fixtures in testdata/DIR, with test/golden/DIR's answers. */
function fixtures(dir: string): Fixture[] {
  const status = new Map<string, number>();
  for (const line of readFileSync(`test/golden/${dir}/status`, "utf8")
    .trim()
    .split("\n")) {
    const [name, kind, code] = line.split(" ");
    if (kind === "fill") status.set(name!, Number(code));
  }
  return readdirSync(`testdata/${dir}`)
    .filter((f) => f.endsWith(".yaml"))
    .sort()
    .map((f) => {
      const name = f.replace(/\.yaml$/, "");
      const code = status.get(name);
      if (code === undefined) throw new Error(`no --fill status: ${dir}/${f}`);
      const text = (ext: string) => {
        const p = `test/golden/${dir}/${name}.${ext}`;
        return existsSync(p) ? readFileSync(p, "utf8") : "";
      };
      const opens = code === 0 && text("fill.yaml") !== "[]\n";
      return {
        path: resolve(`testdata/${dir}`, f),
        opens,
        told: !opens || text("fill.err") !== "",
      };
    });
}

const all = [...fixtures("cg"), ...fixtures("fmt")];

test("there are fixtures", () => {
  // 9 of besm2_cg_po's and 33 of pobesm2_fmt2's (2026-11-15); fewer
  // means a glob gone wrong.
  expect(all.length).toBeGreaterThan(40);
  expect(all.filter((f) => f.opens).length).toBeGreaterThan(20);
  expect(all.filter((f) => !f.opens).length).toBeGreaterThan(10);
});

for (const fx of all) {
  const name = basename(fx.path);
  const where = basename(resolve(fx.path, ".."));
  test(`${where}/${name}: ${fx.opens ? "opened, everything shown" : "refused, and told"}`, async ({
    page,
  }) => {
    const w = watch(page);
    await page.goto(PAGE_URL);
    await openFile(page, name, readFileSync(fx.path, "utf8"));
    const dialog = page.locator("dialog[open]");
    const opened = async () =>
      (await page.title()).startsWith(`${title} - ${name}`);
    // Opened (its name in the title), or told why not, or both.
    await expect
      .poll(async () => (await opened()) || (await dialog.count()) > 0)
      .toBe(true);
    if (fx.told) {
      await expect(dialog).toHaveCount(1);
      await expect(dialog.locator(".dialog-body")).not.toBeEmpty();
      await dialog.getByRole("button").first().click();
      await expect(dialog).toHaveCount(0);
    } else {
      await expect(dialog).toHaveCount(0);
    }
    expect(await opened()).toBe(fx.opens);
    if (fx.opens) {
      const shown = page.getByRole("combobox", {
        name: "Character or mecha shown",
      });
      const n = await shown.locator("option").count();
      for (let i = 0; i < Math.max(n, 1); i++) {
        if (n > 0) await shown.selectOption({ index: i });
        if (n > 1) {
          await expect(page).toHaveTitle(
            `${title} - ${name} (${i + 1} of ${n})`,
          );
        }
        for (const t of tabNames) {
          await page.getByRole("tab", { name: t, exact: true }).click();
          await expect(page.getByRole("tabpanel")).toBeVisible();
        }
        await page.getByRole("tab", { name: "Character", exact: true }).click();
      }
      // Opening and looking are no change.
      await expect(page).not.toHaveTitle(/\*$/);
    }
    expect(w.requests).toEqual([]);
    expect(w.errors).toEqual([]);
  });
}
