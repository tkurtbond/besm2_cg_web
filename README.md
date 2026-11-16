# besm2_cg_web - a BESM2ER character generator in one web page

This project is developed with the use of AI.

`besm2_cg_web` builds characters, and their mecha, for Big Eyes Small
Mouth, 2nd Edition Revised (BESM2ER), in a web page. You pick Stats,
Attributes, Defects, Skills and Weapon Attacks by name, and it keeps
track of Character Points, Bonus Points, Skill Points and Mecha Points
and works out the derived values as you go.

It includes no text quoted from the BESM2ER rules. It holds only lists
of the names of the Stats, Attributes, Weapon Attack Abilities and
Disabilities, Defects and Skills, with the costs, levels and limits
the rules give them and the page each is described on. Each name shows
its rulebook page, both printed and PDF, e.g. `Highly Skilled (p. 42,
PDF 44)`, and **?** opens the rulebook's PDF, which you choose, at
that page. The guide (Help > Guide) explains how to make a character
in its own words, and `make check-guide` checks that it shares no run
of 8 words with the rulebook.

It is the web port of [besm2_cg_po](../besm2_cg_po) (Oberon-2, FLTK),
and loads and saves the same YAML, with every number written into it.
The formatters ([pobesm2_fmt2](../pobesm2_fmt2), the Ada
[besm2_fmt](../besm2_fmt) and the others) print its files, and
`besm2_calc_po`, besm2_cg_po's command-line companion, checks, fills
in and upgrades them.

It is one HTML file, `besm2_cg_web.html`. Download it and open it from
your disk in Firefox or a Chromium-based browser (Chrome, Chromium,
Edge, Brave). It needs no server and no installation, and loads
nothing from the network, so it works offline. Safari isn't tested.

**Status: complete** (the phases of [PLAN.md](PLAN.md)).

## Getting it

