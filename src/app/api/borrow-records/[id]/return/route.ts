import { NotFoundError, ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { handleRouteError, parseIntParam, successResponse } from '@/lib/utils';
import { getViolationPolicyMetadata } from '@/lib/utils/violation-utils';
import { AuthenticatedRequest, requireLibrarian } from '@/middleware/auth.middleware';
import { BorrowStatus } from '@/types/borrow-record';
import { BorrowRequestStatus } from '@/types/borrow-request';
import { Violation } from '@/types/violation';
import { Condition, ItemStatus, Prisma } from '@prisma/client';

// POST /api/borrow-records/[id]/return - Return books for a borrow record
export const POST = requireLibrarian(async (request: AuthenticatedRequest, context?: unknown) => {
  try {
    const { params } = context as { params: Promise<{ id: string }> };
    const { id } = await params;
    const borrowRecordId = parseIntParam(id);

    if (borrowRecordId <= 0) {
      throw new ValidationError('Invalid borrow record ID');
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const violations: Violation[] = body.violations || [];
    const conditionUpdates: Record<string, string> = body.conditionUpdates || {};

    // Get borrow record with related data
    const borrowRecord = await prisma.borrowRecord.findFirst({
      where: {
        id: borrowRecordId,
        isDeleted: false,
      },
      include: {
        user: {
          select: { id: true, fullName: true, email: true },
        },
        borrowBooks: {
          where: { isDeleted: false },
          include: {
            bookItem: {
              include: { book: true },
            },
          },
        },
      },
    });

    if (!borrowRecord) {
      throw new NotFoundError('Borrow record not found');
    }

    // Validation: Must be BORROWED and not already returned
    if (borrowRecord.status !== BorrowStatus.BORROWED || borrowRecord.actualReturnDate) {
      throw new ValidationError('This borrow record has already been returned');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Process return in transaction
    const result = await prisma.$transaction(async tx => {
      const createdPayments: Array<{ id: number; amount: number; policyId: string }> = [];
      let totalViolationPoints = 0;

      // 1. Process violations
      for (const violation of violations) {
        // Find Policy from database
        const policy = await tx.policy.findUnique({
          where: { id: violation.policyId, isDeleted: false },
        });

        if (!policy) {
          throw new ValidationError(`Policy with ID "${violation.policyId}" not found in database`);
        }

        // Create Payment
        const dueDateObj = new Date(violation.dueDate);
        dueDateObj.setHours(23, 59, 59, 999);

        const payment = await tx.payment.create({
          data: {
            policyId: violation.policyId,
            borrowRecordId: borrowRecordId,
            amount: violation.amount,
            isPaid: false,
            dueDate: dueDateObj,
          },
        });

        createdPayments.push({
          id: payment.id,
          amount: payment.amount,
          policyId: payment.policyId,
        });

        // Get violation points from violation policy metadata
        const metadata = getViolationPolicyMetadata(violation.policyId);
        if (!metadata) {
          throw new ValidationError(
            `Invalid violation policy ID: "${violation.policyId}". Policy must be LOST_BOOK, DAMAGED_BOOK, or WORN_BOOK.`
          );
        }
        const points = metadata.points;
        totalViolationPoints += points;

        // Update BookItem condition and status
        const bookItemCondition = conditionUpdates[violation.bookItemId.toString()];
        if (bookItemCondition) {
          let newStatus: ItemStatus;

          // Set status based on condition from form
          if (bookItemCondition === Condition.LOST) {
            newStatus = ItemStatus.LOST;
          } else if (bookItemCondition === Condition.DAMAGED) {
            newStatus = ItemStatus.RETIRED;
          } else {
            newStatus = ItemStatus.AVAILABLE;
          }

          await tx.bookItem.update({
            where: { id: violation.bookItemId },
            data: {
              condition: bookItemCondition as Condition,
              status: newStatus,
            },
          });
        }
      }

      // 2. Update User violation points
      if (totalViolationPoints > 0) {
        await tx.user.update({
          where: { id: borrowRecord.userId },
          data: {
            violationPoints: {
              increment: totalViolationPoints,
            },
          },
        });
      }

      // 3. Update condition for non-violation items
      for (const [bookItemIdStr, condition] of Object.entries(conditionUpdates)) {
        const bookItemId = parseInt(bookItemIdStr, 10);
        if (!isNaN(bookItemId) && !violations.find(v => v.bookItemId === bookItemId)) {
          await tx.bookItem.update({
            where: { id: bookItemId },
            data: {
              condition: condition as Condition,
            },
          });
        }
      }

      // 4. Update BorrowRecord to returned
      const updatedRecord = await tx.borrowRecord.update({
        where: { id: borrowRecordId },
        data: {
          actualReturnDate: today,
          status: BorrowStatus.RETURNED,
          updatedAt: new Date(),
        },
      });

      // 5. Update BookItems status
      const bookIdsSet = new Set<number>();
      for (const bb of borrowRecord.borrowBooks as Array<{
        bookItemId: number;
        bookItem: { id: number; bookId: number };
      }>) {
        const hasViolation = violations.some(v => v.bookItemId === bb.bookItemId);
        if (!hasViolation) {
          await tx.bookItem.update({
            where: { id: bb.bookItemId },
            data: { status: ItemStatus.AVAILABLE },
          });
        }
        bookIdsSet.add(bb.bookItem.bookId);
      }

      // 6. Trigger hold queue processing per book
      const processedBooks: Array<{ bookId: number; approvedRequests: number[] }> = [];
      for (const bookId of bookIdsSet) {
        const approved = await processHoldQueueForBook(tx, bookId);
        if (approved && approved.length > 0) {
          processedBooks.push({ bookId, approvedRequests: approved });
        }
      }

      return { updatedRecord, processedBooks, createdPayments, bookIds: Array.from(bookIdsSet) };
    });

    const message =
      result.createdPayments.length > 0
        ? `Books returned successfully. ${result.createdPayments.length} payment(s) created.`
        : 'Books returned successfully.';

    return successResponse(
      {
        borrowRecord: result.updatedRecord,
        processedBooks: result.processedBooks,
        payments: result.createdPayments,
        message,
      },
      message
    );
  } catch (error) {
    return handleRouteError(error, 'POST /api/borrow-records/[id]/return');
  }
});

// Process hold queue for a specific book; returns list of approved request IDs
async function processHoldQueueForBook(
  tx: Prisma.TransactionClient,
  bookId: number
): Promise<number[] | null> {
  // Get first PENDING request item in FIFO order for this book
  const firstRequestItem = await tx.borrowRequestItem.findFirst({
    where: {
      bookId,
      borrowRequest: { status: BorrowRequestStatus.PENDING, isDeleted: false },
    },
    include: {
      borrowRequest: {
        include: {
          items: { where: { isDeleted: false } },
          user: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (!firstRequestItem) return null;

  const request = firstRequestItem.borrowRequest;

  // Check all items have enough remaining availability: AVAILABLE - APPROVED
  for (const item of request.items) {
    const [totalAvailable, reservedAgg] = await Promise.all([
      tx.bookItem.count({
        where: { bookId: item.bookId, status: ItemStatus.AVAILABLE, isDeleted: false },
      }),
      tx.borrowRequestItem.aggregate({
        where: {
          bookId: item.bookId,
          borrowRequest: { status: BorrowRequestStatus.APPROVED, isDeleted: false },
        },
        _sum: { quantity: true },
      }),
    ]);

    const reservedQty = reservedAgg._sum.quantity || 0;
    const remainingAvailable = totalAvailable - reservedQty;
    if (remainingAvailable < item.quantity) {
      return null; // Keep in queue
    }
  }

  // Approve request
  await tx.borrowRequest.update({
    where: { id: request.id },
    data: { status: BorrowRequestStatus.APPROVED },
  });

  return [request.id];
}
