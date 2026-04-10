import { ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { FileUtils } from '@/lib/server-utils';
import {
  handleRouteError,
  parseIntParam,
  parsePaginationParams,
  sanitizeString,
  successResponse,
  validateRequiredFields,
} from '@/lib/utils';
import { requireLibrarian } from '@/middleware/auth.middleware';
import { listBooks, transformBookData } from '@/services/book.service';
import { GorseService } from '@/services/gorse.service';
import { qdrantService } from '@/services/qdrant.service';
import { Book, BookFilterParams, BooksListPayload, CreateBookData } from '@/types/book';
import { Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';
import path from 'path';

// GET /api/books - Get books
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, search } = parsePaginationParams(searchParams);

    // Parse filter params
    const availableAtParam = searchParams.getAll('availableAt') as ('book-copy' | 'ebook')[];
    const params: BookFilterParams = {
      search,
      page,
      limit,
      authorIds: searchParams
        .getAll('authorIds')
        .map(id => parseIntParam(id, 0))
        .filter(id => id > 0),
      categoryIds: searchParams
        .getAll('categoryIds')
        .map(id => parseIntParam(id, 0))
        .filter(id => id > 0),
      languageCodes: searchParams
        .getAll('languageCodes')
        .map(code => sanitizeString(code))
        .filter(code => code.length > 0),
      publishYearFrom: parseIntParam(searchParams.get('publishYearFrom') || '', 0) || undefined,
      publishYearTo: parseIntParam(searchParams.get('publishYearTo') || '', 0) || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || undefined,
      isDeleted: searchParams.get('isDeleted') === 'true' ? true : null,
      availableAt: availableAtParam.length > 0 ? availableAtParam : undefined,
    };

    // Use standard text search (SQL LIKE)
    const result = await listBooks(params);

    const books = transformBookData(result.books as Parameters<typeof transformBookData>[0]);

    return successResponse<BooksListPayload>({
      books,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    return handleRouteError(error, 'GET /api/books');
  }
}

// POST /api/books - Create book
export const POST = requireLibrarian(async request => {
  try {
    const contentType = request.headers.get('content-type');
    let body: Partial<CreateBookData> = {};
    let bookIdForCover = null;

    // Check if it's multipart/form-data
    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();

      // Extract form fields
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
      body = {
        authorId: authorId || '',
        title: title || '',
        isbn: isbn || null,
        publishYear: publishYear || null,
        publisher: publisher || null,
        pageCount: pageCount || null,
        price: price || null,
        edition: edition || null,
        description: description || null,
        language: language || null,
        coverImageUrl: null,
        isDeleted: isDeleted === 'true',
        categories: categories ? JSON.parse(categories) : [],
      };

      // Handle cover image file upload - need to create book first to get ID
      const coverImageFile = formData.get('coverImage') as File | null;
      if (coverImageFile && coverImageFile.size > 0) {
        // Will handle after book creation
        bookIdForCover = coverImageFile;
      }
    } else {
      // Handle JSON request
      body = await request.json();
    }

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

    // Validate required fields
    const validationError = validateRequiredFields(
      body as CreateBookData & Record<string, unknown>,
      ['authorId', 'title']
    );
    if (validationError) {
      throw new ValidationError(validationError);
    }

    const authorIdNum =
      typeof authorId === 'string' ? parseIntParam(authorId, 0) : Number(authorId);
    if (!authorIdNum || authorIdNum <= 0) {
      throw new ValidationError('Invalid authorId');
    }

    // Prepare data
    const data: Prisma.BookUncheckedCreateInput = {
      authorId: authorIdNum,
      title: sanitizeString(title || ''),
      isbn: isbn ? sanitizeString(isbn) : null,
      publishYear: publishYear ? Number(publishYear) : null,
      publisher: publisher ? sanitizeString(publisher) : null,
      pageCount: pageCount ? Number(pageCount) : null,
      price: price ? Number(price) : null,
      edition: edition ? sanitizeString(edition) : null,
      description: description ? sanitizeString(description) : null,
      coverImageUrl: coverImageUrl ? sanitizeString(coverImageUrl) : null,
      language: language ? sanitizeString(language) : null,
      isDeleted: Boolean(isDeleted),
      bookCategories:
        categories && categories.length > 0
          ? {
              create: categories.map(categoryId => ({
                categoryId: Number(categoryId),
              })),
            }
          : undefined,
    };

    const created: Book = await prisma.book.create({
      data,
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
        isDeleted: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Sync book to Gorse as item (non-blocking)
    try {
      // Fetch book with author and categories for Gorse sync
      const bookForGorse = await prisma.book.findUnique({
        where: { id: created.id },
        select: {
          id: true,
          description: true,
          language: true,
          subtitle: true,
          createdAt: true,
          author: {
            select: {
              fullName: true,
            },
          },
          bookCategories: {
            where: { isDeleted: false },
            select: {
              category: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      if (bookForGorse) {
        const itemPayload = GorseService.createItemPayload(bookForGorse);
        await GorseService.insertItem(itemPayload);
      }
    } catch (error) {
      // Log error but don't fail the request if Gorse is unavailable
      console.error('Failed to sync book to Gorse:', error);
    }

    // Sync book to Qdrant vector store (non-blocking)
    qdrantService.syncBookToQdrantNonBlocking(created.id);

    // Handle cover image file upload if exists
    if (bookIdForCover && created) {
      const coverImageFile = bookIdForCover as File;

      // Validate file type
      const allowedImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const fileExtension = path.extname(coverImageFile.name).toLowerCase();

      if (allowedImageExtensions.includes(fileExtension)) {
        // Check file size (max 5MB)
        const maxImageSize = 5 * 1024 * 1024;
        if (coverImageFile.size <= maxImageSize) {
          // Generate unique filename
          const timestamp = Date.now();
          const sanitizedFileName = `cover-${created.id}-${timestamp}${fileExtension}`;

          // Convert File to Buffer
          const arrayBuffer = await coverImageFile.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Write file to uploads/book-covers directory
          const uploadResult = await FileUtils.writeFileToSystem(buffer, sanitizedFileName, {
            directory: 'uploads/book-covers',
            overwrite: true,
            createDirectory: true,
          });

          if (uploadResult.success) {
            // Update book with cover image URL
            const updatedBook = await prisma.book.update({
              where: { id: created.id },
              data: {
                coverImageUrl: `/api/files/uploads/book-covers/${sanitizedFileName}`,
              },
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
                isDeleted: true,
                createdAt: true,
                updatedAt: true,
              },
            });

            // Note: Gorse item sync already done above, no need to sync again
            return successResponse<Book>(updatedBook, 'Book created successfully', 201);
          }
        }
      }
    }

    return successResponse<Book>(created, 'Book created successfully', 201);
  } catch (error) {
    return handleRouteError(error, 'POST /api/books');
  }
});
