import { ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import {
  handleRouteError,
  parseIntParam,
  parsePaginationParams,
  successResponse,
  validateRequiredFields,
} from '@/lib/utils';
import { AuthenticatedRequest, requireAuth } from '@/middleware/auth.middleware';
import { GorseService } from '@/services/gorse.service';
import {
  CreateFavoriteBookData,
  DeleteFavoriteBookData,
  FavoriteBookResponse,
  FavoriteBookWithBook,
  FavoriteBooksListPayload,
} from '@/types/favorite-book';
import { Prisma } from '@prisma/client';

// GET /api/favorite-books - Get favorite books for current user
export const GET = requireAuth(async (request: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(request.url);

    // Check if checking favorite status for a specific book
    const bookIdParam = searchParams.get('bookId');
    if (bookIdParam) {
      const userId = request.user.id;
      const bookId = parseIntParam(bookIdParam);

      if (!bookId || bookId <= 0) {
        throw new ValidationError('Invalid bookId');
      }

      const favorite = await prisma.userFavoriteBook.findUnique({
        where: {
          userId_bookId: {
            userId,
            bookId,
          },
        },
      });

      return successResponse<{ isFavorite: boolean }>({
        isFavorite: !!favorite && !favorite.isDeleted,
      });
    }

    const { page, limit, search } = parsePaginationParams(searchParams);

    // Get userId from authenticated user
    const userId = request.user.id;

    const sortBy = searchParams.get('sortBy');
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

    const where: Prisma.UserFavoriteBookWhereInput = {
      userId,
      isDeleted: false,
    };

    // Add search filter for book title, author, or ISBN
    if (search) {
      where.book = {
        OR: [
          { title: { contains: search } },
          { isbn: { contains: search } },
          { author: { fullName: { contains: search } } },
        ],
        isDeleted: false,
      };
    } else {
      where.book = {
        isDeleted: false,
      };
    }

    const skip = (page - 1) * limit;

    // Build orderBy clause
    let orderBy: Prisma.UserFavoriteBookOrderByWithRelationInput = { createdAt: 'desc' };

    if (sortBy && sortOrder) {
      const sortFieldMap: Record<string, Prisma.UserFavoriteBookOrderByWithRelationInput> = {
        createdAt: { createdAt: sortOrder },
        bookTitle: { book: { title: sortOrder } },
        bookPublishYear: { book: { publishYear: sortOrder } },
        authorName: { book: { author: { fullName: sortOrder } } },
      };

      if (sortFieldMap[sortBy]) {
        orderBy = sortFieldMap[sortBy];
      }
    }

    const [favoriteBooksRaw, total] = await Promise.all([
      prisma.userFavoriteBook.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          userId: true,
          bookId: true,
          createdAt: true,
          updatedAt: true,
          book: {
            select: {
              id: true,
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
              author: {
                select: {
                  id: true,
                  fullName: true,
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
              reviews: {
                where: {
                  isDeleted: false,
                },
                select: {
                  rating: true,
                },
              },
            },
          },
        },
      }),
      prisma.userFavoriteBook.count({ where }),
    ]);

    // Transform favorite books to include calculated fields
    const favoriteBooks = (
      favoriteBooksRaw as unknown as (FavoriteBookWithBook & {
        book: FavoriteBookWithBook['book'] & {
          bookCategories?: { category: { name: string } }[];
          reviews?: { rating: number }[];
        };
      })[]
    ).map(favorite => {
      // Calculate averageRating from reviews
      const reviews = favorite.book.reviews || [];
      const averageRating =
        reviews.length > 0
          ? Math.round(
              (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10
            ) / 10
          : 0;

      // Map bookCategories to categories array
      const categories = favorite.book.bookCategories?.map(x => x.category.name) ?? [];

      return {
        ...favorite,
        book: {
          ...favorite.book,
          categories,
          averageRating,
        },
      };
    }) as FavoriteBookWithBook[];

    return successResponse<FavoriteBooksListPayload>({
      favoriteBooks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleRouteError(error, 'GET /api/favorite-books');
  }
});

// POST /api/favorite-books - Create favorite book
export const POST = requireAuth(async (request: AuthenticatedRequest) => {
  try {
    const body: CreateFavoriteBookData = await request.json();
    const { bookId } = body;

    // Validate required fields
    const validationError = validateRequiredFields(body as unknown as Record<string, unknown>, [
      'bookId',
    ]);
    if (validationError) {
      throw new ValidationError(validationError);
    }

    // Get userId from authenticated user
    const userId = request.user.id;

    // Parse and validate bookId
    const bookIdNum = typeof bookId === 'string' ? parseIntParam(bookId, 0) : Number(bookId);
    if (!bookIdNum || bookIdNum <= 0) {
      throw new ValidationError('Invalid bookId');
    }

    // Check if book exists
    const book = await prisma.book.findUnique({
      where: { id: bookIdNum, isDeleted: false },
    });

    if (!book) {
      throw new ValidationError('Book not found');
    }

    // Check if already favorited
    const existingFavorite = await prisma.userFavoriteBook.findUnique({
      where: {
        userId_bookId: {
          userId,
          bookId: bookIdNum,
        },
      },
    });

    if (existingFavorite) {
      throw new ValidationError('Book is already in favorites');
    }

    // Create new favorite
    const data: Prisma.UserFavoriteBookUncheckedCreateInput = {
      userId,
      bookId: bookIdNum,
    };

    const created = await prisma.userFavoriteBook.create({
      data,
    });

    // Send feedback to Gorse (non-blocking)
    try {
      const feedback = GorseService.createFeedback(userId, bookIdNum, 'like', {
        timestamp: created.createdAt,
      });
      await GorseService.insertFeedback([feedback]);
    } catch (error) {
      // Log error but don't fail the request if Gorse is unavailable
      console.error('Failed to send feedback to Gorse:', error);
    }

    return successResponse<FavoriteBookResponse>(
      {
        userId: created.userId,
        bookId: created.bookId,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
      'Book added to favorites successfully',
      201
    );
  } catch (error) {
    return handleRouteError(error, 'POST /api/favorite-books');
  }
});

// DELETE /api/favorite-books - Delete favorite book (hard delete)
export const DELETE = requireAuth(async (request: AuthenticatedRequest) => {
  try {
    const body: DeleteFavoriteBookData = await request.json();
    const { bookId } = body;

    // Validate required fields
    const validationError = validateRequiredFields(body as unknown as Record<string, unknown>, [
      'bookId',
    ]);
    if (validationError) {
      throw new ValidationError(validationError);
    }

    // Get userId from authenticated user
    const userId = request.user.id;

    // Parse and validate bookId
    const bookIdNum = typeof bookId === 'string' ? parseIntParam(bookId, 0) : Number(bookId);
    if (!bookIdNum || bookIdNum <= 0) {
      throw new ValidationError('Invalid bookId');
    }

    // Check if favorite exists
    const existingFavorite = await prisma.userFavoriteBook.findUnique({
      where: {
        userId_bookId: {
          userId,
          bookId: bookIdNum,
        },
      },
    });

    if (!existingFavorite) {
      throw new ValidationError('Favorite book not found');
    }

    // Hard delete the favorite
    await prisma.userFavoriteBook.delete({
      where: {
        userId_bookId: {
          userId,
          bookId: bookIdNum,
        },
      },
    });

    return successResponse(null, 'Book removed from favorites successfully', 200);
  } catch (error) {
    return handleRouteError(error, 'DELETE /api/favorite-books');
  }
});
