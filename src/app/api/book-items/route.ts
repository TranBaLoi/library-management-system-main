import { ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import {
  handleRouteError,
  parseIntParam,
  parsePaginationParams,
  sanitizeString,
  successResponse,
  validateRequiredFields,
} from '@/lib/utils';
import { requireLibrarian } from '@/middleware/auth.middleware';
import {
  BookItem,
  BookItemWithBook,
  BookItemsListPayload,
  CreateBookItemData,
} from '@/types/book-item';
import { Condition, ItemStatus, Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';

// GET /api/book-items - Get book items
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, search } = parsePaginationParams(searchParams);

    // Optional filters
    const authorIdsParam = searchParams.getAll('authorIds');
    const bookIdsParam = searchParams.getAll('bookIds');
    const conditionsParam = searchParams.getAll('conditions');
    const statusesParam = searchParams.getAll('statuses');
    const acquisitionDateFromParam = searchParams.get('acquisitionDateFrom');
    const acquisitionDateToParam = searchParams.get('acquisitionDateTo');
    const sortBy = searchParams.get('sortBy');
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null;
    const searchByCodeOnly = searchParams.get('searchByCodeOnly') === 'true';

    const authorIds =
      authorIdsParam.length > 0
        ? authorIdsParam.map(id => parseIntParam(id, 0)).filter(id => id > 0)
        : [];
    const bookIds =
      bookIdsParam.length > 0
        ? bookIdsParam.map(id => parseIntParam(id, 0)).filter(id => id > 0)
        : [];
    const conditions =
      conditionsParam.length > 0
        ? (conditionsParam.filter(condition =>
            Object.values(Condition).includes(condition as Condition)
          ) as Condition[])
        : [];
    const statuses =
      statusesParam.length > 0
        ? (statusesParam.filter(status =>
            Object.values(ItemStatus).includes(status as ItemStatus)
          ) as ItemStatus[])
        : [];

    const where: Prisma.BookItemWhereInput = {
      isDeleted: false,
    };

    if (search) {
      if (searchByCodeOnly) {
        where.code = { contains: search };
      } else {
        where.OR = [
          { code: { contains: search } },
          { book: { title: { contains: search } } },
          { book: { isbn: { contains: search } } },
          { book: { author: { fullName: { contains: search } } } },
        ];
      }
    }

    // Handle author filter
    if (authorIds.length > 0) {
      where.book = {
        authorId: { in: authorIds },
      };
    }

    // Handle book filter
    if (bookIds.length > 0) {
      where.bookId = { in: bookIds };
    }

    // Handle condition filter
    if (conditions.length > 0) {
      where.condition = { in: conditions };
    }

    // Handle status filter
    if (statuses.length > 0) {
      where.status = { in: statuses };
    }

    // Handle acquisition date range filter
    if (acquisitionDateFromParam) {
      const fromDate = new Date(acquisitionDateFromParam);
      if (!isNaN(fromDate.getTime())) {
        where.acquisitionDate = { gte: fromDate };
      }
    }
    if (acquisitionDateToParam) {
      const toDate = new Date(acquisitionDateToParam);
      if (!isNaN(toDate.getTime())) {
        const existingAcquisitionDate = where.acquisitionDate as Prisma.DateTimeFilter | undefined;
        where.acquisitionDate = {
          ...existingAcquisitionDate,
          lte: toDate,
        };
      }
    }

    const skip = (page - 1) * limit;

    // Build orderBy clause
    let orderBy: Prisma.BookItemOrderByWithRelationInput = { createdAt: 'desc' };

    if (sortBy && sortOrder) {
      // Map frontend sort keys to database fields
      const sortFieldMap: Record<string, string> = {
        id: 'id',
        code: 'code',
        condition: 'condition',
        status: 'status',
        acquisitionDate: 'acquisitionDate',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
        bookId: 'bookId',
      };

      const dbField = sortFieldMap[sortBy];
      if (dbField) {
        orderBy = { [dbField]: sortOrder };
      }
    }

    const [bookItemsRaw, total] = await Promise.all([
      prisma.bookItem.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          bookId: true,
          code: true,
          condition: true,
          status: true,
          acquisitionDate: true,
          createdAt: true,
          updatedAt: true,
          isDeleted: true,
          book: {
            select: {
              id: true,
              title: true,
              isbn: true,
              coverImageUrl: true,
              author: {
                select: {
                  id: true,
                  fullName: true,
                },
              },
            },
          },
        },
      }),
      prisma.bookItem.count({ where }),
    ]);

    const bookItems = bookItemsRaw as unknown as BookItemWithBook[];

    return successResponse<BookItemsListPayload>({
      bookItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleRouteError(error, 'GET /api/book-items');
  }
}

// POST /api/book-items - Create book item
export const POST = requireLibrarian(async request => {
  try {
    const body: CreateBookItemData = await request.json();
    const { bookId, code, condition, status, acquisitionDate, isDeleted } = body;

    // Validate required fields
    const validationError = validateRequiredFields(body as unknown as Record<string, unknown>, [
      'bookId',
      'code',
      'condition',
    ]);
    if (validationError) {
      throw new ValidationError(validationError);
    }

    const bookIdNum = typeof bookId === 'string' ? parseIntParam(bookId, 0) : Number(bookId);
    if (!bookIdNum || bookIdNum <= 0) {
      throw new ValidationError('Invalid bookId');
    }

    // Check if book exists
    const bookExists = await prisma.book.findUnique({
      where: { id: bookIdNum },
      select: { id: true },
    });
    if (!bookExists) {
      throw new ValidationError('Book not found');
    }

    // Check if code already exists
    const existingCode = await prisma.bookItem.findUnique({
      where: { code: sanitizeString(code) },
      select: { id: true },
    });
    if (existingCode) {
      throw new ValidationError('Book copy code already exists');
    }

    // Prepare data
    const data: Prisma.BookItemUncheckedCreateInput = {
      bookId: bookIdNum,
      code: sanitizeString(code),
      condition: condition as Condition,
      status: (status as ItemStatus) || ItemStatus.AVAILABLE,
      acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : null,
      isDeleted: Boolean(isDeleted),
    };

    const created: BookItem = await prisma.bookItem.create({
      data,
      select: {
        id: true,
        bookId: true,
        code: true,
        condition: true,
        status: true,
        acquisitionDate: true,
        createdAt: true,
        updatedAt: true,
        isDeleted: true,
      },
    });

    return successResponse<BookItem>(created, 'Book item created successfully', 201);
  } catch (error) {
    return handleRouteError(error, 'POST /api/book-items');
  }
});
