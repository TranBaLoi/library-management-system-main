export interface Policy {
  id: string;
  name: string;
  amount: number;
  unit: 'FIXED' | 'PER_DAY';
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export interface PoliciesListPayload {
  policies: Policy[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreatePolicyData {
  id: string;
  name: string;
  amount: number;
  unit: 'FIXED' | 'PER_DAY';
  isDeleted?: boolean;
}

export interface UpdatePolicyData extends Partial<CreatePolicyData> {
  id: string;
}
