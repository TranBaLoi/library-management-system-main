export interface Payment {
  id: number;
  policyId: string;
  borrowRecordId: number;
  amount: number;
  isPaid: boolean;
  paidAt: Date | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export interface PaymentWithDetails extends Payment {
  policy?: {
    id: string;
    name: string;
  };
  borrowRecord?: {
    id: number;
    user?: {
      id: number;
      fullName: string;
      email: string;
    };
  };
}

export interface PaymentsListPayload {
  payments: PaymentWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
