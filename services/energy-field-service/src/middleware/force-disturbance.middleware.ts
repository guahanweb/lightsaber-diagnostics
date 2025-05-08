import { Request, Response, NextFunction } from 'express';
import { trace, SpanStatusCode } from '@opentelemetry/api';

// Get timeout from environment or use default
const DEFAULT_TIMEOUT = parseInt(process.env.DEFAULT_TIMEOUT || '2000', 10);

export const forceDisturbanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const tracer = trace.getTracer('energy-field-service');

    // Create a span for the force disturbance calculation
    return tracer.startActiveSpan('force.disturbance', span => {
        try {
            // Check if in combat mode vs practice mode
            const isCombatMode = req.body.mode === 'combat';
            span.setAttribute('force.mode', isCombatMode ? 'combat' : 'practice');

            // Generate random delay (higher in combat mode)
            const minDelay = 100;
            const maxDelay = isCombatMode ? 5000 : 2000;
            const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

            span.setAttribute('force.delay', delay);
            span.setAttribute('force.timeout', DEFAULT_TIMEOUT);

            console.log(`Force disturbance detected. Mode: ${isCombatMode ? 'combat' : 'practice'}, Delay: ${delay}ms, Timeout: ${DEFAULT_TIMEOUT}ms`);

            // Check if the delay would exceed our timeout
            const willFail = delay > DEFAULT_TIMEOUT;
            span.setAttribute('force.will_fail', willFail);

            if (willFail) {
                // Simulate a timeout error after the default timeout period
                setTimeout(() => {
                    // Create an error object
                    const error = new Error('Kyber crystal energy field collapsed due to force disturbance');
                    
                    // Set the error status on the span
                    span.setStatus({
                        code: SpanStatusCode.ERROR,
                        message: 'Force disturbance timeout'
                    });
                    
                    // Record the exception
                    span.recordException(error);
                    
                    // End the span AFTER setting the error status
                    span.end();
                    
                    return res.status(504).json({
                        error: 'Force disturbance timeout',
                        message: 'Kyber crystal energy field collapsed due to force disturbance',
                        mode: isCombatMode ? 'combat' : 'practice',
                        delay,
                        timeout: DEFAULT_TIMEOUT
                    });
                }, DEFAULT_TIMEOUT);
            } else {
                // Apply delay and continue
                setTimeout(() => {
                    // Set success status
                    span.setStatus({
                        code: SpanStatusCode.OK
                    });
                    
                    span.end();
                    next();
                }, delay);
            }
        } catch (error: any) {
            // Set error status for unexpected errors
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error.message || 'Unknown error'
            });
            
            // Record the exception
            span.recordException(error);
            
            span.end();
            next(error);
        }
    });
};