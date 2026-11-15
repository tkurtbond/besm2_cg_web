# AGENTS.md

Working notes for an agent in this repo, which holds `besm2_cg_web`, a
character generator for *Big Eyes, Small Mouth* 2nd Edition Revised
(BESM2ER) that runs in a web browser: one HTML file, downloaded and
opened locally, built from TypeScript. It is a port of besm2_cg_po
(`~/Repos/RPG/Tools/besm2_cg_po`, Oberon-2 with pofltk, built with
poc), made the way ova_cg_web (`~/Repos/RPG/Tools/ova_cg_web`) ported
the OVA generator. PLAN.md is the port's design and build order; this
file is operational notes, not a design doc.

**besm2_cg_po is both the specification and the code to port.** Its
`PLAN.md` holds the rules analysis (Part A), the YAML extensions (A4),
the window (A5) and every decision of its build (Part B); its `src/*.Mod`
modules are the program, and its `test/*.Mod` and `test/*.sh` the
checks to port. There is no Go port in between (ova_cg_web had
ova_cg_go): port from the Oberon directly. Read the Oberon module, and
the part of besm2_cg_po's PLAN.md it cites, before writing its
TypeScript module, and port its tests check for check. Where this repo
must differ (a browser, TypeScript, the `yaml` library), PLAN.md says
how and why; anything PLAN.md doesn't mention stays as besm2_cg_po has
it. Where besm2_cg_po's code and its PLAN.md disagree, stop and tell
the user: it is a finding for besm2_cg_po, not a choice to make here.

**ova_cg_web is the model for everything a browser adds**: the build,
the single file, the dialogs, the keys, files as downloads, the
rulebook in the browser's PDF viewer, the clipboard, the browser tests,
the release. Copy its code where it fits (and say so in the copy),
rather than solving the same problem again; its PLAN.md "Findings"
records what the browsers, the `yaml` library and esbuild do.

## Reference material

| What | Where |
|---|---|
| The Oberon program, to port | `~/Repos/RPG/Tools/besm2_cg_po/` (`PLAN.md`, `AGENTS.md`, `README.md`, `src/`, `test/`, `rules/`, `tools/`) |
| Its command-line twin, the oracle for files | `besm2_calc_po` in the same repo (`--fill`, `--check`, the formats) |
| The formatter, the oracle for printing | pobesm2_fmt2: `~/Repos/RPG/Tools/pobesm2_fmt2/` (binary `pobesm2_fmt2`, `test/data/`, `test/golden/`, `test/golden.cases`) |
| The reference formatter | the Ada besm2_fmt: `~/Repos/RPG/Tools/besm2_fmt/` |
| The web port to copy from | `~/Repos/RPG/Tools/ova_cg_web/` (`PLAN.md`, `AGENTS.md`, `build/`, `src/ui/`, `test/browser/`) |
| BESM2ER rulebook, to open in the viewer | `~/Reference/RPG/Dyskami/BESM/2E/BESM2ER_bookmarked.pdf` (no text layer) |
| BESM2ER rulebook, for text and font checks | `~/Reference/RPG/Dyskami/BESM/2E/BESM2ER.pdf`, `BESM2ER-layout.text`, `BESM2ER-nolayout.text` -- **never copy into this repo** |
| Golden outputs | made by `make golden` from besm2_calc_po and pobesm2_fmt2, into `test/golden/` |

## The rulebook's text stays out of the program

The program knows the *names* of Stats, Attributes, Defects, Skills,
and Weapon Attack Abilities and Disabilities, the numbers the rules
attach to them (costs, levels, limits, slots), and the rulebook page
each is described on. **It holds no descriptions**: none in the
source, the data tables, tooltips (`title` attributes included), tests
or docs. To explain an item it opens the rulebook's PDF at that page.
Don't paste text from the rulebook or its `.text` files into this
repo, even as a comment. A test that needs the rulebook's text reads
it from the user's PDF at test time and keeps none of it. **Never
bundle the rulebook PDF** or any part of it into the built page.

**Every name the page shows has both its pages beside it**, the page
printed in the book and the PDF's page: `Highly Skilled (p. 42, PDF
44)` in a menu or message, `p. 42, PDF 44` in a list's page column,
made by `rules.label` and `rules.pageText` (besm2_cg_po's
`Besm2Rules.Label` and `PageText`), never formatted by hand. The PDF
has no page labels, and its page is the printed page + 2
(`rules.pdfIndex`); the browser's viewer is always sent the PDF page
(`#page=N`).

