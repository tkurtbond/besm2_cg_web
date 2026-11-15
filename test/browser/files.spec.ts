// Phase 6: files on the page in a real browser, headless. Adapted from
// ova_cg_web's test/browser/files.spec.ts. A download's bytes are what
// besm2_calc_po --fill writes (test/golden/cg/), and the downloaded file
// opens again with nothing to say; Save As... asks for a name; New and
// Open... ask first with changes, and the file chooser still opens
// after that question; the notices and a file's mistakes are told in a
// dialog; a file dropped on the page opens; and closing the page with
// changes gets the browser's beforeunload question. A change is marked
// through globalThis.besm2 (changed, below), leaving the entities as
// they were, so a save is still the golden file.

import { readFileSync } from "node:fs";
import { expect, test, type Download, type Page } from "@playwright/test";
import { DATA_DIR, openFile, PAGE_URL, watch } from "./page.ts";

const title = "BESM2ER Character Generator";
const golden = (name: string) =>
  readFileSync(`test/golden/cg/${name}.fill.yaml`, "utf8");

async function opened(page: Page): Promise<ReturnType<typeof watch>> {
  const w = watch(page);
  await page.goto(PAGE_URL);
  return w;
}

/** changed marks the entities changed, as an edit will, leaving them as
 *  they were, so a save is still the golden file. */
async function changed(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = (
      globalThis as unknown as {
        besm2: { modified: boolean; showTitle(): void };
      }
    ).besm2;
    w.modified = true;
    w.showTitle();
  });
}

async function menu(page: Page, item: RegExp): Promise<void> {
  await page.getByRole("menuitem", { name: "File" }).click();
  await page.getByRole("menuitem", { name: item }).click();
}

async function text(d: Download): Promise<string> {
  return readFileSync(await d.path(), "utf8");
}

const dialog = (page: Page) => page.locator("dialog[open]");

/**
 * opens opens a fixture and waits for its title: openFile returns once
 * the file is chosen, and the page reads it after, so a change marked
 * before then would be lost to the load.
 */
async function opens(page: Page, name: string, shown = ""): Promise<void> {
  await openFile(page, name);
  await expect(page).toHaveTitle(title + " - " + name + shown);
}

test("Save downloads what besm2_calc_po writes, and it opens again", async ({
  page,
}) => {
  const w = await opened(page);
  await opens(page, "window.yaml", " (2 of 2)");
  await expect(dialog(page)).toHaveCount(0);
  await changed(page);
  await expect(page).toHaveTitle(title + " - window.yaml (2 of 2) *");
  const download = page.waitForEvent("download");
  await menu(page, /^Save\b(?! As)/);
  const d = await download;
  expect(d.suggestedFilename()).toBe("window.yaml");
  const saved = await text(d);
  expect(saved).toBe(golden("window"));
  await expect(page).toHaveTitle(title + " - window.yaml (2 of 2)");

  await openFile(page, "window.yaml", saved);
  await expect(page).toHaveTitle(title + " - window.yaml (2 of 2)");
  await expect(dialog(page)).toHaveCount(0);
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});

test("Save As... asks for a name; Ctrl+S saves as it", async ({ page }) => {
  const w = await opened(page);
  await opens(page, "bare.yaml");
  await menu(page, /^Save As\.\.\./);
  const input = dialog(page).getByRole("textbox");
  await expect(input).toHaveValue("bare.yaml");
  await input.fill("Copy of bare");
  const download = page.waitForEvent("download");
  await input.press("Enter");
  const d = await download;
  expect(d.suggestedFilename()).toBe("Copy of bare.yaml");
  expect(await text(d)).toBe(golden("bare"));
  await expect(page).toHaveTitle(title + " - Copy of bare.yaml");

  await changed(page);
  const again = page.waitForEvent("download");
  await page.locator("body").press("Control+s");
  expect((await again).suggestedFilename()).toBe("Copy of bare.yaml");
  await expect(page).toHaveTitle(title + " - Copy of bare.yaml");
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});

test("the notices, and a file's mistakes, are told", async ({ page }) => {
  const w = await opened(page);
  await openFile(page, "differs.yaml");
  await expect(dialog(page)).toContainText(
    "Numbers the file gives differently from the rules,",
  );
  await expect(dialog(page)).toContainText(
    "points is 9 in the file, 4 by the rules",
  );
  await expect(page).toHaveTitle(title + " - differs.yaml");
  await dialog(page).getByRole("button", { name: "OK" }).click();

  await openFile(page, "bad.yaml", "name: [\n");
  await expect(dialog(page)).toContainText("bad.yaml");
  await expect(page).toHaveTitle(title + " - differs.yaml");
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});

test("New and Open... ask first; the file chooser still opens", async ({
  page,
}) => {
  const w = await opened(page);
  await opens(page, "bare.yaml");
  await changed(page);

  await menu(page, /^Open\.\.\./);
  await expect(dialog(page)).toContainText(
    "Save the changes to bare.yaml first?",
  );
  await dialog(page).getByRole("button", { name: "Cancel" }).click();
  await expect(page).toHaveTitle(title + " - bare.yaml *");

  await menu(page, /^Open\.\.\./);
  const chooser = page.waitForEvent("filechooser");
  await dialog(page).getByRole("button", { name: "Don't save" }).click();
  await (await chooser).setFiles(`${DATA_DIR}/window.yaml`);
  await expect(page).toHaveTitle(title + " - window.yaml (2 of 2)");

  await changed(page);
  await menu(page, /^New(?! from)/);
  const download = page.waitForEvent("download");
  await dialog(page).getByRole("button", { name: "Save", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("window.yaml");
  await expect(page).toHaveTitle(title);
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});

test("a file dropped on the page opens", async ({ page }) => {
  const w = await opened(page);
  const drag = async (type: string, files: boolean) =>
    page.evaluate(
      ([type, files, contents]) => {
        const dt = new DataTransfer();
        if (files) {
          dt.items.add(
            new File([contents], "bare.yaml", { type: "application/yaml" }),
          );
        } else dt.setData("text/plain", "Bare");
        const e = new DragEvent(type, {
          dataTransfer: dt,
          bubbles: true,
          cancelable: true,
        });
        document.body.dispatchEvent(e);
        return e.defaultPrevented;
      },
      [type, files, readFileSync(`${DATA_DIR}/bare.yaml`, "utf8")] as const,
    );
  expect(await drag("dragover", false), "text: left to the browser").toBe(
    false,
  );
  expect(await drag("dragover", true), "a file: taken").toBe(true);
  expect(await drag("drop", true), "and its drop").toBe(true);
  await expect(page).toHaveTitle(title + " - bare.yaml");
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});

test("closing with changes: the browser asks", async ({ page }) => {
  await opened(page);
  await opens(page, "bare.yaml"); // a click: the page has been used
  await changed(page);
  const asked = page.waitForEvent("dialog");
  await page.close({ runBeforeUnload: true });
  const d = await asked;
  expect(d.type()).toBe("beforeunload");
  await d.dismiss();
  expect(page.isClosed(), "dismissed: the page stays").toBe(false);

  await page.evaluate(() => {
    (globalThis as unknown as { besm2: { modified: boolean } }).besm2.modified =
      false;
  });
  let dialogs = 0;
  page.on("dialog", () => dialogs++);
  const closed = page.waitForEvent("close");
  await page.close({ runBeforeUnload: true });
  await closed;
  expect(dialogs, "no changes: closed, nothing asked").toBe(0);
});
