import { prisma } from '@/lib/prisma';
import { handleRouteError, parseIntParam, successResponse } from '@/lib/utils';
import { AuthenticatedRequest, requireReader } from '@/middleware/auth.middleware';
import { MyEbooksResponse } from '@/types/ebook-borrow-request';

// GET /api/my-ebooks - Get list of ebooks currently borrowed by user
export const GET = requireReader(async (request: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseIntParam(searchParams.get('page'), 1);
    const limit = parseIntParam(searchParams.get('limit'), 10);

    const skip = (page - 1) * limit;
    const now = new Date();

    // Get BorrowRecords with status BORROWED that have BorrowEbooks
    const [borrowRecordsRaw, total] = await Promise.all([
      prisma.borrowRecord.findMany({
        where: {
          userId: request.user.id,
          status: 'BORROWED',
          isDeleted: false,
          returnDate: { gte: now }, // Not expired
          borrowEbooks: {
            some: {
              isDeleted: false,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { borrowDate: 'desc' },
        include: {
          borrowEbooks: {
            where: { isDeleted: false },
            include: {
              book: {
                include: {
                  author: true,
                  bookEditions: {
                    where: {
                      fileFormat: 'PDF',
                      isDeleted: false,
                    },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      }),
      prisma.borrowRecord.count({
        where: {
          userId: request.user.id,
          status: 'BORROWED',
          isDeleted: false,
          returnDate: { gte: now },
          borrowEbooks: {
            some: {
              isDeleted: false,
            },
          },
        },
      }),
    ]);

    // Transform to MyEbookItem format
    const ebooks = borrowRecordsRaw.flatMap(record =>
      record.borrowEbooks.map(borrowEbook => {
        const returnDate = record.returnDate!;
        const daysRemaining = Math.ceil(
          (returnDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          borrowRecordId: record.id,
          bookId: borrowEbook.bookId,
          book: {
            id: borrowEbook.book.id,
            title: borrowEbook.book.title,
            isbn: borrowEbook.book.isbn,
            coverImageUrl: borrowEbook.book.coverImageUrl,
            publishYear: borrowEbook.book.publishYear,
            author: {
              id: borrowEbook.book.author.id,
              fullName: borrowEbook.book.author.fullName,
            },
            bookEditions: borrowEbook.book.bookEditions.map(edition => ({
              id: edition.id,
              fileFormat: edition.fileFormat,
              storageUrl: edition.storageUrl,
            })),
          },
          borrowDate: record.borrowDate,
          returnDate: returnDate,
          daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
        };
      })
    );

    return successResponse<MyEbooksResponse>({
      ebooks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleRouteError(error, 'GET /api/my-ebooks');
  }
});

