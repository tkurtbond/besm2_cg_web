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
src/core/fyaml.ts           Fyaml          (polibfyaml's) nodes, paths, places, Resolve, errors
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
Cost table) are built, in the same order, by the same short
procedures as the Oberon's (`A`, `L`, `F`, `D`, `S`, `WA`, ...), call
for call, so each line can be set beside Besm2Rules.Mod's (decided in
Phase 1, in place of `as const` arrays). `label`, `pageText` and
`pdfIndex` are ported exactly, and every name the page shows goes
through them.

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

## Phase 1 rules [done]

`src/core/rules.ts`, the port of `Besm2Rules` (2026-11-15):

- Oberon's `CONST`s are plain numeric constants under the same names;
  an Item's `SET` of flags is a number of bits, tested with
  `hasFlag(it, flag)`; `option[0 .. nOptions-1]` is the array
  `option`, its length `nOptions`; `NIL` is `undefined`, so `find`,
  `findKind`, `pdfPage` and `pageText` take or give `undefined`.
  `count` and `get` keep the Oberon's names; `getAlias(i)` returns
  `{alias, item}` instead of two `VAR`s; procedures that filled a `VAR
  s` (`label`, `pageText`, `pagesText`, `pageLabel`, `labelOf`,
  `genreName`) return the string.
- `Unlimited` is 2147483647, poc's `MAX(INTEGER)`; the listing prints
  it as `unlimited`, as before.
- A programmer error (a page < 0, a Stat outside 1–12 for
  `stagedStatCost`, an index out of range) throws, as the Oberon's
  `ASSERT` halts.

`test/core/rules.test.ts` ports `TestRules` check for check, with its
labels, and adds: `tools/listrules.ts` (the port of `ListRules.Mod`)
prints `test/golden/rules.txt` byte for byte; `sameName` ignores ASCII
case only; `stagedStatCost` refuses 0 and 13. `make test` also runs
besm2_cg_po's `tools/check-rules.py` on this port's listing (`obj/rules.txt`)
against besm2_cg_po's `rules/`; `make check-pages` runs its
`tools/check-pages.py` on the listing and the two PDFs: all 247 items
and 14 rules' pages are headings on their pages. Both tools are read
from besm2_cg_po, not copied.

Proved to fail: Highly Skilled moved to p. 43 failed the book's order,
its label and the listing; Melee and Stoppable's exclusion removed
failed `excludes` and the listing; a listing with p. 43 failed
`check-pages.py`.

## Phase 2 calc [done]

`src/core/calc.ts`, the port of `Besm2Calc` (2026-11-15):

