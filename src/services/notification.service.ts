/**
 * Notification Service
 * Handles all notification functionality including database storage and WebSocket delivery
 * All notifications must go through queue - no direct sending
 */

import { ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import {
  addBulkNotificationsToQueue,
  addNotificationToQueue,
  addUrgentNotificationToQueue,
} from '@/queues/notification.queue';
import { JobPriority } from '@/types/queue';
import { NotificationStatus, NotificationType } from '@prisma/client';

// #region Types

/**
 * Notification data for creating a notification
 */
export interface CreateNotificationData {
  userId: number;
  title: string;
  message: string;
  type: NotificationType;
}

/**
 * Notification result after processing
 */
export interface SendNotificationResult {
  success: boolean;
  notificationId?: number;
  error?: string;
}

/**
 * Notification with user information
 */
export interface NotificationWithUser {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: NotificationType;
  status: NotificationStatus;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: number;
    email: string;
    fullName: string;
  };
}

// #endregion

// #region Notification Service Class

export class NotificationService {
  /**
   * Create and save notification to database
   * This is the core method that always saves to DB first
   */
  static async createNotification(data: CreateNotificationData): Promise<NotificationWithUser> {
    // Validate input
    if (!data.userId || data.userId <= 0) {
      throw new ValidationError('Invalid user ID');
    }

    if (!data.title || data.title.trim() === '') {
      throw new ValidationError('Notification title is required');
    }

    if (!data.message || data.message.trim() === '') {
      throw new ValidationError('Notification message is required');
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: data.userId, isDeleted: false },
      select: { id: true, email: true, fullName: true },
    });

    if (!user) {
      throw new ValidationError('User not found');
    }

    // Create notification in database
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title.trim(),
        message: data.message.trim(),
        type: data.type,
        status: NotificationStatus.UNREAD,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });

    console.log(`Notification ${notification.id} created for user ${data.userId}`);

    return notification;
  }

  /**
   * Queue notification for asynchronous sending
   * All notifications must go through queue - no direct sending
   * Notification will be saved to DB and sent via WebSocket by the worker
   */
  static async queueNotification(data: CreateNotificationData): Promise<SendNotificationResult> {
    try {
      // Validate input
      if (!data.userId || data.userId <= 0) {
        throw new ValidationError('Invalid user ID');
      }

      if (!data.title || data.title.trim() === '') {
        throw new ValidationError('Notification title is required');
      }

      if (!data.message || data.message.trim() === '') {
        throw new ValidationError('Notification message is required');
      }

      // Add to queue
      const jobId = await addNotificationToQueue({
        userId: data.userId,
        title: data.title.trim(),
        message: data.message.trim(),
        type: data.type,
      });

      console.log('Notification queued successfully:', {
        jobId,
        userId: data.userId,
        title: data.title,
      });

      return {
        success: true,
        notificationId: parseInt(jobId) || undefined, // Return job ID as notification ID
      };
    } catch (error) {
      console.error('Failed to queue notification:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Queue urgent notification (high priority)
   * Used for alerts, security notifications, etc.
   */
  static async queueUrgentNotification(
    data: CreateNotificationData
  ): Promise<SendNotificationResult> {
    try {
      // Validate input
      if (!data.userId || data.userId <= 0) {
        throw new ValidationError('Invalid user ID');
      }

      if (!data.title || data.title.trim() === '') {
        throw new ValidationError('Notification title is required');
      }

      if (!data.message || data.message.trim() === '') {
        throw new ValidationError('Notification message is required');
      }

      // Add to queue with high priority
      const jobId = await addUrgentNotificationToQueue({
        userId: data.userId,
        title: data.title.trim(),
        message: data.message.trim(),
        type: data.type,
      });

      console.log('Urgent notification queued successfully:', {
        jobId,
        userId: data.userId,
        title: data.title,
      });

      return {
        success: true,
        notificationId: parseInt(jobId) || undefined,
      };
    } catch (error) {
      console.error('Failed to queue urgent notification:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Queue bulk notifications with shared data for multiple users
   * All users receive the same notification content
   *
   * @param userIds - Array of user IDs to send notification to
   * @param sharedData - Shared notification data (title, message, type) for all users
   * @param priority - Job priority (default: LOW for bulk)
   */
  static async queueBulkNotifications(
    userIds: number[],
    sharedData: {
      title: string;
      message: string;
      type: NotificationType;
    },
    priority: 'LOW' | 'NORMAL' | 'HIGH' = 'LOW'
  ): Promise<{ success: boolean; jobIds: string[]; error?: string }> {
    try {
      // Validate input
      if (!userIds || userIds.length === 0) {
        throw new ValidationError('User IDs array is required and must not be empty');
      }

      if (!sharedData.title || sharedData.title.trim() === '') {
        throw new ValidationError('Notification title is required');
      }

      if (!sharedData.message || sharedData.message.trim() === '') {
        throw new ValidationError('Notification message is required');
      }

      // Validate all user IDs
      const invalidUserIds = userIds.filter(id => !id || id <= 0);
      if (invalidUserIds.length > 0) {
        throw new ValidationError(`Invalid user IDs: ${invalidUserIds.join(', ')}`);
      }

      // Remove duplicates
      const uniqueUserIds = [...new Set(userIds)];

      // Convert priority string to JobPriority enum
      const priorityValue =
        priority === 'HIGH'
          ? JobPriority.HIGH
          : priority === 'NORMAL'
            ? JobPriority.NORMAL
            : JobPriority.LOW;

      // Add bulk notifications to queue
      const jobIds = await addBulkNotificationsToQueue(
        uniqueUserIds.map(userId => ({
          userId,
          title: sharedData.title.trim(),
          message: sharedData.message.trim(),
          type: sharedData.type,
        })),
        priorityValue
      );

      console.log('Bulk notifications queued successfully:', {
        jobIds: jobIds.length,
        userIds: uniqueUserIds.length,
        title: sharedData.title,
        priority,
      });

      return {
        success: true,
        jobIds,
      };
    } catch (error) {
      console.error('Failed to queue bulk notifications:', error);

      return {
        success: false,
        jobIds: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: number, userId: number): Promise<void> {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
        isDeleted: false,
      },
    });

    if (!notification) {
      throw new ValidationError('Notification not found');
    }

    if (notification.status === NotificationStatus.READ) {
      return; // Already read
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });

    console.log(`Notification ${notificationId} marked as read by user ${userId}`);
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: number): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        status: NotificationStatus.UNREAD,
        isDeleted: false,
      },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });

    console.log(`${result.count} notifications marked as read for user ${userId}`);
    return result.count;
  }

  /**
   * Get user notifications
   */
  static async getUserNotifications(
    userId: number,
    options?: {
      limit?: number;
      offset?: number;
      status?: NotificationStatus;
      type?: NotificationType;
    }
  ): Promise<NotificationWithUser[]> {
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        isDeleted: false,
        ...(options?.status && { status: options.status }),
        ...(options?.type && { type: options.type }),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: options?.limit,
      skip: options?.offset,
    });

    return notifications;
  }

  /**
   * Get unread notification count for a user
   */
  static async getUnreadCount(userId: number): Promise<number> {
    const count = await prisma.notification.count({
      where: {
        userId,
        status: NotificationStatus.UNREAD,
        isDeleted: false,
      },
    });

    return count;
  }

  /**
   * Delete notification (soft delete)
   */
  static async deleteNotification(notificationId: number, userId: number): Promise<void> {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
        isDeleted: false,
      },
    });

    if (!notification) {
      throw new ValidationError('Notification not found');
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isDeleted: true,
      },
    });

    console.log(`Notification ${notificationId} deleted by user ${userId}`);
  }
}

// #endregion
