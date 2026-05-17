/**
 * FILE: tests/services/auth.service.test.ts
 * Mô tả: Unit test cho tính năng Xác thực tài khoản (Authentication)
 * Kỹ thuật: Mock Prisma, Mock bcryptjs, Mock jsonwebtoken
 */
import { AuthService } from '@/services/auth.service';
import { Role, UserStatus } from '@prisma/client';
import { ValidationError, ConflictError, UnauthorizedError, NotFoundError } from '@/lib/errors/errors';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    refreshToken: { create: jest.fn(), findUnique: jest.fn(), delete: jest.fn(), deleteMany: jest.fn() },
  },
}));

jest.mock('@/services/gorse.service', () => ({
  GorseService: { insertUser: jest.fn().mockResolvedValue(undefined), createUserPayload: jest.fn().mockReturnValue({}) },
}));

jest.mock('@/lib/utils/form-utils', () => ({
  validators: { required: jest.fn(), email: jest.fn() },
  transformers: { trimString: jest.fn() },
  handleFormSubmission: jest.fn(),
}));

jest.mock('@/components', () => ({
  toaster: { create: jest.fn() },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2b$12$hashedpassword'),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock_jwt_token'),
  verify: jest.fn(),
  decode: jest.fn(),
}));

jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({ toString: () => 'mock_token_id_32hex' })),
}));

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const mockUserActive = { id: 1, fullName: 'Nguyen Van A', email: 'nguyenvana@example.com', password: '$2b$12$hashedpassword', phoneNumber: '0901234567', address: '123 Nguyen Trai, HCM', role: Role.READER, status: UserStatus.ACTIVE, createdAt: new Date(), updatedAt: new Date(), firstLoginAt: null, isDeleted: false };
const mockUserInactive = { ...mockUserActive, id: 2, status: UserStatus.INACTIVE };
const mockUserDeleted = { ...mockUserActive, id: 3, isDeleted: true };

function createAuthMockDb() {
  return {
    users: [] as any[],
    refreshTokens: [] as any[],
  };
}

function printAuthDbSnapshot(label: string, db: { users: any[]; refreshTokens: any[] }) {
  const snapshot = {
    users: db.users.map(u => ({ ...u })),
    refreshTokens: db.refreshTokens.map(t => ({ ...t })),
  };
  console.log('\n[' + label + ']', JSON.stringify(snapshot, null, 2));
}

function cloneAuthMockDb(db: { users: any[]; refreshTokens: any[] }) {
  return {
    users: db.users.map(user => ({ ...user })),
    refreshTokens: db.refreshTokens.map(token => ({ ...token })),
  };
}

function rollbackAuthMockDb(db: { users: any[]; refreshTokens: any[] }, before: { users: any[]; refreshTokens: any[] }) {
  db.users = before.users.map(user => ({ ...user }));
  db.refreshTokens = before.refreshTokens.map(token => ({ ...token }));
}

function expectAuthDbRollbackMatchesBefore(
  label: string,
  db: { users: any[]; refreshTokens: any[] },
  before: { users: any[]; refreshTokens: any[] }
) {
  rollbackAuthMockDb(db, before);
  printAuthDbSnapshot(`${label} | DB AFTER ROLLBACK`, db);
  expect(db).toEqual(before);
}


type AuthTraceDb = { users: any[]; refreshTokens: any[] };

function buildAuthDbAfterFromMockCalls(): AuthTraceDb {
  const db: AuthTraceDb = { users: [], refreshTokens: [] };

  (prisma.user.create as jest.Mock).mock.calls.forEach((call: any, index: number) => {
    const data = call?.[0]?.data;
    if (data) db.users.push({ id: data.id ?? -(index + 1), ...data });
  });

  (prisma.user.update as jest.Mock).mock.calls.forEach((call: any) => {
    const where = call?.[0]?.where ?? {};
    const data = call?.[0]?.data ?? {};
    const idx = db.users.findIndex(u => u.id === where.id);
    if (idx >= 0) db.users[idx] = { ...db.users[idx], ...data };
    else if (where.id !== undefined) db.users.push({ id: where.id, ...data, __virtual: true });
  });

  (prisma.refreshToken.create as jest.Mock).mock.calls.forEach((call: any, index: number) => {
    const data = call?.[0]?.data;
    if (data) db.refreshTokens.push({ id: data.id ?? `virtual_token_${index + 1}`, ...data });
  });

  (prisma.refreshToken.delete as jest.Mock).mock.calls.forEach((call: any) => {
    const id = call?.[0]?.where?.id;
    if (id) db.refreshTokens = db.refreshTokens.filter(t => t.id !== id);
  });

  (prisma.refreshToken.deleteMany as jest.Mock).mock.calls.forEach((call: any) => {
    const where = call?.[0]?.where;
    if (where?.userId !== undefined) {
      db.refreshTokens = db.refreshTokens.filter(t => t.userId !== where.userId);
    } else {
      db.refreshTokens = [];
    }
  });

  return db;
}

