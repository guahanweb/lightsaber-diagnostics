#!/bin/bash
echo "Starting battle simulation... expect more failures!"
export COMBAT_PERCENTAGE=80
export MIN_DELAY_MS=300
export MAX_DELAY_MS=1000
export DURATION_MINUTES=10

cd jedi-archives/simulator
npm run simulator