- The records are classes whose fields start at their zero values, as
  `NEW` leaves them for the `Init` procedures, which keep their names
  (`initEntity`, `initAttr`, `initMod`, `initDefect`, `initSkill`,
  `initHouseSkill`, `initCreation`) and are called after `new`, as the
  Oberon calls them after `NEW`: character.ts will extend the classes
  (`Besm2Character`'s `RECORD (C.AttrDesc)`) and set them up only once
  it has looked an item up.
- The lists stay linked by `next`, in the order added, so each loop
  can be read beside the Oberon's. `AddMod(VAR list, m)` becomes
  `list = addMod(list, m)`.
- `Number` is `Num`, so as not to shadow JavaScript's `Number`. A
  `Num` is an object here, not a record copied on assignment: a port
  that copies one (`Besm2Character`'s `n: C.Number` locals) must copy
  its fields.
- `Rules(e, VAR c)` returns the `Creation` itself instead of a copy;
  nothing in `calc` changes it.
- `DIV` is `div`, which floors (the only `DIV`s that can see a negative
  number are Diminutive's HP; a test checks −10 DIV 20 is −1).
- `Text` and `ComputedText` return the string; `SetOption` and
  `MechaPoints` throw where the Oberon's `ASSERT`s halt.

`test/core/calc.test.ts` ports `TestCalc` check for check: its 279
labels are the Oberon `TestCalc`'s output, line for line (compared
2026-11-15 with besm2_cg_po's `obj/TestCalc`). It adds HP below 0
flooring under Diminutive, and `parse` with tabs, seven digits, `+1`
and `1 2`.

Proved to fail: `div` truncating failed the floor check; no
`checkExclusions` failed the exclusions; SV rounded down failed three
checks; two Stats at 12 not warned failed its check.

Decided 2026-11-15: `warnings.ts` and `TestWarnings` move to Phase 3.2,
since `Besm2Warnings` names its items through `Besm2Character`'s
records and `Besm2Text`, and besm2_cg_po wrote it in its step 6, after
`Besm2Character` (step 4). Likewise the check that every fixture's
numbers come out of `compute` needs the files loaded, so it is Phase
3.2's too; until then the fixtures built by hand above stand for it,
as in besm2_cg_po's step 2.

## Phase 3 Files

### Phase 3.1 text and entities [done]

Reading YAML as pobesm2_fmt2 reads it; the libfyaml-versus-`yaml`
questions above, answered and tested.

Done 2026-11-15: `fyaml.ts` (the part of polibfyaml the Oberon uses:
`Node` with its fields and paths, `Document.resolve`, `parseStream`,
the error kinds and messages, `parseIntText` and `parseBoolText`) over
the `yaml` library's failsafe-schema nodes; `text.ts`, `config.ts`,
`layout.ts` and `entities.ts`, ported from besm2_cg_po's copies.
`test/core/text.test.ts` and `entities.test.ts` port TestText's and
TestEntities' checks with their labels; `fyaml.test.ts` has no Oberon
counterpart, and checks the messages, places and paths besm2_calc_po
`--check` printed for some sixty probe files, every one of which this
port matched (a throwaway script ran both over the probes and every
fixture), except where "Findings" says otherwise.

Proved to fail: a quoted scalar placed at its quote, merged pairs in
the opposite order, a key with a space left unquoted in a path, a block
scalar placed on its indicator's line, an untrimmed tagline, and no
folding of Latin-1 lead bytes each failed their checks.

Decided 2026-11-15: where besm2_cg_po halts on an assertion (a
customizer's counts-as that is a mapping or sequence,
`enhancements: [[Foo, {a: 1}]]`: `Customizer` calls `IntegerValue` on a
node that isn't a scalar, "assertion failed (62)"), the port reports
`PATH: not a scalar`, as `scalar` does for every other place, since an
exception from a loaded file must not escape (AGENTS.md). Reported to
the user as a finding for besm2_cg_po and pobesm2_fmt2.

Decided 2026-11-15: a syntax error keeps the `yaml` library's words at
libfyaml's line and column, as ova_cg_web decided, except a duplicate
key and a tab as indentation, which take libfyaml's ("duplicate key",
"tab character may not be used as indentation"), since a character
with either is a likely mistake. Tests compare other syntax errors by
file, line and column only.

### Phase 3.2 character, warnings and check [done]

The model, load notices and edits; the port of `TestModel` and
`Check`; every fixture's notices match its `NAME.fill.err` and
`NAME.check.err`. `warnings.ts` and the port of `TestWarnings` (moved
from Phase 2). Every fixture character's numbers come out of
`compute` (the fixtures are the oracle), the same differences as
besm2_calc_po reports.

Done 2026-11-15: `character.ts`, `check.ts` and `warnings.ts`.
`test/core/warnings.test.ts` ports TestWarnings with its labels;
`character.test.ts` ports TestModel's checks that need no save, with
its labels, and one of its own (`ChangeAttr` to another name keeps the
keys it doesn't know, `b.extra := a.extra`). `notices.test.ts` loads
every fixture of `testdata/fmt` and `testdata/cg` as `--check` and
`--fill` do, and compares its lines with `test/golden/*/NAME.*.err`:
all match, so every fixture character's numbers come out of `compute`,
with exactly the differences besm2_calc_po reports (bad-root's twice,
as there, for its two documents).

Proved to fail: `copyHouseSkills` sharing the costs array,
`changeAttr` keeping the old subject, `changeAttr` dropping `extra`, a
warning citing the wrong page, `adopt` missing a difference of 1, and
`keep` silent each failed their checks.

Decided 2026-11-15:
- The Oberon's own lists (a Skill's specialisations, the creation
  keys) are arrays and `Set`s; the linked lists that `calc` walks
  (`attrs`, `defects`, `skills`, a weapon's Abilities, the house
  Skills) stay linked, with `next`, so `calc`'s port stays faithful.
- `Besm2Upgrade` is not ported (open question 2), so `character` has
  no upgrade path.
- Loading takes the file's text and the name to report it by
  (`load(text, name)`, `loadAll`, `loadCampaign`), since the page reads
  a file chosen by the user, not a path; a file that can't be read is
  the page's to report.
- TestModel's checks that save (ReadText of a save, Copy, SaveLoad, a
  saved Weapon Attack, creation and campaign saved), and the notices of
  the `window.with-CAMPAIGN` fixtures, which need `--campaign`'s save,
  move to Phase 3.3.
- `notices.test.ts` compares a syntax error by file, line and column
  only (as decided for Phase 3.1).

### Phase 3.3 save [done]

The YAML a save writes; every fixture loaded and saved is byte for byte
its `NAME.fill.yaml`, and loads again with no notices and the same
bytes. TestModel's checks that save, and the `window.with-CAMPAIGN`
fixtures' notices (moved from Phase 3.2).

Done 2026-11-15: `save.ts`, the port of Besm2Save, building the
`yaml` library's nodes with a `str` tag of its own that writes each
string as libfyaml 0.8's emitter would (Findings). Every fixture of
`testdata/` that `--fill` writes, and window.yaml given campaign.yaml,
saves byte for byte as its `test/golden/` file, and loads again with
the same bytes and nothing noted that its source didn't note (an
override stays one, an empty string is still warned of: "no notices"
was too strong, since `--fill` keeps both). `character.test.ts` now
holds all of TestModel's checks, with its labels; `notices.test.ts`
ports `--campaign`'s UseCampaign for the `window.with-CAMPAIGN`
notices, through `character.addNotice` (the Oberon's `AddNotice*`).

This repo's own save fixtures are `test/data/save/` (`scalars.yaml`:
each kind of string, every escape, chomping and indentation
indicator; `folds.yaml`: where long strings fold, swept over their
starting column, and quoted keys; `keys.yaml`: keys of more than one
line). `make golden` now also writes their `--check` and `--fill` into
`test/golden/save/`, so the scalar writers are checked against
besm2_calc_po, not text copied by hand.

Proved to fail: the line width 79, no `\` before a fold's blank, the
indentation indicator from the first character rather than the first
non-empty line, `+` from three line feeds, no `\_`, a lost `details`,
`genre` written for no genre, a sequence indented under its key, a
choice's count written from 1, and a duplicate key let through each
failed their checks.

Decided 2026-11-15:
- `saveAll` and `saveCampaign` return the file's text or the
  Oberon's message, since the page downloads a file rather than writing
  a path.

### Phase 3.4 The round trip [done]

`test/files.sh` (from besm2_cg_po's): each saved file formats through
pobesm2_fmt2 as the fixture's `--fill` does, and passes
`besm2_calc_po --check`. A Node script saves them into `obj/`.

Done 2026-11-15: `test/save-files.ts` saves, into `obj/files/`, each
fixture of `testdata/` and `test/data/save/` that loads (as `--fill`,
`[]` for none), and window.yaml given each campaign; `test/files.sh`
then checks, live against besm2_calc_po and pobesm2_fmt2: a file is
saved exactly when `test/golden/` has its `--fill`, and byte for byte
as it; formatted by pobesm2_fmt2 in each of the eight formats it is
what `--fill`'s output formats as (output, errors and status) and,
where `test/golden/` has it, what besm2_calc_po prints of the fixture;
and `--check` of it says what `--check` of `--fill`'s output says.
27 files, all as `--fill`'s, 26 with no difference: `--fill` keeps
empty-strings-2e.yaml's `value: ""` as written, and `--check` reports
it again, of besm2_calc_po's own output too, so "passes `--check`"
became "checks as `--fill`'s output does". Planted: a file saved that
`--fill` refuses, and a number changed in a saved file, each failed.
`make test` runs it.

## Phase 4 The formatters [done]

`config`, `out`, `layout`, `grid`, `terse`, `rawms`, `hmm`; the port
of `TestOut`; pobesm2_fmt2's `golden.cases` byte for byte, then each
fixture's ~~four~~ eight formats against ~~`test/golden/format/`~~
`test/golden/{fmt,cg}/NAME.ID.out` and `.err` (tools/golden.sh's IDs).

Done 2026-11-15: `out` keeps what is written, always (the page has no
standard output), and `takeRope` gives it where the Oberon would flush
it; Flush, ToFile and Close have no counterpart. `test/core/out.test.ts`
ports TestOut, its labels kept (no buffer here; "past the buffer" is
kept as a long write). `test/core/format.test.ts` ports Besm2Fmt's main
(`fmt2`, with the Besm2Cli options the cases use) and runs every line of
pobesm2_fmt2's `golden.cases` as its `test/golden.sh` does, in its
modes (stdout, all, stdin, file), byte for byte against
`test/golden/fmt2/`: 523 cases. A glob's matches are in bash's
en_US.UTF-8 order (`FV2021-Coleopteran-2e` between `enyon-boase-2e`
and `notes-2e`), which `Intl.Collator("en-US")` gives, checked for the
`*-2e` fixtures. As a FyamlStreams stream, a resolve error ends the
file. Then each fixture of `testdata/{fmt,cg}`, in each of the eight
formats, as besm2_calc_po's FormatFile does it (read, saved, each saved
entity loaded and formatted, a problem reported in its place): output
byte for byte, errors line for line (a syntax error's words only where
they are libfyaml's, as in `notices.test.ts`), and status: 336 runs.
Planted, each failed: TOTAL misspelt (grid), a CP label (terse), the
h-m-m indent, the raw ms prefix, a blank in `layout`, `-U` ignored, the
exit marker, and `-o` output sent to standard output.

## Phase 5 The page's shell [done]

### Phase 5.1 The look and the layout [done]

The menu bar (File, Character, Rulebook), the entity menu, the seven
tabs, empty; ova_cg_web's CSS adapted.

### Phase 5.2 Menus and keys [done]

The keys above, tested in both browsers.

### Phase 5.3 Dialogs and the test harness [done]

`dialogs.ts` copied; the Window's function fields; happy-dom's harness
from ova_cg_web, with its rule against comparing nodes.

Done 2026-11-15: `src/ui/menu.ts` and `dialogs.ts` are ova_cg_web's,
unchanged but for their comments and the title; `style.css` is
ova_cg_web's without the guide, the menu's check mark and the sheet
(neither besm2_cg_po nor ova_cg_po sets an FLTK scheme, so the colours
stay ova_cg_web's). `src/ui/window.ts` is Besm2Window's Build: the
menus in its order, without File > Quit and Rulebook > Viewer...; the
entities' `<select>` ChoiceW (250 px) wide at the bar's right, with
EntityLabel's labels; the title as Besm2Window's ShowTitle makes it;
and the seven tabs, as ova_cg_web's tablist. Decided:

- **The list of entities comes forward from Phase 10**: Add Character,
  Add Mecha, Duplicate, Remove..., Move Up and Down, Next and Previous
  and the `<select>` (AddCharacterAction, Append, DuplicateAction,
  RemoveAction, Move, ShowEntity, ShowEntities) are list operations
  that need no tab, and the menus' tests need enabled items. Phase 10
  keeps the Mecha tab and its pricing.
- Items whose phase hasn't come have no action, so stay disabled
  (menu.ts disables an item with none): File's five (Phase 6; New from
  Campaign... Phase 11), Creation... (Phase 11; ShowEntities' rule for
  it is in place), and Rulebook's two (Phase 13).
- The function fields are tell, ask, confirm, chooseFile, askText and
  download; copyText comes with Phase 12, openPage and openTab with 13.
  `take` is public, so a test can show a fixture's entities before
  Phase 6's File > Open.
- `globalThis.besm2` is the Window (src/main.ts), as ova_cg_web's
  `ova`, for the browser tests and the console.

`test/ui/dialogs.test.ts` is ova_cg_web's. `test/ui/window.test.ts`
ports TestShortcuts (ova_cg_go's), and TestWindow's Basics, NewCharacter
(what Phase 5 has of it) and Several (without the Mecha tab, which is
Phase 10's, and Save, Phase 6's), with their labels where they apply:
`window.yaml` shown as `window-several.yaml`, its mecha chosen, a mecha
added, the first duplicated and moved up past the others (the first of
the name the one tied), Remove... cancelled and done, Next and Previous
at the ends, Move Down, the unnamed mecha's and character's questions,
Add Character from a mecha (its owner's creation, copied), and a
character duplicated, whose copy, last, prices the mecha. Then the
menus by keyboard, the tabs and their keys. `test/browser/shell.spec.ts`
is ova_cg_web's adapted: the menus by mouse and keyboard, the entities,
the tabs, every key pressed for real and prevented (greyed or not), a
dialog's Escape and focus, a key under a dialog, and screenshots in
`obj/screenshots/`; it passes in headless Chromium and Firefox, from
file:// and http://. Planted, each failed: a disabled item's key not
prevented, Remove of the last showing past the end, Move not swapping,
Next never greyed, and Add Character from a mecha without its owner's
creation. (The `<select>`'s filling guard can't fail a test until
Phase 7 fills fields from the entity.)

## Phase 6 Files on the page [done]

Open, drop, Save, Save As, New, the save-first question,
`beforeunload`, the title's ` *`, notices in a dialog.

Done 2026-11-15. Window ports Besm2Window's Adopt, Load, SaveTo,
SaveAs, Save, MayLeave, NewCharacter, NewAction and OpenAction, with
ova_cg_web's loadFile, dropped, the drag and drop listeners,
beforeunload and fileName copied. Decided:

- **Save of a new file** downloads under the first entity's name with
  `.yaml` (fileName), without asking; with no name it asks, as Save
  As... does. besm2_cg_po's Save asks for a new file's path (PLAN.md,
  "Files in the browser": a page needs only a name). Save As...
  suggests the file's name, else the first entity's.
- **The notices' message** is Adopt's, word for word: its two lines,
  then each notice wrapped at NoticeWidth (80) by `layout.wordWrap`,
  its next lines indented two spaces.
- MayLeave's question names the entity when its name is present, even
  if empty, as the Oberon's `entity.name # NIL`.
- SaveTo's failure (`Save.saveAll`'s message) is told, and nothing is
  downloaded or marked saved.