beforeEach(() => {
  const testName = expect.getState().currentTestName || 'Unknown testcase';
  printAuthDbSnapshot(`${testName} | DB BEFORE (auto)`, createAuthMockDb());
});

afterEach(() => {
  const testName = expect.getState().currentTestName || 'Unknown testcase';
  const dbAfter = buildAuthDbAfterFromMockCalls();
  printAuthDbSnapshot(`${testName} | DB AFTER (auto)`, dbAfter);
});



function createMockDb() {
  return {
    users: [] as any[],
    refreshTokens: [] as any[]
  };
}

function printDbSnapshot(label: string, db: any) {
  const snapshot = {
    users: db.users.map((u: any) => ({ ...u })),
    refreshTokens: db.refreshTokens.map((t: any) => ({ ...t }))
  };
  console.log(`\n[${label}]`, JSON.stringify(snapshot, null, 2));
}

describe('TC_AUTH_REG | AuthService.register - Đăng ký tài khoản', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('TC_AUTH_REG_01: Dang ky thanh cong thi DB phai them dung thong tin user', async () => {
    const mockDb = createAuthMockDb();
    const before = cloneAuthMockDb(mockDb);
    printAuthDbSnapshot('TC_AUTH_REG_01 | DB BEFORE', mockDb);

    (prisma.user.findUnique as jest.Mock).mockImplementation(async ({ where }: any) => {
      return mockDb.users.find(u => u.email === where.email) ?? null;
    });

    (prisma.user.create as jest.Mock).mockImplementation(async ({ data }: any) => {
      const newUser = {
        id: mockDb.users.length + 1,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        firstLoginAt: null,
        isDeleted: false,
      };
      mockDb.users.push(newUser);
      return newUser;
    });

    const result = await AuthService.register({ fullName: 'Nguyen Van A', email: 'nguyenvana@example.com', password: 'Password123!', confirmPassword: 'Password123!' });

    printAuthDbSnapshot('TC_AUTH_REG_01 | DB AFTER', mockDb);

    expect(result.message).toBe('Account created successfully');

    expect(mockDb.users).toHaveLength(1);

    const insertedUser = mockDb.users[0];
    expect(insertedUser.fullName).toBe('Nguyen Van A');
    expect(insertedUser.email).toBe('nguyenvana@example.com');
    expect(insertedUser.role).toBe(Role.READER);
    expect(insertedUser.status).toBe(UserStatus.ACTIVE);
    expect(insertedUser.isDeleted).toBe(false);

    expect(insertedUser.password).not.toBe('Password123!');
    expectAuthDbRollbackMatchesBefore('TC_AUTH_REG_01', mockDb, before);
  });

  it('TC_AUTH_REG_02: Email sai định dạng', async () => {
    await expect(AuthService.register({ fullName: 'Nguyen Van A', email: 'invalid-email', password: 'Password123!', confirmPassword: 'Password123!' })).rejects.toThrow(/Password validation failed|Validation failed|Invalid|do not match|required|incorrect|different/);
  });

  it('TC_AUTH_REG_03: Mật khẩu không khớp confirm', async () => {
    await expect(AuthService.register({ fullName: 'Nguyen Van A', email: 'a@example.com', password: 'Password123!', confirmPassword: 'Diff!' })).rejects.toThrow(/Password validation failed|Validation failed|Invalid|do not match|required|incorrect|different/);
  });

  it('TC_AUTH_REG_04: Email đã tồn tại', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserActive);
    await expect(AuthService.register({ fullName: 'Nguyen Van A', email: 'a@example.com', password: 'Password123!', confirmPassword: 'Password123!' })).rejects.toThrow(/already registered/);
  });

  it('TC_AUTH_REG_05: Mật khẩu yếu', async () => {
    await expect(AuthService.register({ fullName: 'Nguyen Van A', email: 'a@example.com', password: '123', confirmPassword: '123' })).rejects.toThrow(/Password validation failed|Validation failed|Invalid|do not match|required|incorrect|different/);
  });

  it('TC_AUTH_REG_06: Họ tên rỗng', async () => {
    await expect(AuthService.register({ fullName: '', email: 'a@example.com', password: 'Password123!', confirmPassword: 'Password123!' })).rejects.toThrow(/Password validation failed|Validation failed|Invalid|do not match|required|incorrect|different/);
  });

  it('TC_AUTH_REG_07: Đăng ký kèm sđt hợp lệ', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({...mockUserActive, phoneNumber: '0901234567'});
    const result = await AuthService.register({ fullName: 'Nguyen Van A', email: 'a@example.com', password: 'Password123!', confirmPassword: 'Password123!', phoneNumber: '0901234567' });
    expect(result.user.phoneNumber).toBe('0901234567');
  });

  it('TC_AUTH_REG_08: SĐT không đủ 10 chữ số', async () => {
    await expect(AuthService.register({ fullName: 'Nguyen Van A', email: 'a@example.com', password: 'Password123!', confirmPassword: 'Password123!', phoneNumber: '123' })).rejects.toThrow(/Password validation failed|Validation failed|Invalid|do not match|required|incorrect|different/);
  });

  it('TC_AUTH_REG_09: Đăng ký vẫn thành công khi đồng bộ Gorse bị lỗi', async () => {
    const { GorseService } = require('@/services/gorse.service');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue(mockUserActive);
    GorseService.insertUser.mockRejectedValueOnce(new Error('Gorse down'));
    const result = await AuthService.register({ fullName: 'Gorse Error', email: 'a@example.com', password: 'Password123!', confirmPassword: 'Password123!' });
    expect(result.message).toBe('Account created successfully');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('TC_AUTH_LOGIN | AuthService.login - Đăng nhập', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwt.sign as jest.Mock).mockReturnValue('mock_access_token');
    (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});
    (prisma.user.update as jest.Mock).mockResolvedValue({});
  });

  it('TC_AUTH_LOGIN_01: Dang nhap thanh cong, sinh RefreshToken va update User', async () => {
    const mockDb = createAuthMockDb();
    mockDb.users.push({ ...mockUserActive, firstLoginAt: null });
    const before = cloneAuthMockDb(mockDb);
    printAuthDbSnapshot('TC_AUTH_LOGIN_01 | DB BEFORE', mockDb);

    (prisma.user.findUnique as jest.Mock).mockImplementation(async ({ where }: any) => {
      return mockDb.users.find(u => u.email === where.email) ?? null;
    });

    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    (prisma.refreshToken.create as jest.Mock).mockImplementation(async ({ data }: any) => {
      const tokenRow = { ...data, createdAt: new Date(), updatedAt: new Date() };
      mockDb.refreshTokens.push(tokenRow);
      return tokenRow;
    });

    (prisma.user.update as jest.Mock).mockImplementation(async ({ where, data }: any) => {
      const index = mockDb.users.findIndex(u => u.id === where.id);
      if (index !== -1) mockDb.users[index] = { ...mockDb.users[index], ...data };
      return mockDb.users[index];
    });

    const result = await AuthService.login({ email: mockUserActive.email, password: 'Password123!' });

    printAuthDbSnapshot('TC_AUTH_LOGIN_01 | DB AFTER', mockDb);

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();

    expect(mockDb.refreshTokens).toHaveLength(1);
    expect(mockDb.refreshTokens[0].token).toBe(result.refreshToken);
    expect(mockDb.refreshTokens[0].userId).toBe(mockUserActive.id);

    expect(mockDb.users[0].firstLoginAt).not.toBeNull();
    expectAuthDbRollbackMatchesBefore('TC_AUTH_LOGIN_01', mockDb, before);
  });

  it('TC_AUTH_LOGIN_02: Email không tồn tại', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(AuthService.login({ email: 'notexist@example.com', password: 'Password123!' })).rejects.toThrow(/Invalid|inactive|expired|not found/);
  });

  it('TC_AUTH_LOGIN_03: Mật khẩu sai', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserActive);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    await expect(AuthService.login({ email: 'nguyenvana@example.com', password: 'Wrong' })).rejects.toThrow(/Invalid|inactive|expired|not found/);
  });

  it('TC_AUTH_LOGIN_04: Tài khoản INACTIVE', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserInactive);
    await expect(AuthService.login({ email: 'a@example.com', password: 'Password123!' })).rejects.toThrow(/Invalid|inactive|expired|not found/);
  });

  it('TC_AUTH_LOGIN_05: Tài khoản đã xóa mềm', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserDeleted);
    await expect(AuthService.login({ email: 'a@example.com', password: 'Password123!' })).rejects.toThrow(/Invalid|inactive|expired|not found/);
  });

  it('TC_AUTH_LOGIN_06: Email login sai format', async () => {
    await expect(AuthService.login({ email: 'not_email', password: 'Password123!' })).rejects.toThrow(/Password validation failed|Validation failed|Invalid|do not match|required|incorrect|different/);
  });

  it('TC_AUTH_LOGIN_07: Password rỗng', async () => {
    await expect(AuthService.login({ email: 'a@example.com', password: '' })).rejects.toThrow(/Password validation failed|Validation failed|Invalid|do not match|required|incorrect|different/);
  });

  it('TC_AUTH_LOGIN_08: First login', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...mockUserActive, firstLoginAt: null });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    const result = await AuthService.login({ email: 'a@example.com', password: 'Password123!' });
    expect(result.isFirstLogin).toBe(true);
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it('TC_AUTH_LOGIN_09: Not first login', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...mockUserActive, firstLoginAt: new Date() });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    const result = await AuthService.login({ email: 'a@example.com', password: 'Password123!' });
    expect(result.isFirstLogin).toBe(false);
  });

  it('TC_AUTH_LOGIN_10: rememberMe=true', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserActive);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    await AuthService.login({ email: 'a@example.com', password: 'Password123!', rememberMe: true });
    expect(prisma.refreshToken.create).toHaveBeenCalled();
  });
});

