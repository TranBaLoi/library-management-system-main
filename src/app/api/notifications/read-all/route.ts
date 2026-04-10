/**
 * Mark All Notifications as Read API Route
 * PUT /api/notifications/read-all - Mark all notifications as read for current user
 */

import { handleRouteError, successResponse } from '@/lib/utils';
import { AuthenticatedRequest, requireAuth } from '@/middleware/auth.middleware';
import { NotificationService } from '@/services/notification.service';

// #region Types

/**
 * Mark all as read response payload
 */
export interface MarkAllAsReadResponse {
  markedCount: number;
}

// #endregion

// #region PUT /api/notifications/read-all - Mark all notifications as read

/**
 * Mark all unread notifications as read for the authenticated user
 * Only marks notifications that belong to the current user
 * Returns the count of notifications that were marked as read
 *
 * @param request - Authenticated request
 */
export const PUT = requireAuth(async (request: AuthenticatedRequest) => {
  try {
    // Get userId from authenticated user
    const userId = request.user.id;

    // Mark all notifications as read
    // The service only marks notifications that belong to the current user
    const markedCount = await NotificationService.markAllAsRead(userId);

    return successResponse<MarkAllAsReadResponse>(
      {
        markedCount,
      },
      `Successfully marked ${markedCount} notification(s) as read`,
      200
    );
  } catch (error) {
    return handleRouteError(error, 'PUT /api/notifications/read-all');
  }
});

// #endregion
