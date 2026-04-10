import { NotFoundError, ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { handleRouteError, parseIntParam, sanitizeString, successResponse } from '@/lib/utils';
import { requireAuth } from '@/middleware/auth.middleware';
import { ReviewWithUser, UpdateReviewData } from '@/types/review';
import { Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';

// GET /api/reviews/[id] - Get review by id
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const reviewId = parseIntParam(id);

    if (reviewId <= 0) {
      throw new ValidationError('Invalid review ID');
    }

    const review = await prisma.review.findFirst({
      where: { id: reviewId, isDeleted: false },
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
        book: {
          select: {
            id: true,
            title: true,
            coverImageUrl: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundError('Review not found');
    }

    return successResponse<ReviewWithUser>(review);
  } catch (error) {
    return handleRouteError(error, 'GET /api/reviews/[id]');
  }
}

// PUT /api/reviews/[id] - Update review
export const PUT = requireAuth(async (request, context) => {
  const { params } = context as { params: Promise<{ id: string }> };
  try {
    const { id } = await params;
    const reviewId = parseIntParam(id);

    if (reviewId <= 0) {
      throw new ValidationError('Invalid review ID!');
    }

    const body: UpdateReviewData = await request.json();
    const { rating, reviewText, reviewDate, isDeleted } = body;

    const updateData: Prisma.ReviewUncheckedUpdateInput = {};

    if (rating !== undefined) {
      const ratingNum = typeof rating === 'string' ? parseIntParam(rating, 0) : Number(rating);
      if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
        throw new ValidationError('Rating must be between 1 and 5!');
      }
      updateData.rating = ratingNum;
    }

    if (reviewText !== undefined) {
      updateData.reviewText = reviewText ? sanitizeString(reviewText) : null;
    }

    if (reviewDate !== undefined) {
      updateData.reviewDate = reviewDate ? new Date(reviewDate) : null;
    }

    if (isDeleted !== undefined) {
      updateData.isDeleted = Boolean(isDeleted);
    }

    // Ensure review exists
    const existing = await prisma.review.findFirst({
      where: { id: reviewId, isDeleted: false },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundError('Review not found!');
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: updateData,
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

    return successResponse<ReviewWithUser>(updated, 'Review updated successfully!');
  } catch (error) {
    return handleRouteError(error, 'PUT /api/reviews/[id]');
  }
});

// DELETE /api/reviews/[id] - Delete review (soft delete)
export const DELETE = requireAuth(async (request, context) => {
  const { params } = context as { params: Promise<{ id: string }> };
  try {
    const { id } = await params;
    const reviewId = parseIntParam(id);

    if (reviewId <= 0) {
      throw new ValidationError('Invalid review ID!');
    }

    const existing = await prisma.review.findFirst({
      where: { id: reviewId, isDeleted: false },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundError('Review not found!');
    }

    await prisma.review.update({
      where: { id: reviewId },
      data: { isDeleted: true },
    });

    return successResponse(null, 'Review deleted successfully!');
  } catch (error) {
    return handleRouteError(error, 'DELETE /api/reviews/[id]');
  }
});
