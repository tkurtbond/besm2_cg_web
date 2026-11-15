// Phase 12: the Preview tab in a real browser, headless. What happy-dom
// can't show (test/ui/preview.test.ts drives the rest): the text shown is
// besm2_calc_po's format of the file (test/golden/cg/), monospaced, in
// each format; Copy reaching the clipboard from file:// and from http://,
// by writeText or its fallback; and Save... downloading the text. The
// way Copy is watched is ova_cg_web's test/browser/markdown.spec.ts's.

import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { openFile, PAGE_URL, watch } from "./page.ts";

const golden = (name: string) => readFileSync(`test/golden/cg/${name}`, "utf8");

/** What the page copied: what writeText was given, or else what the copy
 *  event saw selected (ova_cg_web's markdown.spec.ts). */
const copied = (page: Page) =>
  page.evaluate(() => (window as unknown as { copied?: string }).copied);

test("the Preview tab: the formats, Copy, Save...", async ({
  page,
  browserName,
}) => {
  const w = watch(page);
  await page.goto(PAGE_URL);
  await openFile(page, "window.yaml");
  await expect(page).toHaveTitle(/window\.yaml \(2 of 2\)$/);
  await page.getByRole("tab", { name: "Preview" }).click();
  const shown = page.getByLabel("Preview text", { exact: true });
  await expect(shown).toBeVisible();
  expect(await shown.textContent()).toBe(golden("window.grid.out"));
  expect(await shown.evaluate((e) => getComputedStyle(e).fontFamily)).toMatch(
    /mono/i,
  );
  await page.screenshot({
    path: `obj/screenshots/${browserName}-preview.png`,
  });

  const format = page.getByRole("combobox", { name: "Format:" });
  for (const [label, id] of [
    ["terse reST", "t"],
    ["groff tbl in raw ms", "m"],
    ["h-m-m outline", "H"],
  ] as const) {
    await format.selectOption({ label });
    await expect
      .poll(() => shown.textContent())
      .toBe(golden(`window.${id}.out`));
  }

  // Save...: the file's name suggested with the format's extension.
  await page.getByRole("button", { name: "Save..." }).click();
  const ask = page.locator("dialog[open]").filter({
    hasText: "Save the preview as:",
  });
  await expect(ask.getByRole("textbox")).toHaveValue("window.hmm");
  const download = page.waitForEvent("download");
  await ask.getByRole("textbox").press("Enter");
  const d = await download;
  expect(d.suggestedFilename()).toBe("window.hmm");
  expect(readFileSync(await d.path(), "utf8")).toBe(golden("window.H.out"));
  await expect(page.locator("dialog[open]")).toHaveCount(0);

  // Copy, by writeText where the browser takes it.
  await format.selectOption({ label: "reST grid tables" });
  const grid = golden("window.grid.out");
  await page.evaluate(() => {
    const g = window as unknown as { copied?: string };
    const clipboard = navigator.clipboard;
    const write = clipboard.writeText.bind(clipboard);
    clipboard.writeText = (t: string) =>
      write(t).then(() => {
        g.copied = t;
      });
    document.addEventListener("copy", () => {
      g.copied = String(document.getSelection());
    });
  });
  await page.getByRole("button", { name: "Copy" }).click();
  await expect.poll(() => copied(page)).toBe(grid);
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(page.locator(".copy-buffer")).toHaveCount(0);

  // writeText refused: the fallback, in each browser.
  await page.evaluate(() => {
    (window as unknown as { copied?: string }).copied = undefined;
    navigator.clipboard.writeText = () =>
      Promise.reject(new DOMException("refused", "NotAllowedError"));
  });
  await page.getByRole("button", { name: "Copy" }).click();
  await expect.poll(() => copied(page)).toBe(grid);
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(page.locator(".copy-buffer")).toHaveCount(0);

  // The name changed on the Character tab: the preview follows.
  await page.getByRole("tab", { name: "Character" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Test Pilot");
  await page.getByRole("tab", { name: "Preview" }).click();
  await expect(shown).toContainText("Test Pilot");

  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});
