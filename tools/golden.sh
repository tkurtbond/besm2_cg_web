#!/bin/bash
# golden.sh CALC FMT CG_REPO FMT_REPO: make test/golden/ and testdata/
# (PLAN.md, Phase 0.3; AGENTS.md). Only reads the two repos, and stops
# if a binary is older than its sources: it never rebuilds them.
#
# testdata/fmt/   pobesm2_fmt2's test/data/, copied
# testdata/cg/    besm2_cg_po's test/data/, copied
# test/golden/
#   SOURCE        the commits they came from
#   rules.txt     besm2_cg_po's obj/rules.txt (test/ListRules)
#   fmt2/         pobesm2_fmt2's test/golden/ and test/golden.cases
#   save/         --check and --fill of this repo's test/data/save/
#   fmt/, cg/     for each fixture NAME, run in its directory as
#                 besm2_cg_po's test/files.sh runs them:
#     NAME.check.err           besm2_calc_po --check NAME.yaml, standard error
#     NAME.fill.yaml, .fill.err  --fill NAME.yaml
#     NAME.ID.out, NAME.ID.err   a format of NAME.yaml (FORMATS below)
#     window.with-CAMPAIGN.check.err, .fill.yaml, .fill.err
#                              --campaign CAMPAIGN.yaml on window.yaml
#     status                   NAME MODE STATUS, one line per run
set -eu
calc=$(realpath "$1") fmt=$(realpath "$2") cg=$(realpath "$3") fmtrepo=$(realpath "$4")
here=$(pwd)

newest() { # the newest of the files given
  ls -t "$@" | head -1
}
fresh() { # fresh BINARY SOURCES...: stop unless BINARY is newer than them all
  local bin=$1; shift
  [ -e "$bin" ] || { echo "golden: $bin is missing: build it in its repo first"; exit 1; }
  local n; n=$(newest "$@")
  if [ "$n" -nt "$bin" ]; then
    echo "golden: $bin is older than $n: rebuild it in its repo first"; exit 1
  fi
}
fresh "$calc" "$cg"/src/*.Mod "$cg"/src/*.c
fresh "$fmt" "$fmtrepo"/src/*.Mod
fresh "$cg/obj/rules.txt" "$cg"/src/Besm2Rules.Mod "$cg"/test/ListRules.Mod

rm -rf testdata test/golden
mkdir -p testdata/fmt testdata/cg test/golden/fmt test/golden/cg test/golden/fmt2
cp "$fmtrepo"/test/data/*.yaml testdata/fmt/
cp "$cg"/test/data/*.yaml testdata/cg/
cp "$cg"/obj/rules.txt test/golden/rules.txt
cp "$fmtrepo"/test/golden/* "$fmtrepo"/test/golden.cases test/golden/fmt2/

# ID and options: the default grid, terse, raw ms tbl, h-m-m, and the
# options besm2_cg_po's test/files.sh tries.
ids=(grid t m H H-S 1 b l)
opts=("" -t -m -H "-H -S" -1 -b -l)

for d in fmt cg; do
  out="$here/test/golden/$d"
  cd "$here/testdata/$d"
  for f in *.yaml; do
    n=${f%.yaml}
    st=0; "$calc" --check "$f" >/dev/null 2>"$out/$n.check.err" || st=$?
    echo "$n check $st" >>"$out/status"
    st=0; "$calc" --fill "$f" >"$out/$n.fill.yaml" 2>"$out/$n.fill.err" || st=$?
    echo "$n fill $st" >>"$out/status"
    for i in "${!ids[@]}"; do
      st=0
      # shellcheck disable=SC2086
      "$calc" ${opts[$i]} "$f" >"$out/$n.${ids[$i]}.out" 2>"$out/$n.${ids[$i]}.err" || st=$?
      echo "$n ${ids[$i]} $st" >>"$out/status"
    done
  done
  # A campaign file (a mapping of only `creation`) isn't an entity file:
  # each is given to window.yaml with --campaign, as besm2_cg_po's
  # test/cli.sh does: window.with-CAMPAIGN.MODE.
  if [ $d = cg ]; then
    for c in campaign*.yaml; do
      for m in check fill; do
        n=window.with-${c%.yaml}
        st=0; "$calc" --campaign "$c" --$m window.yaml >"$out/$n.$m.yaml" 2>"$out/$n.$m.err" || st=$?
        echo "$n $m $st" >>"$out/status"
      done
    done
  fi
  # Empty files say nothing; keep only those that do.
  find "$out" -type f -empty -delete
done
cd "$here"

# This repo's own fixtures for save (test/data/save/): --check and
# --fill only, into test/golden/save/.
mkdir -p test/golden/save
out="$here/test/golden/save"
cd "$here/test/data/save"
for f in *.yaml; do
  n=${f%.yaml}
  for m in check fill; do
    st=0
    if [ $m = fill ]; then "$calc" --fill "$f" >"$out/$n.fill.yaml" 2>"$out/$n.fill.err" || st=$?
    else "$calc" --check "$f" >/dev/null 2>"$out/$n.check.err" || st=$?
    fi
    echo "$n $m $st" >>"$out/status"
  done
done
find "$out" -type f -empty -delete
cd "$here"

commit() { # the commit of repo $1, and whether its tree is clean
  echo "$(git -C "$1" rev-parse HEAD)$(git -C "$1" diff --quiet HEAD || echo ' (with uncommitted changes)')"
}
{
  echo "besm2_cg_po $(commit "$cg")"
  echo "pobesm2_fmt2 $(commit "$fmtrepo")"
  echo "made by: make golden, $(date +%F)"
} >test/golden/SOURCE
echo "testdata: $(ls testdata/fmt | wc -l) + $(ls testdata/cg | wc -l) fixtures; test/golden: $(find test/golden -type f | wc -l) files"
