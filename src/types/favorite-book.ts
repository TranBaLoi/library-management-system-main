import { PaginationResponse } from '@/types/api';

export interface FavoriteBook {
  userId: number;
  bookId: number;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export interface FavoriteBookWithBook {
  userId: number;
  bookId: number;
  createdAt: Date;
  updatedAt: Date;
  book: {
    id: number;
    title: string;
    isbn: string | null;
    publishYear: number | null;
    publisher: string | null;
    pageCount: number | null;
    price: number | null;
    edition: string | null;
    description: string | null;
    coverImageUrl: string | null;
    author: {
      id: number;
      fullName: string;
    };
    bookEditions?: { id: number; format: 'EBOOK' | 'AUDIO' }[];
    _count?: { bookItems: number };
    categories?: string[];
    averageRating?: number;
  };
}

export interface CreateFavoriteBookData {
  bookId: number;
}

export interface DeleteFavoriteBookData {
  bookId: number;
}

export interface FavoriteBookResponse {
  userId: number;
  bookId: number;
  createdAt: string;
  updatedAt: string;
}

export interface FavoriteBooksListPayload {
  favoriteBooks: FavoriteBookWithBook[];
  pagination: PaginationResponse;
}
