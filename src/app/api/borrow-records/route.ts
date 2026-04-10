import { ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import {
  handleRouteError,
  parseIntParam,
  successResponse,
  validateRequiredFields,
} from '@/lib/utils';
import {
  AuthenticatedRequest,
  requireLibrarian,
  requireReader,
} from '@/middleware/auth.middleware';
import { GorseService } from '@/services/gorse.service';
import {
  BorrowStatus,
  CreateBorrowRecordData,
  CreateBorrowRecordResponse,
} from '@/types/borrow-record';
import { BorrowRequestStatus } from '@/types/borrow-request';
import { ItemStatus, Prisma } from '@prisma/client';

// GET /api/borrow-records - Get borrow records for the current user
export const GET = requireReader(async (request: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseIntParam(searchParams.get('page'), 1);
    const limit = parseIntParam(searchParams.get('limit'), 10);
    const status = searchParams.get('status'); // Filter by status

    const skip = (page - 1) * limit;

    // Only get borrow records for the current user
    const where: Prisma.BorrowRecordWhereInput = {
      userId: request.user.id,
      isDeleted: false,
    };

    if (status && Object.values(BorrowStatus).includes(status as BorrowStatus)) {
      where.status = status as BorrowStatus;
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
          borrowEbooks: {
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
        borrowEbooks: record.borrowEbooks.map(be => ({
          book: {
            id: be.book.id,
            title: be.book.title,
            isbn: be.book.isbn,
            coverImageUrl: be.book.coverImageUrl,
            publishYear: be.book.publishYear,
            author: {
              id: be.book.author.id,
              fullName: be.book.author.fullName,
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
    return handleRouteError(error, 'GET /api/borrow-records');
  }
});

// POST /api/borrow-records - Create borrow record
export const POST = requireLibrarian(async (request: AuthenticatedRequest) => {
  try {
    const body: CreateBorrowRecordData = await request.json();
    const { userId, borrowDate, returnDate, bookItemIds, requestIds } = body;

    // Validate required fields
    const validationError = validateRequiredFields(body as unknown as Record<string, unknown>, [
      'userId',
      'borrowDate',
      'returnDate',
      'bookItemIds',
    ]);
    if (validationError) {
      throw new ValidationError(validationError);
    }

    const userIdNum = typeof userId === 'string' ? parseIntParam(userId, 0) : Number(userId);
    if (!userIdNum || userIdNum <= 0) {
      throw new ValidationError('Invalid userId');
    }

    // Validate bookItemIds
    if (!Array.isArray(bookItemIds) || bookItemIds.length === 0) {
      throw new ValidationError('bookItemIds must be a non-empty array');
    }

    // Parse dates
    const borrowDateObj = new Date(borrowDate);
    const returnDateObj = new Date(returnDate);

    if (isNaN(borrowDateObj.getTime()) || isNaN(returnDateObj.getTime())) {
      throw new ValidationError('Invalid date format');
    }

    if (returnDateObj < borrowDateObj) {
      throw new ValidationError('Return date must be after borrow date');
    }

    // Check 30 days limit
    const diffTime = returnDateObj.getTime() - borrowDateObj.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    if (diffDays > 30) {
      throw new ValidationError('Borrow period cannot exceed 30 days');
    }

    // Verify user exists and is READER
    const user = await prisma.user.findFirst({
      where: {
        id: userIdNum,
        role: 'READER',
        isDeleted: false,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        avatarUrl: true,
        violationPoints: true,
      },
    });

    if (!user) {
      throw new ValidationError('User not found or is not a reader');
    }

    // Parse bookItemIds to numbers
    const bookItemIdsNum = bookItemIds.map(id =>
      typeof id === 'string' ? parseIntParam(id, 0) : Number(id)
    );

    // Validate all bookItemIds are valid
    if (bookItemIdsNum.some(id => !id || id <= 0)) {
      throw new ValidationError('Invalid bookItemId in bookItemIds array');
    }

    // Check for duplicates
    const uniqueIds = new Set(bookItemIdsNum);
    if (uniqueIds.size !== bookItemIdsNum.length) {
      throw new ValidationError('Duplicate bookItemIds are not allowed');
    }

    // Use transaction for all database operations
    const result = await prisma.$transaction(async tx => {
      // 1. Verify all book items exist, are available, and not deleted
      const bookItems = await tx.bookItem.findMany({
        where: {
          id: { in: bookItemIdsNum },
          isDeleted: false,
        },
        include: {
          book: {
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
          },
        },
      });

      if (bookItems.length !== bookItemIdsNum.length) {
        throw new ValidationError('One or more book items not found');
      }

      // Check all items are AVAILABLE
      const unavailableItems = bookItems.filter(item => item.status !== 'AVAILABLE');
      if (unavailableItems.length > 0) {
        const unavailableCodes = unavailableItems.map(item => item.code).join(', ');
        throw new ValidationError(
          `Book items are not available: ${unavailableCodes}. Current status: ${unavailableItems.map(i => i.status).join(', ')}`
        );
      }

      // 2. Create BorrowRecord
      const borrowRecord = await tx.borrowRecord.create({
        data: {
          userId: userIdNum,
          borrowDate: borrowDateObj,
          returnDate: returnDateObj,
          status: BorrowStatus.BORROWED,
        },
      });

      // 3. Create BorrowBook links and update BookItem status
      const borrowBooks = [];
      for (const bookItem of bookItems) {
        // Create BorrowBook link
        await tx.borrowBook.create({
          data: {
            borrowId: borrowRecord.id,
            bookItemId: bookItem.id,
          },
        });

        // Update BookItem status: AVAILABLE → ON_BORROW
        await tx.bookItem.update({
          where: { id: bookItem.id },
          data: { status: ItemStatus.ON_BORROW },
        });

        borrowBooks.push({
          bookItem: {
            id: bookItem.id,
            code: bookItem.code,
            book: bookItem.book,
          },
        });
      }

      // 4. If requestIds provided, update BorrowRequest status to FULFILLED
      const fulfilledRequests = [];
      if (requestIds && Array.isArray(requestIds) && requestIds.length > 0) {
        const requestIdsNum = requestIds.map(id =>
          typeof id === 'string' ? parseIntParam(id, 0) : Number(id)
        );

        // Find and update matching APPROVED requests for this user
        const requestsToUpdate = await tx.borrowRequest.findMany({
          where: {
            id: { in: requestIdsNum },
            userId: userIdNum,
            status: BorrowRequestStatus.APPROVED,
            isDeleted: false,
          },
          include: {
            items: {
              where: { isDeleted: false },
            },
          },
        });

        for (const request of requestsToUpdate) {
          // Check if all items in this request can be fulfilled by the selected book items
          let canFulfill = true;
          const bookItemCounts = new Map<number, number>();

          // Count how many items of each book have been selected
          for (const bookItem of bookItems) {
            bookItemCounts.set(bookItem.bookId, (bookItemCounts.get(bookItem.bookId) || 0) + 1);
          }

          // Check if request items can be fulfilled
          for (const item of request.items) {
            const availableCount = bookItemCounts.get(item.bookId) || 0;
            if (availableCount < item.quantity) {
              canFulfill = false;
              break;
            }
            // Subtract the quantity used for this request item
            bookItemCounts.set(item.bookId, availableCount - item.quantity);
          }

          if (canFulfill) {
            // Update request status to FULFILLED
            await tx.borrowRequest.update({
              where: { id: request.id },
              data: { status: BorrowRequestStatus.FULFILLED },
            });

            fulfilledRequests.push({
              id: request.id,
              status: BorrowRequestStatus.FULFILLED,
            });
          }
        }
      }

      // Return created borrow record with details
      return {
        borrowRecord: {
          id: borrowRecord.id,
          userId: borrowRecord.userId,
          borrowDate: borrowRecord.borrowDate,
          returnDate: borrowRecord.returnDate,
          actualReturnDate: borrowRecord.actualReturnDate,
          renewalCount: borrowRecord.renewalCount,
          status: BorrowStatus.BORROWED,
          createdAt: borrowRecord.createdAt,
          updatedAt: borrowRecord.updatedAt,
          isDeleted: borrowRecord.isDeleted,
          user,
          borrowBooks,
        },
        fulfilledRequests,
      };
    });

    // Send "borrow" feedback to Gorse for each book (non-blocking)
    try {
      // Get unique bookIds from the borrowed items
      const bookIds = new Set<number>();
      for (const bb of result.borrowRecord.borrowBooks) {
        if (bb.bookItem?.book?.id) {
          bookIds.add(bb.bookItem.book.id);
        }
      }

      if (bookIds.size > 0) {
        const feedbacks = Array.from(bookIds).map(bookId =>
          GorseService.createFeedback(userIdNum, bookId, 'borrow', {
            timestamp: result.borrowRecord.borrowDate,
          })
        );
        await GorseService.insertFeedback(feedbacks);
      }
    } catch (error) {
      // Log error but don't fail the request if Gorse is unavailable
      console.error('Failed to send borrow feedback to Gorse:', error);
    }

    return successResponse<CreateBorrowRecordResponse>(
      {
        borrowRecord: result.borrowRecord,
        fulfilledRequests:
          result.fulfilledRequests.length > 0 ? result.fulfilledRequests : undefined,
        message: 'Borrow record created successfully',
      },
      'Borrow record created successfully',
      201
    );
  } catch (error) {
    return handleRouteError(error, 'POST /api/borrow-records');
  }
});
