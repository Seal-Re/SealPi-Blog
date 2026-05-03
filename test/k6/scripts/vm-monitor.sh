#!/usr/bin/env bash
# Monitor JVM + host during a k6 soak run.
# Usage: ./vm-monitor.sh <java-pid> <duration-seconds>
# Output: logs/{jstat,top,vmstat}-<timestamp>.log
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <java-pid> <duration-seconds>" >&2
  exit 2
fi

PID="$1"
DUR="$2"

if ! kill -0 "$PID" 2>/dev/null; then
  echo "PID $PID not running" >&2
  exit 1
fi

TS=$(date +%Y%m%d-%H%M%S)
LOG_DIR="logs"
mkdir -p "$LOG_DIR"

echo "Monitoring pid=$PID for ${DUR}s; logs -> $(pwd)/$LOG_DIR/*-$TS.log"

jstat -gcutil "$PID" 5000 > "$LOG_DIR/jstat-$TS.log" &
JSTAT_PID=$!

top -b -d 5 -p "$PID" > "$LOG_DIR/top-$TS.log" &
TOP_PID=$!

vmstat 5 > "$LOG_DIR/vmstat-$TS.log" &
VMSTAT_PID=$!

cleanup() {
  kill "$JSTAT_PID" "$TOP_PID" "$VMSTAT_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

sleep "$DUR"
cleanup
echo "Done. Logs in $(pwd)/$LOG_DIR/"
