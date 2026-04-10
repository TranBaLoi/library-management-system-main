import { prisma } from '@/lib/prisma';
import { handleRouteError, successResponse } from '@/lib/utils';
import { GorseService } from '@/services/gorse.service';
import { BookWithAuthor } from '@/types/book';
import { NextRequest } from 'next/server';

/**
 * GET /api/latest
 * Get latest books from Gorse API
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Optional query parameters
    const nParam = searchParams.get('n');
    const offsetParam = searchParams.get('offset');

    const n = nParam ? parseInt(nParam, 10) : undefined;
    const offset = offsetParam ? parseInt(offsetParam, 10) : undefined;

    // Call Gorse latest items API
    const latestItems = await GorseService.getLatestItems(n, offset);

    if (!Array.isArray(latestItems) || latestItems.length === 0) {
      return successResponse<BookWithAuthor[]>([]);
    }

    // Convert Gorse item IDs to library book IDs
    const bookIds = latestItems
      .map(item => GorseService.fromGorseItemId(item.Id))
      .filter((id): id is number => id !== null);

    if (bookIds.length === 0) {
      return successResponse<BookWithAuthor[]>([]);
    }

    // Fetch books from database
    const booksRaw = await prisma.book.findMany({
      where: {
        id: { in: bookIds },
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

    // Maintain order from Gorse latest items (by Score, descending)
    const bookMap = new Map(books.map(book => [book.id, book]));
    const orderedBooks = latestItems
      .map(item => {
        const bookId = GorseService.fromGorseItemId(item.Id);
        return bookId !== null ? bookMap.get(bookId) : null;
      })
      .filter((book): book is BookWithAuthor => book !== undefined);

    return successResponse<BookWithAuthor[]>(orderedBooks);
  } catch (error) {
    return handleRouteError(error, 'GET /api/latest');
  }
}
