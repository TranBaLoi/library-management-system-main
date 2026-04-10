import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { EmailUtils, JWTUtils, PasswordUtils, ValidationUtils } from '@/lib/utils';
import {
  AuthUser,
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
} from '@/types/auth';
import { Role, UserStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { GorseService } from './gorse.service';

export class AuthService {
  // Register new user
  static async register(userData: RegisterRequest): Promise<RegisterResponse> {
    const { fullName, email, password, confirmPassword, phoneNumber, address } = userData;

    // Validate input data
    const validationErrors: string[] = [];

    // Validate full name
    const fullNameValidation = ValidationUtils.validateFullName(fullName);
    if (!fullNameValidation.isValid) {
      validationErrors.push(...fullNameValidation.errors);
    }

    // Validate email
    if (!EmailUtils.isValid(email)) {
      validationErrors.push('Invalid email format');
    }

    // Validate password
    const passwordValidation = PasswordUtils.validate(password);
    if (!passwordValidation.isValid) {
      validationErrors.push(...passwordValidation.errors);
    }

    // Check password confirmation
    if (password !== confirmPassword) {
      validationErrors.push('Passwords do not match');
    }

    // Validate phone number if provided
    if (phoneNumber) {
      const phoneValidation = ValidationUtils.validatePhoneNumber(phoneNumber);
      if (!phoneValidation.isValid) {
        validationErrors.push(...phoneValidation.errors);
      }
    }

    if (validationErrors.length > 0) {
      throw new ValidationError(`Validation failed: ${validationErrors.join(', ')}`);
    }

    // Normalize email
    const normalizedEmail = EmailUtils.normalize(email);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const hashedPassword = await PasswordUtils.hash(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        fullName: ValidationUtils.sanitizeString(fullName),
        email: normalizedEmail,
        password: hashedPassword,
        phoneNumber: phoneNumber ? ValidationUtils.sanitizeString(phoneNumber) : null,
        address: address ? ValidationUtils.sanitizeString(address) : null,
        role: Role.READER, // Default role
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        address: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Sync user to Gorse (only READER role for recommendations)
    // Fail silently to not block user registration if Gorse is unavailable
    if (user.role === Role.READER) {
      try {
        await GorseService.insertUser(
          GorseService.createUserPayload(user.id, {
            comment: user.fullName,
          })
        );
      } catch (error) {
        // Log error but don't fail registration
        console.error('Failed to sync user to Gorse:', error);
      }
    }

    return {
      user: user as AuthUser,
      message: 'Account created successfully',
    };
  }

  // Login user
  static async login(credentials: LoginRequest): Promise<LoginResponse> {
    const { email, password, rememberMe = false } = credentials;

    // Validate input
    if (!EmailUtils.isValid(email)) {
      throw new ValidationError('Invalid email format');
    }

    if (!password || password.length === 0) {
      throw new ValidationError('Password is required');
    }

    const normalizedEmail = EmailUtils.normalize(email);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        fullName: true,
        email: true,
        password: true,
        phoneNumber: true,
        address: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        firstLoginAt: true,
        isDeleted: true,
      },
    });

    if (!user || user.isDeleted) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedError('Account is inactive. Please contact administrator.');
    }

    // Verify password
    const isPasswordValid = await PasswordUtils.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate tokens
    const tokenId = randomBytes(16).toString('hex');
    const accessToken = JWTUtils.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = JWTUtils.generateRefreshToken({
      userId: user.id,
      tokenId,
    });

    // Store refresh token in database (optional - for token revocation)
    await prisma.refreshToken.create({
      data: {
        id: tokenId,
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000), // 30 days if remember me, 7 days otherwise
      },
    });

    // Set firstLoginAt if this is the first login
    const isFirstLogin = !user.firstLoginAt;
    if (isFirstLogin) {
      await prisma.user.update({
        where: { id: user.id },
        data: { firstLoginAt: new Date() },
      });
    }

    return {
      userId: user.id,
      accessToken,
      refreshToken,
      isFirstLogin, // Return flag to indicate if this is first login
    };
  }

  // Refresh access token
  static async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    // Verify refresh token
    const payload = JWTUtils.verifyRefreshToken(refreshToken);

    // Check if refresh token exists in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { id: payload.tokenId },
      include: { user: true },
    });

    if (!storedToken || storedToken.token !== refreshToken) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      // Clean up expired token
      await prisma.refreshToken.delete({
        where: { id: payload.tokenId },
      });
      throw new UnauthorizedError('Refresh token expired');
    }

    // Check if user is still active
    if (storedToken.user.status !== UserStatus.ACTIVE || storedToken.user.isDeleted) {
      throw new UnauthorizedError('User account is inactive');
    }

    // Generate new access token
    const accessToken = JWTUtils.generateAccessToken({
      userId: storedToken.user.id,
      email: storedToken.user.email,
      role: storedToken.user.role,
    });

    return {
      accessToken,
    };
  }

  // Logout user
  static async logout(refreshToken: string): Promise<void> {
    const payload = JWTUtils.verifyRefreshToken(refreshToken);

    // Remove refresh token from database
    await prisma.refreshToken.delete({
      where: { id: payload.tokenId },
    });
  }

  // Logout from all devices
  static async logoutAll(userId: number): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  // Change password
  static async changePassword(userId: number, passwordData: ChangePasswordRequest): Promise<void> {
    const { currentPassword, newPassword, confirmNewPassword } = passwordData;

    // Validate new password
    const passwordValidation = PasswordUtils.validate(newPassword);
    if (!passwordValidation.isValid) {
      throw new ValidationError(
        `Password validation failed: ${passwordValidation.errors.join(', ')}`
      );
    }

    // Check password confirmation
    if (newPassword !== confirmNewPassword) {
      throw new ValidationError('New passwords do not match');
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await PasswordUtils.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new ValidationError('Current password is incorrect');
    }

    // Check if new password is different from current
    const isSamePassword = await PasswordUtils.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new ValidationError('New password must be different from current password');
    }

    // Hash new password
    const hashedNewPassword = await PasswordUtils.hash(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    // Logout from all devices (invalidate all refresh tokens)
    await this.logoutAll(userId);
  }

  // Clean up expired refresh tokens (should be run periodically)
  static async cleanupExpiredTokens(): Promise<number> {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }
}
