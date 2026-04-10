/**
 * Notification Detail API Route
 * GET /api/notifications/[id] - Get notification detail
 * PUT /api/notifications/[id] - Mark notification as read
 */

import { NotFoundError, ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { handleRouteError, parseIntParam, successResponse } from '@/lib/utils';
import { AuthenticatedRequest, requireAuth } from '@/middleware/auth.middleware';
import { NotificationService } from '@/services/notification.service';

// #region GET /api/notifications/[id] - Get notification detail

/**
 * Get notification detail by ID
 * Only allows the notification owner to get the notification
 * Validates that the notification belongs to the current user
 *
 * @param request - Authenticated request
 * @param context - Route context containing notification ID
 */
export const GET = requireAuth(async (request: AuthenticatedRequest, context?: unknown) => {
  try {
    // Get notification ID from route params
    const { params } = context as { params: Promise<{ id: string }> };
    const { id } = await params;
    const notificationId = parseIntParam(id);

    // Validate notification ID
    if (notificationId <= 0) {
      throw new ValidationError('Invalid notification ID');
    }

    // Get userId from authenticated user
    const userId = request.user.id;

    // Get notification and verify it belongs to the current user
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
        isDeleted: false,
      },
      select: {
        id: true,
        userId: true,
        title: true,
        message: true,
        type: true,
        status: true,
        readAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    return successResponse(notification, 'Notification retrieved successfully', 200);
  } catch (error) {
    return handleRouteError(error, 'GET /api/notifications/[id]');
  }
});

// #endregion

// #region PUT /api/notifications/[id] - Mark notification as read

/**
 * Mark a notification as read
 * Only allows the notification owner to mark it as read
 * The service validates that the notification belongs to the current user
 *
 * @param request - Authenticated request
 * @param context - Route context containing notification ID
 */
export const PUT = requireAuth(async (request: AuthenticatedRequest, context?: unknown) => {
  try {
    // Get notification ID from route params
    const { params } = context as { params: Promise<{ id: string }> };
    const { id } = await params;
    const notificationId = parseIntParam(id);

    // Validate notification ID
    if (notificationId <= 0) {
      throw new ValidationError('Invalid notification ID');
    }

    // Get userId from authenticated user
    const userId = request.user.id;

    // Mark notification as read
    // The service validates that the notification belongs to the current user
    await NotificationService.markAsRead(notificationId, userId);

    return successResponse(null, 'Notification marked as read successfully', 200);
  } catch (error) {
    return handleRouteError(error, 'PUT /api/notifications/[id]');
  }
});

// #endregion
