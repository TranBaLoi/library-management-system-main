import { ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import {
  checkBookHasEbook,
  checkUserBorrowedEbook,
  handleRouteError,
  parseIntParam,
  successResponse,
  validateRequiredFields,
} from '@/lib/utils';
import { AuthenticatedRequest, requireReader } from '@/middleware/auth.middleware';
import { NotificationService } from '@/services';
import { GorseService } from '@/services/gorse.service';
import { BorrowRequestStatus } from '@/types/borrow-request';
import {
  EbookBorrowRequestResponse,
  EbookBorrowRequestsListResponse,
} from '@/types/ebook-borrow-request';
import { Prisma } from '@prisma/client';

// GET /api/ebook-borrow-requests - Get ebook borrow requests for the current user
export const GET = requireReader(async (request: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseIntParam(searchParams.get('page'), 1);
    const limit = parseIntParam(searchParams.get('limit'), 10);
    const status = searchParams.get('status');

    const skip = (page - 1) * limit;

    // Only get ebook borrow requests (requests with ebook items)
    const where: Prisma.BorrowRequestWhereInput = {
      userId: request.user.id,
      isDeleted: false,
      items: {
        some: {
          isDeleted: false,
          book: {
            bookEditions: {
              some: {
                fileFormat: 'PDF',
                isDeleted: false,
              },
            },
          },
        },
      },
    };

    if (status && Object.values(BorrowRequestStatus).includes(status as BorrowRequestStatus)) {
      where.status = status as BorrowRequestStatus;
    }

    const [borrowRequestsRaw, total] = await Promise.all([
      prisma.borrowRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
        },
      }),
      prisma.borrowRequest.count({ where }),
    ]);

    // Transform to include book information
    const borrowRequests = borrowRequestsRaw.map(req => ({
      ...req,
      status: req.status as BorrowRequestStatus,
      items: req.items.map(item => ({
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
      })),
    }));

    return successResponse<EbookBorrowRequestsListResponse>({
      borrowRequests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleRouteError(error, 'GET /api/ebook-borrow-requests');
  }
});

// POST /api/ebook-borrow-requests - Create ebook borrow request (auto-approve and fulfill)
export const POST = requireReader(async (request: AuthenticatedRequest) => {
  try {
    const body = await request.json();
    const { userId, bookId, startDate, endDate } = body;

    // Validate required fields
    const validationError = validateRequiredFields(body, [
      'userId',
      'bookId',
      'startDate',
      'endDate',
    ]);
    if (validationError) {
      throw new ValidationError(validationError);
    }

    const userIdNum = typeof userId === 'string' ? parseIntParam(userId, 0) : Number(userId);
    if (!userIdNum || userIdNum <= 0) {
      throw new ValidationError('Invalid userId');
    }

    // Verify user exists and is the authenticated user
    if (userIdNum !== request.user.id) {
      throw new ValidationError('User ID does not match authenticated user');
    }

    const bookIdNum = typeof bookId === 'string' ? parseIntParam(bookId, 0) : Number(bookId);
    if (!bookIdNum || bookIdNum <= 0) {
      throw new ValidationError('Invalid bookId');
    }

    // 1. Check if book has ebook (PDF edition)
    const hasEbook = await checkBookHasEbook(bookIdNum);
    if (!hasEbook) {
      throw new ValidationError('This book does not have an electronic version');
    }

    // 2. Check if user already borrowed this ebook
    const alreadyBorrowed = await checkUserBorrowedEbook(userIdNum, bookIdNum);
    if (alreadyBorrowed) {
      throw new ValidationError(
        'You have already borrowed this ebook. Please return it before borrowing again.'
      );
    }

    // Parse dates
    const borrowStartDate = new Date(startDate);
    const borrowEndDate = new Date(endDate);

    if (isNaN(borrowStartDate.getTime()) || isNaN(borrowEndDate.getTime())) {
      throw new ValidationError('Invalid date format');
    }

    // Check date validation
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDateOnly = new Date(borrowStartDate);
    startDateOnly.setHours(0, 0, 0, 0);

    if (startDateOnly < today) {
      throw new ValidationError('Start date cannot be in the past');
    }

    if (borrowEndDate < borrowStartDate) {
      throw new ValidationError('End date must be after start date');
    }

    // Check 30 days limit
    const diffTime = borrowEndDate.getTime() - borrowStartDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    if (diffDays > 30) {
      throw new ValidationError('Borrow period cannot exceed 30 days');
    }

    // Verify book exists
    const book = await prisma.book.findFirst({
      where: {
        id: bookIdNum,
        isDeleted: false,
      },
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
    });

    if (!book) {
      throw new ValidationError(`Book with id ${bookIdNum} not found`);
    }

    // Use transaction for all database operations
    const result = await prisma.$transaction(async tx => {
      // 1. Create BorrowRecord immediately (ebook is auto-approved and fulfilled)
      const borrowRecord = await tx.borrowRecord.create({
        data: {
          userId: userIdNum,
          borrowDate: borrowStartDate,
          returnDate: borrowEndDate,
          status: 'BORROWED',
        },
      });

      // 2. Create BorrowEbook (link book with BorrowRecord)
      await tx.borrowEbook.create({
        data: {
          borrowId: borrowRecord.id,
          bookId: bookIdNum,
        },
      });

      // 3. Create BorrowRequest with FULFILLED status (ebook is auto-approved and fulfilled)
      const borrowRequest = await tx.borrowRequest.create({
        data: {
          userId: userIdNum,
          startDate: borrowStartDate,
          endDate: borrowEndDate,
          status: BorrowRequestStatus.FULFILLED, // Directly FULFILLED for ebook
          items: {
            create: {
              bookId: bookIdNum,
              quantity: 1, // Always 1 for ebook
              startDate: borrowStartDate,
              endDate: borrowEndDate,
            },
          },
        },
        include: {
          items: {
            include: {
              book: {
                include: {
                  author: true,
                },
              },
            },
          },
        },
      });

      return {
        borrowRequest: {
          ...borrowRequest,
          items: borrowRequest.items.map(item => ({
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
          })),
        },
        borrowRecord,
      };
    });

    // Send "borrow" feedback to Gorse (non-blocking)
    try {
      const feedback = GorseService.createFeedback(userIdNum, bookIdNum, 'borrow', {
        timestamp: result.borrowRequest.createdAt,
      });
      await GorseService.insertFeedback([feedback]);
    } catch (error) {
      // Log error but don't fail the request if Gorse is unavailable
      console.error('Failed to send feedback to Gorse:', error);
    }

    // Send notification
    await NotificationService.queueNotification({
      userId: userIdNum,
      title: 'Ebook Borrowed Successfully',
      message: `You have successfully borrowed "${book.title}" (PDF). You can read it now. Return date: ${borrowEndDate.toLocaleDateString()}`,
      type: 'SYSTEM',
    });

    const message = `Ebook "${book.title}" borrowed successfully. You can read it now.`;

    return successResponse<EbookBorrowRequestResponse>(
      {
        borrowRequest: result.borrowRequest,
        borrowRecord: {
          id: result.borrowRecord.id,
          status: result.borrowRecord.status,
          borrowDate: result.borrowRecord.borrowDate,
          returnDate: result.borrowRecord.returnDate!,
        },
        message,
      },
      message,
      201
    );
  } catch (error) {
    return handleRouteError(error, 'POST /api/ebook-borrow-requests');
  }
});
