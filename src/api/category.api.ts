import { fetchWithAuth, handleJson } from '@/lib/utils';
import { CategoriesListPayload, Category, CreateCategoryData } from '@/types';

export class CategoryApi {
  // Get categories with pagination and filters
  static async getCategories(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    isDeleted?: boolean;
  }): Promise<CategoriesListPayload> {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params?.isDeleted !== undefined) searchParams.set('isDeleted', params.isDeleted.toString());

    const queryString = searchParams.toString();
    const url = queryString ? `/api/categories?${queryString}` : '/api/categories';

    const response = await fetchWithAuth(url);
    return await handleJson<CategoriesListPayload>(response);
  }

  // Get all categories
  static async getAllCategories(): Promise<Category[]> {
    const response = await fetchWithAuth('/api/categories/all');
    return await handleJson<Category[]>(response);
  }

  // Get single category by ID
  static async getCategoryById(id: number): Promise<Category> {
    const response = await fetchWithAuth(`/api/categories/${id}`);
    return await handleJson<Category>(response);
  }

  // Create new category
  static async createCategory(data: CreateCategoryData): Promise<Category> {
    const response = await fetchWithAuth('/api/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return await handleJson<Category>(response);
  }

  // Update category
  static async updateCategory(id: number, data: Partial<CreateCategoryData>): Promise<Category> {
    const response = await fetchWithAuth(`/api/categories/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return await handleJson<Category>(response);
  }

  // Delete category (soft delete)
  static async deleteCategory(id: number): Promise<void> {
    const response = await fetchWithAuth(`/api/categories/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete category: ${response.statusText}`);
    }
  }
}
