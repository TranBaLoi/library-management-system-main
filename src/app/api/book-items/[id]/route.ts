import { NotFoundError, ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { handleRouteError, parseIntParam, sanitizeString, successResponse } from '@/lib/utils';
import { requireLibrarian } from '@/middleware/auth.middleware';
import { BookItem, UpdateBookItemData } from '@/types/book-item';
import { Condition, ItemStatus, Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';

// GET /api/book-items/[id] - Get book item by id
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const bookItemId = parseIntParam(id);

    if (bookItemId <= 0) {
      throw new ValidationError('Invalid book copy ID');
    }

    const bookItem: BookItem | null = await prisma.bookItem.findFirst({
      where: {
        id: bookItemId,
        isDeleted: false,
      },
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

    if (!bookItem) {
      throw new NotFoundError('Book copy not found');
    }

    return successResponse(bookItem);
  } catch (error) {
    return handleRouteError(error, 'GET /api/book-items/[id]');
  }
}

// PUT /api/book-items/[id] - Update book item
export const PUT = requireLibrarian(async (request, context) => {
  const { params } = context as { params: Promise<{ id: string }> };
  try {
    const { id } = await params;
    const bookItemId = parseIntParam(id);

    if (bookItemId <= 0) {
      throw new ValidationError('Invalid book copy ID');
    }

    const body: UpdateBookItemData = await request.json();
    const { bookId, code, condition, status, acquisitionDate, isDeleted } = body;

    const updateData: Prisma.BookItemUncheckedUpdateInput = {};

    if (bookId !== undefined) {
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

      updateData.bookId = bookIdNum;
    }

    if (code !== undefined) {
      const sanitizedCode = sanitizeString(code);

      // Check if code already exists (excluding current book item)
      const existingCode = await prisma.bookItem.findFirst({
        where: {
          code: sanitizedCode,
          id: { not: bookItemId },
        },
        select: { id: true },
      });
      if (existingCode) {
        throw new ValidationError('Book copy code already exists');
      }

      updateData.code = sanitizedCode;
    }

    if (condition !== undefined) updateData.condition = condition as Condition;
    if (status !== undefined) updateData.status = status as ItemStatus;
    if (acquisitionDate !== undefined) {
      updateData.acquisitionDate = acquisitionDate ? new Date(acquisitionDate) : null;
    }
    if (isDeleted !== undefined) updateData.isDeleted = Boolean(isDeleted);

    // Ensure book item exists
    const existing = await prisma.bookItem.findFirst({
      where: {
        id: bookItemId,
        isDeleted: false,
      },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundError('Book copy not found');
    }

    const updated: BookItem = await prisma.bookItem.update({
      where: { id: bookItemId },
      data: updateData,
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

    return successResponse<BookItem>(updated, 'Book copy updated successfully');
  } catch (error) {
    return handleRouteError(error, 'PUT /api/book-items/[id]');
  }
});

// DELETE /api/book-items/[id] - Delete book item (soft delete)
export const DELETE = requireLibrarian(async (request, context) => {
  const { params } = context as { params: Promise<{ id: string }> };
  try {
    const { id } = await params;
    const bookItemId = parseIntParam(id);

    if (bookItemId <= 0) {
      throw new ValidationError('Invalid book copy ID');
    }

    // Ensure book item exists
    const existing = await prisma.bookItem.findFirst({
      where: {
        id: bookItemId,
        isDeleted: false,
      },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundError('Book copy not found');
    }

    await prisma.bookItem.update({
      where: { id: bookItemId },
      data: { isDeleted: true },
    });

    return successResponse<null>(null, 'Book copy deleted successfully');
  } catch (error) {
    return handleRouteError(error, 'DELETE /api/book-items/[id]');
  }
});
