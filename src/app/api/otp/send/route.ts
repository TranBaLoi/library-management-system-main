/**
 * API Route: Send OTP
 * POST /api/otp/send - Send OTP code to user's email
 *
 * This endpoint handles both sending new OTP and resending:
 * - First time: Sends new OTP code
 * - Resend: Call this endpoint again
 * - Cooldown: 1 minute between consecutive requests
 *
 * Authentication: Not required
 *
 * Request body:
 * - type: OTPType (EMAIL_VERIFICATION, PASSWORD_RESET, LOGIN_2FA, PHONE_VERIFICATION)
 * - email: string (user's email address)
 *
 * OTP verification should be done in your application code using OTPService.verifyOTP()
 */

import { ValidationError } from '@/lib/errors';
import { EmailUtils, handleRouteError, successResponse } from '@/lib/utils';
import { OTPService } from '@/services/otp.service';
import { SendOTPRequest, SendOTPResponse } from '@/types/otp';
import { OTPType } from '@prisma/client';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: SendOTPRequest = await request.json();

    // Validate required fields
    const { type, email } = body;

    if (!type) {
      throw new ValidationError('OTP type is required');
    }

    if (!email) {
      throw new ValidationError('Email is required');
    }

    // Validate OTP type
    const validTypes = Object.values(OTPType);
    if (!validTypes.includes(type)) {
      throw new ValidationError(`Invalid OTP type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Validate email format
    if (!EmailUtils.isValid(email)) {
      throw new ValidationError('Invalid email format');
    }

    // Send OTP email (handles both new and resend scenarios)
    const result = await OTPService.sendOTPEmail(email, type);

    // Return success response
    const response: SendOTPResponse = {
      success: true,
      message: 'OTP code sent successfully to your email',
      expiresIn: result.expiresIn,
    };

    return successResponse(response, response.message);
  } catch (error) {
    return handleRouteError(error, 'POST /api/otp/send');
  }
}
