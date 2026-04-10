export interface Category {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export interface CategoriesListPayload {
  categories: Category[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateCategoryData {
  name: string;
  description?: string;
  isDeleted?: boolean;
}

export interface UpdateCategoryData extends Partial<CreateCategoryData> {
  id: number;
}
