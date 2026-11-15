// Prints every page the guide may cite (src/core/guide.ts's pages) as
// "section<TAB>PAGE<TAB>HEADING", the lines of tools/listrules.ts's
// listing that besm2_cg_po's tools/check-pages.py checks, so that make
// check-pages finds each heading on its page as it does rules' own.
// Adapted from ova_cg_web's tools/listguide.ts.
import { pages } from "../src/core/guide.ts";

let out = "";
for (const p of pages) out += `section\t${String(p.page)}\t${p.heading}\n`;
process.stdout.write(out);
