/**
 * Ebook Expired Cron Job
 * Automatically returns expired ebooks (runs every hour)
 * For BorrowRecords with status BORROWED where returnDate < now
 */

import { prisma } from '@/lib/prisma';
import { NotificationService } from '@/services/notification.service';
import { NotificationType } from '@prisma/client';
import { CronTask } from '../cron-manager';

/**
 * Process expired ebooks and automatically return them
 */
export const ebookExpiredTask: CronTask = async () => {
  try {
    console.log('[EbookExpired] ========================================');
    console.log('[EbookExpired] Starting expired ebook check...');
    console.log('[EbookExpired] ========================================');

    const now = new Date();

    // Find all BorrowRecords that are expired and have BorrowEbooks
    const expiredRecords = await prisma.borrowRecord.findMany({
      where: {
        status: 'BORROWED',
        returnDate: { lt: now }, // Expired
        borrowEbooks: {
          some: {
            isDeleted: false,
          },
        },
        isDeleted: false,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        borrowEbooks: {
          where: { isDeleted: false },
          include: {
            book: {
              select: {
                id: true,
                title: true,
                author: {
                  select: {
                    id: true,
                    fullName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    console.log(`[EbookExpired] Found ${expiredRecords.length} expired ebook borrow record(s)`);

    if (expiredRecords.length === 0) {
      console.log('[EbookExpired] No expired ebooks to process');
      return;
    }

    let processedCount = 0;
    let errorCount = 0;

    // Process each expired record
    for (const record of expiredRecords) {
      try {
        await prisma.$transaction(async tx => {
          // 1. Update BorrowRecord
          await tx.borrowRecord.update({
            where: { id: record.id },
            data: {
              status: 'RETURNED',
              actualReturnDate: now,
            },
          });

          // 2. Soft delete BorrowEbook (return ebook)
          await tx.borrowEbook.updateMany({
            where: {
              borrowId: record.id,
              isDeleted: false,
            },
            data: {
              isDeleted: true,
            },
          });
        });

        // 3. Send notification to user (optional - can be commented out if not needed)
        const bookTitles = record.borrowEbooks.map(be => be.book.title).join(', ');
        await NotificationService.queueNotification({
          userId: record.userId,
          title: 'Ebook Automatically Returned',
          message: `Your borrowed ebook(s) "${bookTitles}" have been automatically returned as they have expired.`,
          type: NotificationType.SYSTEM,
        });

        processedCount++;
        console.log(
          `[EbookExpired] Processed borrow record ${record.id} for user ${record.userId}`
        );
      } catch (error) {
        errorCount++;
        console.error(
          `[EbookExpired] Error processing borrow record ${record.id}:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    console.log('[EbookExpired] ========================================');
    console.log(`[EbookExpired] Completed: ${processedCount} processed, ${errorCount} errors`);
    console.log('[EbookExpired] ========================================');
  } catch (error) {
    console.error('[EbookExpired] Fatal error:', error);
    throw error;
  }
};