`test/ui/files.test.ts` ports TestWindow's SaveFirst, Files (without
Quit, which a page hasn't, and the Character tab's lines, Phase 7's),
Bare and Notices, with their labels; a change is made to the entity
and marked, as Phase 7's handlers will (with `Ch.useStat` and
`useDerived`). It adds fileName's cases, a file's mistakes and one that
can't be read, and drops. Saves of window, bare and differs are
compared byte for byte with `test/golden/cg/*.fill.yaml`.
`test/browser/files.spec.ts` is ova_cg_web's adapted: the download's
bytes and name, Save As... and Ctrl+S, the notices and a broken file in
a dialog, the file chooser after the save-first question, a drop, and
beforeunload, in headless Chromium and Firefox from file:// and
http://. Planted, each failed: the notices unwrapped, Don't save doing
nothing, a save leaving the file changed, the question without the
name, a drop under a dialog, Save As... ignoring the file's name,
beforeunload never asking, a drop not prevented, and a download's
bytes changed.

## Phase 7 The Character tab [done]

Name, Tagline, Size; the Stats with Value, Points and override, and
**?**; the derived values; the points lines and Warnings.

Done 2026-11-15. `src/ui/widgets.ts` ports what Besm2Widgets has for
this tab (NumberBox, its Target, HelpButton) with ova_cg_web's Spinner
and Lines copied; Window ports BuildCharacterTab, ShowNumbers,
ShowPoints, SetLines, ShowWarnings, Changed, NumberChanged and BoxName,
StatAction, TextAction, Rename and SetText, and ShowAll's filling of
the fields. Decided:

- **A number box takes its text** on `change` (leaving the box
  changed) and on Enter, and not when the text is as it was shown, as
  FLTK's WhenRelease without WhenNotChanged; Enter's default is
  stopped, as ova_cg_web's (a message's OK would take the same key).
- **The name, tagline and size follow each keystroke** (`input`), as
  TextAction's WhenChanged; a blank text keeps a key the entity had,
  empty, and adds none (SetText).
- **A ? button did nothing until Phase 13** set `openPage`, as the
  Oberon's with openPage NIL. The list tabs' copies of the points lines
  and the warnings (`tabPoints`, `tabWarnings`) are filled by Phase 8,
  and ShowNumbers' refresh of the Mecha tab comes with Phase 10.
- A Stat's points box has no label of its own, as the Oberon's; its
  accessible name is "Body's points" (BoxName's).

`test/ui/character.test.ts` ports TestWindow's NewCharacter, Editing,
Files' lines and warnings, Mecha, and Several's renaming and Mecha
Points lines, with their labels, and adds a blank text, the Stats'
limits on the points line, and a character after a mecha.
`test/browser/character.spec.ts` types, spins and overrides in
headless Chromium and Firefox, from file:// and http://, and saves what
was typed. Planted, each failed: the points line never red, a Stat's
box unnamed in its message, a rename leaving the subject, and a
mecha's ACV to SV shown.

## Phase 8 The Attributes, Defects, Skills and Background tabs [done]

`itempanel.ts`: the lists with their page columns, adding by name
(with both pages), levels, options and choices, subjects, overrides,
notes. The Background tab.

Done 2026-11-15: `itempanel.ts` ports Besm2ItemPanel (AttrPanel,
DefectPanel, SkillPanel) and `background.ts` Besm2Background, on
`widgets.ts`'s Panel, as ova_cg_web's. Each edit relinks and computes
through the Window, refreshes the list and calls the Window's
`changed`, in the Oberon's order. Decided:

- **Lines are numbered from 0** (-1: none) everywhere in TypeScript;
  the Oberon's 1-based lines are shifted where they are ported.
- **An item has no override boxes**, as in besm2_cg_po: an override a
  file holds is kept through Change, and saved as it was read.
- **The Divider between a mecha's offers and the rest** is a disabled
  `<option>`, so it can't be chosen.
- **The list tabs' points lines and warnings** are filled here; the
  Mecha tab's copies come with Phase 10.
- **SkillPanel's genre** calls the host's compute after `Ch.setGenre`,
  as the Oberon's, though setGenre reprices by itself, so a planted
  bug that drops the compute is not seen by a test.

`test/ui/lists.test.ts` ports TestWindow's Attributes, Defects, Skills
and Background checks with their labels, and adds a house Skill chosen
again, a mecha offered its Attributes and Defects first, and an
Attribute with no options. `test/browser/lists.spec.ts` adds, changes,
takes an option, sets the genre, adds a note and saves, in headless
Chromium and Firefox, from file:// and http://. Planted, each failed:
an option counted from its group's first, a note added nowhere, the
tabs' points lines not set, the house Skill not chosen on load, and an
option's "[x]" shown as taken when not.

## Phase 9 The Weapon dialog [done]

Abilities and Disabilities with slots, counts-as and detail; Primary;
Different Gunner; the exclusions; Cancel restores.

Done 2026-11-15: `weapondialog.ts` ports Besm2WeaponDialog (its
ModPanel on `widgets.ts`'s Panel, and WeaponDialog) as a modal
`<dialog>` through `Dialogs.modal`. Every change in it goes through the
Window's `changed` and then refreshes the Attributes list at the
attack's line, as the Oberon's Changed and Refresh do. Decided:

- **Weapon... sits in the Attributes panel's row of buttons**, after
  Remove, and says "Choose a Weapon Attack first." unless a Weapon
  Attack is selected; pressed while the dialog is open, it does nothing.
- **There is no Close**: OK keeps, Cancel and Escape put everything
  back (the attack, its two lists, every attack's primary, and the
  Window's modified). While the dialog is open the modal blocks the
  page's keys and dropped files, as every dialog here does.
- **The Level box acts on `change`** (Enter, Tab or leaving it), like
  every Spinner, so the list follows once the Level is committed.
- **Cancel's putting back the abilities list** after restoring the
  record is redundant (restoring the record already puts the old list
  back), as in the Oberon; it is kept so the two read alike, and a
  planted bug that drops only that line is not seen by a test.

`test/ui/weapon.test.ts` ports TestWindow's Weapons checks with their
labels, saving before the dialog opens so Cancel's modified is seen,
and adds Escape, Weapon... while open, and an override's refused text.
`test/browser/weapon.spec.ts` adds a Weapon Attack, adds an Ability in
the dialog, takes OK, saves, and cancels a Level change with Escape, in
headless Chromium and Firefox, from file:// and http://. Planted, each
failed: choosing a name leaving the old slots, no `changed` on a
change, the damage not saved for Cancel, the primary never disabled,
OK not taking the subject, Cancel not putting back the Disabilities,
the Window's modified not put back, and Cancel not restoring the
attack (in both browsers).

## Phase 10 Mecha and several entities [done]

~~Add Character, Add Mecha, Duplicate, Remove..., Move Up/Down,
Next/Previous~~ (Phase 5, 2026-11-15); the Mecha tab; Mecha Points and
the last owner pricing.

Done 2026-11-15: `mechapanel.ts` ports Besm2MechaPanel. Mecha Points
and the last owner pricing were already `calc.compute`'s (Phase 2); the
tab shows them. On a character, a line for each Own a Big Mecha: the
attr, its Mecha Points, and its mecha's spent of available (": over"
past it), or that another character's later Own a Big Mecha prices it
("not counted"), or that no mecha of that name is in the file, or that
it has no subject. On a mecha, a line for each Own a Big Mecha in the
file that names it, with its character, and "not counted" on all but
the last. With none, the one line says how to make one. Decided:

- **What the tab does goes through a `Host`** (`tell`, `askText`,
  `show`, `add`, `openPage`), as the Oberon's procedure variables;
  `askText` takes a callback, since the page's dialog doesn't block.
- **The columns are 70 px (Mecha Points) and 300 px (the mecha's)**;
  the last reads as a sentence, so it is left-aligned (`style.css`).
- **New Mecha names the mecha by the subject** without asking; with no
  subject it asks, and the name typed (trimmed) becomes the subject. A
  blank name is refused, a cancel does nothing. On a mecha it is
  disabled, and Show Mecha becomes Show Owner.
- `showNumbers` ends with the tab's refresh, keeping its selection, so
  every change elsewhere (a Level, a rename, a removed mecha) shows.

`test/ui/mecha.test.ts` ports TestWindow's Several whole, with its
labels, and adds the tab's messages: none, ": over", a subject naming
no mecha, New Mecha by the subject and by a name typed, blank or
cancelled, and a mecha no one owns. `test/ui/lists.test.ts` now checks
every tab's warnings, the Mecha tab's too. `test/browser/mecha.spec.ts`
shows the mecha and its owner, makes a mecha with New Mecha and saves,
in headless Chromium and Firefox. Planted, each failed: no refresh in
`showNumbers`, the only line not meant, the typed name not made the
subject (in both browsers), no ": over", "not counted" on a mecha
flipped, no Mecha totals, and New Mecha enabled on a mecha.

## Phase 11 Creation and campaigns [done]

The Creation dialog (Copy from, the options, house skills, **?** on
each row, Cancel restores); New from Campaign...; Load and Save
Campaign... as file input and download.

Done 2026-11-15. `src/ui/creation.ts` ports Besm2Creation: a row for
each setting, its label made by `R.pageLabel` (the checked rows' on
the checkbox), its control, and a **?** at its page; every change is
taken at once (`Ch.setCreation`) and the window follows, and Cancel or
Escape puts back the creation, its keys and the Skills
(`Ch.restoreCreation`). On a mecha it is its owner's creation; on a
mecha with no owner Creation... is disabled. Copy from takes another
character's whole creation, house Skills too. Decided:

- **What the dialog does goes through a `Host`** (`tell`, `changed`,
  `openPage`, `chooseCampaign`, `nameCampaign`, `download`), as the
  Oberon's procedure variables. `chooseCampaign` is the file chooser
  and `readFile`, as Open...'s; `nameCampaign` asks "Save the campaign
  as:", suggesting `campaign.yaml` (a page can't choose a path), and a
  blank name is told "The file needs a name.".
- **The Window keeps `campaign`**, the last campaign loaded by New from
  Campaign..., and File > New takes its creation (copied, never
  linked). It isn't remembered across pages (above, "Campaign files"),
  and there is no `--campaign`, as there is no command line.
- **Each control is named by its row's label** (`aria-label`), since
  it sits outside the `<label>`; the dialog's `labels` map gives the
  same text to the tests.
- Copy from lists only the other characters: an HTML `<select>` has no
  extra entry where the Oberon's FLTK Choice counts one more.

`test/ui/creation.test.ts` ports TestWindow's Creation and
NewFromCampaign with their labels; a file that won't load is
`campaign-extra.yaml` (a refused file) where besm2_cg_po's is a path
that isn't there, since a file input only gives files that are. It adds
Escape, Creation... while open, and a character with no name.
`test/browser/creation.spec.ts` changes Character Points and cancels,
saves and loads a campaign and makes a character from one, in headless
Chromium and Firefox. Planted, each failed: Cancel restoring nothing
(on happy-dom and in both browsers), a loaded campaign not shown, and
File > New not taking the campaign.

## Phase 12 The Preview tab [done]

The four formats with the default options, Copy, Save....

Done 2026-11-15. `src/ui/preview.ts` ports Besm2Preview: the file's
entities saved in memory (`Save.saveAll`), loaded again and printed by
the formatters with the default options (`resetConfig`), as
besm2_calc_po prints a file, in the format chosen: reST grid tables,
terse reST, groff tbl in raw ms, or an h-m-m outline. As in the
Oberon's ShowPreview, it is made only while its tab is shown: when the
tab is shown, and after each change (`showTitle`), and an entity that
won't load again shows "(no preview: ...)". Decided:

- **Save... asks for a name and downloads**, as Save As... does:
  `previewName` gives the file's name (or the entity's, with no file)
  with `.rst`, or `.hmm` for the outline, and adds the extension to a
  name typed without it; a blank name is told "The file needs a
  name.". There is no file that can't be written, so the Oberon's
  "can't write" check becomes the blank name, and a cancel that does
  nothing.
- **Copy goes through `Window.copyText`**, which a test replaces;
  the page's is `copyToClipboard`, copied from ova_cg_web's
  markdowntab.ts (writeText, then a selected `<textarea>` and
  `execCommand("copy")`, then "The browser won't let the page copy:
  select the preview and copy it.").
- **The text is labelled "Preview text"** (`aria-label`), not
  "Preview", which is its tab panel's name.

`test/ui/preview.test.ts` ports TestWindow's Preview with its labels,
and checks every fixture of testdata/{fmt,cg} that besm2_calc_po
formats without error: its preview in each format is that fixture's
`test/golden/` output byte for byte. It saves `obj/preview/preview.yaml`
and the preview of it in each format, and `test/preview.sh`, ported
from besm2_cg_po's and run by `make test` after files.sh, compares
those with besm2_calc_po's and pobesm2_fmt2's output for the file.
`test/browser/preview.spec.ts` shows window.yaml in each format as the
goldens, saves the outline, and copies by writeText and by its
fallback, in headless Chromium and Firefox. Planted, each failed: every
format printed as grid tables (22 fixtures, and 6 of preview.sh's
checks), the preview not following a change, the preview made while
hidden, Copy changing the text, and the copy fallback failing (in both
browsers).

## Phase 13 The rulebook [done]

`rulebook.ts` copied; **?** everywhere it is in besm2_cg_po; Rulebook >
Open and Choose PDF....

Done 2026-11-15:

- **`src/ui/rulebook.ts` is ova_cg_web's**, with its own tab name
  (`besm2-rulebook`): the PDF chosen is kept for the session, and each
  opening makes a fresh `blob:` URL of it at `#page=` the PDF's page
  (`rules.pdfIndex`), letting the one before go 60 s later.
- **Every ? already went through `Window.openPage`** (Phases 7 to 10);
  the Window's own `openPage` is now `openRulebook`, so no ? needed a
  change. With no PDF chosen it asks first (`NoRulebook`, yes button
  "Choose PDF..."), where besm2_cg_po opens its chooser at once: a
  browser's file chooser needs a click to open, as in ova_cg_web.
- **Rulebook > Open opens printed page 1** (the PDF's 3), as the
  Oberon's RulebookAction; **Rulebook > Choose PDF...** chooses
  without opening, and a cancel keeps the PDF before. A file that isn't
  a PDF is refused and said so; a blocked pop-up is told `TabBlocked`.
- TestWindow.Rulebook's absolute-path and Viewer... checks have no
  counterpart: a page has no path to keep and no viewer to choose.
- The Phase 7 browser test's ? that did nothing now meets the
  question, and cancels it.

`test/ui/rulebook.test.ts`, adapted from ova_cg_web's, drives it on
happy-dom with fakes for the chooser and the tab; `test/browser/rulebook.spec.ts`,
adapted too, with ova_cg_web's `pdf.ts` (a made PDF, never the
rulebook), checks in headless Chromium and Firefox that the viewer
shows the PDF's page asked for, that later openings reuse the tab, and
that the question cancelled opens nothing. Planted, each failed: the
printed page sent in place of the PDF's (on happy-dom and in both
browsers), and a blocked tab not told. The built page is now 264,048
bytes, over ova_cg_web's 256 KiB; Phase 15 set this page's budget
(320 KiB).

## Phase 14 The guide [done]

A guide inside the page, as ova_cg_web's Phase 15 (open question 4),
written just before the release: its source (`src/guide/guide.md`),
parser and panel (Help > Guide) copied from ova_cg_web's, its text
written for BESM2ER, and `make check-guide` checking that it shares no
run of 8 words with the rulebook, as ova_cg_web's does. The guide, like
the program, holds no rulebook text; it explains the page and points to
the rulebook's pages.

Done 2026-11-15:

- **`src/core/guide.ts`, `src/ui/guide.ts`, `src/guide/guide.d.ts`,
  `tools/checkguide.ts` and the build's `.md` loader are ova_cg_web's**,
  each saying so. The guide's 14 steps follow the rulebook's eight
  (its Character Creation Summary), then a mecha, saving and printing,
  and advancement; each says what to do on the page and sends the
  rules to the rulebook's pages.
- **A `page:` link names a `rules.ts` constant**, as in ova_cg_web;
  the guide's own (`CreationSummaryPage`, `GmDiscussionPage`,
  `CharacterOutlinePage`, `AttributeTypesPage`, `AdvancementPage`)
  join the rules' in `rules.ts`, and `guide.pages` gives each one's
  heading. `tools/listguide.ts` lists them for `make check-pages`, so
  the guide's pages are checked against the PDF's headings as the
  rules' are.
- **Every name and page link shows both pages** (`rules.label`,
  `rules.pageLabel`), and its ? is labelled "The rulebook at p. 13,
  PDF 15" (`rules.pagesText`), where ova_cg_web's gives one page.
- **The Window's target type is `GuideTarget`**: `widgets.ts`
  already exports a `Target`. The targets are the Character tab's
  controls, the list tabs' names, Weapon..., the Mecha tab's list and
  New Mecha, the Background tab's, Preview's Format:, the entities'
  choice, and five menu items; all are enabled on a new character.
- **The panel sits beside the sheet from 1000 px wide**, where
  ova_cg_web's breakpoint is lower: the sheet needs its 640 px and
  the panel 320 px. Below that it goes above the tabs and folds.
- **A Show me's target must be focusable in a browser**: the points
  line is a `<div>`, which happy-dom focuses and the browsers don't
  without a `tabindex`; it has `tabindex=-1`, and the unit test now
  checks each target can take the focus.
- **A menu opened under a still pointer chooses nothing**
  (`menu.ts`'s `still`): Show me opens the File menu over the guide's
  button at 760 px, and Firefox then sends `mouseenter` to the item
  under the pointer, focusing Save As... in place of Save (Findings).
- Help > About tells the version and commit (`src/ui/version.ts`), and
  the title line's tooltip says the same.

`test/core/guide.test.ts`, `test/ui/guide.test.ts` and
`test/browser/guide.spec.ts` are ova_cg_web's, adapted: the parser and
its refusals, the panel's steps and buttons, every target shown, every
Show me naming a target, every bold name in the guide a control the
page shows (the Creation and Weapon dialogs open), and in both browsers
every Show me at 1280 and 760 px, a ? opening the test PDF at PDF page
15, and the wide and narrow layouts. Planted, each failed: a target on
the wrong tab, the points line without its tabindex, a bold name the
page lacks, a guide page off by one (`make check-pages`), and the
Firefox menu fix undone. The built page is 286,813 bytes.

## Phase 15 Release [done]

Browsers and size (a budget set from the first full build; ova_cg_web
holds 256 KiB), a README for users, `make version` and `make release`
as ova_cg_web's (a signed `SHA256SUMS`, a signed tag, a GitHub
release asset, open question 7), with the user's go-ahead for each
release.

Done (2026-11-15):

- **Every fixture**: `test/browser/fixtures.spec.ts`, adapted from
  ova_cg_web's, opens each of `testdata/cg/` and `testdata/fmt/` (42)
  through File > Open..., shows each entity in turn, with the title
  saying which, and clicks every tab; no request, no console error,
  and no ` *` after. Which fixtures open, and which say something, is
  besm2_calc_po's answer from `test/golden/*/status` and `.fill.err`:
  a fixture opens when `--fill` succeeds, and a dialog appears when
  `--fill` printed something or failed. One exception: a file with no
  entities (`edge-empty`, `edge-empty-seq`), which `--fill` writes as
  `[]` with status 0, the page refuses ("holds no entities"), as
  besm2_cg_po's window does (`Besm2Character.Mod`, `Load`). 86 tests
  in each of the file:// and http:// runs. Planted, failing: a throw
  in `showTitle` on the second entity of
  `composite-multi-doc-2e.yaml`, in both browsers.
- **The size**, release build: 286,813 bytes (89,089 gzipped with
  `-9`). Of the minified script (270,086), the `yaml` library is
  97,503 bytes, `src/core` 93,579, `src/ui` 72,133 and the guide's
  text about 6,700; the CSS is 16,194. The debug build is 2,094,398.
  **The budget is 320 KiB** (327,680; the user's, 2026-11-15; `budget`
  in `build/build.mjs`), so a release build over it fails. Planted,
  failing: a budget of 280 KiB failed `make`.
- **README.md**: besm2_cg_po's "Using the window", adapted as
  ova_cg_web's README adapted ova_cg_go's: the Alt+Shift keys, no Quit
  and no Viewer..., Help > Guide and About, files as downloads, a file
  with no entities refused, nothing kept in the browser (open
  question 6), the rulebook as a PDF chosen for the session; and
  ova_cg_web's Building and Making a release.
- **`make version` and `make release`**: ova_cg_web's (its Phase
  14.3), with the names changed. Tried in a scratch clone with a local
  bare repository as origin and a throwaway ed25519 key in a scratch
  `GNUPGHOME`: an empty, two-part, `v`-prefixed and pre-release
  version refused, 0.2.0 set in both files; a release refused for
  uncommitted changes, for a commit not on `origin/main` and, the
  second time, for its tag; `DRY=1` signing and making no tag;
  `GH=echo` pushing a tag `git verify-tag` takes, a `SHA256SUMS` that
  `sha256sum -c` and `gpg --verify` take, and the gh command; a page
  changed after failing `sha256sum -c`. No release is made without
  the user's go-ahead; the version is 0.1.0.

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
- **Firefox sends `mouseenter` to an element that appears under a
  still pointer** (2026-11-15, Playwright 1.65's Firefox 1572; its
  Chromium 1254 doesn't): a menu opened by a click elsewhere, over
  where the pointer rests, had its item there focused. ova_cg_web's
  `menu.ts` has the same handler; its layout never put a menu over a
  Show me.
- **npm 11 doesn't run esbuild's `postinstall`** (`allow-scripts`)
  unless approved; the build works without it, since the platform's
  binary comes as an optional dependency (2026-11-15).

- **libfyaml's places, in characters** (2026-11-15, besm2_calc_po
  over probe files): a column counts characters, not bytes; a quoted
  scalar is placed one past its quote; a block scalar at the start of
  its first content line, column 1; an empty value at the `:` (or `-`,
  `?`) before it; an alias at its name, after the `*`; a value that
  isn't a scalar where a scalar field is wanted, at its key. The `yaml`
  library's ranges are UTF-16 offsets; `fyaml.ts` converts them.