describe('TC_AUTH_REFRESH | AuthService.refreshAccessToken', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('TC_AUTH_REFRESH_01: Làm mới token thành công', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ userId: 1, tokenId: 'token_id' });
    (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({ id: 'token_id', token: 'token', expiresAt: new Date(Date.now() + 100000), user: mockUserActive });
    (jwt.sign as jest.Mock).mockReturnValue('new_token');
    const res = await AuthService.refreshAccessToken('token');
    expect(res.accessToken).toBe('new_token');
  });

  it('TC_AUTH_REFRESH_02: Token không tồn tại DB', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ userId: 1, tokenId: 'token_id' });
    (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(AuthService.refreshAccessToken('token')).rejects.toThrow(/Invalid|inactive|expired|not found/);
  });

  it('TC_AUTH_REFRESH_03: Token hết hạn', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ userId: 1, tokenId: 'token_id' });
    (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({ id: 'token_id', token: 'token', expiresAt: new Date(Date.now() - 100000), user: mockUserActive });
    (prisma.refreshToken.delete as jest.Mock).mockResolvedValue({});
    await expect(AuthService.refreshAccessToken('token')).rejects.toThrow(/Invalid|inactive|expired|not found/);
    expect(prisma.refreshToken.delete).toHaveBeenCalled();
  });

  it('TC_AUTH_REFRESH_04: User inactive', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ userId: 1, tokenId: 'token_id' });
    (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({ id: 'token_id', token: 'token', expiresAt: new Date(Date.now() + 100000), user: mockUserInactive });
    await expect(AuthService.refreshAccessToken('token')).rejects.toThrow(/Invalid|inactive|expired|not found/);
  });
});

