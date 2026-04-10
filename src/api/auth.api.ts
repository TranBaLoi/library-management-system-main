import {
  clearAuthSession,
  fetchWithAuth,
  getAccessToken,
  handleJson,
  setAuthSession,
} from '@/lib/utils';
import {
  AuthUser,
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
  UpdateMeData,
} from '@/types';

export class AuthApi {
  // Login and persist tokens + userId
  static async login(credentials: LoginRequest): Promise<{ isFirstLogin?: boolean }> {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(credentials),
    });

    const data = await handleJson<{
      userId: number;
      accessToken: string;
      refreshToken: string;
      isFirstLogin?: boolean;
    }>(response);
    setAuthSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      userId: data.userId,
    });
    return { isFirstLogin: data.isFirstLogin };
  }

  // Register new account
  static async register(payload: RegisterRequest): Promise<void> {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await handleJson<{ user: AuthUser; message: string }>(response);
  }

  // Get current user using stored access token
  static async me(): Promise<AuthUser> {
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetchWithAuth('/api/auth/me', {
      method: 'GET',
      headers,
    });
    return await handleJson<AuthUser>(response);
  }

  // Update current user profile with optional avatar
  static async updateMe(data: UpdateMeData): Promise<AuthUser> {
    const token = getAccessToken();
    const formData = new FormData();

    formData.append('fullName', data.fullName);
    if (data.phoneNumber) formData.append('phoneNumber', data.phoneNumber);
    if (data.address) formData.append('address', data.address);
    if (data.avatar) formData.append('avatar', data.avatar);
    if (data.removeAvatar) formData.append('removeAvatar', 'true');

    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth('/api/auth/me', {
      method: 'PUT',
      headers,
      body: formData,
    });
    return await handleJson<AuthUser>(response);
  }

  // Update user interests (for first login)
  static async updateInterests(interests: string[]): Promise<void> {
    const token = getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth('/api/auth/interests', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ interests }),
    });

    await handleJson(response);
  }

  // Change password (requires auth)
  static async changePassword(payload: ChangePasswordRequest): Promise<void> {
    const token = getAccessToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetchWithAuth('/api/auth/change-password', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    await handleJson<null>(response);
  }

  // Refresh access token using httpOnly cookie
  static async refresh(): Promise<void> {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    const data = await handleJson<{ accessToken: string }>(response);
    setAuthSession(data.accessToken);
  }

  // Logout and clear access token
  static async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      clearAuthSession();
      // Import locally to avoid circular deps
      const { queryClient } = await import('@/lib/query-client');
      const { meQueryKey } = await import('@/lib/hooks/useMe');
      if (typeof window !== 'undefined') {
        queryClient.setQueryData(meQueryKey, null);
        queryClient.invalidateQueries({ queryKey: meQueryKey });
      }
    }
  }
}
