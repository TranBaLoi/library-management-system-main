export interface BorrowRecord {
  id: number;
  userId: number;
  borrowDate: Date;
  returnDate: Date | null;
  actualReturnDate: Date | null;
  renewalCount: number;
  status: BorrowStatus;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export enum BorrowStatus {
  BORROWED = 'BORROWED',
  RETURNED = 'RETURNED',
  OVERDUE = 'OVERDUE',
}

export interface BookItemForViolation {
  id: number;
  code: string;
  condition?: string;
  book?: {
    id: number;
    title?: string;
    price?: number | null;
    author?: {
      id: number;
      fullName?: string;
    };
  } | null;
}

export interface BorrowRecordWithDetails extends BorrowRecord {
  user?: {
    id: number;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
    violationPoints?: number;
  };
  borrowBooks?: Array<{
    bookItem: {
      id: number;
      code: string;
      condition?: string;
      book: {
        id: number;
        title: string;
        price?: number | null;
        author: {
          id: number;
          fullName: string;
        };
      };
    };
  }>;
  borrowEbooks?: Array<{
    book: {
      id: number;
      title: string;
      isbn?: string | null;
      coverImageUrl?: string | null;
      publishYear?: number | null;
      author: {
        id: number;
        fullName: string;
      };
    };
  }>;
  payments?: Array<{
    id: number;
    policyId: string;
    amount: number;
    isPaid: boolean;
    paidAt: Date | null;
    dueDate: Date | null;
    createdAt: Date;
    policy?: {
      id: string;
      name: string;
    };
  }>;
}

export interface CreateBorrowRecordData {
  userId: number;
  borrowDate: string;
  returnDate: string;
  bookItemIds: number[];
  requestIds?: number[];
}

export interface CreateBorrowRecordResponse {
  borrowRecord: BorrowRecordWithDetails;
  fulfilledRequests?: Array<{
    id: number;
    status: string;
  }>;
  message: string;
}