- **Empty values** (2026-11-15): a key with no value (`points:`) is a
  plain empty scalar, so a text field holds the present text `""`, and
  an integer or boolean field says `not a valid integer: ""`.
- **Integers and booleans** (2026-11-15): polibfyaml trims only spaces
  from a scalar before parsing it, so `" 4 "` is 4 but `"\t4"` gives
  `not a valid integer: "<TAB>4"`, its text unescaped in the message;
  beyond 32 bits is `integer out of range`, beyond 64 bits too.
  Booleans are `true`/`false` in three cases each (`True`, `TRUE`).
- **Paths** (2026-11-15): a key is written bare if it matches
  `[A-Za-z_][A-Za-z0-9_-]*` or is empty, and otherwise in double
  quotes with libfyaml's escapes (`\_` for U+00A0, `\L` for U+2028,
  `\U0001F600` beyond U+FFFF, `\x01`); printable characters beyond
  ASCII (`é`) stay as they are; a complex key is written as its flow
  text (`[k]`).
- **Aliases and merges** (2026-11-15): an undefined alias is `invalid
  alias`, at the alias; an alias inside its own anchor is `cyclic
  reference detected`, at the alias; only a plain `<<` merges (`"<<"`
  is an ordinary key); a merge value that isn't an alias of a mapping
  or a sequence of them is `invalid merge key value`, at the value's
  start (a block mapping's or sequence's first item). Merged pairs go
  in where the `<<` was, skipping keys the mapping already has, and
  each merged pair goes in *before* the ones merged before it: `<<:
  [*b]` with `b: {p: 1, q: 2}` gives `q, p`; the first of several
  mappings wins a key. Errors after resolving name the path to the copy.
