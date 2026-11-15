// Phase 11: the Creation dialog and campaigns in a real browser,
// headless. Character > Creation... changes the shown character's
// creation as it goes and Cancel puts it back; Save Campaign... asks for
// a name and downloads; Load Campaign... and File > New from Campaign...
// read a file through the file chooser. test/ui/creation.test.ts checks
// the rest on happy-dom.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { DATA_DIR, openFile, PAGE_URL, watch } from "./page.ts";

const menu = async (page: Page, top: string, item: RegExp) => {
  await page.getByRole("menuitem", { name: top, exact: true }).click();
  await page.getByRole("menuitem", { name: item }).click();
};

const pointsLine = (page: Page) =>
  page
    .getByRole("tabpanel", { name: "Character" })
    .locator(".points-line")
    .first();

test("the Creation dialog: change, Cancel, campaigns", async ({ page }) => {
  const w = watch(page);
  await page.goto(PAGE_URL);
  await openFile(page, "window.yaml");
  await expect(page).toHaveTitle(/\(2 of 2\)$/);

  await menu(page, "Character", /^Creation\.\.\./);
  const d = page.locator("dialog.creation-dialog[open]");
  await expect(d).toContainText("The creation of Pilot");
  const points = d.getByRole("spinbutton", {
    name: "Character Points (p. 13, PDF 15)",
  });
  await expect(points).toHaveValue("20");
  await points.fill("25");
  await points.press("Tab");
  await expect(pointsLine(page)).toHaveText(
    "Character Points: Stats 13 + Attributes 8 - Bonus Points 1 = 20 of 25",
  );
  await expect(d).toContainText(
    "Character Points: 20 spent of 25.  Skill Points: 8 spent of 20.",
  );
  await expect(page).toHaveTitle(/ \*$/);
  await d.getByRole("button", { name: "Cancel" }).click();
  await expect(d).toHaveCount(0);
  await expect(pointsLine(page)).toHaveText(
    "Character Points: Stats 13 + Attributes 8 - Bonus Points 1 = 20 of 20",
  );
  await expect(page).toHaveTitle(/\(2 of 2\)$/);

  await menu(page, "Character", /^Creation\.\.\./);
  const download = page.waitForEvent("download");
  await d.getByRole("button", { name: "Save Campaign..." }).click();
  const ask = page.locator("dialog[open]").filter({
    hasText: "Save the campaign as:",
  });
  await expect(ask.getByRole("textbox")).toHaveValue("campaign.yaml");
  await ask.getByRole("textbox").fill("mine.yaml");
  await ask.getByRole("button", { name: "OK", exact: true }).click();
  const dl = await download;
  expect(dl.suggestedFilename()).toBe("mine.yaml");
  const saved = readFileSync(await dl.path(), "utf8");
  expect(saved).toMatch(/character-points: 20\n/);

  const chooser = page.waitForEvent("filechooser");
  await d.getByRole("button", { name: "Load Campaign..." }).click();
  await (await chooser).setFiles(resolve(DATA_DIR, "campaign.yaml"));
  await expect(points).toHaveValue("40");
  await expect(
    d.getByRole("checkbox", {
      name: "A ceiling on the Stats' total cost (p. 16, PDF 18)",
    }),
  ).toBeChecked();
  await d.getByRole("button", { name: "Cancel" }).click();
  await expect(d).toHaveCount(0);
  await expect(page).toHaveTitle(/\(2 of 2\)$/);

  const chooser2 = page.waitForEvent("filechooser");
  await menu(page, "File", /^New from Campaign\.\.\./);
  await (await chooser2).setFiles(resolve(DATA_DIR, "campaign.yaml"));
  await expect(pointsLine(page)).toHaveText(
    "Character Points: Stats 3 + Attributes 0 - Bonus Points 0 = 3 of 40; Stats at least 4, at most 6",
  );
  await expect(pointsLine(page)).toHaveClass(/red/);
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});
