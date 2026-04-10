/**
 * OTP Type Definitions
 * Types for OTP generation, verification, and management
 */

import { OTPType } from '@prisma/client';

// #region Constants

/**
 * OTP code length (fixed)
 */
export const OTP_CODE_LENGTH = 6;

// #endregion

// #region Request/Response Types

/**
 * Request to send OTP code
 * Both type and email are required
 */
export interface SendOTPRequest {
  type: OTPType;
  email: string;
}

/**
 * Response after sending OTP
 */
export interface SendOTPResponse {
  success: boolean;
  message: string;
  expiresIn: number; // Seconds until expiration
}

/**
 * Request to verify OTP for forgot password flow
 */
export interface VerifyOTPForgotPasswordRequest {
  email: string;
  code: string;
}

/**
 * Response after verifying OTP for forgot password
 */
export interface VerifyOTPForgotPasswordResponse {
  success: boolean;
  message: string;
  otpId?: number;
}

// #endregion

// #region Service Types

/**
 * OTP generation result
 */
export interface OTPGenerationResult {
  code: string;
  expiresAt: Date;
  otpId: number;
}

/**
 * OTP verification result
 */
export interface OTPVerificationResult {
  valid: boolean;
  message: string;
  otpId?: number;
}

/**
 * OTP configuration options
 */
export interface OTPConfig {
  expiryMinutes?: number; // Default: 5
  maxAttempts?: number; // Default: 3
}

// #endregion

// #region Constants

/**
 * Default OTP configuration
 * OTP code is always 6-digit numeric
 */
export const DEFAULT_OTP_CONFIG: Required<OTPConfig> = {
  expiryMinutes: 5,
  maxAttempts: 3,
};

/**
 * OTP type descriptions for email templates
 */
export const OTP_TYPE_DESCRIPTIONS: Record<OTPType, string> = {
  EMAIL_VERIFICATION: 'Email Verification',
  PASSWORD_RESET: 'Password Reset',
  LOGIN_2FA: 'Two-Factor Authentication',
  PHONE_VERIFICATION: 'Phone Verification',
};

// #endregion
