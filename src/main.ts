// The page's entry point: makes the Window on the document.
//
// The Window is also globalThis.besm2, so a browser test can reach what
// the page offers no control for yet, and a user can look at it from
// the console (as ova_cg_web's globalThis.ova).

import { Window } from "./ui/window.ts";

declare global {
  var besm2: Window;
}

globalThis.besm2 = new Window(document);
