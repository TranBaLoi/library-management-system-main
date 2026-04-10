/**
 * Reservation Reminder Cron Job
 * Checks BorrowRequest startDate and sends notifications
 * For PENDING requests where startDate is exactly 3 days from today
 * Reminds readers to come to library to pick up reserved books
 */

import { prisma } from '@/lib/prisma';
import { NotificationService } from '@/services/notification.service';
import { BorrowRequestStatus, NotificationType } from '@prisma/client';
import { CronTask } from '../cron-manager';

/**
 * Check BorrowRequest startDate and send notifications
 * For PENDING requests where startDate is exactly 3 days from today
 * Reminds readers that their book reservation is expiring soon
 */
export const reservationReminderTask: CronTask = async () => {
  try {
    console.log('[ReservationReminder] ========================================');
    console.log('[ReservationReminder] Starting reservation reminder check...');
    console.log('[ReservationReminder] ========================================');

    // Calculate date 3 days from now
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    threeDaysFromNow.setHours(23, 59, 59, 999); // End of the day

    // Calculate start of the day 3 days from now
    const threeDaysFromNowStart = new Date(today);

    console.log('[ReservationReminder] Checking for PENDING borrow requests with startDate:', {
      from: threeDaysFromNowStart.toISOString(),
      to: threeDaysFromNow.toISOString(),
    });

    // Find all BorrowRequests where:
    // - status is APPROVED
    // - startDate is exactly 3 days from today
    // - not deleted
    const borrowRequests = await prisma.borrowRequest.findMany({
      where: {
        status: BorrowRequestStatus.APPROVED,
        endDate: {
          gte: threeDaysFromNowStart,
          lte: threeDaysFromNow,
        },
        isDeleted: false,
      },
      select: {
        id: true,
        userId: true,
        startDate: true,
        items: {
          select: {
            book: {
              select: {
                title: true,
              },
            },
            quantity: true,
          },
        },
      },
    });

    console.log(
      `[ReservationReminder] Found ${borrowRequests.length} APPROVED borrow requests starting in 3 days`
    );

    if (borrowRequests.length === 0) {
      console.log('[ReservationReminder] No reservations to notify. Exiting...');
      return;
    }

    // Get unique user IDs
    const userIds = [...new Set(borrowRequests.map(req => req.userId))];

    console.log(`[ReservationReminder] Sending notifications to ${userIds.length} unique users`);

    // Send bulk notification with hardcoded content
    const result = await NotificationService.queueBulkNotifications(
      userIds,
      {
        title: 'Book Reservation Reminder',
        message:
          'Your book reservation is expiring in 3 days. Please come to the library to pick up your reserved books before the reservation expires.',
        type: NotificationType.REMINDER,
      },
      'NORMAL'
    );

    if (result.success) {
      console.log('[ReservationReminder] ✓ Bulk notifications queued successfully:', {
        jobIds: result.jobIds.length,
        userIds: userIds.length,
      });
    } else {
      console.error('[ReservationReminder] ✗ Failed to queue bulk notifications:', result.error);
    }

    console.log('[ReservationReminder] ========================================');
    console.log('[ReservationReminder] Reservation reminder check completed');
    console.log('[ReservationReminder] ========================================');
  } catch (error) {
    console.error('[ReservationReminder] Error in reservation reminder check:', error);
    throw error;
  }
};
