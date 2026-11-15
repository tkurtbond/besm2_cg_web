# PLAN.md - besm2_cg_web, the BESM2ER character generator, in a web page

`besm2_cg_web` is a port of `besm2_cg_po` (`~/Repos/RPG/Tools/besm2_cg_po`,
Oberon-2 with pofltk, built with poc) to TypeScript, running in a web
browser. It builds a character for *Big Eyes, Small Mouth* 2nd Edition
Revised (BESM2ER) on a page laid out like besm2_cg_po's window: the
user sets the Stats, picks Attributes, Defects and Skills by name and
level, builds Weapon Attacks from Abilities and Disabilities, ties a
mecha to its owner, and the page works out the points, the derived
values and the warnings as the character changes. It holds no rulebook
text: every name shows its rulebook pages, and **?** opens the
rulebook's PDF, which the user chooses, at that page. It loads and
saves YAML in besm2_fmt's format, extended as besm2_cg_po's PLAN.md A4
says, and saves the same bytes besm2_calc_po `--fill` writes, so
pobesm2_fmt2 and the Ada besm2_fmt print what it makes.

It is **one HTML file**, built from TypeScript modules, with everything
it needs inlined. A user downloads it and opens it from disk; it needs
no server and loads nothing from the network. It can also be hosted as
it is.

