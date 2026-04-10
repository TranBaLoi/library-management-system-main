/**
 * Queue Type Definitions
 * Types for BullMQ job queues
 */

import { EmailOptions } from './mail';

// #region Email Queue Types

/**
 * Email job data structure
 */
export interface EmailJobData extends EmailOptions {
  jobId?: string;
  timestamp?: number;
}

/**
 * Email job result after processing
 */
export interface EmailJobResult {
  success: boolean;
  messageId?: string;
  error?: string;
  processedAt: number;
}

/**
 * Queue names
 */
export enum QueueName {
  EMAIL = 'email',
  OTP = 'otp',
  NOTIFICATION = 'notification',
}

/**
 * Job priorities
 */
export enum JobPriority {
  LOW = 10,
  NORMAL = 5,
  HIGH = 1,
  CRITICAL = 0,
}

// #endregion

// #region Notification Queue Types

/**
 * Notification job data structure
 */
export interface NotificationJobData {
  userId: number;
  title: string;
  message: string;
  type: 'SYSTEM' | 'REMINDER' | 'ALERT' | 'OTHER';
  jobId?: string;
  timestamp?: number;
}

/**
 * Bulk notification job data structure
 * Shared notification data for multiple users
 */
export interface BulkNotificationJobData {
  userIds: number[];
  title: string;
  message: string;
  type: 'SYSTEM' | 'REMINDER' | 'ALERT' | 'OTHER';
  jobId?: string;
  timestamp?: number;
}

/**
 * Notification job result after processing
 */
export interface NotificationJobResult {
  success: boolean;
  notificationId?: number;
  error?: string;
  processedAt: number;
}

// #endregion
