// Phase 8: the Attributes, Defects, Skills and Background tabs in a
// real browser, headless. A name chosen from a <select> with both its
// pages, an option taken with +, a line added, selected and changed, the
// genre changed, a note added and the description typed; the points
// lines following on each tab; and what was done is what Save
// downloads. test/ui/lists.test.ts checks the rest on happy-dom.

import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { openFile, PAGE_URL, watch } from "./page.ts";

const panel = (page: Page, name: string) =>
  page.getByRole("tabpanel", { name });
const listbox = (page: Page, tab: string, name: string) =>
  panel(page, tab).getByRole("listbox", { name, exact: true });

test("the lists: add, change, and save", async ({ page }) => {
  const w = watch(page);
  await page.goto(PAGE_URL);
  await openFile(page, "window.yaml");

  await page.getByRole("tab", { name: "Attributes" }).click();
  const attrs = panel(page, "Attributes");
  const lines = listbox(page, "Attributes", "Attributes");
  await expect(lines.getByRole("option")).toHaveCount(2);
  await expect(lines.getByRole("option").first()).toContainText(
    "1 Own a Big Mecha: Walker",
  );
  await expect(lines.getByRole("option").first()).toContainText(
    "p. 59, PDF 61",
  );
  await expect(attrs.locator(".points-line").first()).toHaveText(
    "Character Points: Stats 13 + Attributes 8 - Bonus Points 1 = 20 of 20",
  );

  await attrs
    .getByRole("combobox", { name: "Attributes: name" })
    .selectOption({ label: "Flight (p. 33, PDF 35)" });
  const options = listbox(page, "Attributes", "options");
  await expect(options.getByRole("option").first()).toContainText("(x) ");
  await options
    .getByRole("option")
    .filter({ hasText: "skimmer or hovercraft" })
    .click();
  await attrs
    .getByRole("button", { name: "Take the option once more" })
    .click();
  await expect(
    options.getByRole("option").filter({ hasText: "skimmer or hovercraft" }),
  ).toContainText("[x] ");
  await attrs.getByRole("spinbutton", { name: "Level" }).fill("2");
  await attrs.getByRole("textbox", { name: "details" }).fill(" wings ");
  await attrs.getByRole("button", { name: "Add", exact: true }).click();
  await expect(lines.getByRole("option")).toHaveCount(3);
  await expect(lines.getByRole("option").nth(2)).toContainText(
    "2 Flight (wings)",
  );
  await expect(lines.getByRole("option").nth(2)).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page).toHaveTitle(/ \*$/);
  await expect(attrs.locator(".points-line").first()).toHaveClass(/red/);

  await lines.getByRole("option").nth(1).click();
  await expect(
    attrs.getByRole("combobox", { name: "Attributes: name" }),
  ).toHaveValue(/\d+/);
  await lines.getByRole("option").nth(2).click();
  await attrs.getByRole("spinbutton", { name: "Level" }).fill("1");
  await attrs.getByRole("button", { name: "Change" }).click();
  await expect(lines.getByRole("option").nth(2)).toContainText(
    "1 Flight (wings)",
  );

  await page.getByRole("tab", { name: "Defects" }).click();
  const defects = panel(page, "Defects");
  await defects
    .getByRole("combobox", { name: "Defects: name" })
    .selectOption({ label: "Easily Distracted (p. 104, PDF 106)" });
  await defects.getByRole("spinbutton", { name: "rank" }).fill("2");
  await defects.getByRole("button", { name: "Add", exact: true }).click();
  await expect(
    listbox(page, "Defects", "Defects").getByRole("option").nth(1),
  ).toContainText("2 BP");

  await page.getByRole("tab", { name: "Skills" }).click();
  const skills = panel(page, "Skills");
  await skills.getByRole("combobox", { name: "genre" }).selectOption({
    label: "Cyberpunk",
  });
  await expect(
    listbox(page, "Skills", "Skills").getByRole("option").first(),
  ).toContainText("6 SP");
  await expect(skills.locator(".points-line").nth(2)).toHaveText(
    "Skill Points: 6 of 20",
  );

  await page.getByRole("tab", { name: "Background" }).click();
  const bg = panel(page, "Background");
  await bg.getByRole("textbox", { name: "Description" }).fill("A test pilot.");
  await bg.getByRole("textbox", { name: "note" }).fill("first");
  await bg.getByRole("button", { name: "Add" }).click();
  await expect(
    listbox(page, "Background", "Notes").getByRole("option"),
  ).toHaveText(["first"]);

  const download = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "File" }).click();
  await page.getByRole("menuitem", { name: /^Save\b(?!\s*As)/ }).click();
  const saved = readFileSync(await (await download).path(), "utf8");
  expect(saved).toContain("Flight");
  expect(saved).toContain("wings");
  expect(saved).toContain("Easily Distracted");
  expect(saved).toContain("genre: Cyberpunk");
  expect(saved).toContain("description: A test pilot.");
  expect(saved).toMatch(/notes:\n\s*- first/);
  await expect(page).not.toHaveTitle(/ \*$/);
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});

test("Add with no name chosen: said so", async ({ page }) => {
  const w = watch(page);
  await page.goto(PAGE_URL);
  await page.getByRole("tab", { name: "Skills" }).click();
  await panel(page, "Skills")
    .getByRole("button", { name: "Add", exact: true })
    .click();
  const dialog = page.locator("dialog[open]");
  await expect(dialog).toContainText("Choose a name first.");
  await dialog.getByRole("button", { name: "OK" }).click();
  await expect(dialog).toHaveCount(0);
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});