**The port changes the language and the platform, not the program.**
The rules, the data tables, the file format, the window's contents and
behaviour, and the tests' oracles are besm2_cg_po's. Its `PLAN.md` is
the design document for all of that and is not repeated here: read
"What exists", Part A (A2 the rules and their results, A3 where the
calculations live, A4 the YAML extensions, A5 the window, Findings)
and Part B ("The modules", "Points the programs keep", "Pages beside
names", the build order's decisions, "Testing", "Copyright") before
changing any rule, table, key or file behaviour. This file records how
each Oberon module becomes a TypeScript module, what a browser makes
the port decide differently and why, and the build order.

**ova_cg_web is the model for the browser side.** It made the same
kind of port for the OVA generator (by way of a Go port; this one has
none, and ports the Oberon directly). Its toolchain, build, dialogs,
keys, files-as-downloads, rulebook tab, clipboard, test harness and
release are copied from it, said so in each copy, and its PLAN.md
"Findings" is taken as known (checked again here only where this
port's versions differ).

## Sources

| What | Where |
|---|---|
| The Oberon program (the code and the specification) | `~/Repos/RPG/Tools/besm2_cg_po/` (`src/*.Mod`, `PLAN.md`, `README.md`, `AGENTS.md`) |
| Its tests (to port, check for check) | `~/Repos/RPG/Tools/besm2_cg_po/test/*.Mod`, `test/*.sh` |
| Its rules tables, checked against the book | `~/Repos/RPG/Tools/besm2_cg_po/rules/*.tsv`, `tools/check-rules.py`, `tools/check-pages.py` |
| The fixtures (copied into `testdata/`) | pobesm2_fmt2's `test/data/` (33 files) and besm2_cg_po's `test/data/` (9) |
| The file oracle | besm2_calc_po, `~/Repos/RPG/Tools/besm2_cg_po/besm2_calc_po` |
| The format oracle | pobesm2_fmt2, `~/Repos/RPG/Tools/pobesm2_fmt2/pobesm2_fmt2`, its `test/golden/` and `test/golden.cases` |
| The browser port to copy from | `~/Repos/RPG/Tools/ova_cg_web/` |
| The rulebook | `~/Reference/RPG/Dyskami/BESM/2E/` (AGENTS.md: names and pages only) |

## Tools

The same as ova_cg_web's, at the versions it pins, unless a phase
finds a reason to move (and records it):

| What | Why |
|---|---|
| TypeScript, `strict`, `erasableSyntaxOnly` | the port's language |
| esbuild | bundles `src/` into one script; `build/inline.mjs` inlines it and the CSS into `src/index.html` |
| `yaml` (eemeli), exact version pinned | parses to nodes (line and column for messages, aliases, several documents) and writes from nodes with per-scalar style, which matching libfyaml's output needs |
| Node 22 (`node --test`, type stripping) | runs `src/core/`'s tests with no browser |
| happy-dom | a DOM for `src/ui/`'s tests under Node, as pofltk's headless tests were for besm2_cg_po |
| Playwright, headless Chromium and Firefox | the built page itself, from `file://` and `http://` |
| GNU make | the same targets as the sibling repos |

No UI framework: besm2_cg_po's window makes its widgets once and
refills them from the character after every change, and the page does
the same with DOM elements, as ova_cg_web's does.

## Layout

```
package.json, package-lock.json
tsconfig.base.json, tsconfig.core.json, tsconfig.ui.json, tsconfig.json (the tests')
GNUmakefile                 make, make test, make test-browser, ...
build/build.mjs             esbuild, then inline.mjs: dist/besm2_cg_web.html
build/inline.mjs            copied from ova_cg_web
src/index.html              the page's skeleton (menu bar, entity menu, tabs)
src/style.css               the look (FLTK's, approximately; ova_cg_web's)
src/main.ts                 makes the Window on the document
src/core/rules.ts           Besm2Rules     the tables, Label, PageText, PdfIndex
src/core/calc.ts            Besm2Calc      Compute
src/core/warnings.ts        Besm2Warnings
src/core/text.ts            Besm2Text      (from pobesm2_fmt2)
src/core/entities.ts        Besm2Entities  (from pobesm2_fmt2): reading YAML
src/core/config.ts          Besm2Config    the formatters' options
src/core/out.ts             Besm2Out       an output buffer (ToRope/TakeRope)
src/core/layout.ts          Besm2Layout
src/core/grid.ts            Besm2Grid      the default format
src/core/terse.ts           Besm2Terse     -t
src/core/rawms.ts           Besm2RawMs     -m
src/core/hmm.ts             Besm2Hmm       -H
src/core/character.ts       Besm2Character the model: load, edit, notices
src/core/check.ts           Besm2Check     the load notices' checks
src/core/save.ts            Besm2Save      the YAML a save writes
src/ui/window.ts            Besm2Window    menus, entity menu, tabs, files, keys
src/ui/widgets.ts           Besm2Widgets   spinners, number boxes, override boxes
src/ui/itempanel.ts         Besm2ItemPanel Attributes, Defects, Skills
src/ui/weapondialog.ts      Besm2WeaponDialog
src/ui/creation.ts          Besm2Creation  the Creation dialog, campaigns
src/ui/mechapanel.ts        Besm2MechaPanel
src/ui/background.ts        Besm2Background
src/ui/preview.ts           Besm2Preview
src/ui/rulebook.ts          the chosen PDF, opened at a page (ova_cg_web's)
src/ui/dialogs.ts           <dialog>s: tell, ask, askText, the Escape stack (ova_cg_web's)
src/ui/version.ts           the version shown and released (ova_cg_web's)
src/ui/guide.ts             the guide's panel, Help > Guide (Phase 14; ova_cg_web's)
src/core/guide.ts           the guide's text parsed (Phase 14; ova_cg_web's)
src/guide/guide.md          the guide's text (Phase 14)
test/core/*.test.ts         ports of TestRules, TestCalc, TestWarnings, TestModel, TestOut, Check
test/ui/*.test.ts           ports of TestWindow, on happy-dom
test/browser/*.spec.ts      Playwright, on dist/besm2_cg_web.html
test/browser/serve.ts       ova_cg_web's
test/files.sh               the round trip through pobesm2_fmt2 and besm2_calc_po --check
test/golden/                made by make golden; SOURCE names the commits
testdata/fmt/               pobesm2_fmt2's test/data/, copied
testdata/cg/                besm2_cg_po's test/data/, copied
tools/listrules.ts          rules' tables as ListRules prints them
tools/golden.sh             make golden
obj/, dist/                 ignored by git
```

Not ported: `Besm2Cg` (the program's main; `src/main.ts` is the
page's), `Besm2Viewer`, `Besm2Spawn` and `Besm2Paths` (the viewer
and preferences; see "The rulebook"), `Besm2Upgrade`, `Besm2Cli` and
`Besm2CalcMain` (besm2_calc_po's; the window uses none of them, and
no command line is built here: open question 1).

## Module by module

What the TypeScript does differently from the Oberon; anything not
said here is besm2_cg_po's. Line counts are the Oberon's, as a
measure of the work (about 6,600 lines of core, 3,700 of window).

### rules (Besm2Rules, 805)

The tables (3 Stats; 76 Attributes and 13 Mecha Attributes; 38
Defects and 10 Mecha-Only Defects; 52 Skills with Table 2-4's genre
costs; 34 Weapon Abilities and 21 Disabilities with their slots and
19 exclusions; 18 aliases; the Attributes' options; the Staged Stat
Cost table) become `as const` arrays of records in the same order.
`label`, `pageText` and `pdfIndex` are ported exactly, and every name
the page shows goes through them.

`tools/listrules.ts` prints the tables as besm2_cg_po's
`test/ListRules.Mod` does; `make golden` copies besm2_cg_po's
`obj/rules.txt`, and the test requires the same bytes. That one
comparison carries besm2_cg_po's `tools/check-rules.py` (against
`rules/*.tsv`) and `check-pages.py` (against the PDF) over to this
port; `make check-pages` also runs `check-pages.py` on this port's
listing, read from besm2_cg_po's repo, not copied.

### calc (Besm2Calc, 816) and warnings (Besm2Warnings, 217)

A direct port, in `Compute`'s order, since that order sets the order
of the warnings. Oberon's `INTEGER` arithmetic is 32-bit and its `DIV`
and `MOD` floor; TypeScript's `/` and `%` don't, so every `DIV` and
`MOD` becomes a helper (`div`, `mod`) that floors, and a value that
could leave −999..999 is checked as besm2_cg_po checks it. Rounding up
(SV is HP/5 rounded up) uses the same integer formula as the Oberon,
not `Math.ceil` on a float.

### text, entities, config, out, layout, grid, terse, rawms, hmm (from pobesm2_fmt2)

besm2_cg_po copied these from pobesm2_fmt2 (its Phase 4); this port
copies them from besm2_cg_po's copies. `entities` reads YAML with the
`yaml` library's nodes, as ova_cg_web's did, and its integers and
booleans with polibfyaml's grammar (ova_cg_web's `parseInt` and
`parseBool`), not the library's resolver. Where libfyaml and the
`yaml` library could disagree on what a document *is* (duplicate keys,
tags, anchors and aliases, several documents, a BOM, tabs), the phase
finds out what libfyaml does with each through pobesm2_fmt2 and
matches it, recording each in "Findings".

