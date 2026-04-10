/**
 * Borrow Request Reminder Cron Job
 * Checks BorrowRequest endDate and sends notifications
 * For requests where endDate is exactly 3 days from today
 */

import { prisma } from '@/lib/prisma';
import { MailService } from '@/services/mail.service';
import { NotificationService } from '@/services/notification.service';
import { NotificationType } from '@prisma/client';
import { CronTask } from '../cron-manager';

/**
 * Check BorrowRequest endDate and send notifications
 * For requests where endDate is exactly 3 days from today
 */
export const borrowReminderTask: CronTask = async () => {
  try {
    console.log('[BorrowReminder] ========================================');
    console.log('[BorrowReminder] Starting borrow request reminder check...');
    console.log('[BorrowReminder] ========================================');

    // Calculate date 3 days from now
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    threeDaysFromNow.setHours(23, 59, 59, 999); // End of the day

    // Calculate start of the day 3 days from now
    const threeDaysFromNowStart = new Date(today);

    console.log('[BorrowReminder] Checking for borrow requests with endDate:', {
      from: threeDaysFromNowStart.toISOString(),
      to: threeDaysFromNow.toISOString(),
    });

    // Find all BorrowRequests where endDate is 3 days from today
    // Only check APPROVED and FULFILLED requests (active borrows)
    const borrowRequests = await prisma.borrowRecord.findMany({
      where: {
        returnDate: {
          gte: threeDaysFromNowStart,
          lte: threeDaysFromNow,
        },
      },
      select: {
        userId: true,
        id: true,
        returnDate: true,
        user: {
          select: {
            email: true,
            fullName: true,
          },
        },
      },
    });

    console.log(`[BorrowReminder] Found ${borrowRequests.length} borrow requests due in 3 days`);

    if (borrowRequests.length === 0) {
      console.log('[BorrowReminder] No borrow requests to notify. Exiting...');
      return;
    }

    // Get unique user IDs
    const userIds = [...new Set(borrowRequests.map(req => req.userId))];

    console.log(`[BorrowReminder] Sending notifications to ${userIds.length} unique users`);

    // Send bulk notification with hardcoded content
    const result = await NotificationService.queueBulkNotifications(
      userIds,
      {
        title: 'Book Return Reminder',
        message:
          'You have books due for return in 3 days. Please prepare to return your books on time to avoid penalties.',
        type: NotificationType.REMINDER,
      },
      'NORMAL'
    );

    if (result.success) {
      console.log('[BorrowReminder] Bulk notifications queued successfully:', {
        jobIds: result.jobIds.length,
        userIds: userIds.length,
      });
    } else {
      console.error('[BorrowReminder] Failed to queue bulk notifications:', result.error);
    }

    // Get unique users for sending reminder emails (deduplicate by email)
    const uniqueUsersMap = new Map<string, { email: string; fullName: string }>();
    borrowRequests.forEach(req => {
      if (!uniqueUsersMap.has(req.user.email)) {
        uniqueUsersMap.set(req.user.email, {
          email: req.user.email,
          fullName: req.user.fullName,
        });
      }
    });
    const uniqueUsers = Array.from(uniqueUsersMap.values());

    console.log(`[BorrowReminder] Sending reminder emails to ${uniqueUsers.length} unique users`);

    // Queue bulk reminder emails using MailService
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/my-borrow-records`;
    await MailService.queueBulkLoanReminderEmails(uniqueUsers, 3, dashboardUrl);

    console.log('[BorrowReminder] ========================================');
    console.log('[BorrowReminder] Borrow request reminder check completed');
    console.log('[BorrowReminder] ========================================');
  } catch (error) {
    console.error('[BorrowReminder] Error in borrow request reminder check:', error);
    throw error;
  }
};