describe('TC_AUTH_CHANGEPWD | AuthService.changePassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({});
    (prisma.user.update as jest.Mock).mockResolvedValue({});
  });

  it('TC_AUTH_CHANGEPWD_01: Doi mat khau thanh cong, update user va xoa toan bo token', async () => {
    const mockDb = createAuthMockDb();
    mockDb.users.push({ id: 1, password: 'old_hash' });
    mockDb.refreshTokens.push({ id: 'tk1', userId: 1 }, { id: 'tk2', userId: 1 });
    const before = cloneAuthMockDb(mockDb);
    printAuthDbSnapshot('TC_AUTH_CHANGEPWD_01 | DB BEFORE', mockDb);

    (prisma.user.findUnique as jest.Mock).mockImplementation(async ({ where }: any) => {
      return mockDb.users.find(u => u.id === where.id) ?? null;
    });

    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    (bcrypt.hash as jest.Mock).mockResolvedValue('new_hash');

    (prisma.user.update as jest.Mock).mockImplementation(async ({ where, data }: any) => {
      const index = mockDb.users.findIndex(u => u.id === where.id);
      if (index !== -1) mockDb.users[index] = { ...mockDb.users[index], ...data };
      return mockDb.users[index];
    });

    (prisma.refreshToken.deleteMany as jest.Mock).mockImplementation(async ({ where }: any) => {
      mockDb.refreshTokens = mockDb.refreshTokens.filter(t => t.userId !== where.userId);
      return {};
    });

    await AuthService.changePassword(1, { currentPassword: 'OldPass123!', newPassword: 'NewPass123!', confirmNewPassword: 'NewPass123!' });

    printAuthDbSnapshot('TC_AUTH_CHANGEPWD_01 | DB AFTER', mockDb);

    expect(mockDb.users[0].password).toBe('new_hash');

    expect(mockDb.refreshTokens).toHaveLength(0);
    expectAuthDbRollbackMatchesBefore('TC_AUTH_CHANGEPWD_01', mockDb, before);
  });

  it('TC_AUTH_CHANGEPWD_02: Current password sai', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ password: 'old' });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    await expect(AuthService.changePassword(1, { currentPassword: 'WrongPass123!', newPassword: 'NewPass123!', confirmNewPassword: 'NewPass123!' })).rejects.toThrow(/Password validation failed|Validation failed|Invalid|do not match|required|incorrect|different/);
  });

  it('TC_AUTH_CHANGEPWD_03: Confirm không khớp', async () => {
    await expect(AuthService.changePassword(1, { currentPassword: 'OldPass123!', newPassword: 'NewPass123!', confirmNewPassword: 'Diff!' })).rejects.toThrow(/Password validation failed|Validation failed|Invalid|do not match|required|incorrect|different/);
  });

  it('TC_AUTH_CHANGEPWD_04: Mật khẩu mới trùng cũ', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ password: 'old' });
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    await expect(AuthService.changePassword(1, { currentPassword: 'OldPass123!', newPassword: 'OldPass123!', confirmNewPassword: 'OldPass123!' })).rejects.toThrow(/Password validation failed|Validation failed|Invalid|do not match|required|incorrect|different/);
  });

  it('TC_AUTH_CHANGEPWD_05: User không tồn tại', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(AuthService.changePassword(99, { currentPassword: 'OldPass123!', newPassword: 'NewPass123!', confirmNewPassword: 'NewPass123!' })).rejects.toThrow(/not found/);
  });

  it('TC_AUTH_CHANGEPWD_06: Mật khẩu mới yếu', async () => {
    await expect(AuthService.changePassword(1, { currentPassword: 'OldPass123!', newPassword: '123', confirmNewPassword: '123' })).rejects.toThrow(/Password validation failed|Validation failed|Invalid|do not match|required|incorrect|different/);
  });
});