The formatters measure widths with `Besm2Text.DisplayLength`, in
characters: `[...s].length`. Every option of `Besm2Config` is ported,
though the page uses only the defaults (open question 3), so the
formatters can be tested through pobesm2_fmt2's `test/golden.cases`
with each case's options.

### character (Besm2Character, 1690) and check (Besm2Check, 208)

The model: entities, the current one, load (with its three kinds of
notice: difference, kept as an override; warning; error), every edit
the window makes, mecha linked by Own a Big Mecha's `subject`,
`creation` and campaigns, overrides, choices, notes. A notice reads
`ENTITY: ITEM (p. N, PDF M): TEXT`, as besm2_cg_po's. A flag beside a
rope in the Oberon (`hasX`, or NIL) becomes an optional field here
(AGENTS.md: absence is `undefined`).

### save (Besm2Save, 528)

#### The YAML a save writes

besm2_cg_po saves through libfyaml's emitter, so its bytes are
libfyaml's, not yaml.v3's as ova_cg_web's were: ova_cg_web's
`customTags` scalar styling is the pattern to follow, but its rules
are replaced with libfyaml's. From besm2_cg_po's `Besm2Save` and the
`--fill` outputs:

- A block mapping per entity in a block sequence at the root; block
  sequences are **not** indented under their key (`stats:` then
  `- name: Body` at the key's own indent).
- A scalar is plain when libfyaml would write it plain, otherwise
  double-quoted (`- "partial, thin area"`); a multi-line text is a
  literal block. The test for "plain" is `Besm2Save`'s
  `CreateStyledScalar` together with what libfyaml's emitter does
  with the style it is given; Phase 3.3 reads both and ports them,
  then proves them on a corpus of awkward strings (leading and
  trailing spaces, `: `, ` #`, indicators, `yes`/`no`/`~`/numbers,
  non-ASCII, `−`, empty) saved through besm2_calc_po.
- Keys in `Besm2Save`'s order, which is the order `--fill` writes.
- Integers as decimal, booleans as `true`/`false`.

The `yaml` library writes the nodes; no YAML is written as text by
hand. Any library option this needs (indentation of sequences, line
width, the document's start and end) is checked with a throwaway
script and recorded in "Findings".

### window and the panels (Besm2Window 1212, ItemPanel 654, WeaponDialog 392, Widgets 407, Creation 456, MechaPanel 240, Background 187, Preview 214)

Each widget becomes a DOM element made once and refilled from the
model after every change (`Changed`, `ShowAll`), with `filling` set.
Every number comes from `calc.compute`. A dialog is a `<dialog>`; a
question goes through the Window's function fields so tests can
answer it. Override boxes, warnings and over-limit points lines are
red, as besm2_cg_po's.

## Decisions the port makes

### Browsers

As ova_cg_web: **Firefox and Chromium-based browsers are required**,
every feature, from `file://`; every browser test runs in both; WebKit
is best effort and isn't tested (Playwright's WebKit doesn't run on
Fedora 44, ova_cg_web's Phase 14.1).

### Files in the browser

As ova_cg_web (its "Files in the browser"):

- **Open...** is a file input (`.yaml,.yml`); a file dropped on the
  page opens too. The notices are shown as besm2_cg_po shows them.
- **Save means download.** Save downloads under the file's name (a
  new file's, the first entity's name with `.yaml`); Save As... asks
  for a name first. A download counts as saved.
- **Unsaved changes**: New, New from Campaign... and Open ask first
  (Save, Don't save, Cancel); closing the tab gets the browser's
  `beforeunload` question.
- **No Quit**: closing the tab is quitting.
- **Campaign files**: New from Campaign... and the Creation dialog's
  Load Campaign... choose a file with a file input; Save Campaign...
  downloads it. besm2_cg_po remembers the last campaign's path in its
  preferences; a page can't keep a path, so the page doesn't.
- **Preview's Save...** downloads the shown text (`.rst`, or `.hmm`
  for h-m-m), named from the YAML file's name; **Copy** uses the
  clipboard with ova_cg_web's `execCommand` fallback.

### The rulebook

As ova_cg_web: **Rulebook > Choose PDF...** is a file input; the page
keeps a Blob URL of it for the session; **?** and **Rulebook > Open**
open a fresh Blob URL with `#page=N` (N the PDF page,
`rules.pdfIndex`) in a tab named `besm2-rulebook`. With no PDF chosen
they ask for one first. **Viewer...** has no counterpart, and
`Besm2Viewer`, `Besm2Spawn` and the preferences aren't ported. The
user should choose `BESM2ER_bookmarked.pdf`, as for besm2_cg_po; any
copy whose pages match works.

### Keys

besm2_cg_po's keys and the page's, following ova_cg_web's findings
(Phase 5.2 there: tested headless, and pressed in the real browsers):

| besm2_cg_po | Page | Why |
|---|---|---|
| Ctrl+O, Ctrl+S, Ctrl+Shift+S | the same | a page can take them (`preventDefault`) |
| Ctrl+N (New) | Alt+Shift+N | the browsers keep it (new window) |
| Ctrl+Q (Quit) | none | no Quit |
| Ctrl+PgDn, Ctrl+PgUp (Next, Previous entity) | Alt+Shift+PgDn, Alt+Shift+PgUp | the browsers keep them (next, previous tab) |

Menu mnemonics (`&File`) are handled as ova_cg_web's menus handle
them. A key whose item is greyed, or pressed under a dialog, is still
prevented. The menus show each item's key. Phase 5.2 re-runs
ova_cg_web's key tests here.

### The look

besm2_cg_po's layout, item for item (its PLAN.md A5 and step 6 to 12's
decisions): 640 by 800 in besm2_cg_po; here the page's content is that
wide and as tall as the window allows, scrolling inside a tab rather
than the page. FLTK's look approximated with ova_cg_web's CSS. No
dark scheme (besm2_cg_po has none; open question 5).

