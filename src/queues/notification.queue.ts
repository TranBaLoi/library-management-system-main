/**
 * Notification Queue Service
 * Manages notification jobs using BullMQ
 */

import { redisConnection } from '@/lib/redis';
import { JobPriority, NotificationJobData, NotificationJobResult, QueueName } from '@/types/queue';
import { Queue, QueueEvents } from 'bullmq';

// #region Queue Configuration

/**
 * Notification queue instance
 */
export const notificationQueue = new Queue<NotificationJobData, NotificationJobResult>(
  QueueName.NOTIFICATION,
  {
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
  }
);

// #endregion

// #region Queue Events

/**
 * Queue events for monitoring
 */
export const notificationQueueEvents = new QueueEvents(QueueName.NOTIFICATION, {
  connection: redisConnection,
});

// Log queue events
notificationQueueEvents.on('completed', ({ jobId }) => {
  console.log(`Notification job ${jobId} completed successfully`);
});

notificationQueueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`Notification job ${jobId} failed:`, failedReason);
});

notificationQueueEvents.on('progress', ({ jobId, data }) => {
  console.log(`Notification job ${jobId} progress:`, data);
});

// #endregion

// #region Queue Operations

/**
 * Add notification to queue
 */
export async function addNotificationToQueue(
  notificationData: NotificationJobData,
  priority: JobPriority = JobPriority.NORMAL
): Promise<string> {
  const job = await notificationQueue.add(
    'send-notification',
    {
      ...notificationData,
      timestamp: Date.now(),
    },
    {
      priority,
    }
  );

  console.log(`Notification job ${job.id} added to queue`);
  return job.id || '';
}

/**
 * Add high-priority notification to queue (alerts, urgent reminders, etc.)
 */
export async function addUrgentNotificationToQueue(
  notificationData: NotificationJobData
): Promise<string> {
  return addNotificationToQueue(notificationData, JobPriority.HIGH);
}

/**
 * Add bulk notifications to queue
 */
export async function addBulkNotificationsToQueue(
  notifications: NotificationJobData[],
  priority: JobPriority = JobPriority.LOW
): Promise<string[]> {
  const jobs = await notificationQueue.addBulk(
    notifications.map((notification, index) => ({
      name: 'send-notification',
      data: {
        ...notification,
        timestamp: Date.now(),
      },
      opts: {
        priority,
        jobId: `bulk-${Date.now()}-${index}`,
      },
    }))
  );

  console.log(`${jobs.length} notification jobs added to queue`);
  return jobs.map(job => job.id || '');
}

/**
 * Get job status
 */
export async function getNotificationJobStatus(jobId: string) {
  const job = await notificationQueue.getJob(jobId);
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
export async function getNotificationQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    notificationQueue.getWaitingCount(),
    notificationQueue.getActiveCount(),
    notificationQueue.getCompletedCount(),
    notificationQueue.getFailedCount(),
    notificationQueue.getDelayedCount(),
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
export async function pauseNotificationQueue(): Promise<void> {
  await notificationQueue.pause();
  console.log('Notification queue paused');
}

/**
 * Resume queue
 */
export async function resumeNotificationQueue(): Promise<void> {
  await notificationQueue.resume();
  console.log('Notification queue resumed');
}

/**
 * Clean completed jobs
 */
export async function cleanNotificationQueue(
  olderThan: number = 24 * 60 * 60 * 1000
): Promise<void> {
  const deletedJobs = await notificationQueue.clean(olderThan, 100, 'completed');
  console.log(`Cleaned ${deletedJobs.length} completed jobs`);
}

// #endregion

// #region Graceful Shutdown

/**
 * Close queue connections gracefully
 */
export async function closeNotificationQueue(): Promise<void> {
  await notificationQueue.close();
  await notificationQueueEvents.close();
  console.log('Notification queue closed');
}

// #endregion
