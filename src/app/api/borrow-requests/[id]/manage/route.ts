import { ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { handleRouteError, parseIntParam, successResponse } from '@/lib/utils';
import { AuthenticatedRequest, requireLibrarian } from '@/middleware/auth.middleware';
import { BorrowRequestStatus } from '@/types/borrow-request';

// PATCH /api/borrow-requests/[id]/manage - Update borrow request status
export const PATCH = requireLibrarian(async (request: AuthenticatedRequest, context?: unknown) => {
  try {
    const { params } = context as { params: Promise<{ id: string }> };
    const { id } = await params;
    const borrowRequestId = parseIntParam(id);

    if (borrowRequestId <= 0) {
      throw new ValidationError('Invalid borrow request ID');
    }

    const body = await request.json();
    const { status } = body;

    // Validate status
    if (!status || !Object.values(BorrowRequestStatus).includes(status)) {
      throw new ValidationError('Invalid status');
    }

    // Check if borrow request exists
    const existingRequest = await prisma.borrowRequest.findFirst({
      where: {
        id: borrowRequestId,
        isDeleted: false,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existingRequest) {
      throw new ValidationError('Borrow request not found');
    }

    // Validate status transitions for librarian
    const currentStatus = existingRequest.status as BorrowRequestStatus;
    const newStatus = status as BorrowRequestStatus;

    // Librarian can approve PENDING requests
    if (newStatus === BorrowRequestStatus.APPROVED) {
      if (currentStatus !== BorrowRequestStatus.PENDING) {
        throw new ValidationError(
          'Can only approve PENDING requests. Current status: ' + currentStatus
        );
      }
    }

    // Librarian can reject PENDING or APPROVED requests
    if (newStatus === BorrowRequestStatus.REJECTED) {
      if (![BorrowRequestStatus.PENDING, BorrowRequestStatus.APPROVED].includes(currentStatus)) {
        throw new ValidationError(
          'Can only reject PENDING or APPROVED requests. Current status: ' + currentStatus
        );
      }
    }

    // Update status
    const updatedRequest = await prisma.borrowRequest.update({
      where: { id: borrowRequestId },
      data: { status: newStatus },
      include: {
        items: {
          where: { isDeleted: false },
          include: {
            book: {
              include: {
                author: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    let message = '';
    if (newStatus === BorrowRequestStatus.APPROVED) {
      message = 'Borrow request approved successfully';
    } else if (newStatus === BorrowRequestStatus.REJECTED) {
      message = 'Borrow request rejected successfully';
    } else {
      message = 'Borrow request updated successfully';
    }

    return successResponse(
      {
        borrowRequest: updatedRequest,
        message,
      },
      message
    );
  } catch (error) {
    return handleRouteError(error, 'PATCH /api/borrow-requests/[id]/manage');
  }
});
