/**
 * Notification API Client
 * Client-side functions for notification operations
 */

import { fetchWithAuth, getAccessToken, handleJson } from '@/lib/utils';
import { NotificationStatus, NotificationType } from '@prisma/client';

// #region Types

/**
 * Notification data structure
 */
export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: NotificationType;
  status: NotificationStatus;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Notifications list response
 */
export interface NotificationsListResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Mark all as read response
 */
export interface MarkAllAsReadResponse {
  markedCount: number;
}

// #endregion

// #region Notification API Class

export class NotificationApi {
  /**
   * Get notifications for current user
   */
  static async getNotifications(params?: {
    page?: number;
    limit?: number;
    status?: NotificationStatus;
    type?: NotificationType;
  }): Promise<NotificationsListResponse> {
    const token = getAccessToken();
    const searchParams = new URLSearchParams();

    if (params?.page) {
      searchParams.set('page', params.page.toString());
    }
    if (params?.limit) {
      searchParams.set('limit', params.limit.toString());
    }
    if (params?.status) {
      searchParams.set('status', params.status);
    }
    if (params?.type) {
      searchParams.set('type', params.type);
    }

    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth(`/api/notifications?${searchParams.toString()}`, {
      headers,
    });

    return await handleJson<NotificationsListResponse>(response);
  }

  /**
   * Get notification detail by ID
   */
  static async getNotificationById(id: number): Promise<Notification> {
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth(`/api/notifications/${id}`, {
      headers,
    });

    return await handleJson<Notification>(response);
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(id: number): Promise<{ message: string }> {
    const token = getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth(`/api/notifications/${id}`, {
      method: 'PUT',
      headers,
    });

    return await handleJson<{ message: string }>(response);
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(): Promise<MarkAllAsReadResponse> {
    const token = getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth('/api/notifications/read-all', {
      method: 'PUT',
      headers,
    });

    return await handleJson<MarkAllAsReadResponse>(response);
  }
}

// #endregion
