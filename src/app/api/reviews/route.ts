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
import { requireAuth } from '@/middleware/auth.middleware';
import { GorseService } from '@/services/gorse.service';
import { CreateReviewData, ReviewWithUser, ReviewsListPayload } from '@/types/review';
import { Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';

// GET /api/reviews - Get reviews
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);

    // Optional filters
    const userIdParam = searchParams.get('userId');
    const bookIdParam = searchParams.get('bookId');
    const ratingParam = searchParams.get('rating');
    const sortBy = searchParams.get('sortBy');
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null;
    const isDeletedParam = searchParams.get('isDeleted');

    const userId = userIdParam ? parseIntParam(userIdParam, 0) : undefined;
    const bookId = bookIdParam ? parseIntParam(bookIdParam, 0) : undefined;
    const rating = ratingParam ? parseIntParam(ratingParam, 0) : undefined;

    const where: Prisma.ReviewWhereInput = {
      ...(isDeletedParam === null || isDeletedParam === 'false' ? { isDeleted: false } : {}),
    };

    // Handle filters
    if (userId && userId > 0) {
      where.userId = userId;
    }

    if (bookId && bookId > 0) {
      where.bookId = bookId;
    }

    if (rating && rating >= 1 && rating <= 5) {
      where.rating = rating;
    }

    const skip = (page - 1) * limit;

    // Build orderBy clause
    let orderBy: Prisma.ReviewOrderByWithRelationInput = { createdAt: 'desc' };

    if (sortBy && sortOrder) {
      // Map frontend sort keys to database fields
      const sortFieldMap: Record<string, string> = {
        id: 'id',
        rating: 'rating',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
        reviewDate: 'reviewDate',
      };

      const dbField = sortFieldMap[sortBy];
      if (dbField) {
        orderBy = { [dbField]: sortOrder };
      }
    }

    const [reviewsRaw, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          userId: true,
          bookId: true,
          rating: true,
          reviewText: true,
          reviewDate: true,
          createdAt: true,
          updatedAt: true,
          isDeleted: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      }),
      prisma.review.count({ where }),
    ]);

    const reviews = reviewsRaw as ReviewWithUser[];

    return successResponse<ReviewsListPayload>({
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleRouteError(error, 'GET /api/reviews');
  }
}

// POST /api/reviews - Create review
export const POST = requireAuth(async request => {
  try {
    const body: CreateReviewData = await request.json();
    const { userId, bookId, rating, reviewText, reviewDate } = body;

    // Validate required fields
    const validationError = validateRequiredFields(body as unknown as Record<string, unknown>, [
      'userId',
      'bookId',
      'rating',
    ]);
    if (validationError) {
      throw new ValidationError(validationError);
    }

    const userIdNum = typeof userId === 'string' ? parseIntParam(userId, 0) : Number(userId);
    const bookIdNum = typeof bookId === 'string' ? parseIntParam(bookId, 0) : Number(bookId);
    const ratingNum = typeof rating === 'string' ? parseIntParam(rating, 0) : Number(rating);

    if (!userIdNum || userIdNum <= 0) {
      throw new ValidationError('Invalid userId!');
    }
    if (!bookIdNum || bookIdNum <= 0) {
      throw new ValidationError('Invalid bookId!');
    }
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
      throw new ValidationError('Rating must be between 1 and 5!');
    }

    // Check if user already reviewed this book
    const existingReview = await prisma.review.findFirst({
      where: {
        userId: userIdNum,
        bookId: bookIdNum,
        isDeleted: false,
      },
    });

    if (existingReview) {
      throw new ValidationError('User has already reviewed this book!');
    }

    // Verify book exists
    const book = await prisma.book.findFirst({
      where: { id: bookIdNum, isDeleted: false },
      select: { id: true },
    });

    if (!book) {
      throw new ValidationError('Book not found!');
    }

    // Verify user exists
    const user = await prisma.user.findFirst({
      where: { id: userIdNum, isDeleted: false },
      select: { id: true },
    });

    if (!user) {
      throw new ValidationError('User not found!');
    }

    // Prepare data
    const data: Prisma.ReviewUncheckedCreateInput = {
      userId: userIdNum,
      bookId: bookIdNum,
      rating: ratingNum,
      reviewText: reviewText ? sanitizeString(reviewText) : null,
      reviewDate: reviewDate ? new Date(reviewDate) : new Date(),
    };

    const created = await prisma.review.create({
      data,
      select: {
        id: true,
        userId: true,
        bookId: true,
        rating: true,
        reviewText: true,
        reviewDate: true,
        createdAt: true,
        updatedAt: true,
        isDeleted: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Send "star" feedback to Gorse for good ratings (non-blocking)
    // Include review text as comment in the feedback
    try {
      if (ratingNum >= 4) {
        const feedback = GorseService.createFeedback(userIdNum, bookIdNum, 'star', {
          comment: reviewText?.trim() || undefined,
          timestamp: created.reviewDate || created.createdAt,
        });
        await GorseService.insertFeedback([feedback]);
      }
    } catch (error) {
      // Log error but don't fail the request if Gorse is unavailable
      console.error('Failed to send feedback to Gorse:', error);
    }

    return successResponse<ReviewWithUser>(created, 'Review created successfully!', 201);
  } catch (error) {
    return handleRouteError(error, 'POST /api/reviews');
  }
});