- **Syntax errors** (2026-11-15): libfyaml says `duplicate key` (at the
  second key) and `tab character may not be used as indentation`
  where the `yaml` library says otherwise; other wordings differ too
  (bad-yaml.yaml at 6:1: libfyaml's "missing comma in flow mapping"
  against the library's "Flow map in block collection..."), and are
  kept as the library's. A syntax error in a later document ends the
  stream after the documents before it.
- **Other forms** (2026-11-15): a BOM at the start is skipped, but not
  one after `---`; an empty file, or one of comments, has no documents
  and no entities; a complex key is never found by lookups, nor is a
  key without a value; tags (`!!int`) are ignored; CR LF reads as LF.
- **pobesm2_fmt2 ignores an undefined alias** (2026-11-15): it prints
  nothing and exits 0 for `- name: *nope`, where besm2_calc_po says
  `f.yaml:1:10: error: invalid alias`. The port follows besm2_calc_po.
  The cause is in polibfyaml's `FyamlStreams` and libfyaml: recorded
  as bug 1 in pobesm2_fmt2's `POBESM2_FMT2-BUGS.md` and polibfyaml's
  `POLIBFYAML-BUGS.md`, and issue 2 in `LIBFYAML-ISSUES.md`.

- **libfyaml 0.8's emitter, as besm2_calc_po uses it** (2026-11-15,
  besm2_calc_po 42e58e1 over `test/data/save/`): a plain scalar folds
  at the first blank past column 80 whose next character isn't a blank
  (a run of blanks never breaks), the blank dropped; a double-quoted
  one with nothing to escape is written as is, never folded; one with
  an escape folds the same way but only at a space, writing `\` before
  the line end when the next character is a blank. It escapes all but
  0x20-0x7E, 0xA1-0xD7FF (but U+2028, U+2029) and 0xE000-0xFFFD (but
  U+FEFF), and `"` and `\`: short escapes where YAML has them (`\_`
  for U+00A0, `\N`, `\L`, `\P`, `\e`), else `\xHH`, `\uHHHH`,
  `\UHHHHHHHH`, upper case. A literal block's header has `2` when its
  first line that isn't empty starts with a blank, then `-` for no
  final line feed or `+` for more than one; every line, empty ones
  too, is written at the indent. A key is never folded; a key of more
  than one line is an explicit `? |-` key. Columns count characters.
