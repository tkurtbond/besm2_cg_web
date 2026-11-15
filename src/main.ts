// The page's entry point: makes the Window on the document, with the
// guide's text (src/guide/guide.md, Phase 14), as ova_cg_web's does.
//
// The Window is also globalThis.besm2, so a browser test can reach what
// the page offers no control for yet, and a user can look at it from
// the console (as ova_cg_web's globalThis.ova).

import { Window } from "./ui/window.ts";
import { parse } from "./core/guide.ts";
import guideText from "./guide/guide.md";

declare global {
  var besm2: Window;
}

globalThis.besm2 = new Window(document, parse(guideText));
