import { fetchWithAuth, getAccessToken, handleJson } from '@/lib/utils';
import {
  CreateFavoriteBookData,
  DeleteFavoriteBookData,
  FavoriteBookResponse,
  FavoriteBooksListPayload,
} from '@/types/favorite-book';

export class FavoriteBookApi {
  // Get favorite books for current user
  static async getFavoriteBooks(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<FavoriteBooksListPayload> {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth(`/api/favorite-books?${searchParams.toString()}`, {
      method: 'GET',
      headers,
    });

    return await handleJson<FavoriteBooksListPayload>(response);
  }

  // Create favorite book
  static async createFavoriteBook(data: CreateFavoriteBookData): Promise<FavoriteBookResponse> {
    const token = getAccessToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth('/api/favorite-books', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    return await handleJson<FavoriteBookResponse>(response);
  }

  // Delete favorite book (hard delete)
  static async deleteFavoriteBook(data: DeleteFavoriteBookData): Promise<void> {
    const token = getAccessToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth('/api/favorite-books', {
      method: 'DELETE',
      headers,
      body: JSON.stringify(data),
    });

    await handleJson<void>(response);
  }

  // Check if a book is favorite
  static async checkFavoriteBook(bookId: number): Promise<boolean> {
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth(`/api/favorite-books?bookId=${bookId}`, {
      method: 'GET',
      headers,
    });

    const data = await handleJson<{ isFavorite: boolean }>(response);
    return data.isFavorite;
  }
}
