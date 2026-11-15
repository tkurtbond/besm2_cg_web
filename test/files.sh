#!/bin/bash
# files.sh CALC FMT: the round trip (PLAN.md, Phase 3.4), after
# besm2_cg_po's test/files.sh. test/save-files.ts saves each fixture as
# the page would into obj/files/; then, live, with besm2_calc_po (CALC)
# and pobesm2_fmt2 (FMT) as they are built:
# - a fixture is saved exactly when --fill writes it, and byte for byte
#   as test/golden/ has --fill's output;
# - a saved file formats through pobesm2_fmt2, in each format
#   besm2_cg_po's files.sh tries, as the fixture's --fill does, and as
#   besm2_calc_po formats the fixture (test/golden/, NAME.ID.out);
# - besm2_calc_po --check of it, run where it has the fixture's name,
#   says what --check of --fill's output says; that is nothing but
#   warnings, and status 0, but where --fill keeps something --check
#   reports again (empty-strings-2e.yaml's `value: ""`, kept as
#   written), which is listed.
# Run from the repo's top directory; writes only under obj/.
set -u
calc=$1 fmt=$2
for b in "$calc" "$fmt"; do
  [ -x "$b" ] || { echo "files.sh: $b is missing: build it in its repo first"; exit 2; }
done
calc=$(realpath "$calc") fmt=$(realpath "$fmt")
here=$(pwd)
saved=$here/obj/files
status=0
out=$(mktemp -d "$here/obj/files.XXXXXX") || exit 2
trap 'rm -rf "$out"' EXIT

check() { # check LABEL CONDITION...
  local label=$1; shift
  if "$@"; then echo "ok   - $label"; else echo "FAIL - $label"; status=1; fi
}
quiet=0 # a diff is shown for the first three failures only
same() { # same LABEL FILE1 FILE2
  if cmp -s "$2" "$3"; then return 0; fi
  echo "FAIL - $1"; status=1
  if [ $quiet -lt 3 ]; then diff "$2" "$3" | head -10; quiet=$((quiet + 1)); fi
  return 1
}

rm -rf "$saved"
node test/save-files.ts "$saved" || exit 1

# ID and options, as tools/golden.sh names them.
ids=(grid t m H H-S 1 b l)
opts=("" -t -m -H "-H -S" -1 -b -l)

n=0 nsaved=0 nformats=0 nchecked=0 nclean=0
for d in fmt cg save; do
  for g in test/golden/$d/*.fill.yaml; do
    name=$(basename "$g" .fill.yaml)
    s=$saved/$d/$name.yaml
    n=$((n + 1))
    if [ ! -e "$s" ]; then
      echo "FAIL - $d/$name: --fill writes it and the page didn't save it"; status=1
      continue
    fi
    same "$d/$name: saved as --fill writes it" "$g" "$s" && nsaved=$((nsaved + 1))
    # Formatted, the saved file and --fill's, both named as the fixture.
    mkdir -p "$out/s" "$out/g"
    cp "$s" "$out/s/$name.yaml"; cp "$g" "$out/g/$name.yaml"
    ok=1
    for i in "${!ids[@]}"; do
      id=${ids[$i]} o=${opts[$i]}
      # shellcheck disable=SC2086
      (cd "$out/s" && "$fmt" $o "$name.yaml" >"$out/s.out" 2>"$out/s.err"); sst=$?
      # shellcheck disable=SC2086
      (cd "$out/g" && "$fmt" $o "$name.yaml" >"$out/g.out" 2>"$out/g.err"); gst=$?
      same "$d/$name ($id): formats as its --fill" "$out/g.out" "$out/s.out" &&
        same "$d/$name ($id): with its --fill's errors" "$out/g.err" "$out/s.err" &&
        { [ $sst -eq $gst ] || { echo "FAIL - $d/$name ($id): status $sst, its --fill's $gst"; status=1; false; }; } ||
        ok=0
      if [ -e "test/golden/$d/$name.$id.out" ]; then
        same "$d/$name ($id): formats as besm2_calc_po formats the fixture" \
          "test/golden/$d/$name.$id.out" "$out/s.out" || ok=0
      fi
    done
    [ $ok -eq 1 ] && nformats=$((nformats + 1))
    (cd "$out/s" && "$calc" --check "$name.yaml" >"$out/s.out" 2>"$out/s.err"); sst=$?
    (cd "$out/g" && "$calc" --check "$name.yaml" >"$out/g.out" 2>"$out/g.err"); gst=$?
    if same "$d/$name: --check of the saved file as of its --fill" "$out/g.err" "$out/s.err" &&
      [ $sst -eq $gst ] && [ ! -s "$out/s.out" ]; then
      nchecked=$((nchecked + 1))
      if [ $sst -eq 0 ] && ! grep -q ': \(difference\|error\): \|^besm2_calc_po: ' "$out/s.err"; then
        nclean=$((nclean + 1))
      else
        echo "#    $d/$name: --check of its --fill finds, and of the saved file:"
        grep ': \(difference\|error\): \|^besm2_calc_po: ' "$out/s.err" | sort -u | sed 's/^/#      /'
      fi
    else
      echo "FAIL - $d/$name: --check of the saved file, status $sst, of its --fill $gst"; status=1
    fi
    rm -rf "$out/s" "$out/g"
  done
done
# And nothing saved that --fill doesn't write.
for s in "$saved"/*/*.yaml; do
  d=$(basename "$(dirname "$s")") name=$(basename "$s" .yaml)
  [ -e "test/golden/$d/$name.fill.yaml" ] ||
    { echo "FAIL - $d/$name: saved, and --fill doesn't write it"; status=1; }
done
echo "#    $n files --fill writes: $nsaved saved as it, $nformats formatting as it in every format, $nchecked checking as it, $nclean of them clean"
check "every file was tried" test $n -ge 27
check "every file saved as --fill writes it" test $nsaved -eq $n
check "every saved file formats as --fill's" test $nformats -eq $n
check "every saved file checks as --fill's" test $nchecked -eq $n
check "all but empty-strings-2e pass --check with no difference" test $nclean -eq $((n - 1))

if [ $status -eq 0 ]; then echo "All checks passed."; else echo "Some checks failed."; fi
exit $status
