#!/bin/bash
echo "Starting lightsaber stress test..."
export COMBAT_PERCENTAGE=50
export MIN_DELAY_MS=100
export MAX_DELAY_MS=500
export DURATION_MINUTES=5

cd jedi-archives/simulator
npm run simulator
