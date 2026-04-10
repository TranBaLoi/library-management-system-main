import { EXTENSION_DAYS, MAX_BORROW_DAYS, MAX_RENEWALS } from '@/constants/borrow-record';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { handleRouteError, parseIntParam, successResponse } from '@/lib/utils';
import { AuthenticatedRequest, requireReader } from '@/middleware/auth.middleware';
import { BorrowStatus } from '@/types/borrow-record';
import { BorrowRequestStatus } from '@/types/borrow-request';

// POST /api/borrow-records/[id]/renew - Renew borrow record
export const POST = requireReader(async (request: AuthenticatedRequest, context?: unknown) => {
  try {
    const { params } = context as { params: Promise<{ id: string }> };
    const { id } = await params;
    const borrowRecordId = parseIntParam(id);

    if (borrowRecordId <= 0) {
      throw new ValidationError('Invalid borrow record ID');
    }

    // Get borrow record with related data
    const borrowRecord = await prisma.borrowRecord.findFirst({
      where: {
        id: borrowRecordId,
        userId: request.user.id,
        isDeleted: false,
      },
      include: {
        borrowBooks: {
          where: { isDeleted: false },
          include: {
            bookItem: {
              include: {
                book: true,
              },
            },
          },
        },
      },
    });

    if (!borrowRecord) {
      throw new NotFoundError('Borrow record not found or you do not have permission');
    }

    // Validation Rule 1: Must be BORROWED and not returned
    if (borrowRecord.status !== BorrowStatus.BORROWED || borrowRecord.actualReturnDate) {
      throw new ValidationError('Cannot renew: This borrow record has already been returned');
    }

    // Validation Rule 2: Must not be overdue
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (borrowRecord.returnDate) {
      const returnDate = new Date(borrowRecord.returnDate);
      returnDate.setHours(0, 0, 0, 0);

      if (returnDate < today) {
        throw new ValidationError(
          'Cannot renew when overdue. Please return the book or pay the penalty fee.'
        );
      }
    }

    // Validation Rule 3: Must not exceed max renewals
    if (borrowRecord.renewalCount >= MAX_RENEWALS) {
      throw new ValidationError(`Maximum renewal limit reached (${MAX_RENEWALS} renewals)`);
    }

    // Validation Rule 4: Check conflict with Hold Queue
    const bookIds = borrowRecord.borrowBooks.map(bb => bb.bookItem.bookId);

    for (const bookId of bookIds) {
      const pendingRequests = await prisma.borrowRequestItem.aggregate({
        where: {
          bookId: bookId,
          borrowRequest: {
            status: {
              in: [BorrowRequestStatus.PENDING, BorrowRequestStatus.APPROVED],
            },
            isDeleted: false,
          },
        },
        _sum: {
          quantity: true,
        },
      });

      if (pendingRequests._sum.quantity && pendingRequests._sum.quantity > 0) {
        const bookTitle = borrowRecord.borrowBooks.find(bb => bb.bookItem.bookId === bookId)
          ?.bookItem.book.title;
        throw new ValidationError(
          `Cannot renew: The book "${bookTitle || 'book'}" has pending reservations. Please return it so others can borrow.`
        );
      }
    }

    // Calculate new return date
    const oldReturnDate = borrowRecord.returnDate
      ? new Date(borrowRecord.returnDate)
      : new Date(borrowRecord.borrowDate);

    const newReturnDate = new Date(oldReturnDate);
    newReturnDate.setDate(newReturnDate.getDate() + EXTENSION_DAYS);

    // Check total borrow period limit
    const borrowDate = new Date(borrowRecord.borrowDate);
    borrowDate.setHours(0, 0, 0, 0);

    const totalBorrowDays = Math.ceil(
      (newReturnDate.getTime() - borrowDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (totalBorrowDays > MAX_BORROW_DAYS) {
      // Adjust to max limit
      newReturnDate.setTime(borrowDate.getTime());
      newReturnDate.setDate(newReturnDate.getDate() + MAX_BORROW_DAYS);
    }

    // Update borrow record in transaction
    const updatedRecord = await prisma.$transaction(async tx => {
      const record = await tx.borrowRecord.update({
        where: { id: borrowRecordId },
        data: {
          returnDate: newReturnDate,
          renewalCount: { increment: 1 },
          status: BorrowStatus.BORROWED,
          updatedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          borrowBooks: {
            where: { isDeleted: false },
            include: {
              bookItem: {
                include: {
                  book: {
                    include: {
                      author: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      return record;
    });

    return successResponse(
      {
        borrowRecord: updatedRecord,
        message: `Renewal successful. New return date: ${newReturnDate.toLocaleDateString()}`,
      },
      'Borrow record renewed successfully'
    );
  } catch (error) {
    return handleRouteError(error, 'POST /api/borrow-records/[id]/renew');
  }
});
