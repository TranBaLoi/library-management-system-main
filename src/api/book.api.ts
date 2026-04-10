import { fetchWithAuth, getAccessToken, handleJson } from '@/lib/utils';
import { Book, BookDetail, BookWithAuthor, CreateBookData, UpdateBookData } from '@/types/book';

// Helper to create headers with optional auth token
function createHeaders(includeContentType = false): Record<string, string> {
  const headers: Record<string, string> = {};
  if (includeContentType) headers['Content-Type'] = 'application/json';
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export class BookApi {
  // Create book
  static async createBook(data: CreateBookData): Promise<Book> {
    const response = await fetchWithAuth('/api/books', {
      method: 'POST',
      headers: createHeaders(true),
      body: JSON.stringify(data),
    });

    return await handleJson<Book>(response);
  }

  // Get books
  static async getBooks(params?: {
    page?: number;
    limit?: number;
    search?: string;
    authorIds?: number[];
    categoryIds?: number[];
    languageCodes?: string[];
    publishYearFrom?: number;
    publishYearTo?: number;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    isDeleted?: boolean;
    availableAt?: ('book-copy' | 'ebook')[];
  }): Promise<{ books: BookWithAuthor[]; pagination: { total: number } }> {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.authorIds && params.authorIds.length > 0) {
      params.authorIds.forEach(id => searchParams.append('authorIds', id.toString()));
    }
    if (params?.categoryIds && params.categoryIds.length > 0) {
      params.categoryIds.forEach(id => searchParams.append('categoryIds', id.toString()));
    }
    if (params?.languageCodes && params.languageCodes.length > 0) {
      params.languageCodes.forEach(code => searchParams.append('languageCodes', code));
    }
    if (params?.publishYearFrom)
      searchParams.set('publishYearFrom', params.publishYearFrom.toString());
    if (params?.publishYearTo) searchParams.set('publishYearTo', params.publishYearTo.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params?.isDeleted !== undefined) searchParams.set('isDeleted', params.isDeleted.toString());
    if (params?.availableAt && params.availableAt.length > 0) {
      params.availableAt.forEach(value => searchParams.append('availableAt', value));
    }

    const response = await fetchWithAuth(`/api/books?${searchParams.toString()}`, {
      method: 'GET',
      headers: createHeaders(),
    });

    return await handleJson<{ books: BookWithAuthor[]; pagination: { total: number } }>(response);
  }

  // Get book by id
  static async getBookById(id: number): Promise<BookDetail> {
    const response = await fetchWithAuth(`/api/books/${id}`, {
      method: 'GET',
      headers: createHeaders(),
    });

    return await handleJson<BookDetail>(response);
  }

  // Update book
  static async updateBook(id: number, data: UpdateBookData): Promise<Book> {
    const response = await fetchWithAuth(`/api/books/${id}`, {
      method: 'PUT',
      headers: createHeaders(true),
      body: JSON.stringify(data),
    });

    return await handleJson<Book>(response);
  }

  // Get all books
  static async getAllBooks(): Promise<Book[]> {
    const response = await fetchWithAuth('/api/books/all', {
      method: 'GET',
      headers: createHeaders(),
    });

    return await handleJson<Book[]>(response);
  }

  // Create book with file upload
  static async createBookWithFile(data: CreateBookData, coverImageFile: File): Promise<Book> {
    const formData = new FormData();

    // Add text fields
    formData.append('authorId', String(data.authorId));
    formData.append('title', data.title);
    if (data.isbn) formData.append('isbn', data.isbn);
    if (data.publishYear) formData.append('publishYear', String(data.publishYear));
    if (data.publisher) formData.append('publisher', data.publisher);
    if (data.pageCount) formData.append('pageCount', String(data.pageCount));
    if (data.price) formData.append('price', String(data.price));
    if (data.edition) formData.append('edition', data.edition);
    if (data.description) formData.append('description', data.description);
    formData.append('isDeleted', String(data.isDeleted || false));
    if (data.categories?.length) {
      formData.append('categories', JSON.stringify(data.categories));
    }

    // Add file
    formData.append('coverImage', coverImageFile);

    const response = await fetchWithAuth('/api/books', {
      method: 'POST',
      headers: createHeaders(),
      body: formData,
    });

    return await handleJson<Book>(response);
  }

  // Update book with file upload
  static async updateBookWithFile(
    id: number,
    data: UpdateBookData,
    coverImageFile: File
  ): Promise<Book> {
    const formData = new FormData();

    // Add text fields
    if (data.authorId !== undefined) formData.append('authorId', String(data.authorId));
    if (data.title) formData.append('title', data.title);
    if (data.isbn !== undefined) formData.append('isbn', data.isbn || '');
    if (data.publishYear !== undefined)
      formData.append('publishYear', data.publishYear ? String(data.publishYear) : '');
    if (data.publisher !== undefined) formData.append('publisher', data.publisher || '');
    if (data.pageCount !== undefined)
      formData.append('pageCount', data.pageCount ? String(data.pageCount) : '');
    if (data.price !== undefined) formData.append('price', data.price ? String(data.price) : '');
    if (data.edition !== undefined) formData.append('edition', data.edition || '');
    if (data.description !== undefined) formData.append('description', data.description || '');
    if (data.isDeleted !== undefined) formData.append('isDeleted', String(data.isDeleted));
    if (data.categories) {
      formData.append('categories', JSON.stringify(data.categories));
    }

    // Add file
    formData.append('coverImage', coverImageFile);

    const response = await fetchWithAuth(`/api/books/${id}`, {
      method: 'PUT',
      headers: createHeaders(),
      body: formData,
    });

    return await handleJson<Book>(response);
  }

  // Delete book (soft delete)
  static async deleteBook(id: number): Promise<void> {
    const response = await fetchWithAuth(`/api/books/${id}`, {
      method: 'DELETE',
      headers: createHeaders(),
    });

    await handleJson<null>(response);
  }

  // Get available book count
  static async getBookAvailableCount(id: number): Promise<{ availableCount: number }> {
    const response = await fetchWithAuth(`/api/books/${id}/available-count`, {
      method: 'GET',
      headers: createHeaders(),
    });

    return await handleJson<{ availableCount: number }>(response);
  }

  static async searchBooks(params: {
    keyword: string;
    page: number;
    size: number;
  }): Promise<{
    books: BookWithAuthor[];
    page: number;
    size: number;
    total: number;
    hasNext: boolean;
  }> {
    const apiPage = params.page + 1;

    const response = await this.getBooks({
      search: params.keyword || undefined,
      page: apiPage,
      limit: params.size,
      isDeleted: false,
    });

    const hasNext = apiPage * params.size < response.pagination.total;

    return {
      books: response.books,
      page: params.page,
      size: params.size,
      total: response.pagination.total,
      hasNext,
    };
  }
}
