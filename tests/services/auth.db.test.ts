import { AuthService } from '@/services/auth.service';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

jest.setTimeout(30000);

jest.mock('@/services/gorse.service', () => ({
  GorseService: {
    insertUser: jest.fn().mockResolvedValue(undefined),
    createUserPayload: jest.fn().mockReturnValue({}),
  },
}));

jest.mock('@/lib/utils', () => {
  const bcryptLib = require('bcryptjs');
  const jwtLib = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'jwt-key';
  const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-key';

  return {
    EmailUtils: {
      isValid: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.toLowerCase()),
      normalize: (email: string) => email.toLowerCase().trim(),
    },
    PasswordUtils: {
      hash: (password: string) => bcryptLib.hash(password, 12),
      compare: (password: string, hashedPassword: string) => bcryptLib.compare(password, hashedPassword),
      validate: (password: string) => {
        const errors: string[] = [];
        if (password.length < 8) errors.push('Password must be at least 8 characters long');
        if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
        if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
        if (!/\d/.test(password)) errors.push('Password must contain at least one number');
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('Password must contain at least one special character');
        return { isValid: errors.length === 0, errors };
      },
    },
    ValidationUtils: {
      validateFullName: (fullName: string) => {
        const errors: string[] = [];
        if (!fullName || fullName.trim().length === 0) errors.push('Full name is required');
        if (fullName && fullName.trim().length < 2) errors.push('Full name must be at least 2 characters long');
        return { isValid: errors.length === 0, errors };
      },
      validatePhoneNumber: () => ({ isValid: true, errors: [] }),
      sanitizeString: (input: string) => input.trim().replace(/[<>]/g, ''),
    },
    JWTUtils: {
      generateAccessToken: (payload: object) => jwtLib.sign(payload, JWT_SECRET, {
        expiresIn: '15m', issuer: 'library-management-system', audience: 'library-users',
      }),
      generateRefreshToken: (payload: object) => jwtLib.sign(payload, JWT_REFRESH_SECRET, {
        expiresIn: '7d', issuer: 'library-management-system', audience: 'library-users',
      }),
      verifyRefreshToken: (token: string) => jwtLib.verify(token, JWT_REFRESH_SECRET, {
        issuer: 'library-management-system', audience: 'library-users',
      }),
    },
  };
});

