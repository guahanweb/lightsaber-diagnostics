import axios from 'axios';
import fs from 'fs';
import { config } from './config';

enum CrystalType {
    BLUE = 'blue',
    GREEN = 'green',
    RED = 'red',
    WHITE = 'white',
    PURPLE = 'purple',
}

enum Modes {
    PRACTICE = 'practice',
    COMBAT = 'combat',
}

const OWNERS = [
    // Jedi and light side users (varied colors)
    { name: 'obi-wan', crystal: [CrystalType.GREEN] },
    { name: 'luke', crystal: [CrystalType.GREEN, CrystalType.BLUE] },
    { name: 'yoda', crystal: [CrystalType.GREEN] },
    { name: 'mace', crystal: [CrystalType.PURPLE] },
    { name: 'ahsoka', crystal: [CrystalType.WHITE] },
    { name: 'qui-gon', crystal: [CrystalType.GREEN] },
    // Sith and dark side users (always red)
    { name: 'vader', crystal: [CrystalType.RED] },
    { name: 'sidious', crystal: [CrystalType.RED] },
    { name: 'dooku', crystal: [CrystalType.RED] },
    { name: 'maul', crystal: [CrystalType.RED] },
    { name: 'kylo', crystal: [CrystalType.RED] },
    { name: 'plagueis', crystal: [CrystalType.RED] },
];

// Log setup
const logFile = fs.createWriteStream('./lighsaber-traffic.log', { flags: 'a' });
const log = (message: string, toConsole = config.verbose) => {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${message}`;
    if (toConsole) {
        console.log(logMessage);
    }
    logFile.write(logMessage + '\n');
};

// Random utilities
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomItem = (array: any[]) => array[randomInt(0, array.length - 1)];
const randomDelay = () => randomInt(config.minDelayMs, config.maxDelayMs);
const isCombatMode = () => Math.random() * 100 < config.combatPercentage;

// Function to generate a random crystal ID
const generateCrystalId = () => {
    return `crystal-${randomInt(1, 100)}-${Date.now().toString(36)}`;
};

// Function to determine power level (1-10)
// Note: Combat mode tends to use higher power levels
const determinePowerLevel = (mode: Modes) => {
    return mode === Modes.COMBAT
        ? randomInt(5, 10)
        : randomInt(1, 8);
}

// Function to clear the current line in the terminal
const clearLine = () => {
    process.stdout.clearLine?.(0);
    process.stdout.cursorTo?.(0);
}

// Function to send a single activation request
const activateLightsaber = async () => {
    const owner = randomItem(OWNERS);
    const crystalType = randomItem(owner.crystal);
    const mode = isCombatMode() ? Modes.COMBAT : Modes.PRACTICE;
    const powerLevel = determinePowerLevel(mode);
    const crystalId = generateCrystalId();

    try {
        log(`Activating lightsaber: Owner=${owner.name}, Crystal=${crystalType}, Mode=${mode}, PowerLevel=${powerLevel}, CrystalId=${crystalId}`);

        const response = await axios.post(`${config.kyberServiceUrl}/api/crystals/activate`, {
            crystalId,
            ownerName: owner.name,
            type: crystalType,
            mode,
            powerLevel,
        }, {
            timeout: 3000, // 3 second timeout
        });

        log(`Activation result: ${response.data.success ? 'SUCCESS' : 'FAILURE'}`);
        return true;
    } catch (error: any) {
        log(`Activation ERROR: ${error.message}`);
        return false;
    }
};

// Main simulation loop
const runTrafficGenerator = async () => {
    // Print a message that's always visible
    console.log('Starting Lightsaber Traffic Generator');
    console.log(`Configuration: Combat=${config.combatPercentage}%, Delay=${config.minDelayMs}-${config.maxDelayMs}ms`);
    console.log('Progress updates will appear below. Press Ctrl+C to stop.');
    console.log('----------------------------------------------------------------');

    log('Starting Lightsaber Traffic Generator');
    log(`Configuration: Combat=${config.combatPercentage}%, Delay=${config.minDelayMs}-${config.maxDelayMs}ms`);

    // Calculate end time
    const endTime = new Date();
    endTime.setMinutes(endTime.getMinutes() + config.runtime);

    let successCount = 0;
    let failureCount = 0;
    let combatCount = 0;
    let practiceCount = 0;
    let lastUpdateTime = Date.now();
    let requestsInLastMinute = 0;

    const printStats = () => {
        const total = successCount + failureCount;
        const successRate = total > 0 ? (successCount / total * 100).toFixed(1) : 0;
        const elapsedMinutes = ((Date.now() - lastUpdateTime) / 60000);

        if (elapsedMinutes >= 1) {
            requestsInLastMinute = 0;
            lastUpdateTime = Date.now();
        }

        // Clear line if possible (works in most terminals)
        if (typeof process.stdout.clearLine === 'function') {
            clearLine();
        } else {
            // For terminals that don't support clearLine
            process.stdout.write('\r');
        }

        process.stdout.write(
            `Total: ${total} | Success: ${successRate}% | Combat: ${combatCount} | Practice: ${practiceCount} | Req/min: ${requestsInLastMinute.toFixed(1)}`
        );
    }

    // Main loop
    while (new Date() < endTime) {
        const success = await activateLightsaber();
        if (success) {
            successCount++;
        } else {
            failureCount++;
        }

        // Update mode counters based on probability (for approximation)
        if (Math.random() * 100 < config.combatPercentage) {
            combatCount++;
        } else {
            practiceCount++;
        }

        requestsInLastMinute++;
        printStats();

        // Random delay before next request
        await new Promise(resolve => setTimeout(resolve, randomDelay()));
    }

    // Clear the line for final output
    if (typeof process.stdout.clearLine === 'function') {
        clearLine();
    }

    log(`\nTraffic generation complete!`, true);
    log(`Final stats: ${successCount} successes, ${failureCount} failures`, true);
    logFile.end();
}

// Start the traffic generator
runTrafficGenerator().catch(error => {
    log(`Fatal error: ${error.message}`);
    process.exit(1);
});
