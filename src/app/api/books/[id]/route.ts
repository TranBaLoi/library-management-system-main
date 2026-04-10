import { NotFoundError, ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { FileUtils } from '@/lib/server-utils';
import { handleRouteError, parseIntParam, sanitizeString, successResponse } from '@/lib/utils';
import { optionalAuth, requireLibrarian } from '@/middleware/auth.middleware';
import { GorseService } from '@/services/gorse.service';
import { qdrantService } from '@/services/qdrant.service';
import { Book, BookDetail, UpdateBookData } from '@/types/book';
import { Prisma, Role } from '@prisma/client';
import path from 'path';

// GET /api/books/[id] - Get book by id
export const GET = optionalAuth(async (request, context) => {
  try {
    const { params } = context as { params: Promise<{ id: string }> };
    const { id } = await params;
    const bookId = parseIntParam(id);

    if (bookId <= 0) {
      throw new ValidationError('Invalid book ID');
    }

    const book = await prisma.book.findFirst({
      where: { id: bookId },
      select: {
        id: true,
        authorId: true,
        title: true,
        isbn: true,
        publishYear: true,
        publisher: true,
        pageCount: true,
        price: true,
        edition: true,
        description: true,
        coverImageUrl: true,
        language: true,
        createdAt: true,
        updatedAt: true,
        isDeleted: true,
        author: {
          select: {
            id: true,
            fullName: true,
          },
        },
        bookItems: {
          where: { isDeleted: false },
          select: {
            id: true,
            code: true,
            condition: true,
            status: true,
            acquisitionDate: true,
            createdAt: true,
            updatedAt: true,
            isDeleted: true,
          },
        },
        bookCategories: {
          where: { isDeleted: false },
          select: {
            categoryId: true,
            category: {
              select: {
                name: true,
              },
            },
          },
        },
        bookEditions: {
          where: { isDeleted: false },
          select: {
            id: true,
            format: true,
          },
        },
      },
    });

    if (!book) {
      throw new NotFoundError('Book not found');
    }

    // Calculate ebook and audio counts
    const ebookCount = book.bookEditions?.filter(e => e.format === 'EBOOK').length ?? 0;
    const audioCount = book.bookEditions?.filter(e => e.format === 'AUDIO').length ?? 0;

    // Extract categories from bookCategories
    const categories = book.bookCategories?.map(bc => bc.category.name).filter(Boolean) || [];

    // Transform bookCategories to match BookDetail type (only categoryId)
    const bookCategoriesForResponse =
      book.bookCategories?.map(bc => ({
        categoryId: bc.categoryId,
      })) || [];

    // Transform to BookDetail format (exclude bookEditions from response)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { bookEditions: _, ...bookWithoutEditions } = book;
    const bookDetail: BookDetail = {
      ...bookWithoutEditions,
      bookCategories: bookCategoriesForResponse,
      categories,
      bookEbookCount: ebookCount,
      bookAudioCount: audioCount,
    };

    // Send "view" feedback to Gorse only for READER users (non-blocking)
    // ADMIN and LIBRARIAN are managing books, not viewing for reading purposes
    if (request.user && request.user.role === Role.READER) {
      try {
        const feedback = GorseService.createFeedback(request.user.id, bookId, 'read', {
          timestamp: new Date(),
        });

        await GorseService.insertFeedback([feedback]);
      } catch (error) {
        // Log error but don't fail the request if Gorse is unavailable
        console.error('Failed to send feedback to Gorse:', error);
      }
    }

    return successResponse<BookDetail>(bookDetail);
  } catch (error) {
    return handleRouteError(error, 'GET /api/books/[id]');
  }
});

// PUT /api/books/[id] - Update book
export const PUT = requireLibrarian(async (request, context) => {
  const { params } = context as { params: Promise<{ id: string }> };
  try {
    const { id } = await params;
    const bookId = parseIntParam(id);

    if (bookId <= 0) {
      throw new ValidationError('Invalid book ID');
    }

    const contentType = request.headers.get('content-type');
    let body: Partial<UpdateBookData> = {};

    // Check if it's multipart/form-data
    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();

      // Handle cover image file upload
      const coverImageFile = formData.get('coverImage') as File | null;
      if (coverImageFile && coverImageFile.size > 0) {
        // Validate file type
        const allowedImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const fileExtension = path.extname(coverImageFile.name).toLowerCase();

        if (!allowedImageExtensions.includes(fileExtension)) {
          throw new ValidationError(
            `Invalid file type. Allowed types: ${allowedImageExtensions.join(', ')}`
          );
        }

        // Check file size (max 5MB)
        const maxImageSize = 5 * 1024 * 1024;
        if (coverImageFile.size > maxImageSize) {
          throw new ValidationError(`File too large. Max allowed: 5MB`);
        }

        // Generate unique filename
        const timestamp = Date.now();
        const sanitizedFileName = `cover-${bookId}-${timestamp}${fileExtension}`;

        // Convert File to Buffer
        const arrayBuffer = await coverImageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Write file to uploads/book-covers directory
        const uploadResult = await FileUtils.writeFileToSystem(buffer, sanitizedFileName, {
          directory: 'uploads/book-covers',
          overwrite: true,
          createDirectory: true,
        });

        if (!uploadResult.success) {
          throw new Error(`Failed to upload cover image: ${uploadResult.message}`);
        }

        // Delete old cover image if exists
        const existingBook = await prisma.book.findFirst({
          where: { id: bookId },
          select: { coverImageUrl: true },
        });

        if (existingBook?.coverImageUrl) {
          const oldImagePath = existingBook.coverImageUrl.replace('/api/files/', '');
          await FileUtils.deleteFileFromSystem(oldImagePath, {
            force: true,
            checkExists: true,
          });
        }

        // Set cover image URL
        body.coverImageUrl = `/api/files/uploads/book-covers/${sanitizedFileName}`;
      }

      // Extract other form fields
      const authorId = formData.get('authorId')?.toString();
      const title = formData.get('title')?.toString();
      const isbn = formData.get('isbn')?.toString();
      const publishYear = formData.get('publishYear')?.toString();
      const publisher = formData.get('publisher')?.toString();
      const pageCount = formData.get('pageCount')?.toString();
      const price = formData.get('price')?.toString();
      const edition = formData.get('edition')?.toString();
      const description = formData.get('description')?.toString();
      const language = formData.get('language')?.toString();
      const isDeleted = formData.get('isDeleted')?.toString();
      const categories = formData.get('categories')?.toString();

      // Build body object
      if (authorId) body.authorId = authorId;
      if (title) body.title = title;
      if (isbn !== undefined) body.isbn = isbn;
      if (publishYear) body.publishYear = publishYear;
      if (publisher !== undefined) body.publisher = publisher;
      if (pageCount) body.pageCount = pageCount;
      if (price) body.price = price;
      if (edition !== undefined) body.edition = edition;
      if (description !== undefined) body.description = description;
      if (language !== undefined) body.language = language;
      if (isDeleted !== undefined) body.isDeleted = isDeleted === 'true';
      if (categories) {
        try {
          body.categories = JSON.parse(categories);
        } catch {
          // Invalid JSON, ignore
        }
      }
    } else {
      // Handle JSON request
      body = await request.json();
    }

    // Extract fields from body
    const {
      authorId,
      title,
      isbn,
      publishYear,
      publisher,
      pageCount,
      price,
      edition,
      description,
      coverImageUrl,
      language,
      isDeleted,
      categories,
    } = body;

    const updateData: Prisma.BookUncheckedUpdateInput = {};
    if (authorId !== undefined) {
      const authorIdNum =
        typeof authorId === 'string' ? parseIntParam(authorId, 0) : Number(authorId);
      if (!authorIdNum || authorIdNum <= 0) {
        throw new ValidationError('Invalid authorId');
      }
      updateData.authorId = authorIdNum;
    }
    if (title !== undefined) updateData.title = sanitizeString(title);
    if (isbn !== undefined) updateData.isbn = isbn ? sanitizeString(isbn) : null;
    if (publishYear !== undefined)
      updateData.publishYear = publishYear ? Number(publishYear) : null;
    if (publisher !== undefined)
      updateData.publisher = publisher ? sanitizeString(publisher) : null;
    if (pageCount !== undefined) updateData.pageCount = pageCount ? Number(pageCount) : null;
    if (price !== undefined) updateData.price = price ? Number(price) : null;
    if (edition !== undefined) updateData.edition = edition ? sanitizeString(edition) : null;
    if (description !== undefined)
      updateData.description = description ? sanitizeString(description) : null;
    if (coverImageUrl !== undefined)
      updateData.coverImageUrl = coverImageUrl ? sanitizeString(coverImageUrl) : null;
    if (language !== undefined) updateData.language = language ? sanitizeString(language) : null;
    if (isDeleted !== undefined) updateData.isDeleted = Boolean(isDeleted);

    // Handle categories update
    if (categories !== undefined) {
      // Delete existing book categories
      await prisma.bookCategory.deleteMany({
        where: { bookId: bookId },
      });

      // Create new book categories if categories are provided
      if (categories && categories.length > 0) {
        updateData.bookCategories = {
          create: categories.map(categoryId => ({
            categoryId: Number(categoryId),
          })),
        };
      }
    }

    // Ensure book exists
    const existing = await prisma.book.findFirst({
      where: { id: bookId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundError('Book not found');
    }

    const updated: Book = await prisma.book.update({
      where: { id: bookId },
      data: updateData,
      select: {
        id: true,
        authorId: true,
        title: true,
        isbn: true,
        publishYear: true,
        publisher: true,
        pageCount: true,
        price: true,
        edition: true,
        description: true,
        coverImageUrl: true,
        language: true,
        createdAt: true,
        updatedAt: true,
        isDeleted: true,
      },
    });

    // Sync book to Qdrant vector store (non-blocking)
    // This will update the embedding or remove it if book is soft-deleted
    qdrantService.syncBookToQdrantNonBlocking(bookId);

    return successResponse<Book>(updated, 'Book updated successfully');
  } catch (error) {
    return handleRouteError(error, 'PUT /api/books/[id]');
  }
});

// DELETE /api/books/[id] - Delete book (soft delete)
export const DELETE = requireLibrarian(async (request, context) => {
  const { params } = context as { params: Promise<{ id: string }> };
  try {
    const { id } = await params;
    const bookId = parseIntParam(id);

    if (bookId <= 0) {
      throw new ValidationError('Invalid book ID');
    }

    const existing = await prisma.book.findFirst({
      where: { id: bookId, isDeleted: false },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundError('Book not found');
    }

    await prisma.book.update({
      where: { id: bookId },
      data: { isDeleted: true },
    });

    // Remove book from Qdrant vector store (non-blocking)
    qdrantService.removeBookFromQdrantNonBlocking(bookId);

    return successResponse(null, 'Book deleted successfully');
  } catch (error) {
    return handleRouteError(error, 'DELETE /api/books/[id]');
  }
});