type DbSnapshot = {
  user: null | {
    id: number;
    fullName: string;
    email: string;
    password: string;
    phoneNumber: string | null;
    address: string | null;
    role: string;
    status: string;
    firstLoginAt: Date | null;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  refreshTokens: Array<{
    id: string;
    userId: number;
    token: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }>;
};

describe('DB Integration Test: Xác thực tài khoản (AuthService)', () => {
  const timestamp = Date.now();
  const validEmail = `db_test_${timestamp}@example.com`;
  const validPass = 'Password123!';
  const newPass = 'NewPass123!';
  let createdUserId: number | null = null;
  let latestRefreshToken: string | null = null;

  const getDbSnapshot = async (email: string): Promise<DbSnapshot> => {
    const user = await prisma.user.findUnique({ where: { email } });
    const refreshTokens = user
      ? await prisma.refreshToken.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'asc' } })
      : [];

    return { user, refreshTokens };
  };

  const cleanupDbTestUsers = async () => {
    const users = await prisma.user.findMany({
      where: { email: { contains: 'db_test_' } },
      select: { id: true },
    });
    const userIds = users.map(user => user.id);

    if (userIds.length > 0) {
      await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  };

  beforeAll(async () => {
    await cleanupDbTestUsers();
  });

  afterAll(async () => {
    await cleanupDbTestUsers();
    await prisma.$disconnect();
  });

  it('TC_AUTH_REG_01_DB: Đăng ký thành công thì DB phải thêm đúng thông tin user', async () => {
    const dbBefore = await getDbSnapshot(validEmail);
    expect(dbBefore).toEqual({ user: null, refreshTokens: [] });

    await AuthService.register({
      fullName: ' DB Test User ',
      email: validEmail.toUpperCase(),
      password: validPass,
      confirmPassword: validPass,
      phoneNumber: '0901234567',
      address: ' 123 Test Street ',
    });

    const dbAfter = await getDbSnapshot(validEmail);
    expect(dbAfter.user).not.toBeNull();
    expect(dbAfter.refreshTokens).toEqual([]);

    createdUserId = dbAfter.user!.id;
    expect(dbAfter.user).toMatchObject({
      fullName: 'DB Test User',
      email: validEmail,
      phoneNumber: '0901234567',
      address: '123 Test Street',
      role: 'READER',
      status: 'ACTIVE',
      firstLoginAt: null,
      isDeleted: false,
    });
    expect(dbAfter.user!.id).toEqual(expect.any(Number));
    expect(dbAfter.user!.createdAt).toBeInstanceOf(Date);
    expect(dbAfter.user!.updatedAt).toBeInstanceOf(Date);
    expect(dbAfter.user!.password).not.toBe(validPass);
    expect(await bcrypt.compare(validPass, dbAfter.user!.password)).toBe(true);
  });

  it('TC_AUTH_LOGIN_01_DB: Đăng nhập thành công thì DB phải thêm RefreshToken và update firstLoginAt', async () => {
    const dbBefore = await getDbSnapshot(validEmail);
    expect(dbBefore.user?.id).toBe(createdUserId);
    expect(dbBefore.user?.firstLoginAt).toBeNull();
    expect(dbBefore.refreshTokens).toEqual([]);

    const result = await AuthService.login({ email: validEmail, password: validPass, rememberMe: true });
    latestRefreshToken = result.refreshToken;

    const dbAfter = await getDbSnapshot(validEmail);
    expect(result.userId).toBe(createdUserId);
    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(result.isFirstLogin).toBe(true);

    expect(dbAfter.user?.firstLoginAt).toBeInstanceOf(Date);
    expect(dbAfter.refreshTokens).toHaveLength(1);
    expect(dbAfter.refreshTokens[0]).toMatchObject({
      userId: createdUserId,
      token: result.refreshToken,
    });
    expect(dbAfter.refreshTokens[0].id).toEqual(expect.any(String));
    expect(dbAfter.refreshTokens[0].expiresAt.getTime()).toBeGreaterThan(Date.now());

    const decoded = jwt.decode(result.refreshToken) as { tokenId?: string; userId?: number };
    expect(decoded.tokenId).toBe(dbAfter.refreshTokens[0].id);
    expect(decoded.userId).toBe(createdUserId);
  });

  it('TC_AUTH_LOGOUT_01_DB: Đăng xuất thành công thì DB phải xóa đúng RefreshToken', async () => {
    expect(latestRefreshToken).not.toBeNull();
    const dbBefore = await getDbSnapshot(validEmail);
    expect(dbBefore.refreshTokens).toHaveLength(1);
    const tokenIdBefore = dbBefore.refreshTokens[0].id;

    await AuthService.logout(latestRefreshToken!);

    const dbAfter = await getDbSnapshot(validEmail);
    expect(dbAfter.user?.id).toBe(createdUserId);
    expect(dbAfter.refreshTokens).toEqual([]);
    const deletedToken = await prisma.refreshToken.findUnique({ where: { id: tokenIdBefore } });
    expect(deletedToken).toBeNull();
  });

  it('TC_AUTH_CHANGEPWD_01_DB: Đổi mật khẩu thì DB phải đổi hash và xóa toàn bộ RefreshToken', async () => {
    await AuthService.login({ email: validEmail, password: validPass });
    await AuthService.login({ email: validEmail, password: validPass });

    const dbBefore = await getDbSnapshot(validEmail);
    expect(dbBefore.refreshTokens).toHaveLength(2);
    const oldPasswordHash = dbBefore.user!.password;
    const oldTokenIds = dbBefore.refreshTokens.map(token => token.id);

    await AuthService.changePassword(createdUserId!, {
      currentPassword: validPass,
      newPassword: newPass,
      confirmNewPassword: newPass,
    });

    const dbAfter = await getDbSnapshot(validEmail);
    expect(dbAfter.user?.id).toBe(createdUserId);
    expect(dbAfter.user!.password).not.toBe(oldPasswordHash);
    expect(await bcrypt.compare(newPass, dbAfter.user!.password)).toBe(true);
    expect(await bcrypt.compare(validPass, dbAfter.user!.password)).toBe(false);
    expect(dbAfter.refreshTokens).toEqual([]);

    const oldTokensStillInDb = await prisma.refreshToken.findMany({ where: { id: { in: oldTokenIds } } });
    expect(oldTokensStillInDb).toEqual([]);
  });
});

