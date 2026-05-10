import { AuthService } from '@/services/auth.service';
import { prisma } from '@/lib/prisma';
import { PasswordUtils, JWTUtils } from '@/lib/utils';
import { Role, UserStatus } from '@prisma/client';
import { GorseService } from '@/services/gorse.service';
import { ConflictError, UnauthorizedError, ValidationError, NotFoundError } from '@/lib/errors';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/utils', () => ({
  EmailUtils: {
    isValid: jest.fn().mockReturnValue(true),
    normalize: jest.fn((email) => email.toLowerCase()),
  },
  PasswordUtils: {
    validate: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
    hash: jest.fn().mockResolvedValue('hashedPassword123'),
    compare: jest.fn(),
  },
  ValidationUtils: {
    validateFullName: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
    validatePhoneNumber: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
    sanitizeString: jest.fn((str) => str),
  },
  JWTUtils: {
    generateAccessToken: jest.fn().mockReturnValue('mockAccessToken'),
    generateRefreshToken: jest.fn().mockReturnValue('mockRefreshToken'),
    verifyRefreshToken: jest.fn(),
  },
}));

jest.mock('@/services/gorse.service', () => ({
  GorseService: {
    insertUser: jest.fn(),
    createUserPayload: jest.fn(),
  },
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register (TC-AUTH-001)', () => {
    // ... (Keep existing tests)
    const validRegisterData = {
      fullName: 'Test User',
      email: 'test@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      phoneNumber: '0123456789',
      address: 'Test Address',
    };

    it('should successfully register a new user and return user data without orphans', async () => {
      // Setup mocks
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      
      const createdUser = {
        id: 1,
        fullName: 'Test User',
        email: 'test@example.com',
        phoneNumber: '0123456789',
        address: 'Test Address',
        role: Role.READER,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      (prisma.user.create as jest.Mock).mockResolvedValue(createdUser);

      // Execute
      const result = await AuthService.register(validRegisterData);

      // Verify
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(PasswordUtils.hash).toHaveBeenCalledWith('Password123!');
      expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          email: 'test@example.com',
          password: 'hashedPassword123',
          role: Role.READER,
        })
      }));
      expect(GorseService.insertUser).toHaveBeenCalled();
      expect(result.message).toBe('Account created successfully');
      expect(result.user).toEqual(createdUser);
    });

    it('should throw ConflictError if email already exists', async () => {
      // Setup mock
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 2, email: 'test@example.com' });

      // Execute & Verify
      await expect(AuthService.register(validRegisterData)).rejects.toMatchObject({ name: 'ConflictError', statusCode: 409 });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should throw ValidationError if passwords do not match', async () => {
      const data = { ...validRegisterData, confirmPassword: 'DifferentPassword123!' };
      await expect(AuthService.register(data)).rejects.toMatchObject({ name: 'ValidationError', statusCode: 400 });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login (TC-AUTH-002)', () => {
    // ... (Keep existing tests)
    const loginData = {
      email: 'test@example.com',
      password: 'Password123!',
      rememberMe: false,
    };

    const mockUser = {
      id: 1,
      email: 'test@example.com',
      password: 'hashedPassword123',
      role: Role.READER,
      status: UserStatus.ACTIVE,
      isDeleted: false,
      firstLoginAt: null,
    };

    it('should successfully login and return tokens', async () => {
      // Setup mocks
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (PasswordUtils.compare as jest.Mock).mockResolvedValue(true);
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      // Execute
      const result = await AuthService.login(loginData);

      // Verify
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: expect.any(Object),
      });
      expect(PasswordUtils.compare).toHaveBeenCalledWith('Password123!', 'hashedPassword123');
      expect(JWTUtils.generateAccessToken).toHaveBeenCalled();
      expect(JWTUtils.generateRefreshToken).toHaveBeenCalled();
      expect(prisma.refreshToken.create).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { firstLoginAt: expect.any(Date) },
      });
      
      expect(result.accessToken).toBe('mockAccessToken');
      expect(result.refreshToken).toBe('mockRefreshToken');
      expect(result.isFirstLogin).toBe(true);
    });

    it('should throw UnauthorizedError on invalid password', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (PasswordUtils.compare as jest.Mock).mockResolvedValue(false);

      await expect(AuthService.login(loginData)).rejects.toMatchObject({ name: 'UnauthorizedError', statusCode: 401 });
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError if user is deleted', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...mockUser, isDeleted: true });

      await expect(AuthService.login(loginData)).rejects.toMatchObject({ name: 'UnauthorizedError', statusCode: 401 });
    });
    
    it('should throw UnauthorizedError if user is inactive', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...mockUser, status: UserStatus.INACTIVE });

      await expect(AuthService.login(loginData)).rejects.toMatchObject({ name: 'UnauthorizedError', statusCode: 401 });
    });
  });

  // Adding more coverage for the auth tests
  describe('changePassword (TC-AUTH-004)', () => {
    it('should successfully update password and invalidate sessions', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1, password: 'oldPasswordHash' });
      (PasswordUtils.compare as jest.Mock).mockImplementation((plain, hash) => {
         return Promise.resolve(plain === 'oldPass' && hash === 'oldPasswordHash');
      });
      
      await AuthService.changePassword(1, { currentPassword: 'oldPass', newPassword: 'NewPassword123!', confirmNewPassword: 'NewPassword123!' });
      
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { password: 'hashedPassword123' }
      });
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 1 } });
    });

    it('should throw ValidationError if new password same as old', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1, password: 'oldPasswordHash' });
      (PasswordUtils.compare as jest.Mock).mockResolvedValue(true);
      
      await expect(AuthService.changePassword(1, { currentPassword: 'oldPass', newPassword: 'oldPass', confirmNewPassword: 'oldPass' }))
        .rejects.toMatchObject({ name: 'ValidationError', statusCode: 400 });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('logout & token cleanup (TC-AUTH-005)', () => {
    it('should correctly call prisma to delete token on logout', async () => {
      (JWTUtils.verifyRefreshToken as jest.Mock).mockReturnValue({ tokenId: 'tokenId123' });
      await AuthService.logout('someToken');
      expect(prisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 'tokenId123' } });
    });
    it('should clear expired tokens', async () => {
      (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });
      const count = await AuthService.cleanupExpiredTokens();
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalled();
      expect(count).toBe(5);
    });
  });
});
