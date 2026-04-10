import { fetchWithAuth, getAccessToken, handleJson } from '@/lib/utils';
import {
  CreateReviewData,
  ReviewStats,
  ReviewWithUser,
  ReviewsListPayload,
  UpdateReviewData,
} from '@/types/review';

export class ReviewApi {
  // Create review
  static async createReview(data: CreateReviewData): Promise<ReviewWithUser> {
    const token = getAccessToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth('/api/reviews', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    return await handleJson<ReviewWithUser>(response);
  }

  // Get reviews
  static async getReviews(params?: {
    page?: number;
    limit?: number;
    userId?: number;
    bookId?: number;
    rating?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    isDeleted?: boolean;
  }): Promise<ReviewsListPayload> {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.userId) searchParams.set('userId', params.userId.toString());
    if (params?.bookId) searchParams.set('bookId', params.bookId.toString());
    if (params?.rating) searchParams.set('rating', params.rating.toString());
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params?.isDeleted !== undefined) searchParams.set('isDeleted', params.isDeleted.toString());

    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth(`/api/reviews?${searchParams.toString()}`, {
      method: 'GET',
      headers,
    });

    return await handleJson<ReviewsListPayload>(response);
  }

  // Get review by id
  static async getReviewById(id: number): Promise<ReviewWithUser> {
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth(`/api/reviews/${id}`, {
      method: 'GET',
      headers,
    });

    return await handleJson<ReviewWithUser>(response);
  }

  // Update review
  static async updateReview(id: number, data: UpdateReviewData): Promise<ReviewWithUser> {
    const token = getAccessToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth(`/api/reviews/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });

    return await handleJson<ReviewWithUser>(response);
  }

  // Delete review (soft delete)
  static async deleteReview(id: number): Promise<void> {
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth(`/api/reviews/${id}`, {
      method: 'DELETE',
      headers,
    });

    await handleJson<null>(response);
  }

  // Get review statistics for a book
  static async getReviewStats(bookId: number): Promise<ReviewStats> {
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth(`/api/reviews/stats/${bookId}`, {
      method: 'GET',
      headers,
    });

    return await handleJson<ReviewStats>(response);
  }

  // Get reviews for a specific book
  static async getBookReviews(
    bookId: number,
    params?: {
      page?: number;
      limit?: number;
      rating?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<ReviewsListPayload> {
    return this.getReviews({
      ...params,
      bookId,
    });
  }

  // Get user's reviews
  static async getUserReviews(
    userId: number,
    params?: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<ReviewsListPayload> {
    return this.getReviews({
      ...params,
      userId,
    });
  }
}
