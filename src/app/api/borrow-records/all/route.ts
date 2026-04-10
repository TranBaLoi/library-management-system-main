import { prisma } from '@/lib/prisma';
import { handleRouteError, parseIntParam, successResponse } from '@/lib/utils';
import { AuthenticatedRequest, requireLibrarian } from '@/middleware/auth.middleware';
import { BorrowStatus } from '@/types/borrow-record';
import { Prisma } from '@prisma/client';

// GET /api/borrow-records/all - Get all borrow records
export const GET = requireLibrarian(async (request: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseIntParam(searchParams.get('page'), 1);
    const limit = parseIntParam(searchParams.get('limit'), 10);
    const status = searchParams.get('status'); // Filter by status
    const userId = searchParams.get('userId'); // Filter by userId
    const bookId = searchParams.get('bookId'); // Filter by bookId
    const search = searchParams.get('search'); // Search by user name or email

    const skip = (page - 1) * limit;

    // Get all borrow records with optional filters
    const where: Prisma.BorrowRecordWhereInput = {
      isDeleted: false,
    };

    if (status && Object.values(BorrowStatus).includes(status as BorrowStatus)) {
      where.status = status as BorrowStatus;
    }

    if (userId) {
      const userIdNum = parseIntParam(userId, 0);
      if (userIdNum > 0) {
        where.userId = userIdNum;
      }
    }

    // Filter by bookId if provided
    if (bookId) {
      const bookIdNum = parseIntParam(bookId, 0);
      if (bookIdNum > 0) {
        where.borrowBooks = {
          some: {
            isDeleted: false,
            bookItem: {
              bookId: bookIdNum,
            },
          },
        };
      }
    }

    // Filter by user name or email if search query is provided
    if (search) {
      where.user = {
        OR: [{ fullName: { contains: search } }, { email: { contains: search } }],
        isDeleted: false,
      };
    }

    const [borrowRecordsRaw, total] = await Promise.all([
      prisma.borrowRecord.findMany({
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
              avatarUrl: true,
              violationPoints: true,
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
      }),
      prisma.borrowRecord.count({ where }),
    ]);

    // Transform borrow records
    const borrowRecords = borrowRecordsRaw.map(record => {
      return {
        ...record,
        status: record.status as BorrowStatus,
        user: record.user
          ? {
              id: record.user.id,
              fullName: record.user.fullName,
              email: record.user.email,
              avatarUrl: record.user.avatarUrl,
              violationPoints: record.user.violationPoints,
            }
          : undefined,
        borrowBooks: record.borrowBooks.map(bb => ({
          bookItem: {
            id: bb.bookItem.id,
            code: bb.bookItem.code,
            book: {
              id: bb.bookItem.book.id,
              title: bb.bookItem.book.title,
              isbn: bb.bookItem.book.isbn,
              coverImageUrl: bb.bookItem.book.coverImageUrl,
              publishYear: bb.bookItem.book.publishYear,
              author: {
                id: bb.bookItem.book.author.id,
                fullName: bb.bookItem.book.author.fullName,
              },
            },
          },
        })),
      };
    });

    return successResponse({
      borrowRecords,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleRouteError(error, 'GET /api/borrow-records/all');
  }
});
