import { prisma } from '@/lib/prisma';
import { handleRouteError, parseIntParam, successResponse } from '@/lib/utils';
import { GorseService } from '@/services/gorse.service';
import { BookWithAuthor } from '@/types/book';
import { NextRequest } from 'next/server';

/**
 * GET /api/books/[id]/neighbors
 * Get similar/neighbor books for a specific book from Gorse API
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const bookId = parseIntParam(id);

    if (bookId <= 0) {
      throw new Error('Invalid book ID');
    }

    const { searchParams } = new URL(request.url);

    // Optional query parameters
    const nParam = searchParams.get('n');
    const offsetParam = searchParams.get('offset');

    const n = nParam ? parseInt(nParam, 10) : undefined;
    const offset = offsetParam ? parseInt(offsetParam, 10) : undefined;

    // Convert library book ID to Gorse item ID format
    const gorseItemId = GorseService.toGorseItemId(bookId);

    // Call Gorse neighbors API
    const neighborItems = await GorseService.getItemNeighbors(gorseItemId, n, offset);

    if (!Array.isArray(neighborItems) || neighborItems.length === 0) {
      return successResponse<BookWithAuthor[]>([]);
    }

    // Convert Gorse item IDs to library book IDs
    const neighborBookIds = neighborItems
      .map(item => GorseService.fromGorseItemId(item.Id))
      .filter((id): id is number => id !== null);

    if (neighborBookIds.length === 0) {
      return successResponse<BookWithAuthor[]>([]);
    }

    // Fetch books from database
    const booksRaw = await prisma.book.findMany({
      where: {
        id: { in: neighborBookIds },
        isDeleted: false,
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
        author: {
          select: {
            id: true,
            fullName: true,
          },
        },
        bookCategories: {
          select: {
            category: {
              select: {
                name: true,
              },
            },
          },
        },
        bookEditions: {
          select: {
            format: true,
            id: true,
          },
        },
        _count: {
          select: {
            bookItems: true,
          },
        },
        reviews: {
          where: {
            isDeleted: false,
          },
          select: {
            rating: true,
          },
        },
      },
    });

    // Calculate average rating for each book
    const books = booksRaw.map(book => {
      const ratings = book.reviews.map(r => r.rating);
      const averageRating =
        ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0;

      // Transform to BookWithAuthor format
      const bookWithAuthor: BookWithAuthor = {
        id: book.id,
        authorId: book.authorId,
        title: book.title,
        isbn: book.isbn,
        publishYear: book.publishYear,
        publisher: book.publisher,
        pageCount: book.pageCount,
        price: book.price,
        edition: book.edition,
        description: book.description,
        coverImageUrl: book.coverImageUrl,
        language: book.language,
        isDeleted: book.isDeleted,
        createdAt: book.createdAt,
        updatedAt: book.updatedAt,
        author: book.author,
        categories: book.bookCategories.map(bc => bc.category.name),
        bookEbookCount: book.bookEditions.filter(e => e.format === 'EBOOK').length,
        bookAudioCount: book.bookEditions.filter(e => e.format === 'AUDIO').length,
        bookItemsCount: book._count.bookItems,
        averageRating,
      };

      return bookWithAuthor;
    });

    // Maintain order from Gorse neighbors (by Score, descending)
    const bookMap = new Map(books.map(book => [book.id, book]));
    const orderedBooks = neighborItems
      .map(item => {
        const neighborBookId = GorseService.fromGorseItemId(item.Id);
        return neighborBookId !== null ? bookMap.get(neighborBookId) : null;
      })
      .filter((book): book is BookWithAuthor => book !== undefined);

    return successResponse<BookWithAuthor[]>(orderedBooks);
  } catch (error) {
    return handleRouteError(error, 'GET /api/books/[id]/neighbors');
  }
}
