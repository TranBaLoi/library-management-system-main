/**
 * Notifications API Route
 * GET /api/notifications - Get all notifications for current user
 */

import { prisma } from '@/lib/prisma';
import { handleRouteError, parsePaginationParams, successResponse } from '@/lib/utils';
import { AuthenticatedRequest, requireAuth } from '@/middleware/auth.middleware';
import { NotificationService } from '@/services/notification.service';
import { NotificationStatus, NotificationType } from '@prisma/client';

// #region Types

/**
 * Notifications list response payload
 */
export interface NotificationsListPayload {
  notifications: Array<{
    id: number;
    userId: number;
    title: string;
    message: string;
    type: NotificationType;
    status: NotificationStatus;
    readAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// #endregion

// #region GET /api/notifications - Get notifications for current user

/**
 * Get all notifications for the authenticated user
 * Supports pagination and filtering by status and type
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 100)
 * - status: Filter by status (UNREAD, READ)
 * - type: Filter by type (SYSTEM, REMINDER, ALERT, OTHER)
 */
export const GET = requireAuth(async (request: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);

    // Get userId from authenticated user
    const userId = request.user.id;

    // Parse optional filters
    const statusParam = searchParams.get('status');
    const typeParam = searchParams.get('type');

    // Validate and parse status filter
    let status: NotificationStatus | undefined;
    if (statusParam) {
      const upperStatus = statusParam.toUpperCase();
      if (upperStatus === 'UNREAD' || upperStatus === 'READ') {
        status = upperStatus as NotificationStatus;
      }
    }

    // Validate and parse type filter
    let type: NotificationType | undefined;
    if (typeParam) {
      const upperType = typeParam.toUpperCase();
      if (
        upperType === 'SYSTEM' ||
        upperType === 'REMINDER' ||
        upperType === 'ALERT' ||
        upperType === 'OTHER'
      ) {
        type = upperType as NotificationType;
      }
    }

    // Calculate offset for service method
    const offset = (page - 1) * limit;

    // Get notifications using service
    const notifications = await NotificationService.getUserNotifications(userId, {
      limit,
      offset,
      status,
      type,
    });

    // Get total count with same filters for pagination
    const total = await prisma.notification.count({
      where: {
        userId,
        isDeleted: false,
        ...(status && { status }),
        ...(type && { type }),
      },
    });

    // Transform notifications to remove user relation (not needed in response)
    const notificationsResponse = notifications.map(notification => ({
      id: notification.id,
      userId: notification.userId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      status: notification.status,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    }));

    return successResponse<NotificationsListPayload>({
      notifications: notificationsResponse,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleRouteError(error, 'GET /api/notifications');
  }
});

// #endregion
