import { fetchWithAuth, getAccessToken, handleJson } from '@/lib/utils';
import { BookWithAuthor } from '@/types/book';

export class RecommendationApi {
  /**
   * Get recommended books for the current user
   * @returns Array of recommended books
   */
  static async getRecommendations(): Promise<BookWithAuthor[]> {
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth('/api/recommendations', {
      method: 'GET',
      headers,
    });

    return await handleJson<BookWithAuthor[]>(response);
  }

  /**
   * Get popular books
   * @param n - Number of popular books (optional)
   * @param category - Category filter (optional)
   * @returns Array of popular books
   */
  static async getPopularBooks(n?: number, category?: string): Promise<BookWithAuthor[]> {
    const searchParams = new URLSearchParams();
    if (n) searchParams.set('n', n.toString());
    if (category) searchParams.set('category', category);

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/api/popular?${queryString}` : '/api/popular';

    const response = await fetchWithAuth(endpoint, {
      method: 'GET',
    });

    return await handleJson<BookWithAuthor[]>(response);
  }

  /**
   * Get latest books
   * @param n - Number of latest books (optional, defaults to 10)
   * @param offset - Offset for pagination (optional, defaults to 0)
   * @returns Array of latest books
   */
  static async getLatestBooks(n?: number, offset?: number): Promise<BookWithAuthor[]> {
    const searchParams = new URLSearchParams();
    if (n) searchParams.set('n', n.toString());
    if (offset !== undefined) searchParams.set('offset', offset.toString());

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/api/latest?${queryString}` : '/api/latest';

    const response = await fetchWithAuth(endpoint, {
      method: 'GET',
    });

    return await handleJson<BookWithAuthor[]>(response);
  }

  /**
   * Get similar/neighbor books for a specific book
   * @param bookId - Book ID to get neighbors for
   * @param n - Number of neighbor books (optional, defaults to 10)
   * @param offset - Offset for pagination (optional, defaults to 0)
   * @returns Array of similar books
   */
  static async getBookNeighbors(
    bookId: number,
    n?: number,
    offset?: number
  ): Promise<BookWithAuthor[]> {
    const searchParams = new URLSearchParams();
    if (n) searchParams.set('n', n.toString());
    if (offset !== undefined) searchParams.set('offset', offset.toString());

    const queryString = searchParams.toString();
    const endpoint = queryString
      ? `/api/books/${bookId}/neighbors?${queryString}`
      : `/api/books/${bookId}/neighbors`;

    const response = await fetchWithAuth(endpoint, {
      method: 'GET',
    });

    return await handleJson<BookWithAuthor[]>(response);
  }
}
