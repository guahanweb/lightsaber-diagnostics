import { metrics } from '@opentelemetry/api';

// Create a meter for the Kyber Crystal Service
const meter = metrics.getMeter('kyber-crystal-metrics');

// Define counters for activations
export const activationCounter = meter.createCounter('crystal.activations', {
  description: 'Counts the number of lightsaber activations',
  unit: '1',
});

// Define counters for failures
export const failureCounter = meter.createCounter('crystal.failures', {
  description: 'Counts the number of failed lightsaber activations',
  unit: '1',
});

// Define histogram for activation duration
export const activationDuration = meter.createHistogram('crystal.activation_duration', {
  description: 'Duration of lightsaber activation process in milliseconds',
  unit: 'ms',
});

// Define a gauge for power levels
export const powerLevelGauge = meter.createObservableGauge('crystal.power_level', {
  description: 'Current power level of active kyber crystals',
  unit: '1',
});

// Store for tracking current crystal power levels
interface CrystalState {
  power: number;
  type: string;
  mode: string;
  active: boolean;
}

const activeCrystals = new Map<string, CrystalState>();

// Function to update the crystal power levels
export function trackCrystalPowerLevel(
  crystalId: string, 
  state: CrystalState
) {
  if (state.active) {
    activeCrystals.set(crystalId, state);
  } else {
    activeCrystals.delete(crystalId);
  }
}

// Register the observable gauge callback
meter.addBatchObservableCallback(
  (observableResult) => {
    // Report power levels for all active crystals
    for (const [crystalId, state] of activeCrystals.entries()) {
      observableResult.observe(
        powerLevelGauge,
        state.power,
        {
          crystal_id: crystalId,
          crystal_type: state.type,
          mode: state.mode
        }
      );
    }
  },
  [powerLevelGauge]
);