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

.PHONY: all build debug test test-browser check check-pages golden clean
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

# What needs no browser: the unit tests under Node; then, once it
# exists (Phase 3.4), test/files.sh. Fail at the end if any failed.
test: node_modules | obj
	@status=0; \
	echo "== node --test"; $(NPM) run -s test || status=1; \
	if [ -x test/files.sh ]; then \
	  echo "== files.sh"; test/files.sh $(BESM2_CALC_PO) $(POBESM2_FMT2) || status=1; fi; \
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

# The golden files (AGENTS.md, PLAN.md Phase 0.3), from besm2_calc_po
# and pobesm2_fmt2 as they are built; never edit test/golden/ by hand.
golden:
	tools/golden.sh $(BESM2_CALC_PO) $(POBESM2_FMT2) $(BESM2_CG_PO) $(POBESM2_FMT2_DIR)

clean:
	rm -rf obj dist test-results playwright-report
