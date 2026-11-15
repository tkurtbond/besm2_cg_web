// Phase 10: the Mecha tab in a real browser, headless. A character's
// Own a Big Mecha and their mecha's points, Show Mecha and Show Owner,
// a new Own a Big Mecha's mecha made by New Mecha with its name asked,
// and what Save downloads. test/ui/mecha.test.ts checks the rest on
// happy-dom.

import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { openFile, PAGE_URL, watch } from "./page.ts";

const panel = (page: Page, name: string) =>
  page.getByRole("tabpanel", { name });

test("the Mecha tab: show, New Mecha, save", async ({ page }) => {
  const w = watch(page);
  await page.goto(PAGE_URL);
  await openFile(page, "window.yaml");

  await page.getByRole("tab", { name: "Mecha" }).click();
  const mecha = panel(page, "Mecha");
  const lines = mecha.getByRole("listbox", {
    name: "Own a Big Mecha (p. 59, PDF 61)",
  });
  await expect(lines.getByRole("option")).toHaveCount(1);
  await expect(lines.getByRole("option").first()).toContainText(
    "1 Own a Big Mecha: Walker",
  );
  await expect(lines.getByRole("option").first()).toContainText(
    "Walker spends 4 of 20",
  );
  await expect(mecha.locator(".points-line").first()).toHaveText(
    "Character Points: Stats 13 + Attributes 8 - Bonus Points 1 = 20 of 20",
  );

  await mecha.getByRole("button", { name: "Show Mecha" }).click();
  await expect(page).toHaveTitle(/\(1 of 2\)$/);
  await expect(lines.getByRole("option").first()).toContainText(
    "Pilot: 1 Own a Big Mecha: Walker",
  );
  await expect(mecha.getByRole("button", { name: "New Mecha" })).toBeDisabled();
  await mecha.getByRole("button", { name: "Show Owner" }).click();
  await expect(page).toHaveTitle(/\(2 of 2\)$/);

  await page.getByRole("tab", { name: "Attributes" }).click();
  const attrs = panel(page, "Attributes");
  await attrs
    .getByRole("combobox", { name: "Attributes: name" })
    .selectOption({ label: "Own a Big Mecha (p. 59, PDF 61)" });
  await attrs.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("tab", { name: "Mecha" }).click();
  await expect(lines.getByRole("option")).toHaveCount(2);
  await expect(lines.getByRole("option").nth(1)).toContainText(
    "no subject: no mecha",
  );
  await lines.getByRole("option").nth(1).click();
  await mecha.getByRole("button", { name: "New Mecha" }).click();
  const ask = page.locator("dialog[open]");
  await expect(ask).toContainText(
    "The mecha's name (the Own a Big Mecha's subject):",
  );
  await ask.getByRole("textbox").fill(" Hopper ");
  await ask.getByRole("button", { name: "OK", exact: true }).click();
  await expect(page).toHaveTitle(/\(3 of 3\) \*$/);
  await expect(lines.getByRole("option").first()).toContainText(
    "Pilot: 1 Own a Big Mecha: Hopper",
  );
  await expect(
    page.getByRole("combobox", { name: "Character or mecha shown" }),
  ).toContainText("3. Hopper (mecha)");

  const download = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "File" }).click();
  await page.getByRole("menuitem", { name: /^Save\b(?!\s*As)/ }).click();
  const saved = readFileSync(await (await download).path(), "utf8");
  expect(saved).toMatch(/subject: Hopper/);
  expect(saved).toMatch(/name: Hopper\n/);
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});
