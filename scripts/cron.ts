/**
 * Cron Jobs Runner
 * Runs all registered cron jobs
 *
 * Usage:
 *   ts-node scripts/cron.ts
 *   or
 *   yarn cron
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

import { CronManager } from '../src/lib/cron';
import {
  borrowReminderTask,
  ebookExpiredTask,
  lateReturnPaymentTask,
  reservationReminderTask,
} from '../src/lib/cron/jobs';

// #region Register All Cron Jobs

console.log('========================================');
console.log('Initializing Cron Jobs...');
console.log('========================================');

// Register Borrow Request Reminder Job
// Runs at 1:00 AM every day
CronManager.register({
  name: 'borrow-reminder',
  schedule: '0 1 * * *', // At 1:00 AM
  task: borrowReminderTask,
  description: 'Check BorrowRequest endDate and send reminder notifications (3 days before due)',
  enabled: true,
});

// Register Reservation Reminder Job
// Runs at 1:00 AM every day
CronManager.register({
  name: 'reservation-reminder',
  schedule: '0 1 * * *', // At 1:00 AM
  task: reservationReminderTask,
  description:
    'Check BorrowRequest startDate for PENDING requests and send reminder notifications (3 days before reservation expires)',
  enabled: true,
});

// Register Ebook Expired Job
// Runs every hour
CronManager.register({
  name: 'ebook-expired',
  schedule: '0 * * * *', // Every hour at minute 0
  task: ebookExpiredTask,
  description: 'Automatically return expired ebooks (BorrowRecords with returnDate < now)',
  enabled: true,
});

// Register Late Return Payment Job
// Runs at 1:00 AM every day
CronManager.register({
  name: 'late-return-payment',
  schedule: '0 1 * * *', // At 1:00 AM
  task: lateReturnPaymentTask,
  description:
    'Automatically calculates and creates/updates payment for late return violations (actualReturnDate > returnDate)',
  enabled: true,
});

// #endregion

// #region Display Status

const jobs = CronManager.getJobs();
console.log('========================================');
console.log(`Registered ${jobs.length} cron job(s):`);
jobs.forEach(job => {
  console.log(`  - ${job.name}: ${job.schedule}${job.description ? ` (${job.description})` : ''}`);
});
console.log('========================================');
console.log('Cron jobs are running. Press Ctrl+C to stop.');

// #endregion

// #region Graceful Shutdown

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n[Cron] SIGINT received, shutting down all cron jobs...');
  CronManager.stopAll();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Cron] SIGTERM received, shutting down all cron jobs...');
  CronManager.stopAll();
  process.exit(0);
});

// #endregion
