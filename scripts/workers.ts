/**
 * Combined Workers Script
 * Runs both email and notification queue workers in a single process
 *
 * Usage:
 *   ts-node scripts/workers.ts
 *   or
 *   yarn worker
 */

// Load environment variables from .env file
import { config } from 'dotenv';
config();

// Register tsconfig paths for @/ alias resolution
import { resolve } from 'path';
import { register } from 'tsconfig-paths';

register({
  baseUrl: resolve(__dirname, '..'),
  paths: {
    '@/*': ['./src/*'],
  },
});

// Import both workers
import { closeEmailWorker } from '../src/workers/email.worker';
import { closeNotificationWorker } from '../src/workers/notification.worker';

// Import workers to initialize them
import '../src/workers/email.worker';
import '../src/workers/notification.worker';

console.log('========================================');
console.log('Workers started successfully!');
console.log('========================================');
console.log('✓ Email worker: Listening for email jobs');
console.log('✓ Notification worker: Listening for notification jobs');
console.log('========================================');
console.log('Press Ctrl+C to stop all workers');

// #region Graceful Shutdown

/**
 * Close all workers gracefully
 */
async function closeAllWorkers(): Promise<void> {
  console.log('\nShutting down all workers...');
  try {
    // Close both workers in parallel
    await Promise.all([closeEmailWorker(), closeNotificationWorker()]);
    console.log('✓ All workers closed successfully');
  } catch (error) {
    console.error('Error closing workers:', error);
    throw error;
  }
}

// Handle process termination
// Remove existing handlers from individual workers and use combined handler
// This ensures only one shutdown handler runs
process.removeAllListeners('SIGTERM');
process.removeAllListeners('SIGINT');

// Register combined handler
process.once('SIGTERM', async () => {
  console.log('\nSIGTERM received, closing all workers...');
  await closeAllWorkers();
  process.exit(0);
});

process.once('SIGINT', async () => {
  console.log('\nSIGINT received, closing all workers...');
  await closeAllWorkers();
  process.exit(0);
});

// #endregion
