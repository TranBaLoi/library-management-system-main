/**
 * Email Queue Service
 * Manages email jobs using BullMQ
 */

import { redisConnection } from '@/lib/redis';
import { EmailJobData, EmailJobResult, JobPriority, QueueName } from '@/types/queue';
import { Queue, QueueEvents } from 'bullmq';

// #region Queue Configuration

/**
 * Email queue instance
 */
export const emailQueue = new Queue<EmailJobData, EmailJobResult>(QueueName.EMAIL, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 seconds
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 24 * 60 * 60, // Keep for 24 hours
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs
      age: 7 * 24 * 60 * 60, // Keep for 7 days
    },
  },
});

// #endregion

// #region Queue Events

/**
 * Queue events for monitoring
 */
export const emailQueueEvents = new QueueEvents(QueueName.EMAIL, {
  connection: redisConnection,
});

// Log queue events
emailQueueEvents.on('completed', ({ jobId }) => {
  console.log(`Email job ${jobId} completed successfully`);
});

emailQueueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`Email job ${jobId} failed:`, failedReason);
});

emailQueueEvents.on('progress', ({ jobId, data }) => {
  console.log(`Email job ${jobId} progress:`, data);
});

// #endregion

// #region Queue Operations

/**
 * Add email to queue
 */
export async function addEmailToQueue(
  emailData: EmailJobData,
  priority: JobPriority = JobPriority.NORMAL
): Promise<string> {
  const job = await emailQueue.add(
    'send-email',
    {
      ...emailData,
      timestamp: Date.now(),
    },
    {
      priority,
    }
  );

  console.log(`Email job ${job.id} added to queue`);
  return job.id || '';
}

/**
 * Add high-priority email to queue (OTP, password reset, etc.)
 */
export async function addUrgentEmailToQueue(emailData: EmailJobData): Promise<string> {
  return addEmailToQueue(emailData, JobPriority.HIGH);
}

/**
 * Add bulk emails to queue
 */
export async function addBulkEmailsToQueue(
  emails: EmailJobData[],
  priority: JobPriority = JobPriority.LOW
): Promise<string[]> {
  const jobs = await emailQueue.addBulk(
    emails.map((email, index) => ({
      name: 'email',
      data: {
        ...email,
        timestamp: Date.now(),
      },
      opts: {
        priority,
        jobId: `bulk-${Date.now()}-${index}`,
      },
    }))
  );

  console.log(`${jobs.length} email jobs added to queue`);
  return jobs.map(job => job.id || '');
}

/**
 * Get job status
 */
export async function getEmailJobStatus(jobId: string) {
  const job = await emailQueue.getJob(jobId);
  if (!job) {
    return null;
  }

  const state = await job.getState();
  return {
    id: job.id,
    state,
    progress: job.progress,
    attemptsMade: job.attemptsMade,
    data: job.data,
    returnvalue: job.returnvalue,
    failedReason: job.failedReason,
  };
}

/**
 * Get queue statistics
 */
export async function getEmailQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    emailQueue.getWaitingCount(),
    emailQueue.getActiveCount(),
    emailQueue.getCompletedCount(),
    emailQueue.getFailedCount(),
    emailQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

/**
 * Pause queue
 */
export async function pauseEmailQueue(): Promise<void> {
  await emailQueue.pause();
  console.log('Email queue paused');
}

/**
 * Resume queue
 */
export async function resumeEmailQueue(): Promise<void> {
  await emailQueue.resume();
  console.log('Email queue resumed');
}

/**
 * Clean completed jobs
 */
export async function cleanEmailQueue(olderThan: number = 24 * 60 * 60 * 1000): Promise<void> {
  const deletedJobs = await emailQueue.clean(olderThan, 100, 'completed');
  console.log(`Cleaned ${deletedJobs.length} completed jobs`);
}

// #endregion

// #region Graceful Shutdown

/**
 * Close queue connections gracefully
 */
export async function closeEmailQueue(): Promise<void> {
  await emailQueue.close();
  await emailQueueEvents.close();
  console.log('Email queue closed');
}

// #endregion
