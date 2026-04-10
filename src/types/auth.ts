import { Role, UserStatus } from '@prisma/client';

// Auth request types
export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber?: string;
  address?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface ResetPasswordRequest {
  email: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export interface ConfirmResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmNewPassword: string;
}

// Auth response types
export interface AuthUser {
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
  firstLoginAt?: Date | null;
  interest?: string | null; // JSON array string of interests
}

export interface LoginResponse {
  userId: number;
  accessToken: string;
  refreshToken: string;
  isFirstLogin?: boolean; // Flag to indicate if this is the first login
}

export interface RegisterResponse {
  user: AuthUser;
  message: string;
}

// JWT payload types
export interface JWTPayload {
  userId: number;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: number;
  tokenId: string;
  iat?: number;
  exp?: number;
}

// Auth context types
export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  updateProfile: (userData: Partial<AuthUser>) => Promise<void>;
}

// Cookie options
export interface CookieSetOptions {
  days?: number;
  path?: string;
  sameSite?: 'Lax' | 'Strict' | 'None';
  secure?: boolean;
}
