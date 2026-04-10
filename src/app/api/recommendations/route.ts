import { prisma } from '@/lib/prisma';
import { handleRouteError, successResponse } from '@/lib/utils';
import { requireAuth } from '@/middleware/auth.middleware';
import { GorseService } from '@/services/gorse.service';
import { BookWithAuthor } from '@/types/book';

/**
 * GET /api/recommendations
 * Get recommended books for the authenticated user from Gorse API
 */
export const GET = requireAuth(async request => {
  try {
    const userId = request.user.id;

    // Convert library user ID to Gorse user ID format
    const gorseUserId = GorseService.toGorseUserId(userId);

    // Call Gorse recommendation API
    const recommendedItemIds = await GorseService.getRecommendations(gorseUserId);

    if (!Array.isArray(recommendedItemIds) || recommendedItemIds.length === 0) {
      return successResponse<BookWithAuthor[]>([]);
    }

    // Convert Gorse item IDs to library book IDs
    const bookIds = recommendedItemIds
      .map(itemId => GorseService.fromGorseItemId(itemId))
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

    // Maintain order from Gorse recommendations
    const bookMap = new Map(books.map(book => [book.id, book]));
    const orderedBooks = bookIds
      .map(id => bookMap.get(id))
      .filter((book): book is BookWithAuthor => book !== undefined);

    return successResponse<BookWithAuthor[]>(orderedBooks);
  } catch (error) {
    return handleRouteError(error, 'GET /api/recommendations');
  }
});
