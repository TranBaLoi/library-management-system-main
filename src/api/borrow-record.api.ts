import { fetchWithAuth, getAccessToken, handleJson } from '@/lib/utils';
import {
  BorrowRecordWithDetails,
  BorrowStatus,
  CreateBorrowRecordData,
  CreateBorrowRecordResponse,
} from '@/types/borrow-record';
import { Violation } from '@/types/violation';

export class BorrowRecordApi {
  // Create borrow record
  static async createBorrowRecord(
    data: CreateBorrowRecordData
  ): Promise<CreateBorrowRecordResponse> {
    const token = getAccessToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth('/api/borrow-records', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    return await handleJson<CreateBorrowRecordResponse>(response);
  }

  // Get all borrow records (Librarian only)
  static async getAllBorrowRecords(params?: {
    page?: number;
    limit?: number;
    status?: BorrowStatus;
    userId?: number;
    bookId?: number;
    search?: string;
  }): Promise<{
    borrowRecords: BorrowRecordWithDetails[];
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
    if (params?.bookId) searchParams.set('bookId', params.bookId.toString());
    if (params?.search) searchParams.set('search', params.search);

    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const queryString = searchParams.toString();
    const url = queryString ? `/api/borrow-records/all?${queryString}` : '/api/borrow-records/all';

    const response = await fetchWithAuth(url, {
      method: 'GET',
      headers,
    });

    return await handleJson<{
      borrowRecords: BorrowRecordWithDetails[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(response);
  }

  // Get borrow records for current user (Reader only)
  static async getMyBorrowRecords(params?: {
    page?: number;
    limit?: number;
    status?: BorrowStatus;
  }): Promise<{
    borrowRecords: BorrowRecordWithDetails[];
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

    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const queryString = searchParams.toString();
    const url = queryString ? `/api/borrow-records?${queryString}` : '/api/borrow-records';

    const response = await fetchWithAuth(url, {
      method: 'GET',
      headers,
    });

    return await handleJson<{
      borrowRecords: BorrowRecordWithDetails[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(response);
  }

  // Get borrow record by id
  static async getBorrowRecordById(id: number): Promise<BorrowRecordWithDetails> {
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth(`/api/borrow-records/${id}`, {
      method: 'GET',
      headers,
    });

    return await handleJson<BorrowRecordWithDetails>(response);
  }

  // Renew borrow record
  static async renewBorrowRecord(id: number): Promise<{
    borrowRecord: BorrowRecordWithDetails;
    message: string;
  }> {
    const token = getAccessToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth(`/api/borrow-records/${id}/renew`, {
      method: 'POST',
      headers,
    });

    return await handleJson<{
      borrowRecord: BorrowRecordWithDetails;
      message: string;
    }>(response);
  }

  // Return borrow record
  static async returnBorrowRecord(
    id: number,
    options?: {
      violations?: Violation[];
      conditionUpdates?: Record<number, string>;
    }
  ): Promise<{
    borrowRecord: BorrowRecordWithDetails;
    message: string;
    payments?: Array<{ id: number; amount: number; policyId: string }>;
  }> {
    const token = getAccessToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const body: {
      violations?: Violation[];
      conditionUpdates?: Record<number, string>;
    } = {};
    if (options?.violations) {
      body.violations = options.violations;
    }
    if (options?.conditionUpdates) {
      body.conditionUpdates = options.conditionUpdates;
    }

    const response = await fetchWithAuth(`/api/borrow-records/${id}/return`, {
      method: 'POST',
      headers,
      body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
    });

    return await handleJson<{
      borrowRecord: BorrowRecordWithDetails;
      message: string;
      payments?: Array<{ id: number; amount: number; policyId: string }>;
    }>(response);
  }
}
