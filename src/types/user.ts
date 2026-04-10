import { Role, UserStatus } from '@prisma/client';

// User Types from Prisma
export interface User {
  id: number;
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  address?: string | null;
  avatarUrl?: string | null;
  role: Role;
  status: UserStatus;
  violationPoints: number;
  createdAt: Date;
  updatedAt: Date;
  inactiveAt?: Date | null;
  firstLoginAt?: Date | null;
  isDeleted: boolean;
}

// User without sensitive data (for API responses)
export interface PublicUser {
  id: number;
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  address?: string | null;
  avatarUrl?: string | null;
  role: Role;
  status: UserStatus;
  violationPoints?: number;
  createdAt: Date;
  updatedAt: Date;
  inactiveAt?: Date | null;
  firstLoginAt?: Date | null;
  interest?: string | null; // JSON array string of interests
}

// User creation data
export interface CreateUserData {
  fullName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  address?: string;
  role?: Role;
}

// User update data
export interface UpdateUserData {
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  avatarUrl?: string;
  role?: Role;
  status?: UserStatus;
}

// Update current user profile data (for self-update)
export interface UpdateMeData {
  fullName: string;
  phoneNumber?: string;
  address?: string;
  avatar?: File | null;
  removeAvatar?: boolean;
}

// User query filters
export interface UserQueryFilters {
  search?: string;
  role?: Role;
  status?: UserStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
