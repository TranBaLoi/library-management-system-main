import { ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { handleRouteError, parseIntParam, successResponse } from '@/lib/utils';
import { AuthenticatedRequest, requireReader } from '@/middleware/auth.middleware';
import { NotificationService } from '@/services';
import { BorrowStatus } from '@/types/borrow-record';
import { ReturnEbookResponse } from '@/types/ebook-borrow-request';

// POST /api/borrow-records/[id]/return-ebook - Return ebook early
export const POST = requireReader(async (request: AuthenticatedRequest, context?: unknown) => {
  try {
    const { params } = context as { params: Promise<{ id: string }> };
    const { id } = await params;
    const borrowRecordId = parseIntParam(id);

    if (borrowRecordId <= 0) {
      throw new ValidationError('Invalid borrow record ID');
    }

    // 1. Check permission and get borrow record
    const borrowRecord = await prisma.borrowRecord.findFirst({
      where: {
        id: borrowRecordId,
        userId: request.user.id,
        status: BorrowStatus.BORROWED,
        isDeleted: false,
      },
      include: {
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

    if (!borrowRecord) {
      throw new ValidationError('Borrow record not found or you do not have permission');
    }

    // Check if this is an ebook borrow (has BorrowEbook)
    if (borrowRecord.borrowEbooks.length === 0) {
      throw new ValidationError('This is not an ebook borrow record');
    }

    const book = borrowRecord.borrowEbooks[0]?.book;
    if (!book) {
      throw new ValidationError('Book information not found');
    }

    // 2. Return ebook in transaction
    const result = await prisma.$transaction(async tx => {
      // Update BorrowRecord
      const updatedRecord = await tx.borrowRecord.update({
        where: { id: borrowRecordId },
        data: {
          status: BorrowStatus.RETURNED,
          actualReturnDate: new Date(),
        },
      });

      // Soft delete BorrowEbook (return ebook)
      await tx.borrowEbook.updateMany({
        where: {
          borrowId: borrowRecordId,
          isDeleted: false,
        },
        data: {
          isDeleted: true,
        },
      });

      return updatedRecord;
    });

    // 4. Send notification
    await NotificationService.queueNotification({
      userId: request.user.id,
      title: 'Ebook Returned Successfully',
      message: `You have successfully returned "${book.title}" (PDF).`,
      type: 'SYSTEM',
    });

    return successResponse<ReturnEbookResponse>(
      {
        message: 'Ebook returned successfully',
        borrowRecord: {
          id: result.id,
          status: result.status,
          actualReturnDate: result.actualReturnDate!,
        },
      },
      'Ebook returned successfully'
    );
  } catch (error) {
    return handleRouteError(error, 'POST /api/borrow-records/[id]/return-ebook');
  }
});
