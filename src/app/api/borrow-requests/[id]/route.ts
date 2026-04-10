import { ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { handleRouteError, parseIntParam, successResponse } from '@/lib/utils';
import { AuthenticatedRequest, requireReader } from '@/middleware/auth.middleware';
import { BorrowRequestStatus } from '@/types/borrow-request';

// PATCH /api/borrow-requests/[id] - Update borrow request status
export const PATCH = requireReader(async (request: AuthenticatedRequest, context?: unknown) => {
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

    // Check if borrow request exists and belongs to the current user
    const existingRequest = await prisma.borrowRequest.findFirst({
      where: {
        id: borrowRequestId,
        userId: request.user.id,
        isDeleted: false,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existingRequest) {
      throw new ValidationError('Borrow request not found or you do not have permission');
    }

    // Only allow cancelling PENDING or APPROVED requests
    if (
      status === BorrowRequestStatus.CANCELLED &&
      ![BorrowRequestStatus.PENDING, BorrowRequestStatus.APPROVED].includes(
        existingRequest.status as BorrowRequestStatus
      )
    ) {
      throw new ValidationError(
        'Cannot cancel borrow request. Only PENDING or APPROVED requests can be cancelled'
      );
    }

    // Update status
    const updatedRequest = await prisma.borrowRequest.update({
      where: { id: borrowRequestId },
      data: { status: status as BorrowRequestStatus },
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

    return successResponse(
      {
        borrowRequest: updatedRequest,
        message: 'Borrow request cancelled successfully',
      },
      'Borrow request cancelled successfully'
    );
  } catch (error) {
    return handleRouteError(error, 'PATCH /api/borrow-requests/[id]');
  }
});
