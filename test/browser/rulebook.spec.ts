// Phase 13: the rulebook in a real browser, headless, from file:// and
// http://, with a PDF made for the test (test/browser/pdf.ts, copied from
// ova_cg_web's), never the rulebook. Adapted from ova_cg_web's
// test/browser/rulebook.spec.ts. What happy-dom can't show
// (test/ui/rulebook.test.ts drives the rest): Choose PDF...'s file
// chooser, the tab ? opens and the page its viewer shows, and a second ?
// reusing that tab at its own page.
//
// The browsers' PDF viewers (ova_cg_web's findings, playwright.config.ts):
// this project's Chromium is the full build, whose viewer says the page
// it shows in its "Page number" field, in a chrome-extension: frame; its
// Firefox has pdf.js on, which says it in PDFViewerApplication.page.

import { expect, test, type Page } from "@playwright/test";
import { PAGE_URL, watch } from "./page.ts";
import { testPdf } from "./pdf.ts";

const pdf = {
  name: "BESM2ER_bookmarked.pdf",
  mimeType: "application/pdf",
  buffer: testPdf(120),
};

function dialog(page: Page) {
  return page.locator("dialog[open]");
}

/** shown is the page Firefox's pdf.js shows, once it has the PDF. */
async function shown(tab: Page): Promise<number | undefined> {
  return tab.evaluate(() => {
    const app = (
      window as unknown as {
        PDFViewerApplication?: { page: number; pagesCount: number };
      }
    ).PDFViewerApplication;
    return app !== undefined && app.pagesCount > 0 ? app.page : undefined;
  });
}

/** pages is how many pages the PDF Firefox's pdf.js shows has. */
async function pages(tab: Page): Promise<number | undefined> {
  return tab.evaluate(
    () =>
      (
        window as unknown as {
          PDFViewerApplication?: { pagesCount: number };
        }
      ).PDFViewerApplication?.pagesCount,
  );
}

/**
 * viewerPage is the page Chromium's PDF viewer shows: the value of its
 * "Page number" field, in the viewer's chrome-extension: frame.
 */
async function viewerPage(tab: Page): Promise<number | undefined> {
  const f = tab.frames().find((f) => f.url().startsWith("chrome-extension:"));
  if (f === undefined) return undefined;
  const field = f.getByLabel("Page number");
  if ((await field.count()) === 0) return undefined;
  return Number(await field.inputValue());
}

/** at checks that tab shows the PDF's page n. */
async function at(tab: Page, n: number, browserName: string): Promise<void> {
  await expect(tab).toHaveURL(new RegExp(`^blob:.*#page=${n}$`));
  const read = browserName === "firefox" ? shown : viewerPage;
  await expect.poll(() => read(tab)).toBe(n);
}

test("the rulebook: asked for, chosen, opened at the page; ? reuses its tab", async ({
  page,
  context,
  browserName,
}) => {
  const w = watch(page);
  await page.goto(PAGE_URL);
  await page.getByRole("tab", { name: "Attributes" }).click();
  const attrs = page
    .getByRole("tabpanel", { name: "Attributes" })
    .getByRole("region", { name: "Attributes", exact: true });

  // ? with none chosen: asked, then the chooser, then the tab.
  const name = attrs.getByRole("combobox", { name: "Attributes: name" });
  await name.selectOption({ label: "Flight (p. 33, PDF 35)" });
  const help = attrs.getByRole("button", { name: "The rulebook at this page" });
  await help.click();
  await expect(dialog(page)).toContainText("hasn't been chosen");
  const chooser = page.waitForEvent("filechooser");
  await dialog(page).getByRole("button", { name: "Choose PDF..." }).click();
  const c = await chooser;
  expect(c.isMultiple()).toBe(false);
  const popup = page.waitForEvent("popup");
  await c.setFiles(pdf);
  const tab = await popup;
  await at(tab, 35, browserName);
  await tab.screenshot({
    path: `obj/screenshots/${browserName}-rulebook-35.png`,
  });
  expect(context.pages().length).toBe(2);

  // Rulebook > Open: page 1, the PDF's 3, in the same tab, not asked.
  await page.bringToFront();
  await page.getByRole("menuitem", { name: "Rulebook" }).click();
  await page.getByRole("menuitem", { name: "Open", exact: true }).click();
  await at(tab, 3, browserName);
  expect(context.pages().length).toBe(2);
  await expect(dialog(page)).toHaveCount(0);

  // Choose PDF...: another PDF used from then on.
  await page.bringToFront();
  const chooser2 = page.waitForEvent("filechooser");
  await page.getByRole("menuitem", { name: "Rulebook" }).click();
  await page.getByRole("menuitem", { name: "Choose PDF..." }).click();
  await (
    await chooser2
  ).setFiles({ ...pdf, name: "Other.pdf", buffer: testPdf(130) });
  await expect(dialog(page)).toHaveCount(0);
  expect(context.pages().length).toBe(2);
  await name.selectOption({ label: "Own a Big Mecha (p. 59, PDF 61)" });
  await help.click();
  await at(tab, 61, browserName);
  if (browserName === "firefox") {
    expect(await pages(tab)).toBe(130); // the PDF chosen second
  }
  expect(context.pages().length).toBe(2);

  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});

test("the rulebook: the question cancelled opens nothing", async ({
  page,
  context,
}) => {
  const w = watch(page);
  await page.goto(PAGE_URL);
  await page.getByRole("menuitem", { name: "Rulebook" }).click();
  await page.getByRole("menuitem", { name: "Open", exact: true }).click();
  await expect(dialog(page)).toContainText("hasn't been chosen");
  await dialog(page).getByRole("button", { name: "Cancel" }).click();
  await expect(dialog(page)).toHaveCount(0);
  await page.waitForTimeout(500);
  expect(context.pages().length).toBe(1);
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});
