#!/usr/bin/env bash
# Usage: vm-monitor.sh <samples> <interval-sec> <out-dir>
set -euo pipefail
SAMPLES="${1:-60}"
INTERVAL="${2:-1}"
OUT="${3:-/tmp/vm-monitor}"
mkdir -p "$OUT"

vmstat "$INTERVAL" "$SAMPLES" > "$OUT/vmstat.log" &
P_VM=$!
iostat -x "$INTERVAL" "$SAMPLES" > "$OUT/iostat.log" &
P_IO=$!
for i in $(seq 1 "$SAMPLES"); do
    free -m >> "$OUT/free.log"
    sleep "$INTERVAL"
done
wait $P_VM $P_IO
echo "DONE: $OUT"
