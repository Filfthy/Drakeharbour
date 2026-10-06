#!/bin/bash
# tools/par.sh games-per-job jobs   (env passes through to tools/plan.js)
n=${1:-20}; jobs=${2:-12}
for i in $(seq 1 $jobs); do node tools/plan.js $n > /tmp/rv2_$i.txt 2>&1 & done
wait
cat /tmp/rv2_*.txt | python tools/agg.py
