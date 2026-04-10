import { prisma } from '@/lib/prisma';
import { handleRouteError, parseIntParam, successResponse } from '@/lib/utils';
import { AuthenticatedRequest, requireLibrarian } from '@/middleware/auth.middleware';
import { BorrowRequestStatus } from '@/types/borrow-request';
import { Prisma } from '@prisma/client';

// Helper function to calculate queue position
async function calculateQueuePosition(bookId: number, borrowRequestId: number): Promise<number> {
  const queue = await prisma.borrowRequestItem.findMany({
    where: {
      bookId: bookId,
      borrowRequest: {
        status: 'PENDING',
        isDeleted: false,
      },
      isDeleted: false,
    },
    include: {
      borrowRequest: {
        select: {
          id: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      borrowRequest: {
        createdAt: 'asc',
      },
    },
  });

  const position = queue.findIndex(item => item.borrowRequestId === borrowRequestId) + 1;
  return position > 0 ? position : queue.length + 1;
}

// GET /api/borrow-requests/all - Get all borrow requests (Librarian only)
export const GET = requireLibrarian(async (request: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseIntParam(searchParams.get('page'), 1);
    const limit = parseIntParam(searchParams.get('limit'), 10);
    const status = searchParams.get('status'); // Filter by status
    const userId = searchParams.get('userId'); // Filter by userId

    const skip = (page - 1) * limit;

    // Get all borrow requests with optional filters
    const where: Prisma.BorrowRequestWhereInput = {
      isDeleted: false,
    };

    if (status && Object.values(BorrowRequestStatus).includes(status as BorrowRequestStatus)) {
      where.status = status as BorrowRequestStatus;
    }

    if (userId) {
      const userIdNum = parseIntParam(userId, 0);
      if (userIdNum > 0) {
        where.userId = userIdNum;
      }
    }

    const [borrowRequestsRaw, total] = await Promise.all([
      prisma.borrowRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
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
        },
      }),
      prisma.borrowRequest.count({ where }),
    ]);

    // Transform to calculate queue position for each item
    const borrowRequests = await Promise.all(
      borrowRequestsRaw.map(async req => {
        const items = await Promise.all(
          req.items.map(async item => {
            // Calculate queue position if status = PENDING
            const queuePosition =
              req.status === BorrowRequestStatus.PENDING
                ? await calculateQueuePosition(item.bookId, req.id)
                : null;

            return {
              ...item,
              book: {
                id: item.book.id,
                title: item.book.title,
                isbn: item.book.isbn,
                coverImageUrl: item.book.coverImageUrl,
                publishYear: item.book.publishYear,
                author: {
                  id: item.book.author.id,
                  fullName: item.book.author.fullName,
                },
              },
              queuePosition,
            };
          })
        );

        return {
          ...req,
          status: req.status as BorrowRequestStatus,
          items,
          user: req.user
            ? {
                id: req.user.id,
                fullName: req.user.fullName,
                email: req.user.email,
              }
            : undefined,
        };
      })
    );

    return successResponse({
      borrowRequests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleRouteError(error, 'GET /api/borrow-requests/all');
  }
});
