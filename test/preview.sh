#!/bin/bash
# preview.sh CALC FMT: the Preview tab's text (PLAN.md, Phase 12) against
# the formatters', ported from besm2_cg_po's test/preview.sh.
# test/ui/preview.test.ts saves obj/preview/preview.yaml and its preview
# in each format; each must be byte for byte what besm2_calc_po, and
# pobesm2_fmt2, print for that file in that format. Run after the unit
# tests, from the top directory.
set -u
calc=$1 fmt=$2
dir=obj/preview
status=0
out=$(mktemp -d -p "${TMPDIR:-obj}") || exit 2
trap 'rm -rf "$out"' EXIT

check() { # check LABEL CONDITION...
  local label=$1; shift
  if "$@"; then echo "ok   - $label"; else echo "FAIL - $label"; status=1; fi
}

if [ ! -x "$calc" ]; then
  echo "FAIL - besm2_calc_po isn't built: $calc"; exit 1
fi
for f in grid:preview-grid.rst: terse:preview-terse.rst:-t rawms:preview-rawms.rst:-m hmm:preview.hmm:-H; do
  IFS=: read -r name file opt <<<"$f"
  check "$name: preview.test.ts saved the preview" test -s "$dir/$file"
  # shellcheck disable=SC2086
  "$calc" $opt "$dir/preview.yaml" >"$out/calc" 2>"$out/calc.err"
  check "$name: besm2_calc_po formats the saved file" test $? -eq 0
  check "$name: the preview is besm2_calc_po's output" cmp -s "$dir/$file" "$out/calc"
  if [ -x "$fmt" ]; then
    # shellcheck disable=SC2086
    "$fmt" $opt "$dir/preview.yaml" >"$out/fmt" 2>"$out/fmt.err"
    check "$name: the preview is pobesm2_fmt2's output" cmp -s "$dir/$file" "$out/fmt"
  else
    echo "ok   - $name: pobesm2_fmt2 not built, skipped"
  fi
done

if [ $status -eq 0 ]; then echo "All checks passed."; else echo "Some checks failed."; fi
exit $status
