import { fetchWithAuth, getAccessToken, handleJson } from '@/lib/utils';
import { BookItem, CreateBookItemData, UpdateBookItemData } from '@/types/book-item';

export class BookItemApi {
  static async getBookItems(params?: {
    page?: number;
    limit?: number;
    search?: string;
    searchByCodeOnly?: boolean;
    authorIds?: number[];
    bookIds?: number[];
    conditions?: string[];
    statuses?: string[];
    acquisitionDateFrom?: string;
    acquisitionDateTo?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    bookItems: BookItem[];
    pagination: { total: number; page: number; limit: number };
  }> {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.searchByCodeOnly)
      searchParams.set('searchByCodeOnly', params.searchByCodeOnly.toString());
    if (params?.authorIds && params.authorIds.length > 0) {
      params.authorIds.forEach(id => searchParams.append('authorIds', id.toString()));
    }
    if (params?.bookIds && params.bookIds.length > 0) {
      params.bookIds.forEach(id => searchParams.append('bookIds', id.toString()));
    }
    if (params?.conditions && params.conditions.length > 0) {
      params.conditions.forEach(condition => searchParams.append('conditions', condition));
    }
    if (params?.statuses && params.statuses.length > 0) {
      params.statuses.forEach(status => searchParams.append('statuses', status));
    }
    if (params?.acquisitionDateFrom)
      searchParams.set('acquisitionDateFrom', params.acquisitionDateFrom);
    if (params?.acquisitionDateTo) searchParams.set('acquisitionDateTo', params.acquisitionDateTo);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth(`/api/book-items?${searchParams.toString()}`, {
      method: 'GET',
      headers,
    });

    return await handleJson<{
      bookItems: BookItem[];
      pagination: { total: number; page: number; limit: number };
    }>(response);
  }

  static async getBookItemById(id: number): Promise<BookItem> {
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth(`/api/book-items/${id}`, {
      method: 'GET',
      headers,
    });

    return await handleJson<BookItem>(response);
  }

  static async createBookItem(data: CreateBookItemData): Promise<BookItem> {
    const token = getAccessToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth('/api/book-items', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    return await handleJson<BookItem>(response);
  }

  static async updateBookItem(id: number, data: UpdateBookItemData): Promise<BookItem> {
    const token = getAccessToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth(`/api/book-items/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });

    return await handleJson<BookItem>(response);
  }

  static async deleteBookItem(id: number): Promise<void> {
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth(`/api/book-items/${id}`, {
      method: 'DELETE',
      headers,
    });

    await handleJson<null>(response);
  }
}