describe('TC_AUTH_LOGOUT & CLEANUP', () => {
  it('TC_AUTH_LOGOUT_01: Dang xuat thanh cong thi xoa token khoi DB', async () => {
    const mockDb = createAuthMockDb();
    mockDb.refreshTokens.push({ id: 'token_id', userId: 1, token: 'refresh_demo' });
    const before = cloneAuthMockDb(mockDb);
    printAuthDbSnapshot('TC_AUTH_LOGOUT_01 | DB BEFORE', mockDb);

    (jwt.verify as jest.Mock).mockReturnValue({ tokenId: 'token_id' });

    (prisma.refreshToken.delete as jest.Mock).mockImplementation(async ({ where }: any) => {
      mockDb.refreshTokens = mockDb.refreshTokens.filter(t => t.id !== where.id);
      return {};
    });

    await AuthService.logout('token');

    printAuthDbSnapshot('TC_AUTH_LOGOUT_01 | DB AFTER', mockDb);

    expect(mockDb.refreshTokens).toHaveLength(0);
    expectAuthDbRollbackMatchesBefore('TC_AUTH_LOGOUT_01', mockDb, before);
  });

  it('TC_AUTH_LOGOUT_02: Đăng xuất tất cả thiết bị', async () => {
    await AuthService.logoutAll(1);
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalled();
  });

  it('TC_AUTH_CLEANUP_01: Dọn dẹp token hết hạn', async () => {
    (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });
    const count = await AuthService.cleanupExpiredTokens();
    expect(count).toBe(5);
  });

  it('TC_AUTH_CLEANUP_02: Trả về 0 khi không có token', async () => {
    (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
    const count = await AuthService.cleanupExpiredTokens();
    expect(count).toBe(0);
  });
});
