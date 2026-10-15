# Campaign driver for the WKWebView localStorage durability probe (Gate 4).
#
# Runs N kill cycles: launch `wkprobe write` in the background, let it hammer
# localStorage writes for a random 2..12s, SIGKILL it, then relaunch in report
# mode and check the invariant: the recovered seq must never be less than the
# largest fsynced ACK (a setItem that had returned but was lost = FAIL).
#
# Usage: wk-storage-kill.sh [iterations=100] [minSec=2] [maxSec=12] [bytes=65536]

set -u
DIR="$(cd "$(dirname "$0")" && pwd)"
PROBE="$DIR/wk-probe/wkprobe"
ITER="${1:-100}"
MINS="${2:-2}"
MAXS="${3:-12}"
BYTES="${4:-65536}"
RES="$DIR/wk-probe/results.csv"

if [ ! -x "$PROBE" ]; then
  echo "wkprobe not built; run: swiftc -O \"$DIR/wk-probe/main.swift\" -o \"$PROBE\" -framework WebKit"
  exit 1
fi

"$PROBE" reset | grep -q RESET_OK || { echo "reset failed"; exit 1; }
echo "iter,write_seconds,pre_ack,post_ack,seq,rec_i,verdict" > "$RES"

fail=0
for ((i=1; i<=ITER; i++)); do
  "$PROBE" report > /tmp/wkpre.txt 2>&1
  pre_ack=$(sed -n 's/^ACKMAX \([0-9-]*\)$/\1/p' /tmp/wkpre.txt)
  [ -z "$pre_ack" ] && pre_ack=-1

  dur=$(( RANDOM % (MAXS - MINS + 1) + MINS ))
  "$PROBE" write "$BYTES" > /tmp/wkpw.txt 2>&1 &
  wpid=$!
  sleep "$dur"
  kill -9 "$wpid" 2>/dev/null
  wait "$wpid" 2>/dev/null
  sleep 0.7

  "$PROBE" report > /tmp/wkpost.txt 2>&1
  post_ack=$(sed -n 's/^ACKMAX \([0-9-]*\)$/\1/p' /tmp/wkpost.txt)
  seq=$(sed -n 's/^REPORT seq=\([^ ]*\) rec_i=.*/\1/p' /tmp/wkpost.txt)
  rec_i=$(sed -n 's/^REPORT seq=[^ ]* rec_i=\([^ ]*\) ok=.*/\1/p' /tmp/wkpost.txt)
  [ -z "$post_ack" ] && post_ack=-1

  seq_n=$seq
  case "$seq" in ''|*[!0-9]*) seq_n=0 ;; esac

  verdict="PASS"
  if [ "$seq_n" -lt "$post_ack" ]; then verdict="FAIL_LOSS"; fi
  if [ "$rec_i" != "$seq_n" ] && [ "$seq_n" != "0" ]; then verdict="FAIL_INTEGRITY"; fi
  if [ "$post_ack" -le "$pre_ack" ] && [ "$verdict" = "PASS" ]; then verdict="NO_PROGRESS"; fi

  echo "$i,$dur,$pre_ack,$post_ack,$seq,$rec_i,$verdict" >> "$RES"
  echo "iter $i: dur=${dur}s ack=${pre_ack}->${post_ack} seq=$seq verdict=$verdict"
  if [ "$verdict" != "PASS" ]; then fail=$((fail+1)); fi
done

echo "=== campaign done: $ITER iterations, $fail failures ==="
echo "results: $RES"
[ "$fail" -eq 0 ]
