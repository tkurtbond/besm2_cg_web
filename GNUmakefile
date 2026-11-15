# besm2_cg_web -- a BESM2ER character generator in one web page, built
# from TypeScript: the port of besm2_cg_po (Oberon-2, pofltk). See
# AGENTS.md and PLAN.md. Laid out as ova_cg_web's GNUmakefile.
#
# npm and esbuild do the work; make only names the steps, keeps test
# outputs in obj/, and the page in dist/.

SHELL = bash

NPM  ?= npm
NODE ?= node
PAGE := dist/besm2_cg_web.html

# The oracles (AGENTS.md): besm2_calc_po for files and calculations,
# pobesm2_fmt2 for the formats. Only read, never rebuilt from here.
BESM2_CG_PO  ?= $(HOME)/Repos/RPG/Tools/besm2_cg_po
POBESM2_FMT2_DIR ?= $(HOME)/Repos/RPG/Tools/pobesm2_fmt2
BESM2_CALC_PO ?= $(BESM2_CG_PO)/besm2_calc_po
POBESM2_FMT2  ?= $(POBESM2_FMT2_DIR)/pobesm2_fmt2

# The rulebook, for make check-pages only; never copied into this repo.
RULEBOOK   ?= $(HOME)/Reference/RPG/Dyskami/BESM/2E/BESM2ER.pdf
BOOKMARKED ?= $(HOME)/Reference/RPG/Dyskami/BESM/2E/BESM2ER_bookmarked.pdf

.PHONY: all build debug test test-browser check check-pages check-guide golden version release clean
.NOTPARALLEL:

all: build

obj:
	mkdir -p $@

# The build takes well under a second, so it always runs.
build: node_modules
	$(NPM) run -s build

debug: node_modules
	$(NPM) run -s build:debug

node_modules: package.json package-lock.json
	$(NPM) ci
	@touch $@

# rules' tables as besm2_cg_po's test/ListRules prints them (PLAN.md,
# Phase 1).
obj/rules.txt: src/core/rules.ts tools/listrules.ts | obj
	$(NODE) tools/listrules.ts > $@

# What needs no browser: the unit tests under Node; besm2_cg_po's
# tools/check-rules.py on rules' listing (its rules/*.tsv, no PDF); then
# test/files.sh, the round trip through besm2_calc_po and pobesm2_fmt2
# (PLAN.md, Phase 3.4); and test/preview.sh, the Preview tab's text
# against theirs (Phase 12). Fail at the end if any failed.
test: node_modules obj/rules.txt | obj
	@status=0; \
	echo "== node --test"; $(NPM) run -s test || status=1; \
	echo "== check-rules.py"; $(BESM2_CG_PO)/tools/check-rules.py obj/rules.txt $(BESM2_CG_PO)/rules || status=1; \
	if [ -x test/files.sh ]; then \
	  echo "== files.sh"; test/files.sh $(BESM2_CALC_PO) $(POBESM2_FMT2) || status=1; fi; \
	echo "== preview.sh"; test/preview.sh $(BESM2_CALC_PO) $(POBESM2_FMT2) || status=1; \
	exit $$status

# The built page in headless Chromium and Firefox (Playwright), from
# file:// and then from a local http:// server (test/browser/serve.ts).
test-browser: build | obj
	@status=0; \
	echo "== file://"; $(NPM) run -s test:browser || status=1; \
	echo "== http://"; BESM2_HTTP=1 $(NPM) run -s test:browser || status=1; \
	exit $$status

check: node_modules
	$(NPM) run -s check

# rules' pages against the rulebook's headings, by their font, with
# besm2_cg_po's tools/check-pages.py (needs mutool); it reads only the
# headings, never the rulebook's text (AGENTS.md).
# The guide's pages (tools/listguide.ts) are checked with them, as more
# of the listing's section lines (Phase 14).
check-pages: obj/rules.txt
	$(NODE) tools/listguide.ts | cat obj/rules.txt - > obj/rules-guide.txt
	@$(BESM2_CG_PO)/tools/check-pages.py $(RULEBOOK) $(BOOKMARKED) $(BESM2_CG_PO)/rules obj/rules-guide.txt

