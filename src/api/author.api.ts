import { fetchWithAuth, handleJson } from '@/lib/utils';
import { Author, AuthorsListPayload, CreateAuthorData } from '@/types';

export class AuthorApi {
  // Get authors with pagination and filters
  static async getAuthors(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    isDeleted?: boolean;
  }): Promise<AuthorsListPayload> {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params?.isDeleted !== undefined) searchParams.set('isDeleted', params.isDeleted.toString());

    const queryString = searchParams.toString();
    const url = queryString ? `/api/authors?${queryString}` : '/api/authors';

    const response = await fetchWithAuth(url);
    return await handleJson<AuthorsListPayload>(response);
  }

  // Get all authors
  static async getAllAuthors(): Promise<Author[]> {
    const response = await fetchWithAuth('/api/authors/all');
    return await handleJson<Author[]>(response);
  }

  // Get single author by ID
  static async getAuthorById(id: number): Promise<Author> {
    const response = await fetchWithAuth(`/api/authors/${id}`);
    return await handleJson<Author>(response);
  }

  // Create new author
  static async createAuthor(data: CreateAuthorData): Promise<Author> {
    const response = await fetchWithAuth('/api/authors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return await handleJson<Author>(response);
  }

  // Update author
  static async updateAuthor(id: number, data: Partial<CreateAuthorData>): Promise<Author> {
    const response = await fetchWithAuth(`/api/authors/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return await handleJson<Author>(response);
  }

  // Delete author (soft delete)
  static async deleteAuthor(id: number): Promise<void> {
    const response = await fetchWithAuth(`/api/authors/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete author: ${response.statusText}`);
    }
  }
}
