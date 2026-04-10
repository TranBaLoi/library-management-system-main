import { fetchWithAuth, getAccessToken, handleJson } from '@/lib/utils';
import { CreateUserData, PublicUser, UpdateUserData, UserQueryFilters } from '@/types/user';
import { Role, UserStatus } from '@prisma/client';

// Response types
interface UsersResponse {
  users: PublicUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface BulkDeleteResponse {
  deletedCount: number;
  notFoundIds: number[];
}

/**
 * User API Client
 * Handles all user management API calls
 */
export class UserApi {
  // Get list of users with filters
  static async getUsers(filters?: UserQueryFilters): Promise<UsersResponse> {
    const searchParams = new URLSearchParams();

    if (filters?.page) searchParams.set('page', filters.page.toString());
    if (filters?.limit) searchParams.set('limit', filters.limit.toString());
    if (filters?.search) searchParams.set('search', filters.search);
    if (filters?.role) searchParams.set('role', filters.role);
    if (filters?.status) searchParams.set('status', filters.status);
    if (filters?.sortBy) searchParams.set('sortBy', filters.sortBy);
    if (filters?.sortOrder) searchParams.set('sortOrder', filters.sortOrder);

    const url = `/api/users${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await fetchWithAuth(url);
    return await handleJson<UsersResponse>(response);
  }

  // Get all users
  static async getAllUsers(): Promise<PublicUser[]> {
    const response = await fetchWithAuth('/api/users/all');
    return await handleJson<PublicUser[]>(response);
  }

  // Get single user by ID
  static async getUserById(id: number): Promise<PublicUser> {
    const response = await fetchWithAuth(`/api/users/${id}`);
    return await handleJson<PublicUser>(response);
  }

  // Create new user
  static async createUser(data: CreateUserData): Promise<PublicUser> {
    const token = getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth('/api/users', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    return await handleJson<PublicUser>(response);
  }

  // Update user
  static async updateUser(id: number, data: UpdateUserData): Promise<PublicUser> {
    const token = getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth(`/api/users/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    });

    return await handleJson<PublicUser>(response);
  }

  // Bulk delete users (can be used for single or multiple users)
  static async bulkDeleteUsers(ids: number[]): Promise<BulkDeleteResponse> {
    const token = getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth('/api/users/bulk-delete', {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ ids }),
    });

    return await handleJson<BulkDeleteResponse>(response);
  }
}

// Export role and status enums for convenience
export { Role, UserStatus };
