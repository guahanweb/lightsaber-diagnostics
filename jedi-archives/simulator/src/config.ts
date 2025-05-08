import dotenv from 'dotenv';

dotenv.config();

export const config = {
    kyberServiceUrl: process.env.KYBER_SERVICE_URL || 'http://localhost:3000',
    runtime: parseInt(process.env.DURATION_MINUTES || '60'),
    minDelayMs: parseInt(process.env.MIN_DELAY_MS || '500'),
    maxDelayMs: parseInt(process.env.MAX_DELAY_MS || '2000'),
    combatPercentage: parseInt(process.env.COMBAT_PERCENTAGE || '40'), // % of requests in combat mode
    verbose: process.env.VERBOSE === 'true' || false,
};