### Several entities, mecha

The model holds every entity of the file (characters, mecha, and
entities it doesn't edit, which are kept and saved as loaded, as
besm2_cg_po keeps them). The entity menu sits at the menu bar's right,
as besm2_cg_po's Choice does.

## Build order

The phases follow besm2_cg_po's Part B order where it applies and
ova_cg_web's for the page. Each phase ends with `make test` (and
`make test-browser` from Phase 5) passing, and its decisions and
findings recorded here.

## Phase 0 Skeleton [done]

### Phase 0.1 The toolchain [done]

`package.json` with ova_cg_web's pinned versions (TypeScript 7.0.2,
esbuild 0.28.2, `yaml` 2.9.1, happy-dom 21.0.4, Playwright 1.65.0,
prettier 3.9.10, @types/node 22.20.5); ova_cg_web's three tsconfig
projects (`tsconfig.core.json` with no DOM and no Node,
`tsconfig.ui.json` with the DOM, `tsconfig.json` for the tests, tools
and build), `.gitignore`, prettier's settings; the GNUmakefile's
targets as far as Phase 0 needs them (`make`, `debug`, `test`,
`test-browser`, `check`, `golden`, `clean`; `check-pages` comes with
Phase 1, `check-guide` with 14, `version` and `release` with 15).
`test/ui/happydom.test.ts` shows happy-dom gives the tests a document.

