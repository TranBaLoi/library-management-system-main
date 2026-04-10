import { CookieSetOptions, JWTPayload, RefreshTokenPayload } from '@/types/auth';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

// Environment variables with defaults
const JWT_SECRET = process.env.JWT_SECRET || 'jwt-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Password utilities
export class PasswordUtils {
  private static readonly SALT_ROUNDS = 12;

  static async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  static async compare(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  static validate(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
      errors.push('Password must not exceed 128 characters');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// JWT utilities
export class JWTUtils {
  static generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'library-management-system',
      audience: 'library-users',
    } as jwt.SignOptions);
  }

  static generateRefreshToken(payload: Omit<RefreshTokenPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: 'library-management-system',
      audience: 'library-users',
    } as jwt.SignOptions);
  }

  static verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, JWT_SECRET, {
        issuer: 'library-management-system',
        audience: 'library-users',
      }) as JWTPayload;
    } catch {
      throw new Error('Invalid or expired access token');
    }
  }

  static verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET, {
        issuer: 'library-management-system',
        audience: 'library-users',
      }) as RefreshTokenPayload;
    } catch {
      throw new Error('Invalid or expired refresh token');
    }
  }

  static decodeToken(token: string): null | string | Record<string, unknown> {
    return jwt.decode(token) as null | string | Record<string, unknown>;
  }

  static getTokenExpiration(token: string): Date | null {
    const decoded = this.decodeToken(token);
    if (decoded && typeof decoded === 'object') {
      const exp = (decoded as Record<string, unknown>).exp;
      if (typeof exp === 'number') {
        return new Date(exp * 1000);
      }
    }
    return null;
  }
}

// Email validation
export class EmailUtils {
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  static isValid(email: string): boolean {
    return this.EMAIL_REGEX.test(email.toLowerCase());
  }

  static normalize(email: string): string {
    return email.toLowerCase().trim();
  }
}

// General validation utilities
export class ValidationUtils {
  static validateFullName(fullName: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!fullName || fullName.trim().length === 0) {
      errors.push('Full name is required');
    }

    if (fullName.length < 2) {
      errors.push('Full name must be at least 2 characters long');
    }

    if (fullName.length > 255) {
      errors.push('Full name must not exceed 255 characters');
    }

    if (!/^[a-zA-ZÀ-ỹ\s]+$/.test(fullName)) {
      errors.push('Full name can only contain letters and spaces');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static validatePhoneNumber(phoneNumber: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (phoneNumber && phoneNumber.trim().length > 0) {
      // Remove all non-digit characters for validation
      const digitsOnly = phoneNumber.replace(/\D/g, '');

      if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        errors.push('Phone number must be between 10 and 15 digits');
      }

      if (!/^[\d\s\-\+\(\)]+$/.test(phoneNumber)) {
        errors.push('Phone number contains invalid characters');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static sanitizeString(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }
}

// (Server-side Edge runtime)
export function getAccessTokenFromRequest(req: NextRequest): string | null {
  return req.cookies.get('accessToken')?.value ?? null;
}

// Client-side access token helpers (cookie-based; no-ops on server)
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const part = parts.pop();
    if (!part) return null;
    return part.split(';').shift() ?? null;
  }
  return null;
}

function setCookie(name: string, value: string, options: CookieSetOptions = {}): void {
  if (typeof document === 'undefined') return;
  const { days, path = '/', sameSite = 'Lax', secure } = options;
  let cookie = `${name}=${encodeURIComponent(value)}; path=${path}; SameSite=${sameSite}`;
  if (typeof days === 'number') {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    cookie += `; Expires=${date.toUTCString()}`;
  }
  const isHttps = typeof location !== 'undefined' && location.protocol === 'https:';
  if (secure ?? isHttps) cookie += '; Secure';
  document.cookie = cookie;
}

function deleteCookie(name: string, path: string = '/'): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; Path=${path}; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

export function getAccessToken(): string | null {
  try {
    return getCookie('accessToken');
  } catch {
    return null;
  }
}

export function setAuthSession(
  value:
    | string
    | null
    | { accessToken: string; refreshToken?: string | null; userId?: number | null },
  options?: CookieSetOptions
): void {
  if (typeof window === 'undefined') return;
  try {
    if (typeof value === 'string' || value === null) {
      if (value) {
        setCookie('accessToken', value, options);
      } else {
        deleteCookie('accessToken');
      }
      return;
    }

    const { accessToken, refreshToken } = value;
    if (accessToken) setCookie('accessToken', accessToken, options);
    if (typeof refreshToken !== 'undefined') {
      if (refreshToken) setCookie('refreshToken', refreshToken, options);
      else deleteCookie('refreshToken');
    }
  } catch {
    // ignore cookie errors
  }
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') return;
  try {
    deleteCookie('accessToken');
    deleteCookie('refreshToken');
  } catch {
    // ignore cookie errors
  }
}
