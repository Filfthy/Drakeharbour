#!/bin/bash
args="$1"; jobs=${2:-12}
for i in $(seq 1 $jobs); do node tools/plan.js $args > /tmp/rv_$i.txt 2>&1 & done
wait
cat /tmp/rv_*.txt | python tools/agg.py
