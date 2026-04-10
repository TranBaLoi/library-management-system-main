/**
 * Notification Worker Script
 * Standalone script to run notification queue worker
 *
 * Usage:
 *   ts-node scripts/notification-worker.ts
 *   or
 *   yarn worker:notification
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

import '../src/workers/notification.worker';

console.log('Notification worker started and listening for jobs...');
console.log('Press Ctrl+C to stop the worker');
