/**
 * Email Worker
 * Processes email jobs from the queue
 */

import { redisOptions } from '@/lib/redis';
import { MailService } from '@/services/mail.service';
import { EmailJobData, EmailJobResult, QueueName } from '@/types/queue';
import { Job, Worker } from 'bullmq';

// #region Worker Configuration

/**
 * Email worker instance
 */
export const emailWorker = new Worker<EmailJobData, EmailJobResult>(
  QueueName.EMAIL,
  async (job: Job<EmailJobData>) => {
    const { id, data } = job;

    console.log(`Processing email job ${id}...`);

    try {
      // Update progress
      await job.updateProgress(10);

      // Send email using MailService
      const result = await MailService.sendEmail({
        to: data.to,
        subject: data.subject,
        html: data.html,
        text: data.text,
        from: data.from,
        cc: data.cc,
        bcc: data.bcc,
        replyTo: data.replyTo,
        attachments: data.attachments,
      });

      // Update progress
      await job.updateProgress(100);

      if (result.success) {
        console.log(`Email job ${id} sent successfully. Message ID: ${result.messageId}`);
        return {
          success: true,
          messageId: result.messageId,
          processedAt: Date.now(),
        };
      } else {
        throw new Error(result.error || 'Failed to send email');
      }
    } catch (error) {
      console.error(`Email job ${id} failed:`, error);
      throw error; // BullMQ will handle retry
    }
  },
  {
    connection: redisOptions,
    concurrency: 5, // Process up to 5 emails concurrently
    limiter: {
      max: 10, // Maximum 10 jobs
      duration: 1000, // Per second (rate limiting)
    },
  }
);

// #endregion

// #region Worker Events

emailWorker.on('completed', job => {
  console.log(`✓ Email job ${job.id} completed`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`✗ Email job ${job?.id} failed:`, err.message);
});

emailWorker.on('error', err => {
  console.error('Email worker error:', err);
});

emailWorker.on('stalled', jobId => {
  console.warn(`Email job ${jobId} stalled`);
});

// #endregion

// #region Graceful Shutdown

/**
 * Close worker gracefully
 */
export async function closeEmailWorker(): Promise<void> {
  await emailWorker.close();
  console.log('Email worker closed');
}

// Handle process termination
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing email worker...');
  await closeEmailWorker();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing email worker...');
  await closeEmailWorker();
  process.exit(0);
});

// #endregion
