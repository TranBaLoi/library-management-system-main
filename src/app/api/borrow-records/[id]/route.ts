import { NotFoundError, ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { handleRouteError, parseIntParam, successResponse } from '@/lib/utils';
import { AuthenticatedRequest, requireAuth } from '@/middleware/auth.middleware';
import { BorrowStatus } from '@/types/borrow-record';
import { Role } from '@prisma/client';

// GET /api/borrow-records/[id] - Get borrow record by id
export const GET = requireAuth(async (request: AuthenticatedRequest, context?: unknown) => {
  try {
    const { params } = context as { params: Promise<{ id: string }> };
    const { id } = await params;
    const borrowRecordId = parseIntParam(id);

    if (borrowRecordId <= 0) {
      throw new ValidationError('Invalid borrow record ID');
    }

    const whereClause: {
      id: number;
      isDeleted: boolean;
      userId?: number;
    } = {
      id: borrowRecordId,
      isDeleted: false,
    };

    if (request.user.role === Role.READER) {
      whereClause.userId = request.user.id;
    }

    const borrowRecordRaw = await prisma.borrowRecord.findFirst({
      where: whereClause,
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
        payments: {
          where: { isDeleted: false },
          include: {
            policy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!borrowRecordRaw) {
      throw new NotFoundError('Borrow record not found');
    }

    // Transform borrow record
    const borrowRecord = {
      ...borrowRecordRaw,
      status: borrowRecordRaw.status as BorrowStatus,
      user: borrowRecordRaw.user
        ? {
            id: borrowRecordRaw.user.id,
            fullName: borrowRecordRaw.user.fullName,
            email: borrowRecordRaw.user.email,
            avatarUrl: borrowRecordRaw.user.avatarUrl,
            violationPoints: borrowRecordRaw.user.violationPoints,
          }
        : undefined,
      borrowBooks: borrowRecordRaw.borrowBooks.map(bb => ({
        bookItem: {
          id: bb.bookItem.id,
          code: bb.bookItem.code,
          condition: bb.bookItem.condition,
          book: {
            id: bb.bookItem.book.id,
            title: bb.bookItem.book.title,
            isbn: bb.bookItem.book.isbn,
            coverImageUrl: bb.bookItem.book.coverImageUrl,
            publishYear: bb.bookItem.book.publishYear,
            price: bb.bookItem.book.price,
            author: {
              id: bb.bookItem.book.author.id,
              fullName: bb.bookItem.book.author.fullName,
            },
          },
        },
      })),
      borrowEbooks: borrowRecordRaw.borrowEbooks.map(be => ({
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
      payments: borrowRecordRaw.payments.map(payment => ({
        id: payment.id,
        policyId: payment.policyId,
        amount: payment.amount,
        isPaid: payment.isPaid,
        paidAt: payment.paidAt,
        dueDate: payment.dueDate,
        createdAt: payment.createdAt,
        policy: payment.policy
          ? {
              id: payment.policy.id,
              name: payment.policy.name,
            }
          : undefined,
      })),
    };

    return successResponse(borrowRecord);
  } catch (error) {
    return handleRouteError(error, 'GET /api/borrow-records/[id]');
  }
});
