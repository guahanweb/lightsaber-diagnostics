#!/bin/bash
echo "Starting training session simulation..."
export COMBAT_PERCENTAGE=20
export MIN_DELAY_MS=800
export MAX_DELAY_MS=2000
export DURATION_MINUTES=10

cd jedi-archives/simulator
npm run simulator