Each release on the repository's GitHub page has `besm2_cg_web.html`
attached: download it, keep it anywhere, and open it with your browser
(double-click it, or File > Open File..., or drag it onto a browser
window). To build it yourself, see [Building](#building).

The page's version, and the commit it was built from, are in the
tooltip of the title line at the top of the page, and in **Help >
About** (`besm2_cg_web 0.1.0, built from 1a2b3c4d5e6f`; a `+` after the
commit means it was built with uncommitted changes).

## Using the page

The page has seven tabs: **Character**, **Attributes**, **Defects**,
**Skills**, **Mecha**, **Background** and **Preview**. Every change
goes into the character at once, and every number is recomputed as you
work. The title (the browser tab's, and the line at the top of the
page) shows the file's name, then "(i of n)" when the file holds more
than one character or mecha, and ` *` while there are unsaved changes.

### Menus and keys

| Menu | Item | Key |
|---|---|---|
| File | New | Alt+Shift+N |
| File | New from Campaign... | |
| File | Open... | Ctrl+O |
| File | Save, Save As... | Ctrl+S, Ctrl+Shift+S |
| Character | Creation... | |
| Character | Add Character, Add Mecha, Duplicate, Remove... | |
| Character | Move Up, Move Down | |
| Character | Next, Previous | Alt+Shift+PgDn, Alt+Shift+PgUp |
| Rulebook | Open, Choose PDF... | |
| Help | Guide, About | |

The menus show each item's key. A browser keeps some keys for itself
(Ctrl+N opens a window, Ctrl+PgDn and Ctrl+PgUp switch tabs), so the
page uses Alt+Shift where besm2_cg_po uses Ctrl. There is no Quit:
closing the browser tab is quitting. The browser's PDF viewer is the
only viewer, so there is no Viewer....

The dialogs open inside the page. Escape cancels or closes the one on
top.

### The guide

**Help > Guide** opens a step-by-step guide to making a character,
following the rulebook's own steps. It sits beside the tabs when the
window is wide, and above them when it is narrow, where ▾ folds it out
of the way. It shows one step at a time: **Back** and **Next** move
through them, and **Steps** unfolds a list of all of them to jump to
any one. A step's **Show me** takes you to the control it is talking
about, on its tab or in its menu, and marks it for a moment; each name
in a step has a **?** for its page in the rulebook. **Close**, or
**Help > Guide** again, puts it away; it opens where you left it until
the page is closed.

### Files

A web page can read only the files you give it, and can write files
only as downloads. So:

- **Open...** (or dropping a `.yaml` file on the page) reads the file
  you choose. A file that can't be read, that the formatters would
  refuse, or that holds no characters, is reported, and nothing
  changes. A file whose numbers differ from the rules' keeps them as
  overrides, and says which when it opens.
- **Save** downloads the characters as a YAML file named as the file
  you opened, or, for a new one, after the first character's name.
  **Save As...** asks for the name first. Your browser decides where a
  download goes (usually your Downloads folder, unless it is set to
  ask), and may rename it if a file of that name is already there
  (`Name (1).yaml`). Move it where you keep your characters.
- The page counts a download as saved, so the ` *` goes when the
  browser takes it, whether or not you keep the file.
- **New** and **Open...** ask first whether to save unsaved changes
  (Save, Don't save, Cancel). Closing or reloading the tab with
  unsaved changes gets your browser's own question instead.

The page keeps nothing in the browser: closing the tab forgets the
characters, the rulebook chosen and the guide's place.

### Several characters and mecha in a file

The menu at the right of the menu bar lists the file's characters and
mecha by number and name. Choose one to show it.

- **Add Character** starts with the creation of the character shown;
  **Add Mecha** adds a mecha with no owner; **Duplicate** copies the
  one shown.
- **Remove...** asks first, and is greyed out when the file holds only
  one.
- **Move Up** and **Move Down** change the order. The formatters print
  every entity after the first as a subentry, so put the main one
  first.
- **Next** and **Previous** step through them.

**Save** writes all of them, in order.

### Rulebook pages and overrides

**Rulebook pages.** Every name, in a list or a menu, shows its printed
and PDF page, and each **?** opens the rulebook at that page.

**Overrides.** Beside each computed number (a Stat's points, the derived
values, an item's points) is an empty box. Type a whole number there to
override the computed one, for a GM's ruling or a house rule. The
computed number stays shown beside it, and whatever is computed from it
uses the override. Empty the box to go back to the computed number.

### The Character tab

From the top:

- **Name, Tagline and Size.**
- **The Stats**, Body, Mind and Soul. Each has its value, its points and
  a **?**.
- **The derived values**: ACV, DCV, HP, EP and SV, and AR when the
  character has an Armour.
- **The points**: Character Points (the Stats and Attributes less the
  Bonus Points, against what the creation gives), Bonus Points and Skill
  Points. A total over its limit turns red.
- **The warnings**: what the rules find wrong, with the pages of the
  rules.

The points and the warnings are repeated under the Attributes, Defects,
Skills and Mecha lists, so they stay in view.

### The Attributes, Defects and Skills tabs

Each tab is a list with an editor under it:

- **Adding:** choose a name (each shows its pages), set its Level or
  rank, its subject or details, and press **Add**.
- **Changing:** click a line to load it back into the editor, then
  press **Change** to replace it, or **Remove** to take it out.
- **Options:** an Attribute's options are listed under it. Use **+**
  and **-** to take the selected option once more or once less.
- **The Skills tab** also chooses the genre, which sets every Skill's
  cost. Specialisations are typed separated by commas; the first is
  free.

**Weapon...**, under the Attributes list, opens the selected Weapon
Attack: its subject, Level and details; **Primary** and **Different
Gunner**; and its Abilities and Disabilities, each with its slots and
details. Its damage, points and warnings follow each change. **OK**
keeps it, and **Cancel** puts everything back as it was.

### The Mecha tab

**On a character,** it lists each Own a Big Mecha with its Mecha Points
and what its mecha spends of them. The mecha is the entity in the file
whose name is the Attribute's subject.

- **Show Mecha** goes to that mecha.
- **New Mecha** adds one, named by the subject.

**On a mecha,** it lists each character whose Own a Big Mecha names it.
**Show Owner** goes to that character.

Renaming a mecha renames the subjects that name it, so the link holds.

### The Background tab

The description and the notes. Notes are short lines, printed after the
Skills and never priced.

### The Preview tab

The file's characters and mecha as the formatters print the saved
file, in reST grid tables, terse reST, groff tbl in a raw ms block, or
an h-m-m outline, chosen with **Format:**. It is the same text
`besm2_calc_po` (with no option, `-t`, `-m` or `-H`) and pobesm2_fmt2
make of the file, kept up to date as you work.

- **Copy** puts all of it on the clipboard.
- **Save...** downloads it, suggesting the file's name with `.rst` or
  `.hmm`.

Saving the preview doesn't save the characters.

### Character > Creation...

The rules the character is built under, each with a **?**:

- Character Points and Background Points;
- the genre and the GM's Skill Points;
- Staged Stat Cost;
- a ceiling on each Stat, a ceiling and a floor on the Stats' total
  cost, and a ceiling on the Bonus Points;
- Auto-Fire counted as 1 slot.

The page follows each change. **OK** keeps the changes, and **Cancel**
or Escape puts them back. **Copy from** takes the whole creation, house
Skills too, from another character in the file. On a mecha,
Creation... edits its owner's creation, which prices the mecha.

### Campaign files

A campaign file holds just a `creation`, for a GM to hand to the
players.

- **Save Campaign...** and **Load Campaign...**, in the Creation dialog,
  download one and read one in. Loading also works from a character's
  file, taking its first character's creation.
- **File > New from Campaign...** starts a character in a campaign, and
  File > New then starts each one in it too, until the page is closed.

### The rulebook

The page holds no rules text. **?** or **Rulebook > Open** opens the
rulebook's PDF in a browser tab, at the page, in your browser's own PDF
viewer. The next **?** reuses that tab.

The page can't find the PDF itself. The first time, it asks you to
choose it, and keeps it until the page is closed; **Rulebook > Choose
PDF...** chooses another. The PDF never leaves your computer, and the
page doesn't keep a copy. The viewer is asked for the PDF's page,
which is the printed page plus 2.

A browser set to download PDFs instead of showing them (in Firefox,
Settings > General > Applications > Portable Document Format) will
download the rulebook instead of opening it at the page.

## Building

You need Node 22 or later and GNU make. For `make test` and `make
golden`, besm2_calc_po and pobesm2_fmt2, built, at `BESM2_CALC_PO` and
`POBESM2_FMT2` (see `GNUmakefile`). For `make check-pages` and `make
check-guide`, mutool and the rulebook's PDF.

```sh
npm ci               # once: the pinned dependencies
make                 # dist/besm2_cg_web.html
make test            # the unit tests, under Node, and test/files.sh
make test-browser    # the page in headless Chromium and Firefox,
                     #   from file:// and from http://127.0.0.1
                     #   (once first: npx playwright install chromium firefox)
make check           # the type checks and prettier
make check-pages     # the rules' and the guide's pages against the rulebook's PDF
make check-guide     # the guide shares no 8 words with the rulebook
make clean
```

The build refuses a page larger than its budget (320 KiB, in
`build/build.mjs`); the page is about 287 KB.

### Making a release

1. Set the version: `make version V=0.1.0` (it changes `package.json`
   and `package-lock.json`, through `npm version`, and neither commits
   nor tags), and commit.
2. Run `make clean check test test-browser`.
3. Push.
4. `make release` (needs `gh`, logged in, and your gpg key). It refuses
   a tree with uncommitted changes, a version already tagged (here or
   on GitHub) and a commit not on `origin/main`. Then it builds the
   page, writes `dist/SHA256SUMS` and signs it (`SHA256SUMS.asc`),
   makes a signed tag `vVERSION` and pushes it, and runs `gh release
   create` for that tag with the three files attached. gpg may ask for
   your passphrase, twice. `GPG_KEY=ID` picks the key (else gpg's and
   git's default for your email); `make release DRY=1` builds and
   signs, but only shows the tag, the push and the `gh` command.

To check a downloaded page, with the release's three files in one
folder:

```sh
gpg --verify SHA256SUMS.asc SHA256SUMS
sha256sum -c SHA256SUMS
```

## Documents

- [PLAN.md](PLAN.md): how the port maps besm2_cg_po to TypeScript and
  a browser, what it decided differently, and what it found.
- [AGENTS.md](AGENTS.md): working notes on the build and the tests.
- besm2_cg_po's PLAN.md: the design, and the analysis of the rules the
  program computes, with their pages.