# The guide in its own words: no run of 8 words shared with the
# rulebook's text, which mutool pipes in and nothing keeps (AGENTS.md;
# ova_cg_web's check-guide).
check-guide:
	set -o pipefail; mutool draw -q -F txt -o - $(RULEBOOK) | $(NODE) tools/checkguide.ts src/guide/guide.md

# The golden files (AGENTS.md, PLAN.md Phase 0.3), from besm2_calc_po
# and pobesm2_fmt2 as they are built; never edit test/golden/ by hand.
golden:
	tools/golden.sh $(BESM2_CALC_PO) $(POBESM2_FMT2) $(BESM2_CG_PO) $(POBESM2_FMT2_DIR)

# The version, for the next release: make version V=X.Y.Z sets it in
# package.json and package-lock.json. It neither commits nor tags.
# Copied from ova_cg_web's GNUmakefile.
version:
	@[[ "$(V)" =~ ^[0-9]+\.[0-9]+\.[0-9]+$$ ]] || \
	  { echo "version: give V=X.Y.Z (now $(VERSION))"; exit 1; }
	$(NPM) version --no-git-tag-version $(V)

# A release (PLAN.md, Phase 15): the page built from a committed,
# pushed tree, its SHA256SUMS signed with gpg, a signed tag vVERSION
# (package.json's version) pushed, and a GitHub release of that tag
# with the three files, which gh creates. Refuses a tree with
# uncommitted changes, a version already tagged here or on origin, and
# a commit not on origin/main. Run make check test test-browser first.
# Copied from ova_cg_web's GNUmakefile.
#
# GPG_KEY=ID signs with that key, else gpg's and git's default for
# your email. DRY=1 builds and signs SHA256SUMS but only shows the tag,
# the push and the gh command. If gh fails once the tag is pushed, run
# the gh command it shows by hand.
GH      ?= gh
GPG     ?= gpg
GPG_KEY ?=
DRY     ?=
VERSION  = $(shell $(NODE) -p 'require("./package.json").version')
TAG      = v$(VERSION)
SUMS    := dist/SHA256SUMS
run      = $(if $(DRY),@echo "would run:",)
release: node_modules
	@test -z "$$(git status --porcelain --untracked-files=no)" || \
	  { echo "release: the tree has uncommitted changes"; exit 1; }
	@git fetch -q --tags origin
	@! git rev-parse -q --verify "refs/tags/$(TAG)" >/dev/null || \
	  { echo "release: $(TAG) is already tagged: set a new version"; exit 1; }
	@git merge-base --is-ancestor HEAD origin/main || \
	  { echo "release: HEAD isn't on origin/main: push first"; exit 1; }
	$(NPM) run -s build
	cd dist && sha256sum besm2_cg_web.html > SHA256SUMS
	$(GPG) $(if $(GPG_KEY),--local-user $(GPG_KEY)) --yes --armor \
	  --detach-sign --output $(SUMS).asc $(SUMS)
	$(GPG) --verify $(SUMS).asc $(SUMS)
	$(run) git tag -s $(if $(GPG_KEY),-u $(GPG_KEY)) -m "besm2_cg_web $(VERSION)" $(TAG)
	$(run) git push origin refs/tags/$(TAG)
	$(run) $(GH) release create $(TAG) $(PAGE) $(SUMS) $(SUMS).asc \
	  --verify-tag --title "besm2_cg_web $(VERSION)" \
	  --notes "The BESM2ER character generator in one web page: download besm2_cg_web.html and open it in Firefox or a Chromium-based browser. Built from $$(git rev-parse --short=12 HEAD). SHA256SUMS lists its checksum, and SHA256SUMS.asc is that list's gpg signature."

clean:
	rm -rf obj dist test-results playwright-report
