// The built page in headless browsers (AGENTS.md, "Browsers and the
// desktop"): Chromium and Firefox, both required (PLAN.md, "Browsers").
// Never headed: no window opens on the desktop.
//
// Copied from ova_cg_web. Each with its PDF viewer, for the rulebook (Phase 13):
// Chromium the full build (channel "chromium"), since the headless shell
// Playwright uses by default has none, and Firefox with pdf.js on, which
// Playwright turns off (both seen in ova_cg_web's Phase 13).

import { defineConfig, devices } from "@playwright/test";
import { HTTP_PORT } from "./test/browser/page.ts";

// BESM2_HTTP set: the same tests with the page from a local http://
// server (make test-browser runs both).
const http = process.env.BESM2_HTTP !== undefined;

export default defineConfig({
  testDir: "test/browser",
  outputDir: http ? "obj/playwright-http" : "obj/playwright",
  webServer: http
    ? {
        command: `node test/browser/serve.ts ${HTTP_PORT}`,
        url: `http://127.0.0.1:${HTTP_PORT}/besm2_cg_web.html`,
        reuseExistingServer: false,
      }
    : undefined,
  forbidOnly: true,
  reporter: "list",
  use: { headless: true },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chromium" },
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        launchOptions: { firefoxUserPrefs: { "pdfjs.disabled": false } },
      },
    },
  ],
});