## Build / test

```sh
make                 # dist/besm2_cg_web.html (npm run build: esbuild, inline)
make test            # the unit tests under Node (node --test), then
                     #   test/files.sh (needs besm2_calc_po and pobesm2_fmt2)
make test-browser    # the built page in headless Chromium and Firefox (Playwright)
make check           # tsc on the three projects (core, ui, tests) and prettier --check
make check-pages     # rules' pages against the rulebook PDF (needs mutool)
make check-guide     # the guide shares no run of 8 words with the rulebook (Phase 14)
make golden          # remake test/golden/ from besm2_calc_po and pobesm2_fmt2
make clean           # rm -rf obj dist
```

- `npm ci` once after cloning; `package-lock.json` is committed. Adding
  a dependency needs the user's go-ahead: the built file inlines it.
  Pin exact versions.
- **The built page loads nothing from the network**: no CDN, no web
  fonts, no analytics. Everything is inlined, so it works offline from
  `file://`. `make test-browser` checks that it makes no request.
- **`testdata/` is copied by `make golden`, never edited**: `testdata/fmt/` is
  pobesm2_fmt2's `test/data/` (itself the Ada besm2_fmt's), and
  `testdata/cg/` is besm2_cg_po's `test/data/`. A fixture changes in
  its own repo first, then down the chain to here. Likewise
  `test/golden/` is only ever refreshed by `make golden`, never edited
  by hand; `test/golden/SOURCE` says which commits it came from.
- **A new YAML key** goes into the Ada besm2_fmt first, then the
  Oberon-2 ports (obesm2_fmt, obesm2_fmt2, pobesm2_fmt2), the Scheme
  `besm2-rst*.scm`, and besm2_cg_po (each in its own repo, with the
  user's go-ahead), before besm2_cg_web saves it (besm2_cg_po's
  AGENTS.md, "Order of changes to the YAML format").
- `make golden` and `test/files.sh` run besm2_calc_po and pobesm2_fmt2
  where they are built (`BESM2_CALC_PO`, `POBESM2_FMT2`); they only
  read those repos, and write only under this repo's `obj/` and
  `test/golden/`. If a binary is missing or stale, say so; don't
  rebuild another repo without the user's go-ahead.

## Browsers and the desktop

- **The page must work in Firefox and in Chromium-based browsers**,
  as ova_cg_web must (the user's requirement for it, 2026-11-07).
  Every browser test runs in both; never use a feature only one of them
  has without a fallback that works in the other.
- **An agent never opens windows on the user's desktop** (the user's
  rule for ova_cg_po and besm2_cg_po, which holds here): not the page
  in the user's browser, not through the Claude in Chrome extension,
  not a headed Playwright browser, not a PDF viewer. Browser tests run
  headless (`make test-browser`). Opening the page in the user's own
  browser happens only when the user asks for it.
- **Never write into the user's browser profile.** Playwright's
  browsers use their own temporary profiles; `npx playwright install`
  downloads browsers into `~/.cache/ms-playwright/` (ova_cg_web
  already installed Chromium and Firefox there) and needs the user's
  go-ahead to add any.
- **Nothing on the page waits for the user** in a way a test can't
  answer: a message, the save-first question, the file choosers, a
  line of text, the download and the rulebook go through the `Window`'s
  function fields (`tell`, `ask`, `chooseFile`, `askText`, `download`,
  `openPage`), as ova_cg_web's do, and a test replaces them with
  synchronous fakes. Never call `alert`, `confirm` or `prompt`: they
  block, and the page uses its own `<dialog>`s.
- Temporary files go under `/usr/local/sw/tmp` (the user's CLAUDE.md:
  `/tmp` is RAM), in a directory of the session's own, removed when
  done.

## TypeScript here

- **The rules and the page are separate.** `src/core/` (`rules`,
  `calc`, `warnings`, `text`, `entities`, `character`, `check`,
  `save`, the formatters) uses no DOM and no browser global; its tests
  run under plain Node. Only `src/ui/` touches the DOM. Every number
  on the page comes from `calc.compute`; no event handler does
  arithmetic of its own.
- **Only erasable TypeScript**: Node runs the tests by stripping
  types, so no `enum`, no value `namespace`, no constructor parameter
  properties (`erasableSyntaxOnly` refuses them). Imports name the
  `.ts` file.
