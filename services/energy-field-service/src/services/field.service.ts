import { trace, SpanStatusCode } from '@opentelemetry/api';

// In-memory storage for simplicity
const activeFields: Record<string, {
    crystalId: string;
    stabilityLevel: number;
    status: 'stable' | 'unstable' | 'failed';
    mode: 'combat' | 'practice';
    startTime: Date;
    duration: number;
}> = {};

const tracer = trace.getTracer('energy-field-service');

interface FieldParams {
    crystalId: string;
    mode: 'combat' | 'practice';
    powerLevel: number;
    duration: number;
}

export async function generateField(params: FieldParams) {
    return tracer.startActiveSpan('field.generation', async (span) => {
        try {
            // Add attributes to the span
            span.setAttribute('field.crystal_id', params.crystalId);
            span.setAttribute('field.mode', params.mode);
            span.setAttribute('field.power_level', params.powerLevel);
            span.setAttribute('field.duration', params.duration);

            // Calculate field stability based on power level and mode
            const maxStability = 100;
            let stabilityLevel = params.mode === 'combat'
                ? Math.round(Math.random() * 30 + 50) // 50-80% stability in combat
                : Math.round(Math.random() * 20 + 75); // 75-95% stability in practice

            // Adjust stability based on power level (higher power = lower stability)
            stabilityLevel = Math.max(10, stabilityLevel - (params.powerLevel * 2));

            const status = stabilityLevel > 50 ? 'stable' : (stabilityLevel > 30 ? 'unstable' : 'failed');

            // Store field data
            activeFields[params.crystalId] = {
                crystalId: params.crystalId,
                stabilityLevel,
                status,
                mode: params.mode,
                startTime: new Date(),
                duration: params.duration
            };

            // Record success metrics
            span.setAttribute('field.stability', stabilityLevel);
            span.setAttribute('field.status', status);
            span.setStatus({ code: SpanStatusCode.OK });

            return {
                success: true,
                message: `Energy field ${status}`,
                fieldData: activeFields[params.crystalId]
            };
        } catch (error: any) {
            // Record error in span
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

export async function getFieldStatus(crystalId: string) {
    return tracer.startActiveSpan('field.get_status', async (span) => {
        try {
            span.setAttribute('field.crystal_id', crystalId);

            if (!activeFields[crystalId]) {
                const error = new Error(`No active field found for crystal ${crystalId}`);
                span.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: error.message
                });
                span.recordException(error);
                throw error;
            }

            // Check if field duration has expired
            const field = activeFields[crystalId];
            const now = new Date();
            const elapsedSeconds = (now.getTime() - field.startTime.getTime()) / 1000;

            if (elapsedSeconds > field.duration) {
                // Field has expired
                delete activeFields[crystalId];
                span.setAttribute('field.status', 'expired');

                return {
                    crystalId,
                    status: 'expired',
                    message: 'Energy field has dissipated'
                };
            }

            span.setAttribute('field.status', field.status);
            span.setAttribute('field.stability', field.stabilityLevel);
            span.setStatus({ code: SpanStatusCode.OK });

            return {
                crystalId: field.crystalId,
                stabilityLevel: field.stabilityLevel,
                status: field.status,
                mode: field.mode,
                elapsedTime: Math.round(elapsedSeconds),
                remainingTime: Math.round(field.duration - elapsedSeconds)
            };
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
