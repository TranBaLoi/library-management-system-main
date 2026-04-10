/**
 * OTP API Client
 * Client-side functions for OTP operations
 */

import { fetchWithAuth, handleJson } from '@/lib/utils';
import {
  SendOTPResponse,
  VerifyOTPForgotPasswordRequest,
  VerifyOTPForgotPasswordResponse,
} from '@/types/otp';
import { OTPType } from '@prisma/client';

export class OTPApi {
  /**
   * Send OTP code for password reset (no authentication required)
   */
  static async sendOTPForPasswordReset(email: string): Promise<SendOTPResponse> {
    const response = await fetch('/api/otp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: OTPType.PASSWORD_RESET,
        email,
      }),
    });

    return await handleJson<SendOTPResponse>(response);
  }

  /**
   * Verify OTP code for forgot password
   */
  static async verifyOTPForPasswordReset(
    data: VerifyOTPForgotPasswordRequest
  ): Promise<VerifyOTPForgotPasswordResponse> {
    const response = await fetch('/api/otp/verify/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return await handleJson<VerifyOTPForgotPasswordResponse>(response);
  }

  /**
   * Send OTP code for authenticated user
   */
  static async sendOTP(type: OTPType): Promise<SendOTPResponse> {
    const response = await fetchWithAuth('/api/otp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type }),
    });

    return await handleJson<SendOTPResponse>(response);
  }
}
