import { fetchWithAuth, handleJson } from '@/lib/utils';
import { CreatePolicyData, PoliciesListPayload, Policy } from '@/types/policy';

export class PolicyApi {
  // Get policies with pagination and filters
  static async getPolicies(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    isDeleted?: boolean;
  }): Promise<PoliciesListPayload> {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params?.isDeleted !== undefined) searchParams.set('isDeleted', params.isDeleted.toString());

    const queryString = searchParams.toString();
    const url = queryString ? `/api/policies?${queryString}` : '/api/policies';

    const response = await fetchWithAuth(url);
    return await handleJson<PoliciesListPayload>(response);
  }

  // Get all policies
  static async getAllPolicies(): Promise<Policy[]> {
    const response = await fetchWithAuth('/api/policies/all');
    return await handleJson<Policy[]>(response);
  }

  // Get single policy by ID
  static async getPolicyById(id: string): Promise<Policy> {
    const response = await fetchWithAuth(`/api/policies/${id}`);
    return await handleJson<Policy>(response);
  }

  // Create new policy
  static async createPolicy(data: CreatePolicyData): Promise<Policy> {
    const response = await fetchWithAuth('/api/policies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return await handleJson<Policy>(response);
  }

  // Update policy
  static async updatePolicy(id: string, data: Partial<CreatePolicyData>): Promise<Policy> {
    const response = await fetchWithAuth(`/api/policies/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return await handleJson<Policy>(response);
  }

  // Delete policy (soft delete)
  static async deletePolicy(id: string): Promise<void> {
    const response = await fetchWithAuth(`/api/policies/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete policy: ${response.statusText}`);
    }
  }
}
