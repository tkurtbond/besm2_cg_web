// Phase 7: the Character tab in a real browser, headless. The name and
// tagline typed, a Stat spun, an override typed and taken on leaving the
// box or on Enter, text that isn't a number told in a dialog, the points
// line and the warnings following; and what was typed is what Save
// downloads. test/ui/character.test.ts checks the rest on happy-dom.

import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { openFile, PAGE_URL, watch } from "./page.ts";

const title = "BESM2ER Character Generator";
const dialog = (page: Page) => page.locator("dialog[open]");
const points = (page: Page) => page.locator(".points-line").first();

test("typing on the Character tab changes the character", async ({ page }) => {
  const w = watch(page);
  await page.goto(PAGE_URL);
  await expect(points(page)).toHaveText(
    "Character Points: Stats 3 + Attributes 0 - Bonus Points 0 = 3 (no limit set)",
  );
  await expect(page.getByRole("textbox", { name: "AR override" })).toBeHidden();

  await page.getByLabel("Name", { exact: true }).fill("Kei Tanaka");
  await expect(page).toHaveTitle(title + " *");
  await expect(page.locator("select.entities option").first()).toHaveText(
    "1. Kei Tanaka",
  );
  await page.getByLabel("Tagline").fill("  Pilot  ");

  const body = page.getByRole("spinbutton", { name: "Body" });
  await body.fill("5");
  await body.press("Tab");
  await expect(points(page)).toHaveText(
    "Character Points: Stats 7 + Attributes 0 - Bonus Points 0 = 7 (no limit set)",
  );
  await expect(page.locator(".points-line").first()).not.toHaveClass(/red/);

  const hp = page.getByRole("textbox", { name: "HP override" });
  await hp.fill("99");
  await hp.press("Enter");
  await expect(hp).toHaveValue("99");
  await expect(dialog(page)).toHaveCount(0);

  const mind = page.getByRole("textbox", { name: "Mind's points override" });
  await mind.fill("4");
  await mind.press("Tab");
  await expect(points(page)).toHaveText(
    "Character Points: Stats 10 + Attributes 0 - Bonus Points 0 = 10 (no limit set)",
  );

  const sv = page.getByRole("textbox", { name: "SV override" });
  await sv.fill("lots");
  await sv.press("Enter");
  await expect(dialog(page)).toContainText(
    "Not a number for SV: a whole number. The computed number is used.",
  );
  await dialog(page).getByRole("button", { name: "OK" }).click();
  await expect(sv).toHaveValue("");

  const ar = page.getByRole("textbox", { name: "AR override" });
  await page
    .getByRole("button", { name: "The rulebook at this page" })
    .first()
    .click(); // no rulebook yet: asked for, and cancelled
  await expect(dialog(page)).toContainText("hasn't been chosen");
  await dialog(page).getByRole("button", { name: "Cancel" }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(ar).toBeHidden();

  const download = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "File" }).click();
  await page.getByRole("menuitem", { name: /^Save As\.\.\./ }).click();
  const input = dialog(page).getByRole("textbox");
  await input.fill("kei");
  await input.press("Enter");
  const saved = readFileSync(await (await download).path(), "utf8");
  expect(saved).toContain("name: Kei Tanaka\n");
  expect(saved).toContain("tagline: Pilot\n");
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});

test("a file's character: over its points, red and warned", async ({
  page,
}) => {
  const w = watch(page);
  await page.goto(PAGE_URL);
  await openFile(page, "window.yaml");
  await expect(page).toHaveTitle(title + " - window.yaml (2 of 2)");
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Pilot");
  await expect(points(page)).toHaveText(
    "Character Points: Stats 13 + Attributes 8 - Bonus Points 1 = 20 of 20",
  );
  const body = page.getByRole("spinbutton", { name: "Body" });
  await body.fill("6");
  await body.press("Tab");
  await expect(points(page)).toHaveClass(/red/);
  await expect(page.locator(".warnings .line")).toContainText([
    "spent 21 Character Points of 20 (p. 13, PDF 15)",
  ]);

  await page.locator("select.entities").selectOption({ index: 0 });
  await expect(page.getByRole("spinbutton", { name: "Body" })).toBeDisabled();
  await expect(points(page)).toHaveText(
    "Mecha Points: Attributes 4 - Bonus Points 0 = 4 of 20",
  );
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});
