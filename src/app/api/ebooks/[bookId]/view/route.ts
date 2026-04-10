import { ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import {
  generateSignedUrl,
  handleRouteError,
  parseIntParam,
  successResponse,
} from '@/lib/utils';
import { AuthenticatedRequest, requireReader } from '@/middleware/auth.middleware';
import { EbookViewResponse } from '@/types/ebook-borrow-request';

// GET /api/ebooks/[bookId]/view - Get signed URL for viewing PDF
export const GET = requireReader(async (request: AuthenticatedRequest, context?: unknown) => {
  try {
    const { params } = context as { params: Promise<{ bookId: string }> };
    const { bookId: bookIdParam } = await params;
    const bookId = parseIntParam(bookIdParam);

    if (bookId <= 0) {
      throw new ValidationError('Invalid book ID');
    }

    // 1. Check if user has active BorrowRecord for this ebook
    const borrowRecord = await prisma.borrowRecord.findFirst({
      where: {
        userId: request.user.id,
        status: 'BORROWED',
        isDeleted: false,
        returnDate: { gte: new Date() }, // Not expired
        borrowEbooks: {
          some: {
            bookId: bookId,
            isDeleted: false,
          },
        },
      },
      include: {
        borrowEbooks: {
          where: { isDeleted: false },
          include: {
            book: {
              include: {
                bookEditions: {
                  where: {
                    fileFormat: 'PDF',
                    isDeleted: false,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!borrowRecord) {
      throw new ValidationError('You do not have permission to access this ebook');
    }

    // 2. Get BookEdition (PDF file)
    const borrowEbook = borrowRecord.borrowEbooks.find(be => be.bookId === bookId);
    if (!borrowEbook) {
      throw new ValidationError('You do not have permission to access this ebook');
    }

    const edition = borrowEbook.book.bookEditions[0];

    if (!edition || !edition.storageUrl) {
      throw new ValidationError('This book does not have a PDF file');
    }

    // 3. Generate signed URL (expires in 1 hour)
    const signedUrl = await generateSignedUrl(edition.storageUrl, {
      expiresIn: 3600, // 1 hour
      userId: request.user.id,
      bookId: bookId,
    });

    return successResponse<EbookViewResponse>({
      viewUrl: signedUrl,
      expiresAt: new Date(Date.now() + 3600 * 1000),
    });
  } catch (error) {
    return handleRouteError(error, 'GET /api/ebooks/[bookId]/view');
  }
});