- **libfyaml 0.8's folds lose a space** (2026-11-15, besm2_calc_po
  42e58e1): a double-quoted string with an escape and two spaces at a
  fold (`words  two`) is written `words\`, then the next line indented
  and ` two`; read back, YAML drops that leading space, so
  besm2_calc_po's `--fill` of its own `--fill` has `wordstwo`... and
  `wordstwospaces` the time after, then stays. The port writes and
  reads exactly as besm2_calc_po does, at each step
  (`save.test.ts`). The bug is in libfyaml's C emitter, not in
  polibfyaml's binding: a C program against libfyaml 0.8 alone,
  emitting with `FYECF_MODE_BLOCK`, loses the space the same way (it
  should write `\ ` there). Recorded as issue 1 in
  `LIBFYAML-ISSUES.md` in polibfyaml, olibfyaml and alibfyaml
  (2026-11-15). Not reported upstream, and not yet tried with
  libfyaml 1.0.0-rc2.
- **The `yaml` library's `ctx.indent` isn't a scalar's column**
  (2026-11-15, yaml 2.9.1, throwaway script): a `str` tag's
  `stringify` is given `ctx.indent` 8 for a value of a mapping nested
  in a mapping that is written at 6 (`creation:` then `options:`).
  So `save.ts` walks the nodes first (`place`) and gives each string
  the column it starts at and its continuation indent, as libfyaml
  lays them out. With `indent: 2, indentSeq: false, lineWidth: 0,
  flowCollectionPadding: false`, the library writes the collections
  as libfyaml does (`[]` and `{}` for empty ones), and keeps a
  multi-line string from `stringify` as it is given.
- **besm2_calc_po and pobesm2_fmt2 halt on a flow sequence of
  sequences in `enhancements`** (2026-11-15): `enhancements: [[Foo,
  {a: 1}]]` ends both with "assertion failed (62)", as does
  `limiters: [[Foo, [1]]]`: `Customizer` calls `IntegerValue` on a
  node that isn't a scalar. Recorded as bug 1 in besm2_cg_po's
  `BESM2_CG_PO-BUGS.md` and bug 2 in pobesm2_fmt2's
  `POBESM2_FMT2-BUGS.md`; not a case this port's tests use.

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
6. ~~Draft autosave~~ in `localStorage`? ova_cg_web has none (nothing
   in its `src/` uses `localStorage`, `sessionStorage` or IndexedDB,
   2026-11-15), and it is an open question there too. Decided (the
   user, 2026-11-15): no; the page saves no drafts in the browser's
   storage.
7. ~~Distribution~~. Decided (the user, 2026-11-15): a GitHub release
   asset, as ova_cg_web's.