### Phase 0.2 The single-file build [done]

`build/inline.mjs` and its test copied from ova_cg_web; `build/build.mjs`
copied without the guide and the size budget, which come in their
phases. `src/index.html` with the CSP (`default-src 'none'`, inline
script and style, `img-src data:` for the empty icon), and a
placeholder `src/main.ts`. `test/browser/build.spec.ts` opens the page
in headless Chromium and Firefox from `file://` and from `http://`
(`test/browser/serve.ts`, on port 8714, so it doesn't meet
ova_cg_web's 8713) and finds no request and no error; a planted image
request made it fail in both. Playwright uses the browsers ova_cg_web
installed (chromium-1254, firefox-1572); none was added.

### Phase 0.3 Fixtures and golden files [done]

`make golden` (`tools/golden.sh`) copies the fixtures and makes the
golden files from besm2_calc_po (`BESM2_CALC_PO`) and pobesm2_fmt2
(`POBESM2_FMT2`) where they are built. It stops if a binary (or
besm2_cg_po's `obj/rules.txt`) is older than its sources; it never
rebuilds another repo. It writes only `testdata/` and `test/golden/`:

- `testdata/fmt/`: pobesm2_fmt2's `test/data/` (33 fixtures);
  `testdata/cg/`: besm2_cg_po's `test/data/` (9).
- `test/golden/fmt/` and `test/golden/cg/`, for each fixture NAME, run
  in its directory as besm2_cg_po's `test/files.sh` runs them, so a
  message names the file as `NAME.yaml`:
  - `NAME.check.err`: `--check`'s standard error;
  - `NAME.fill.yaml`, `NAME.fill.err`: `--fill`'s output and notices;
  - `NAME.ID.out`, `NAME.ID.err`: the formats of the file as
    besm2_calc_po prints them (computed, overrides marked), ID one of
    `grid` (the default), `t`, `m`, `H`, `H-S`, `1`, `b`, `l`, the
    options `test/files.sh` tries, with `-t`;
  - `window.with-CAMPAIGN.{check,fill}.*`: each campaign fixture given
    to `window.yaml` with `--campaign`, as besm2_cg_po's `test/cli.sh`
    does (a campaign file on its own isn't an entity file, and
    besm2_calc_po refuses it);
  - `status`: `NAME MODE STATUS`, a line per run.
  Empty outputs are not kept.
- `test/golden/fmt2/`: pobesm2_fmt2's `test/golden/` and
  `test/golden.cases`, copied.
- `test/golden/rules.txt`: besm2_cg_po's `obj/rules.txt`.
- `test/golden/SOURCE`: the two commits, and whether each tree was
  clean.

Made from besm2_cg_po 42e58e1 and pobesm2_fmt2 78a0fe6 (2026-11-15):
1,070 files, 4.6 MB.

## Phase 1 rules

`rules.ts` and the port of `TestRules`; `tools/listrules.ts` against
`test/golden/rules.txt`; `make check-pages`.

## Phase 2 calc and warnings

`calc.ts` and `warnings.ts`; the ports of `TestCalc` and
`TestWarnings`. Every fixture character's numbers come out of
`compute` (the fixtures are the oracle), the same differences as
besm2_calc_po reports.

## Phase 3 Files

### Phase 3.1 text and entities

Reading YAML as pobesm2_fmt2 reads it; the libfyaml-versus-`yaml`
questions above, answered and tested.

### Phase 3.2 character and check

The model, load notices and edits; the port of `TestModel` and
`Check`; every fixture's notices match its `NAME.fill.err` and
`NAME.check.err`.

### Phase 3.3 save

The YAML a save writes; every fixture loaded and saved is byte for byte
its `NAME.fill.yaml`, and loads again with no notices and the same
bytes.

### Phase 3.4 The round trip

`test/files.sh` (from besm2_cg_po's): each saved file formats through
pobesm2_fmt2 as the fixture's `--fill` does, and passes
`besm2_calc_po --check`. A Node script saves them into `obj/`.

## Phase 4 The formatters

`config`, `out`, `layout`, `grid`, `terse`, `rawms`, `hmm`; the port
of `TestOut`; pobesm2_fmt2's `golden.cases` byte for byte, then each
fixture's four formats against `test/golden/format/`.

## Phase 5 The page's shell

### Phase 5.1 The look and the layout

The menu bar (File, Character, Rulebook), the entity menu, the seven
tabs, empty; ova_cg_web's CSS adapted.

### Phase 5.2 Menus and keys

The keys above, tested in both browsers.

### Phase 5.3 Dialogs and the test harness

`dialogs.ts` copied; the Window's function fields; happy-dom's harness
from ova_cg_web, with its rule against comparing nodes.

## Phase 6 Files on the page

Open, drop, Save, Save As, New, the save-first question,
`beforeunload`, the title's ` *`, notices in a dialog.

## Phase 7 The Character tab

Name, Tagline, Size; the Stats with Value, Points and override, and
**?**; the derived values; the points lines and Warnings.

## Phase 8 The Attributes, Defects, Skills and Background tabs

`itempanel.ts`: the lists with their page columns, adding by name
(with both pages), levels, options and choices, subjects, overrides,
notes. The Background tab.

## Phase 9 The Weapon dialog

Abilities and Disabilities with slots, counts-as and detail; Primary;
Different Gunner; the exclusions; Cancel restores.

## Phase 10 Mecha and several entities

Add Character, Add Mecha, Duplicate, Remove..., Move Up/Down,
Next/Previous; the Mecha tab; Mecha Points and the last owner pricing.

## Phase 11 Creation and campaigns

The Creation dialog (Copy from, the options, house skills, **?** on
each row, Cancel restores); New from Campaign...; Load and Save
Campaign... as file input and download.

## Phase 12 The Preview tab

The four formats with the default options, Copy, Save....

## Phase 13 The rulebook

`rulebook.ts` copied; **?** everywhere it is in besm2_cg_po; Rulebook >
Open and Choose PDF....

## Phase 14 The guide

A guide inside the page, as ova_cg_web's Phase 15 (open question 4),
written just before the release: its source (`src/guide/guide.md`),
parser and panel (Help > Guide) copied from ova_cg_web's, its text
written for BESM2ER, and `make check-guide` checking that it shares no
run of 8 words with the rulebook, as ova_cg_web's does. The guide, like
the program, holds no rulebook text; it explains the page and points to
the rulebook's pages.

## Phase 15 Release

Browsers and size (a budget set from the first full build; ova_cg_web
holds 256 KiB), a README for users, `make version` and `make release`
as ova_cg_web's (a signed `SHA256SUMS`, a signed tag, a GitHub
release asset, open question 7), with the user's go-ahead for each
release.

## Testing

- `make test`: `src/core` under Node against `testdata/` and
  `test/golden/`; `src/ui` on happy-dom; then `test/files.sh` (needs
  besm2_calc_po and pobesm2_fmt2).
- `make test-browser`: the built page, headless, in Chromium and
  Firefox, from `file://` and `http://`.
- `make check-pages`: rules' pages against the PDF, with besm2_cg_po's
  `tools/check-pages.py`.
- `make check-guide` (from Phase 14): the guide shares no run of 8
  words with the rulebook.
- `make check`: `tsc` on the three projects, and prettier.
- The oracle for calculations is the fixture characters; for files,
  besm2_calc_po's `--fill` and `--check`; for the formats,
  pobesm2_fmt2's golden files.

## Findings

What the port finds out about TypeScript, the `yaml` library, libfyaml,
esbuild and the browsers that besm2_cg_po's design didn't have to know.
ova_cg_web's "Findings" are taken as known and not repeated.

- **The empty icon needs `img-src data:`** (2026-11-15, headless
  Chromium 1254 and Firefox 1572): with `default-src 'none'` alone,
  both report the `data:,` icon blocked as a console error.
  ova_cg_web's policy allowed `data:` images for its portrait, so it
  never met this.
- **npm 11 doesn't run esbuild's `postinstall`** (`allow-scripts`)
  unless approved; the build works without it, since the platform's
  binary comes as an optional dependency (2026-11-15).

## Open questions

1. ~~besm2_calc_po's twin~~: a Node command from `Besm2Cli`,
   `Besm2CalcMain` and `Besm2Upgrade`? Decided (the user, 2026-11-15):
   no; the command line stays besm2_calc_po's.
2. ~~Upgrade in the page~~: should Open offer `--upgrade`'s changes
   (old keys to the structured Weapon Attack keys, aliases to
   BESM2ER's names)? Decided (the user, 2026-11-15): not now.
3. ~~The formatters' options in Preview~~ (terse, width, the other
   `Besm2Config` options). Decided (the user, 2026-11-15): the
   defaults only, as besm2_cg_po; the options are ported anyway, for
   the golden cases.
4. ~~A guide~~ inside the page, as ova_cg_web's Phase 15? Decided (the
   user, 2026-11-15): yes, just before the release (Phase 14).
5. ~~A dark colour scheme~~? Decided (the user, 2026-11-15): no.
6. **Draft autosave** in `localStorage`? ova_cg_web has none (nothing
   in its `src/` uses `localStorage`, `sessionStorage` or IndexedDB,
   2026-11-15), and it is an open question there too. Proposed: no;
   nothing is stored.
7. ~~Distribution~~. Decided (the user, 2026-11-15): a GitHub release
   asset, as ova_cg_web's.
