import { NotFoundError, ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { handleRouteError, parseIntParam, successResponse } from '@/lib/utils';
import { optionalAuth } from '@/middleware/auth.middleware';
import { ItemStatus } from '@prisma/client';

// Helper function to count reserved quantity for a single book
async function countReservedQuantity(bookId: number): Promise<number> {
  const result = await prisma.borrowRequestItem.aggregate({
    where: {
      bookId: bookId,
      borrowRequest: {
        status: 'APPROVED',
        isDeleted: false,
      },
    },
    _sum: {
      quantity: true,
    },
  });

  return result._sum.quantity || 0;
}

// Helper function to count total available book items for a single book
async function countTotalAvailableBookItems(bookId: number): Promise<number> {
  return await prisma.bookItem.count({
    where: {
      bookId: bookId,
      status: ItemStatus.AVAILABLE,
      isDeleted: false,
    },
  });
}

// GET /api/books/[id]/available-count - Get available book count
export const GET = optionalAuth(async (request, context) => {
  try {
    const { params } = context as { params: Promise<{ id: string }> };
    const { id } = await params;
    const bookId = parseIntParam(id);

    if (bookId <= 0) {
      throw new ValidationError('Invalid book ID');
    }

    // Check if book exists
    const book = await prisma.book.findFirst({
      where: { id: bookId },
      select: { id: true },
    });

    if (!book) {
      throw new NotFoundError('Book not found');
    }

    // Calculate available count
    const [totalAvailable, reservedQuantity] = await Promise.all([
      countTotalAvailableBookItems(bookId),
      countReservedQuantity(bookId),
    ]);

    const availableCount = totalAvailable - reservedQuantity;

    return successResponse<{ availableCount: number }>({ availableCount });
  } catch (error) {
    return handleRouteError(error, 'GET /api/books/[id]/available-count');
  }
});

