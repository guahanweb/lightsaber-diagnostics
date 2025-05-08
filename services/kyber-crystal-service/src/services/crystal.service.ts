import axios from 'axios';
import { activationCounter, failureCounter, activationDuration, trackCrystalPowerLevel } from '../metrics';
import { trace, SpanStatusCode, Attributes } from '@opentelemetry/api';

const DEFAULT_TIMEOUT = parseInt(process.env.DEFAULT_TIMEOUT || '2000', 10);

// In-memory storage for simplicity
const crystalActivations: Record<string, {
  id: string;
  type: string;
  ownerName: string;
  activationCount: number;
  lastActivated: Date;
}> = {};

// In-memory counters for metrics (keep these for your app's internal use)
const activationsByType: Record<string, number> = {};
const activationsByOwner: Record<string, number> = {};

const tracer = trace.getTracer('kyber-crystal-service');

interface ActivationParams {
  crystalId: string;
  ownerName: string;
  type: string;
  mode: 'combat' | 'practice';
  powerLevel: number;
}

export async function activateCrystal(params: ActivationParams) {
  const startTime = Date.now();

  // Create a custom span for the activation process
  return tracer.startActiveSpan('crystal.activation', async (span) => {
    try {
      // Add attributes to the span
      span.setAttribute('crystal.id', params.crystalId);
      span.setAttribute('crystal.type', params.type);
      span.setAttribute('crystal.owner', params.ownerName);
      span.setAttribute('crystal.mode', params.mode);
      span.setAttribute('crystal.power_level', params.powerLevel);
      
      // Update crystal activation stats
      if (!crystalActivations[params.crystalId]) {
        crystalActivations[params.crystalId] = {
          id: params.crystalId,
          type: params.type,
          ownerName: params.ownerName,
          activationCount: 0,
          lastActivated: new Date()
        };
      }
      
      crystalActivations[params.crystalId].activationCount += 1;
      crystalActivations[params.crystalId].lastActivated = new Date();
      
      // Update internal activation counters
      activationsByType[params.type] = (activationsByType[params.type] || 0) + 1;
      activationsByOwner[params.ownerName] = (activationsByOwner[params.ownerName] || 0) + 1;

      // IMPROVED: Record the activation with proper labels that Prometheus can query
      activationCounter.add(1, {
        'crystal_type': params.type,
        'owner': params.ownerName,
        'mode': params.mode
      });
      
      // ADDED: Record the power level (helps visualize energy levels)
      trackCrystalPowerLevel(params.crystalId, {
        power: params.powerLevel,
        type: params.type,
        mode: params.mode,
        active: true,
      });

      // Create a specific event for the activation that can be aggregated
      span.addEvent('crystal.activated', {
        'crystal.id': params.crystalId,
        'crystal.type': params.type,
        'crystal.owner': params.ownerName,
        'crystal.mode': params.mode,
        'crystal.count': crystalActivations[params.crystalId].activationCount
      });
      
      // Call the Energy Field Service to generate energy field
      try {
        const fieldResult = await axios.post(
          `${process.env.ENERGY_FIELD_SERVICE_URL || 'http://localhost:3001'}/api/field/generate`,
          {
            crystalId: params.crystalId,
            mode: params.mode,
            powerLevel: params.powerLevel,
            duration: 30 // Default duration in seconds
          },
          {
            timeout: DEFAULT_TIMEOUT // 2 seconds... long enough?
            // timeout: 6000,
          }
        );
        
        // ADDED: Record the successful activation duration
        const duration = Date.now() - startTime;
        activationDuration.record(duration, {
          'crystal_type': params.type,
          'mode': params.mode,
          'result': 'success'
        });
        
        // Set success status and end span
        span.setStatus({ code: SpanStatusCode.OK });
        
        return {
          success: true,
          message: 'Lightsaber activated successfully',
          fieldStatus: fieldResult.data,
          crystalData: crystalActivations[params.crystalId]
        };
      } catch (error: any) {
        // ADDED: Record the failure with reason
        failureCounter.add(1, {
          'crystal_type': params.type,
          'owner': params.ownerName,
          'mode': params.mode,
          'reason': error.code || 'timeout'
        });
        
        // ADDED: Record the failed activation duration
        const duration = Date.now() - startTime;
        activationDuration.record(duration, {
          'crystal_type': params.type,
          'mode': params.mode,
          'result': 'failure'
        });
        
        // Record error in span
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message
        });
        
        // Add error details to the span
        span.recordException(error);
        
        throw error;
      }
    } catch (error: any) {
      console.error('Error in activation process:', error);
      
      // If we reach here, it's a general error not related to the field service call
      failureCounter.add(1, {
        'crystal_type': params.type,
        'owner': params.ownerName,
        'mode': params.mode,
        'reason': 'general_error'
      });
      
      // Record error in span
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      });
      
      // Add error details to the span
      span.recordException(error);
      
      throw error;
    } finally {
      span.end();
    }
  });
}

export async function getCrystalStats() {
  return tracer.startActiveSpan('crystal.get_stats', async (span) => {
    try {
      // Process statistics
      const totalActivations = Object.values(crystalActivations)
        .reduce((sum, crystal) => sum + crystal.activationCount, 0);
      
      // Set attributes for counts on the span
      span.setAttribute('stats.total_crystals', Object.keys(crystalActivations).length);
      span.setAttribute('stats.total_activations', totalActivations);
      
      // Add attributes for each crystal type
      Object.entries(activationsByType).forEach(([type, count]) => {
        span.setAttribute(`stats.activations_by_type.${type}`, count);
      });
      
      // Add attributes for each owner
      Object.entries(activationsByOwner).forEach(([owner, count]) => {
        span.setAttribute(`stats.activations_by_owner.${owner.replace(/\s+/g, '_')}`, count);
      });
      
      // Create a specific stats event that can be queried
      const statsEvent: Attributes = {
        'stats.timestamp': new Date().toISOString(),
        'stats.total_crystals': Object.keys(crystalActivations).length,
        'stats.total_activations': totalActivations
      };
      
      // Add type breakdowns to the event
      Object.entries(activationsByType).forEach(([type, count]) => {
        statsEvent[`stats.type.${type}`] = count;
      });
      
      // Add owner breakdowns to the event
      Object.entries(activationsByOwner).forEach(([owner, count]) => {
        statsEvent[`stats.owner.${owner.replace(/\s+/g, '_')}`] = count;
      });
      
      // Add the stats event
      span.addEvent('crystal.stats.calculated', statsEvent);
      
      const result = {
        totalCrystals: Object.keys(crystalActivations).length,
        totalActivations,
        activationsByType,
        activationsByOwner,
        crystals: Object.values(crystalActivations)
      };
      
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error: any) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}