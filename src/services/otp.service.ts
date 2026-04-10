/**
 * OTP Service
 * Handles OTP generation, verification, and management
 */

import { ConflictError, ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { EmailUtils } from '@/lib/utils';
import {
  DEFAULT_OTP_CONFIG,
  OTPConfig,
  OTPGenerationResult,
  OTPVerificationResult,
  OTP_TYPE_DESCRIPTIONS,
} from '@/types/otp';
import { OTPType } from '@prisma/client';
import { randomInt } from 'crypto';
import { MailService } from './mail.service';

export class OTPService {
  // #region OTP Generation

  /**
   * Generate a random 6-digit numeric OTP code
   * @returns 6-digit numeric string (e.g., "123456")
   */
  private static generateOTPCode(): string {
    // Generate 6-digit numeric code
    const min = 100000; // Minimum 6-digit number
    const max = 999999; // Maximum 6-digit number
    return randomInt(min, max + 1).toString();
  }

  /**
   * Create and store OTP in database
   * @param email - User's email address
   * @param type - Type of OTP (verification, password reset, etc.)
   * @param config - OTP configuration options
   */
  static async createOTP(
    email: string,
    type: OTPType,
    config: OTPConfig = {}
  ): Promise<OTPGenerationResult> {
    // Validate email
    if (!EmailUtils.isValid(email)) {
      throw new ValidationError('Invalid email format');
    }

    const normalizedEmail = EmailUtils.normalize(email);

    // Merge config with defaults
    const otpConfig = { ...DEFAULT_OTP_CONFIG, ...config };

    // Check if there's a recent unused OTP
    const recentOTP = await prisma.oTP.findFirst({
      where: {
        email: normalizedEmail,
        type,
        verified: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (recentOTP) {
      // If OTP was created less than 1 minute ago, don't create new one
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      if (recentOTP.createdAt > oneMinuteAgo) {
        throw new ConflictError('OTP already sent. Please wait before requesting a new one.');
      }
    }

    // Generate OTP code (always 6-digit numeric)
    const code = this.generateOTPCode();

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + otpConfig.expiryMinutes * 60 * 1000);

    // Store OTP in database
    const otp = await prisma.oTP.create({
      data: {
        email: normalizedEmail,
        code,
        type,
        expiresAt,
      },
    });

    return {
      code,
      expiresAt,
      otpId: otp.id,
    };
  }

  // #endregion

  // #region OTP Verification

  /**
   * Verify OTP code
   * @param email - User's email address
   * @param code - OTP code to verify
   * @param type - Type of OTP
   */
  static async verifyOTP(
    email: string,
    code: string,
    type: OTPType
  ): Promise<OTPVerificationResult> {
    // Validate inputs
    if (!EmailUtils.isValid(email)) {
      throw new ValidationError('Invalid email format');
    }

    if (!code || code.trim().length === 0) {
      throw new ValidationError('OTP code is required');
    }

    const normalizedEmail = EmailUtils.normalize(email);
    const normalizedCode = code.trim().toUpperCase();

    // Find OTP
    const otp = await prisma.oTP.findFirst({
      where: {
        email: normalizedEmail,
        code: normalizedCode,
        type,
        verified: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otp) {
      // Increment failed attempt
      return {
        valid: false,
        message: 'Invalid or expired OTP code',
      };
    }

    // Check if OTP is expired
    if (otp.expiresAt < new Date()) {
      return {
        valid: false,
        message: 'OTP code has expired',
      };
    }

    // Check max attempts
    if (otp.attempts >= DEFAULT_OTP_CONFIG.maxAttempts) {
      return {
        valid: false,
        message: 'Maximum verification attempts exceeded',
      };
    }

    // Update OTP as verified
    await prisma.oTP.update({
      where: { id: otp.id },
      data: {
        verified: true,
        verifiedAt: new Date(),
        attempts: otp.attempts + 1,
      },
    });

    return {
      valid: true,
      message: 'OTP verified successfully',
      otpId: otp.id,
    };
  }

  /**
   * Increment failed verification attempt
   * @param email - User's email address
   * @param code - OTP code that failed
   * @param type - Type of OTP
   */
  static async incrementFailedAttempt(email: string, code: string, type: OTPType): Promise<void> {
    const normalizedEmail = EmailUtils.normalize(email);

    await prisma.oTP.updateMany({
      where: {
        email: normalizedEmail,
        code: code.trim().toUpperCase(),
        type,
        verified: false,
      },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });
  }

  // #endregion

  // #region OTP Management

  /**
   * Invalidate all OTPs for a user and type
   * @param email - User's email address
   * @param type - Type of OTP to invalidate
   */
  static async invalidateOTPs(email: string, type?: OTPType): Promise<number> {
    const normalizedEmail = EmailUtils.normalize(email);

    const result = await prisma.oTP.updateMany({
      where: {
        email: normalizedEmail,
        type,
        verified: false,
      },
      data: {
        verified: true, // Mark as verified to prevent reuse
      },
    });

    return result.count;
  }

  /**
   * Clean up expired OTPs (should be run periodically)
   */
  static async cleanupExpiredOTPs(): Promise<number> {
    const result = await prisma.oTP.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Keep for 24 hours before deletion
        },
      },
    });

    return result.count;
  }

  /**
   * Check if user has verified OTP recently
   * @param email - User's email address
   * @param type - Type of OTP
   * @param withinMinutes - Time window in minutes (default: 10)
   */
  static async hasRecentVerifiedOTP(
    email: string,
    type: OTPType,
    withinMinutes: number = 10
  ): Promise<boolean> {
    const normalizedEmail = EmailUtils.normalize(email);
    const cutoffTime = new Date(Date.now() - withinMinutes * 60 * 1000);

    const recentOTP = await prisma.oTP.findFirst({
      where: {
        email: normalizedEmail,
        type,
        verified: true,
        verifiedAt: {
          gte: cutoffTime,
        },
      },
    });

    return !!recentOTP;
  }

  // #endregion

  // #region Email Integration

  /**
   * Send OTP code via email
   * @param email - Recipient email address
   * @param type - Type of OTP
   * @param config - OTP configuration options
   */
  static async sendOTPEmail(
    email: string,
    type: OTPType,
    config: OTPConfig = {}
  ): Promise<{ success: boolean; expiresIn: number }> {
    // Generate OTP
    const otp = await this.createOTP(email, type, config);

    // Get OTP configuration
    const otpConfig = { ...DEFAULT_OTP_CONFIG, ...config };

    // Get type description for email
    const typeDescription = OTP_TYPE_DESCRIPTIONS[type];

    // Queue OTP email with high priority (urgent)
    const result = await MailService.sendOTPCodeEmail(
      email,
      otp.code,
      typeDescription,
      otpConfig.expiryMinutes
    );

    if (!result.success) {
      throw new Error('Failed to queue OTP email');
    }

    return {
      success: true,
      expiresIn: otpConfig.expiryMinutes * 60, // Return expiry in seconds
    };
  }

  // #endregion
}
