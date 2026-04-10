export interface BorrowRequest {
  id: number;
  userId: number;
  startDate: Date;
  endDate: Date;
  status: BorrowRequestStatus;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export enum BorrowRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  FULFILLED = 'FULFILLED',
}

export interface BorrowRequestItem {
  borrowRequestId: number;
  bookId: number;
  quantity: number;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export interface BorrowRequestItemWithBook extends BorrowRequestItem {
  book: {
    id: number;
    title: string;
    isbn: string | null;
    coverImageUrl: string | null;
    publishYear: number | null;
    author: {
      id: number;
      fullName: string;
    };
  };
  queuePosition?: number | null;
}

export interface BorrowRequestWithItems extends BorrowRequest {
  items: BorrowRequestItem[];
  user?: {
    id: number;
    fullName: string;
    email: string;
  };
}

export interface BorrowRequestWithBook extends BorrowRequest {
  items: BorrowRequestItemWithBook[];
}

export interface BorrowRequestWithBookAndUser extends BorrowRequest {
  items: BorrowRequestItemWithBook[];
  user?: {
    id: number;
    fullName: string;
    email: string;
  };
}

export interface CreateBorrowRequestData {
  userId: number;
  startDate: string;
  endDate: string;
  items: BorrowRequestItemData[];
}

export interface BorrowRequestItemData {
  bookId: number;
  quantity: number;
  startDate: string;
  endDate: string;
}

export interface BorrowRequestResponse {
  borrowRequest: BorrowRequestWithItems;
  borrowRecord?: {
    id: number;
    status: string;
  } | null;
  queuePosition?: number | null;
  message: string;
}

export interface BorrowRequestsListResponse {
  borrowRequests: BorrowRequestWithBook[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
