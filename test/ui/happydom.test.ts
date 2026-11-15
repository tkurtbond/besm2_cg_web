// Phase 0.1: happy-dom gives src/ui's tests a document under plain
// Node. The page's own tests start in Phase 5.

import { test } from "node:test";
import assert from "node:assert/strict";
import { Window as HappyWindow } from "happy-dom";

test("happy-dom: a document with the page's #app", () => {
  const happy = new HappyWindow({ url: "file:///besm2_cg_web.html" });
  happy.document.body.innerHTML = '<main id="app"></main>';
  const app = happy.document.getElementById("app");
  assert.ok(app !== null, "the #app element");
  app.textContent = "BESM2ER";
  assert.equal(happy.document.body.textContent, "BESM2ER");
  happy.close();
});
