// Which build the page is: its version (package.json's) and the commit
// it was built from, which build/build.mjs puts in the bundle (esbuild's
// define). Run unbundled, as the unit tests run it, there are none, and
// the page says it is a development copy. Shown as the title line's
// tooltip (PLAN.md, Phase 14), and
// Help > About's message. Copied from ova_cg_web's src/ui/version.ts.

declare const BESM2_VERSION: string | undefined;
declare const BESM2_COMMIT: string | undefined;

/** package.json's version; "dev" unbundled. */
export const version: string =
  typeof BESM2_VERSION === "string" ? BESM2_VERSION : "dev";

/** The commit built from, "+" after it if the tree had changes; "" unbundled. */
export const commit: string =
  typeof BESM2_COMMIT === "string" ? BESM2_COMMIT : "";

/** about is what the title line's tooltip says of the build. */
export function about(): string {
  const built = commit === "" ? "" : `, built from ${commit}`;
  return `besm2_cg_web ${version}${built}`;
}
