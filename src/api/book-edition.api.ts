import { fetchWithAuth, getAccessToken, handleJson } from '@/lib/utils';
import {
  AiSummarizeParams,
  AiSummarizeResponse,
  BookEdition,
  BookEditionsListPayload,
  BulkDeleteBookEditionResponse,
} from '@/types/book-edition';

export class BookEditionApi {
  // Create book edition (bookId in body, not URL)
  static async createBookEdition(bookId: number, formData: FormData): Promise<BookEdition> {
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    // Add bookId to formData
    formData.append('bookId', bookId.toString());

    const response = await fetchWithAuth('/api/book-editions', {
      method: 'POST',
      headers,
      body: formData,
    });

    return await handleJson<BookEdition>(response);
  }

  // Update book edition
  static async updateBookEdition(editionId: number, formData: FormData): Promise<BookEdition> {
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth(`/api/book-editions/${editionId}`, {
      method: 'PATCH',
      headers,
      body: formData,
    });

    return await handleJson<BookEdition>(response);
  }

  // Get book edition by ID
  static async getBookEditionById(editionId: number): Promise<BookEdition> {
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth(`/api/book-editions/${editionId}`, {
      method: 'GET',
      headers,
    });

    return await handleJson<BookEdition>(response);
  }

  // Get book editions with optional bookId filter (get all editions if no bookId provided)
  static async getBookEditions(params?: {
    bookIds?: number[]; // Support multiple book IDs
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    format?: string;
    fileFormat?: string;
    drmType?: string;
    status?: string;
  }): Promise<BookEditionsListPayload> {
    const searchParams = new URLSearchParams();

    // Add multiple bookIds if provided
    if (params?.bookIds && params.bookIds.length > 0) {
      params.bookIds.forEach(id => searchParams.append('bookIds', id.toString()));
    }
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params?.format) searchParams.set('format', params.format);
    if (params?.fileFormat) searchParams.set('fileFormat', params.fileFormat);
    if (params?.drmType) searchParams.set('drmType', params.drmType);
    if (params?.status) searchParams.set('status', params.status);

    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const queryString = searchParams.toString();
    const url = `/api/book-editions${queryString ? `?${queryString}` : ''}`;

    const response = await fetchWithAuth(url, {
      method: 'GET',
      headers,
    });

    return await handleJson<BookEditionsListPayload>(response);
  }

  // Backward compatibility: Get book editions by book id
  static async getBookEditionsByBookId(
    bookId: number,
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      format?: string;
      fileFormat?: string;
      drmType?: string;
      status?: string;
    }
  ): Promise<BookEditionsListPayload> {
    return this.getBookEditions({ ...params, bookIds: [bookId] });
  }

  // Bulk delete book editions (soft delete)
  static async bulkDeleteBookEditions(ids: number[]): Promise<BulkDeleteBookEditionResponse> {
    const token = getAccessToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth('/api/book-editions/bulk-delete', {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ ids }),
    });

    return await handleJson<BulkDeleteBookEditionResponse>(response);
  }

  // Summarize PDF file directly using AI (upload file)
  static async aiSummarize(params: AiSummarizeParams): Promise<AiSummarizeResponse> {
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const formData = new FormData();
    formData.append('file', params.file);
    if (params.language) formData.append('language', params.language);
    if (params.maxLength) formData.append('maxLength', params.maxLength.toString());

    const response = await fetchWithAuth('/api/ai-summarize', {
      method: 'POST',
      headers,
      body: formData,
    });

    return await handleJson<AiSummarizeResponse>(response);
  }
}
