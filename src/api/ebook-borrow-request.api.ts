import { fetchWithAuth, getAccessToken, handleJson } from '@/lib/utils';
import { BorrowRequestStatus } from '@/types/borrow-request';
import {
  CreateEbookBorrowRequestData,
  EbookBorrowRequestResponse,
  EbookBorrowRequestsListResponse,
  EbookViewResponse,
  MyEbooksResponse,
  ReturnEbookResponse,
} from '@/types/ebook-borrow-request';

export class EbookBorrowRequestApi {
  /**
   * Create ebook borrow request (auto-approve and fulfill)
   */
  static async createEbookBorrowRequest(
    data: CreateEbookBorrowRequestData
  ): Promise<EbookBorrowRequestResponse> {
    const token = getAccessToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth('/api/ebook-borrow-requests', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    return await handleJson<EbookBorrowRequestResponse>(response);
  }

  /**
   * Get ebook borrow requests for current user
   */
  static async getEbookBorrowRequests(params?: {
    page?: number;
    limit?: number;
    status?: BorrowRequestStatus;
  }): Promise<EbookBorrowRequestsListResponse> {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.status) searchParams.set('status', params.status);

    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const queryString = searchParams.toString();
    const url = queryString
      ? `/api/ebook-borrow-requests?${queryString}`
      : '/api/ebook-borrow-requests';

    const response = await fetchWithAuth(url, {
      method: 'GET',
      headers,
    });

    return await handleJson<EbookBorrowRequestsListResponse>(response);
  }

  /**
   * Get list of ebooks currently borrowed by user
   */
  static async getMyEbooks(params?: { page?: number; limit?: number }): Promise<MyEbooksResponse> {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const queryString = searchParams.toString();
    const url = queryString ? `/api/my-ebooks?${queryString}` : '/api/my-ebooks';

    const response = await fetchWithAuth(url, {
      method: 'GET',
      headers,
    });

    return await handleJson<MyEbooksResponse>(response);
  }

  /**
   * Get signed URL for viewing PDF ebook
   */
  static async getEbookViewUrl(bookId: number): Promise<EbookViewResponse> {
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth(`/api/ebooks/${bookId}/view`, {
      method: 'GET',
      headers,
    });

    return await handleJson<EbookViewResponse>(response);
  }

  /**
   * Return ebook early
   */
  static async returnEbook(borrowRecordId: number): Promise<ReturnEbookResponse> {
    const token = getAccessToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth(`/api/borrow-records/${borrowRecordId}/return-ebook`, {
      method: 'POST',
      headers,
    });

    return await handleJson<ReturnEbookResponse>(response);
  }
}
