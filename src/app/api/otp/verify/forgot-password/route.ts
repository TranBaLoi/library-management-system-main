/**
 * API Route: Verify OTP for Forgot Password
 * POST /api/otp/verify/forgot-password - Verify OTP code for password reset
 *
 * This endpoint verifies OTP codes sent for PASSWORD_RESET type.
 * It does NOT require authentication since users have forgotten their password.
 */

import { ValidationError } from '@/lib/errors';
import { EmailUtils, handleRouteError, successResponse } from '@/lib/utils';
import { OTPService } from '@/services/otp.service';
import { VerifyOTPForgotPasswordRequest, VerifyOTPForgotPasswordResponse } from '@/types/otp';
import { OTPType } from '@prisma/client';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: VerifyOTPForgotPasswordRequest = await request.json();

    // Validate required fields
    if (!body.email || !body.code) {
      throw new ValidationError('Email and OTP code are required');
    }

    // Validate email format
    if (!EmailUtils.isValid(body.email)) {
      throw new ValidationError('Invalid email format');
    }

    // Validate OTP code format (should be 6-digit numeric)
    const codeRegex = /^\d{6}$/;
    if (!codeRegex.test(body.code.trim())) {
      throw new ValidationError('OTP code must be a 6-digit number');
    }

    // Verify OTP using OTPService
    const result = await OTPService.verifyOTP(body.email, body.code, OTPType.PASSWORD_RESET);

    // Return verification result
    const response: VerifyOTPForgotPasswordResponse = {
      success: result.valid,
      message: result.message,
      otpId: result.otpId,
    };

    // Return appropriate status code
    if (result.valid) {
      return successResponse(response, response.message, 200);
    } else {
      return successResponse(response, response.message, 400);
    }
  } catch (error) {
    return handleRouteError(error, 'POST /api/otp/verify/forgot-password');
  }
}
