import { PaginationResponse } from '@/types/api';

export interface Review {
  id: number;
  userId: number;
  bookId: number;
  rating: number;
  reviewText: string | null;
  reviewDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export interface ReviewWithUser extends Review {
  user: {
    id: number;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
  };
}

export interface CreateReviewData {
  userId: number;
  bookId: number;
  rating: number;
  reviewText?: string | null;
  reviewDate?: Date | null;
}

export interface UpdateReviewData {
  rating?: number;
  reviewText?: string | null;
  reviewDate?: Date | null;
  isDeleted?: boolean;
}

export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    rating: number;
    count: number;
    percentage: number;
  }[];
}

export interface ReviewsListPayload {
  reviews: ReviewWithUser[];
  pagination: PaginationResponse;
}

export interface ReviewDisplayData {
  id: number;
  userId: number;
  userName: string;
  userAvatar: string;
  rating: number;
  reviewText: string;
  reviewDate: string;
  createdAt: string;
}
