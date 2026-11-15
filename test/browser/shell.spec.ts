// Phase 5: the page's shell in a real browser, headless: the menus by
// mouse and keyboard, the entities' list, the tabs, the keys, a
// dialog's Escape and focus, and screenshots for the user to judge the
// look (obj/screenshots/, never shown on the desktop). Adapted from
// ova_cg_web's test/browser/shell.spec.ts; a file opened through the
// chooser comes with Phase 6.

import { expect, test, type Page } from "@playwright/test";
import { PAGE_URL, watch } from "./page.ts";

const title = "BESM2ER Character Generator";

async function opened(page: Page): Promise<ReturnType<typeof watch>> {
  const w = watch(page);
  await page.goto(PAGE_URL);
  return w;
}

const item = (page: Page, name: string | RegExp) =>
  page.getByRole("menuitem", { name });

/** Shows a message through the page's tell (src/main.ts's besm2). */
async function tell(page: Page): Promise<void> {
  await page.evaluate(() =>
    (
      globalThis as unknown as { besm2: { tell: (t: string) => void } }
    ).besm2.tell("a message"),
  );
}

/** Chooses Character > name with the mouse. */
async function character(page: Page, name: string): Promise<void> {
  await item(page, "Character").click();
  await item(page, name).click();
}

test("the menus, by mouse and by keyboard", async ({ page }) => {
  const w = await opened(page);
  const file = item(page, "File");
  const fileMenu = page.getByRole("menu", { name: "File" });
  const charMenu = page.getByRole("menu", { name: "Character" });
  await expect(fileMenu).toBeHidden();
  await file.click();
  await expect(fileMenu).toBeVisible();
  await expect(item(page, /^Save As/)).toBeEnabled();
  await expect(item(page, /^New from Campaign/)).toBeDisabled(); // Phase 11
  // Over another menu's name, that menu opens instead.
  await item(page, "Character").hover();
  await expect(charMenu).toBeVisible();
  await expect(fileMenu).toBeHidden();
  await expect(item(page, "Add Mecha")).toBeEnabled();
  await expect(item(page, /^Remove/)).toBeDisabled();
  await page.mouse.click(400, 600);
  await expect(charMenu).toBeHidden();

  // The keyboard, on a fresh page (Chromium starts Tab from where the
  // mouse last pressed): Tab reaches the bar, Down opens, Right moves on.
  await page.reload();
  await page.keyboard.press("Tab");
  await expect(file).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(item(page, "Character")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(item(page, "Add Character")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(item(page, "Add Mecha")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(item(page, "Duplicate")).toBeFocused();
  // Down wraps to Add Character.
  await page.keyboard.press("ArrowDown");
  await expect(item(page, "Add Character")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(charMenu).toBeHidden();
  await expect(item(page, "Character")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(charMenu).toBeVisible();
  await page.keyboard.press("ArrowDown"); // Add Mecha
  await page.keyboard.press("Enter");
  await expect(charMenu).toBeHidden();
  await expect(page).toHaveTitle(title + " (2 of 2) *");
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});

test("the entities", async ({ page }) => {
  const w = await opened(page);
  const choice = page.locator(".entities");
  await expect(choice).toHaveValue("1. (no name)");
  await character(page, "Add Mecha");
  await expect(page).toHaveTitle(title + " (2 of 2) *");
  await expect(choice).toHaveValue("2. (no name) (mecha)");
  await choice.selectOption("1. (no name)");
  await expect(page).toHaveTitle(title + " (1 of 2) *");
  await character(page, "Move Down");
  await expect(page).toHaveTitle(title + " (2 of 2) *");
  await expect(choice.locator("option")).toHaveText([
    "1. (no name) (mecha)",
    "2. (no name)",
  ]);
  await character(page, "Previous");
  await expect(choice).toHaveValue("1. (no name) (mecha)");
  await character(page, "Remove...");
  const d = page.locator("dialog[open]");
  await expect(d).toContainText("Remove this mecha from the file?");
  await d.getByRole("button", { name: "Remove" }).click();
  await expect(d).toHaveCount(0);
  await expect(page).toHaveTitle(title + " *");
  await expect(choice.locator("option")).toHaveText(["1. (no name)"]);
  expect(w.errors).toEqual([]);
});

test("the tabs", async ({ page }) => {
  await opened(page);
  const tab = (n: string) => page.getByRole("tab", { name: n });
  await expect(page.getByRole("tab")).toHaveText([
    "Character",
    "Attributes",
    "Defects",
    "Skills",
    "Mecha",
    "Background",
    "Preview",
  ]);
  await expect(tab("Character")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#panel-character")).toBeVisible();
  await tab("Skills").click();
  await expect(page.locator("#panel-skills")).toBeVisible();
  await expect(page.locator("#panel-character")).toBeHidden();
  await page.keyboard.press("ArrowRight");
  await expect(tab("Mecha")).toBeFocused();
  await expect(page.locator("#panel-mecha")).toBeVisible();
  await page.keyboard.press("End");
  await expect(tab("Preview")).toBeFocused();
});

// Every key in PLAN.md's "Keys", pressed with the real keyboard: the
// page gets it and prevents the browser's default, greyed item or not.
// A listener on window runs after the page's on document, in the bubble
// phase. Headless, the browsers' own shortcuts never act, so whether
// they give a key up is the user's to see in a real browser.
test("every key reaches the page and is prevented", async ({ page }) => {
  await opened(page);
  await character(page, "Add Mecha");
  await page.evaluate(() => {
    const seen: string[] = [];
    (window as unknown as { seen: string[] }).seen = seen;
    window.addEventListener("keydown", (e) => {
      if (e.key === "Control" || e.key === "Shift" || e.key === "Alt") return;
      seen.push(`${e.code} ${e.defaultPrevented}`);
    });
  });
  const pressed: [string, string][] = [
    ["Alt+Shift+PageUp", "PageUp"],
    ["Alt+Shift+PageDown", "PageDown"],
    ["Alt+Shift+N", "KeyN"],
    ["Control+o", "KeyO"],
    ["Control+s", "KeyS"],
    ["Control+Shift+S", "KeyS"],
  ];
  const titles: string[] = [];
  for (const [key] of pressed) {
    await page.keyboard.press(key);
    titles.push(await page.title());
  }
  const seen = await page.evaluate(
    () => (window as unknown as { seen: string[] }).seen,
  );
  expect(seen).toEqual(pressed.map(([, code]) => `${code} true`));
  // Previous, then Next; the rest are greyed until Phase 6.
  expect(titles).toEqual([
    title + " (1 of 2) *",
    ...Array<string>(5).fill(title + " (2 of 2) *"),
  ]);
});

test("a dialog: Escape closes it, the focus goes back", async ({ page }) => {
  await opened(page);
  await character(page, "Add Mecha");
  const choice = page.locator(".entities");
  await choice.focus();
  await tell(page);
  const d = page.locator("dialog[open]");
  await expect(d).toBeVisible();
  await expect(d.getByRole("button", { name: "OK" })).toBeFocused();
  // A key under the dialog: prevented, and does nothing.
  await page.keyboard.press("Alt+Shift+PageUp");
  await expect(page).toHaveTitle(title + " (2 of 2) *");
  await page.keyboard.press("Escape");
  await expect(d).toHaveCount(0);
  await expect(choice).toBeFocused();
  // Remove...'s question: Cancel the default, Escape cancels.
  await character(page, "Remove...");
  await expect(d).toContainText("Remove this mecha from the file?");
  await expect(d.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(d).toHaveCount(0);
  await expect(page).toHaveTitle(title + " (2 of 2) *");
  // And a message with OK, by Enter.
  await tell(page);
  await expect(d).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(d).toHaveCount(0);
});

test("screenshots", async ({ page, browserName }) => {
  await opened(page);
  await character(page, "Add Mecha");
  for (const [w, h] of [
    [640, 800],
    [1280, 800],
    [544, 700],
  ] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.screenshot({
      path: `obj/screenshots/${browserName}-${w}x${h}.png`,
    });
  }
  await page.setViewportSize({ width: 640, height: 800 });
  await item(page, "Character").click();
  await page.screenshot({ path: `obj/screenshots/${browserName}-menu.png` });
  await page.keyboard.press("Escape");
  await tell(page);
  await expect(page.locator("dialog[open]")).toBeVisible();
  await page.screenshot({ path: `obj/screenshots/${browserName}-tell.png` });
});
