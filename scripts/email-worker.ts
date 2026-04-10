/**
 * Email Worker Script
 * Standalone script to run email queue worker
 *
 * Usage:
 *   ts-node scripts/email-worker.ts
 *   or
 *   yarn worker:email
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

import '../src/workers/email.worker';

console.log('Email worker started and listening for jobs...');
console.log('Press Ctrl+C to stop the worker');
