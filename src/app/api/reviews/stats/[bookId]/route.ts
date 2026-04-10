import { ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { handleRouteError, parseIntParam, successResponse } from '@/lib/utils';
import { ReviewStats } from '@/types/review';
import { NextRequest } from 'next/server';

// GET /api/reviews/stats/[bookId] - Get review statistics for a book
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params;
    const bookIdNum = parseIntParam(bookId);

    if (bookIdNum <= 0) {
      throw new ValidationError('Invalid book ID!');
    }

    // Verify book exists
    const book = await prisma.book.findFirst({
      where: { id: bookIdNum, isDeleted: false },
      select: { id: true },
    });

    if (!book) {
      throw new ValidationError('Book not found!');
    }

    // Get review statistics
    const [totalReviews, averageRating, ratingDistribution] = await Promise.all([
      // Total reviews count
      prisma.review.count({
        where: {
          bookId: bookIdNum,
          isDeleted: false,
        },
      }),

      // Average rating
      prisma.review.aggregate({
        where: {
          bookId: bookIdNum,
          isDeleted: false,
        },
        _avg: {
          rating: true,
        },
      }),

      // Rating distribution
      prisma.review.groupBy({
        by: ['rating'],
        where: {
          bookId: bookIdNum,
          isDeleted: false,
        },
        _count: {
          rating: true,
        },
        orderBy: {
          rating: 'desc',
        },
      }),
    ]);

    const avgRating = averageRating._avg.rating || 0;
    const total = totalReviews;

    // Calculate percentage for each rating
    const distribution = ratingDistribution.map(item => ({
      rating: item.rating,
      count: item._count.rating,
      percentage: total > 0 ? Math.round((item._count.rating / total) * 100) : 0,
    }));

    // Ensure all ratings 1-5 are present with 0 count if missing
    const completeDistribution = [];
    for (let rating = 5; rating >= 1; rating--) {
      const existing = distribution.find(d => d.rating === rating);
      completeDistribution.push(
        existing || {
          rating,
          count: 0,
          percentage: 0,
        }
      );
    }

    const stats: ReviewStats = {
      totalReviews: total,
      averageRating: Math.round(avgRating * 10) / 10, // Round to 1 decimal place
      ratingDistribution: completeDistribution,
    };

    return successResponse<ReviewStats>(stats, 'Review statistics fetched successfully!');
  } catch (error) {
    return handleRouteError(error, 'GET /api/reviews/stats/[bookId]');
  }
}
