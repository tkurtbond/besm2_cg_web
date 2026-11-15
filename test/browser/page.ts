// What every browser test needs: the built page's URL, and a record of
// what the page asked the network for (blob: and data: URLs aside) and
// said on its console. Copied from ova_cg_web's test/browser/page.ts.

import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import type { Page } from "@playwright/test";

/** The port test/browser/serve.ts serves the page on. */
export const HTTP_PORT = 8714;

/**
 * The page: from file://, or, when BESM2_HTTP is set, from the local
 * server playwright.config.ts starts (test/browser/serve.ts).
 */
export const PAGE_URL =
  process.env.BESM2_HTTP === undefined
    ? pathToFileURL(resolve("dist/besm2_cg_web.html")).href
    : `http://127.0.0.1:${HTTP_PORT}/besm2_cg_web.html`;

export interface Watch {
  requests: string[];
  errors: string[];
}

/** Starts recording; call before page.goto. */
export function watch(page: Page): Watch {
  const w: Watch = { requests: [], errors: [] };
  // A blob: or data: URL is the page's own memory, not the network.
  page.on("request", (r) => {
    const u = r.url();
    if (u !== PAGE_URL && !/^(blob|data):/.test(u)) w.requests.push(u);
  });
  page.on("console", (m) => {
    if (m.type() === "error") w.errors.push(m.text());
  });
  page.on("pageerror", (e) => w.errors.push(String(e)));
  return w;
}

/** besm2_cg_po's test/data, copied by make golden. */
export const DATA_DIR = resolve("testdata/cg");

/**
 * openFile opens a file through File > Open... and the file chooser it
 * opens, as a user would: the fixture testdata/cg/NAME, or, given
 * contents, a file named name holding them. Copied from ova_cg_web's.
 */
export async function openFile(
  page: Page,
  name: string,
  contents?: string,
): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("menuitem", { name: "File" }).click();
  await page.getByRole("menuitem", { name: /^Open\.\.\./ }).click();
  const c = await chooser;
  if (contents === undefined) await c.setFiles(resolve(DATA_DIR, name));
  else
    await c.setFiles({
      name,
      mimeType: "application/yaml",
      buffer: Buffer.from(contents),
    });
}
