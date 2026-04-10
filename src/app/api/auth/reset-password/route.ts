/**
 * API Route: Reset Password
 * POST /api/auth/reset-password - Reset user password after OTP verification
 *
 * This endpoint allows users to reset their password after verifying their OTP.
 * It does NOT require authentication since users have forgotten their password.
 */

import { ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { EmailUtils, handleRouteError, PasswordUtils, successResponse } from '@/lib/utils';
import { OTPService } from '@/services/otp.service';
import { ResetPasswordRequest, ResetPasswordResponse } from '@/types/auth';
import { OTPType } from '@prisma/client';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: ResetPasswordRequest = await request.json();

    // Validate required fields
    if (!body.email || !body.newPassword) {
      throw new ValidationError('Email and new password are required');
    }

    // Validate email format
    if (!EmailUtils.isValid(body.email)) {
      throw new ValidationError('Invalid email format');
    }

    const normalizedEmail = EmailUtils.normalize(body.email);

    // Validate password strength
    const passwordValidation = PasswordUtils.validate(body.newPassword);
    if (!passwordValidation.isValid) {
      throw new ValidationError(`Password: ${passwordValidation.errors.join(', ')}`);
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new ValidationError('User not found');
    }

    // Check if user has recently verified OTP (within 10 minutes)
    const hasVerifiedOTP = await OTPService.hasRecentVerifiedOTP(
      normalizedEmail,
      OTPType.PASSWORD_RESET,
      10 // 10 minutes window
    );

    if (!hasVerifiedOTP) {
      throw new ValidationError(
        'OTP verification required. Please verify your OTP code first or request a new one.'
      );
    }

    // Hash new password
    const hashedPassword = await PasswordUtils.hash(body.newPassword);

    // Update user password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
      },
    });

    // Invalidate all password reset OTPs for this user
    await OTPService.invalidateOTPs(normalizedEmail, OTPType.PASSWORD_RESET);

    // Return success response
    const response: ResetPasswordResponse = {
      success: true,
      message: 'Password reset successfully',
    };

    return successResponse(response, response.message, 200);
  } catch (error) {
    return handleRouteError(error, 'POST /api/auth/reset-password');
  }
}
