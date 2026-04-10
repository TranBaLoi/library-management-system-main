import { PaginationResponse } from '@/types/api';
import { Condition, ItemStatus } from '@prisma/client';

export interface BookItem {
  id: number;
  bookId: number;
  code: string;
  condition: Condition;
  status: ItemStatus;
  acquisitionDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export interface BookItemWithBook extends BookItem {
  book: {
    id: number;
    title: string;
    isbn: string | null;
    coverImageUrl: string | null;
    author: {
      id: number;
      fullName: string;
    };
  };
}

export interface BookItemsListPayload {
  bookItems: BookItemWithBook[];
  pagination: PaginationResponse;
}

export interface CreateBookItemData {
  bookId: number | string;
  code: string;
  condition: Condition;
  status?: ItemStatus;
  acquisitionDate?: string | Date | null;
  isDeleted?: boolean;
}

export interface UpdateBookItemData {
  bookId?: number | string;
  code?: string;
  condition?: Condition;
  status?: ItemStatus;
  acquisitionDate?: string | Date | null;
  isDeleted?: boolean;
}
