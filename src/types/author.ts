export interface Author {
  id: number;
  fullName: string;
  bio?: string | null;
  birthDate?: Date | null;
  nationality?: string | null;
  avatarUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export interface AuthorsListPayload {
  authors: Author[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateAuthorData {
  fullName: string;
  bio?: string;
  birthDate?: string;
  nationality?: string;
  isDeleted?: boolean;
}

export interface UpdateAuthorData extends Partial<CreateAuthorData> {
  id: number;
}
