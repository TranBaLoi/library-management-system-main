/**
 * Notification Worker
 * Processes notification jobs from the queue
 * Saves notifications to database and sends via WebSocket
 *
 * NOTE: This worker should be started from socket-server to share the same process
 * and use the same emitToUser function directly.
 */

import { redisOptions } from '@/lib/redis';
import { emitToUser } from '@/lib/socket-emitter';
import { NotificationService } from '@/services/notification.service';
import { NotificationJobData, NotificationJobResult, QueueName } from '@/types/queue';
import { Job, Worker } from 'bullmq';

// #region Worker Configuration

/**
 * Notification worker instance
 */
export const notificationWorker = new Worker<NotificationJobData, NotificationJobResult>(
  QueueName.NOTIFICATION,
  async (job: Job<NotificationJobData>) => {
    const { id, data } = job;

    console.log(`Processing notification job ${id}...`);

    try {
      // Update progress
      await job.updateProgress(10);

      // 1. Save notification to database first (as required)
      const notification = await NotificationService.createNotification({
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
      });

      // Update progress
      await job.updateProgress(50);

      // 2. Send notification via WebSocket (direct emit in same process)
      const emitted = emitToUser(data.userId, 'notification', notification);
      if (emitted) {
        console.log(`Emitted notification to user ${data.userId} via WebSocket`);
      } else {
        console.log(`User ${data.userId} not connected, notification saved to DB only`);
      }

      // Update progress
      await job.updateProgress(100);

      console.log(
        `Notification job ${id} processed successfully. Notification ID: ${notification.id}`
      );
      return {
        success: true,
        notificationId: notification.id,
        processedAt: Date.now(),
      };
    } catch (error) {
      console.error(`Notification job ${id} failed:`, error);
      throw error; // BullMQ will handle retry
    }
  },
  {
    connection: redisOptions,
    concurrency: 10, // Process up to 10 notifications concurrently
    limiter: {
      max: 50, // Maximum 50 jobs
      duration: 1000, // Per second (rate limiting)
    },
  }
);

// #endregion

// #region Worker Events

notificationWorker.on('completed', job => {
  console.log(`✓ Notification job ${job.id} completed`);
});

notificationWorker.on('failed', (job, err) => {
  console.error(`✗ Notification job ${job?.id} failed:`, err.message);
});

notificationWorker.on('error', err => {
  console.error('Notification worker error:', err);
});

notificationWorker.on('stalled', jobId => {
  console.warn(`Notification job ${jobId} stalled`);
});

// #endregion

// #region Graceful Shutdown

/**
 * Close worker gracefully
 * Note: When running in socket-server process, shutdown is handled by socket-server
 */
export async function closeNotificationWorker(): Promise<void> {
  await notificationWorker.close();
  console.log('Notification worker closed');
}

// #endregion
