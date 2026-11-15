// Phase 0.2: the single file opens in each browser, from file:// and
// from http://, fetches nothing and reports no error.

import { expect, test } from "@playwright/test";
import { PAGE_URL, watch } from "./page.ts";

test("the page opens, fetching nothing", async ({ page }) => {
  const w = watch(page);
  await page.goto(PAGE_URL);
  await expect(page).toHaveTitle("BESM2ER Character Generator");
  await expect(page.locator("#app")).toHaveText("BESM2ER Character Generator");
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});
