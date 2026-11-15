// The port of besm2_cg_po's test/TestOut.Mod: Besm2Out's ToRope and
// TakeRope. Out here has no buffer of the Oberon's size, but the check
// past it is kept, with the same label, as a long write.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as Out from "../../src/core/out.ts";

const BufSize = 8192; // Besm2Out's buffer

test("nothing written: NIL", () => {
  Out.toRope();
  assert.equal(Out.takeRope(), undefined);
});

test("what was written, in order", () => {
  Out.toRope();
  Out.string("abc");
  Out.ln();
  Out.rope("de");
  Out.repeat("f", 3);
  assert.equal(Out.takeRope(), "abc\ndefff");
});

test("past the buffer: all of it, in order", () => {
  Out.toRope();
  Out.repeat("x", 2 * BufSize + 5);
  Out.char("y");
  assert.equal(Out.takeRope(), "x".repeat(2 * BufSize + 5) + "y");
});

test("taken: kept from scratch the next time", () => {
  Out.toRope();
  Out.string("abc");
  Out.takeRope();
  Out.toRope();
  assert.equal(Out.takeRope(), undefined);
});
