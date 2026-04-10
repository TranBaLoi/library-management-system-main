import { fetchWithAuth, getAccessToken, handleJson } from '@/lib/utils';
import {
  BorrowRequestResponse,
  BorrowRequestsListResponse,
  BorrowRequestStatus,
  BorrowRequestWithBookAndUser,
  CreateBorrowRequestData,
} from '@/types/borrow-request';

export class BorrowRequestApi {
  // Create borrow request
  static async createBorrowRequest(data: CreateBorrowRequestData): Promise<BorrowRequestResponse> {
    const token = getAccessToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth('/api/borrow-requests', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    return await handleJson<BorrowRequestResponse>(response);
  }

  // Get borrow requests
  static async getBorrowRequests(params?: {
    page?: number;
    limit?: number;
    status?: BorrowRequestStatus;
  }): Promise<BorrowRequestsListResponse> {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.status) searchParams.set('status', params.status);

    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const queryString = searchParams.toString();
    const url = queryString ? `/api/borrow-requests?${queryString}` : '/api/borrow-requests';

    const response = await fetchWithAuth(url, {
      method: 'GET',
      headers,
    });

    return await handleJson<BorrowRequestsListResponse>(response);
  }

  // Cancel borrow request
  static async cancelBorrowRequest(id: number): Promise<BorrowRequestResponse> {
    const token = getAccessToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth(`/api/borrow-requests/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: BorrowRequestStatus.CANCELLED }),
    });

    return await handleJson<BorrowRequestResponse>(response);
  }

  // Get all borrow requests (Librarian only)
  static async getAllBorrowRequests(params?: {
    page?: number;
    limit?: number;
    status?: BorrowRequestStatus;
    userId?: number;
  }): Promise<{
    borrowRequests: BorrowRequestWithBookAndUser[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.userId) searchParams.set('userId', params.userId.toString());

    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const queryString = searchParams.toString();
    const url = queryString
      ? `/api/borrow-requests/all?${queryString}`
      : '/api/borrow-requests/all';

    const response = await fetchWithAuth(url, {
      method: 'GET',
      headers,
    });

    return await handleJson<{
      borrowRequests: BorrowRequestWithBookAndUser[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(response);
  }

  // Approve borrow request
  static async approveBorrowRequest(id: number): Promise<BorrowRequestResponse> {
    const token = getAccessToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth(`/api/borrow-requests/${id}/manage`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: BorrowRequestStatus.APPROVED }),
    });

    return await handleJson<BorrowRequestResponse>(response);
  }

  // Reject borrow request
  static async rejectBorrowRequest(id: number): Promise<BorrowRequestResponse> {
    const token = getAccessToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth(`/api/borrow-requests/${id}/manage`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: BorrowRequestStatus.REJECTED }),
    });

    return await handleJson<BorrowRequestResponse>(response);
  }
}