- **Port names and order faithfully.** `Besm2Calc.Compute` applies
  the rules in an order that sets the order of the warnings; keep it.
  An Oberon module `Besm2Xxx` becomes `src/core/xxx.ts` (PLAN.md,
  "Module by module"); an exported `Proc*` becomes `proc`, a `TYPE`
  `PascalCase`; keep the names otherwise, so a reader can find the
  Oberon behind each one. Oberon's `CONST` groups become `as const`
  objects or plain `const`s.
- **Absence is `undefined`, never `""`.** Where the Oberon keeps a
  flag beside a rope (`hasX`, or NIL for none) because "" and absent
  save differently, an optional text here is `x?: string`, and `""` is
  a present, empty text. Never test absence with `!x`.
- **Integers and booleans in a file are read with polibfyaml's
  grammar** (ported as ova_cg_web's `entities.parseInt` and
  `parseBool` were, and checked against polibfyaml's), not the `yaml`
  library's resolver, so the page reads exactly what pobesm2_fmt2
  reads. Integers stay within 32 bits; check range explicitly, since
  JavaScript numbers won't overflow.
- **Save through the `yaml` library's nodes, never YAML text by
  hand**, set up to write what libfyaml's emitter writes for
  besm2_cg_po (PLAN.md, "The YAML a save writes"), which is not what
  ova_cg_web's yaml.v3 port writes. Check a change against
  `test/golden/` and with `test/files.sh`.
- **Bytes or characters**: the Oberon's ropes are UTF-8 bytes.
  `Besm2Text.DisplayLength` counts characters (the grid tables'
  widths, the word wrap), and that is `[...s].length` here; elsewhere
  a length is bytes, which is the same for ASCII. Port each length
  knowing which it is. `"−"` (U+2212) and `"×"` (U+00D7) are one
  character each.
- **Fill the page with `filling` set**: setting an input's value
  doesn't fire `input`, but code that calls a handler while filling
  mustn't count as a change; `Window.filling` guards every handler, as
  in ova_cg_web.
- **Keys:** the page takes only keys the browser lets it have (PLAN.md,
  "Keys"). Never bind Ctrl+A, C, V, X, Z or Y.
- A programmer error throws; bad input or a cancelled dialog comes back
  as a result with a message, shown in a dialog. Never let an
  exception from a loaded file escape to the console unreported.

## Testing policy

- Run `make test` after any change, and `make test-browser` after a
  change to `src/ui/`, the build or the page's CSS.
- **The fixture characters are the oracle for the calculations**, as
  in besm2_cg_po: every number a fixture's file holds must come out of
  `calc` from its Stats, Attributes, Defects, Skills and creation
  alone, or be a difference besm2_calc_po reports too. A fixture the
  rules can't reproduce is a finding for besm2_cg_po's PLAN.md, not a
  test to loosen.
- **besm2_calc_po's outputs are the oracle for the files**: each
  fixture loaded and saved must be byte for byte its `--fill` output
  (`test/golden/`), with the same notices; formatted, byte for byte
  its formatted output. A saved file must also format through
  pobesm2_fmt2 as the fixture's `--fill` does and pass `besm2_calc_po
  --check` (`test/files.sh`), and load here again with no notices,
  saving the same bytes.
- **pobesm2_fmt2's golden files are the oracle for the formatters**,
  through its `test/golden.cases`.
- Port each Oberon check with the same label where it makes sense, so a
  failure can be compared with besm2_cg_po's.
- **Prove a new check can fail**: plant the bug it targets and watch it
  fail.
- **Never compare DOM nodes with `assert.equal` or `deepEqual`** in
  `test/ui/`: on a failure node:test prints both, and a happy-dom node
  prints its whole window, about 20 GB, so the OOM killer stops the
  run (ova_cg_web, twice, 2026-11-07). Write `assert.ok(a === b,
  label)`. Run a planted bug's test under a memory cap, e.g.
  `systemd-run --user --scope -q -p MemoryMax=4G -p MemorySwapMax=0`;
  `--max-old-space-size` didn't stop it.

## Conventions

- Prettier-formatted TypeScript, `strict` on. Comments explain why and
  only claim what has been verified; a comment about how a browser,
  the `yaml` library, libfyaml or esbuild behaves is checked with a
  throwaway script first, and says in which browsers or versions it
  was seen.
- A rule in the code cites both its pages (`// p. 82, PDF 84`), never
  its text.
- Record decisions and findings in PLAN.md as they happen, with the
  date. Mark a finished phase or subphase `[done]` in its heading and
  strike through an open question once it's decided.
- Commit only when the user asks.
