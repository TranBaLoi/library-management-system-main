/**
 * Password API Client
 * Client-side functions for password operations
 */

import { fetchWithAuth, handleJson } from '@/lib/utils';
import { ChangePasswordRequest, ResetPasswordRequest, ResetPasswordResponse } from '@/types/auth';

export class PasswordApi {
  /**
   * Change password for authenticated user
   */
  static async changePassword(data: ChangePasswordRequest): Promise<{ message: string }> {
    const response = await fetchWithAuth('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return await handleJson<{ message: string }>(response);
  }

  /**
   * Reset password after OTP verification (no authentication required)
   */
  static async resetPassword(data: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return await handleJson<ResetPasswordResponse>(response);
  }
}
