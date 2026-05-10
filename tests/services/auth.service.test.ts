/**
 * FILE: tests/services/auth.service.test.ts
 * Mô tả: Unit test cho tính năng Xác thực tài khoản (Authentication)
 * Kỹ thuật: Mock Prisma, Mock bcryptjs, Mock jsonwebtoken
 */
import { AuthService } from '@/services/auth.service';
import { Role, UserStatus } from '@prisma/client';
import { ValidationError, ConflictError, UnauthorizedError, NotFoundError } from '@/lib/errors/errors';

// Giả lập (mock) Prisma để không thao tác trực tiếp với Database thật
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    refreshToken: { create: jest.fn(), findUnique: jest.fn(), delete: jest.fn(), deleteMany: jest.fn() },
  },
}));

// Giả lập GorseService (hệ thống recommendation) để không gọi API ra ngoài
jest.mock('@/services/gorse.service', () => ({
  GorseService: { insertUser: jest.fn().mockResolvedValue(undefined), createUserPayload: jest.fn().mockReturnValue({}) },
}));

// Giả lập các tiện ích form để tránh lỗi cú pháp JSX khi import
jest.mock('@/lib/utils/form-utils', () => ({
  validators: { required: jest.fn(), email: jest.fn() },
  transformers: { trimString: jest.fn() },
  handleFormSubmission: jest.fn(),
}));

// Giả lập các component UI (ví dụ toaster)
jest.mock('@/components', () => ({
  toaster: { create: jest.fn() },
}));

// Giả lập thư viện mã hóa mật khẩu bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2b$12$hashedpassword'),
  compare: jest.fn(),
}));

// Giả lập thư viện xử lý token JWT
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock_jwt_token'),
  verify: jest.fn(),
  decode: jest.fn(),
}));

// Giả lập thư viện crypto tạo chuỗi ngẫu nhiên
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({ toString: () => 'mock_token_id_32hex' })),
}));

// Import các thư viện đã được mock ở trên
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Chuẩn bị dữ liệu mẫu cho user đang hoạt động
const mockUserActive = { id: 1, fullName: 'Nguyen Van A', email: 'nguyenvana@example.com', password: '$2b$12$hashedpassword', phoneNumber: '0901234567', address: '123 Nguyen Trai, HCM', role: Role.READER, status: UserStatus.ACTIVE, createdAt: new Date(), updatedAt: new Date(), firstLoginAt: null, isDeleted: false };
// Chuẩn bị dữ liệu mẫu cho user bị vô hiệu hóa
const mockUserInactive = { ...mockUserActive, id: 2, status: UserStatus.INACTIVE };
// Chuẩn bị dữ liệu mẫu cho user đã bị xóa
const mockUserDeleted = { ...mockUserActive, id: 3, isDeleted: true };

describe('TC_AUTH_REG | AuthService.register - Đăng ký tài khoản', () => {
  // Xóa toàn bộ lịch sử gọi hàm mock trước mỗi test
  beforeEach(() => { jest.clearAllMocks(); });

  it('TC_AUTH_REG_01: Đăng ký thành công với dữ liệu hợp lệ', async () => {
    // Giả lập: tìm user theo email trả về null (email chưa tồn tại)
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    // Giả lập: lệnh tạo user trả về thông tin user mới
    (prisma.user.create as jest.Mock).mockResolvedValue(mockUserActive);
    // Gọi hàm đăng ký với dữ liệu hợp lệ
    const result = await AuthService.register({ fullName: 'Nguyen Van A', email: 'nguyenvana@example.com', password: 'Password123!', confirmPassword: 'Password123!' });
    // Kiểm tra: message trả về đúng yêu cầu
    expect(result.message).toBe('Account created successfully');
    // Kiểm tra: lệnh tạo user trong DB được gọi đúng 1 lần
    expect(prisma.user.create).toHaveBeenCalledTimes(1);
  });

  it('TC_AUTH_REG_02: Email sai định dạng', async () => {
    // Gọi hàm đăng ký với email không có chữ @
    // Kiểm tra: Hàm phải ném ra lỗi validation
    await expect(AuthService.register({ fullName: 'Nguyen Van A', email: 'invalid-email', password: 'Password123!', confirmPassword: 'Password123!' })).rejects.toThrow(/Password validation failed|Validation failed|Invalid|do not match|required|incorrect|different/);
  });

  it('TC_AUTH_REG_03: Mật khẩu không khớp confirm', async () => {
    // Gọi hàm đăng ký với mật khẩu và mật khẩu xác nhận khác nhau
    // Kiểm tra: Hàm phải ném ra lỗi validation
    await expect(AuthService.register({ fullName: 'Nguyen Van A', email: 'a@example.com', password: 'Password123!', confirmPassword: 'Diff!' })).rejects.toThrow(/Password validation failed|Validation failed|Invalid|do not match|required|incorrect|different/);
  });

  it('TC_AUTH_REG_04: Email đã tồn tại', async () => {
    // Giả lập: tìm user theo email trả về thông tin user (email đã tồn tại)
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserActive);
    // Gọi hàm đăng ký với email cũ
    // Kiểm tra: Hàm phải ném ra lỗi đã tồn tại (ConflictError)
    await expect(AuthService.register({ fullName: 'Nguyen Van A', email: 'a@example.com', password: 'Password123!', confirmPassword: 'Password123!' })).rejects.toThrow(/already registered/);
  });

  it('TC_AUTH_REG_05: Mật khẩu yếu', async () => {
    // Gọi hàm đăng ký với mật khẩu quá ngắn và không có ký tự đặc biệt
    // Kiểm tra: Hàm phải ném ra lỗi validation
    await expect(AuthService.register({ fullName: 'Nguyen Van A', email: 'a@example.com', password: '123', confirmPassword: '123' })).rejects.toThrow(/Password validation failed|Validation failed|Invalid|do not match|required|incorrect|different/);
  });

  it('TC_AUTH_REG_06: Họ tên rỗng', async () => {
    // Gọi hàm đăng ký với fullName rỗng
    // Kiểm tra: Hàm phải ném ra lỗi validation
    await expect(AuthService.register({ fullName: '', email: 'a@example.com', password: 'Password123!', confirmPassword: 'Password123!' })).rejects.toThrow(/Password validation failed|Validation failed|Invalid|do not match|required|incorrect|different/);
  });

  it('TC_AUTH_REG_07: Đăng ký kèm sđt hợp lệ', async () => {
    // Giả lập: email chưa tồn tại
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    // Giả lập: tạo user thành công kèm số điện thoại
    (prisma.user.create as jest.Mock).mockResolvedValue({...mockUserActive, phoneNumber: '0901234567'});
    // Gọi hàm đăng ký
    const result = await AuthService.register({ fullName: 'Nguyen Van A', email: 'a@example.com', password: 'Password123!', confirmPassword: 'Password123!', phoneNumber: '0901234567' });
    // Kiểm tra: số điện thoại được trả về đúng
    expect(result.user.phoneNumber).toBe('0901234567');
  });

  it('TC_AUTH_REG_08: SĐT không đủ 10 chữ số', async () => {
    // Gọi hàm đăng ký với số điện thoại quá ngắn
    // Kiểm tra: Hàm phải ném ra lỗi validation
    await expect(AuthService.register({ fullName: 'Nguyen Van A', email: 'a@example.com', password: 'Password123!', confirmPassword: 'Password123!', phoneNumber: '123' })).rejects.toThrow(/Password validation failed|Validation failed|Invalid|do not match|required|incorrect|different/);
  });

  it('TC_AUTH_REG_09: Đăng ký vẫn thành công khi đồng bộ Gorse bị lỗi', async () => {
    // Require lại GorseService để lấy mock
    const { GorseService } = require('@/services/gorse.service');
    // Mock console.error để tránh in log đỏ ra terminal khi chạy test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // Giả lập: email chưa tồn tại
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    // Giả lập: tạo user trong MySQL thành công
    (prisma.user.create as jest.Mock).mockResolvedValue(mockUserActive);
    // Giả lập: Gorse đồng bộ thất bại
    GorseService.insertUser.mockRejectedValueOnce(new Error('Gorse down'));
    // Gọi hàm đăng ký
    const result = await AuthService.register({ fullName: 'Gorse Error', email: 'a@example.com', password: 'Password123!', confirmPassword: 'Password123!' });
    // Kiểm tra: đăng ký vẫn thành công (không bị crash)
    expect(result.message).toBe('Account created successfully');
    // Kiểm tra: console.error đã ghi nhận lỗi đồng bộ
    expect(consoleSpy).toHaveBeenCalled();
    // Phục hồi lại console.error
    consoleSpy.mockRestore();
  });
});

describe('TC_AUTH_LOGIN | AuthService.login - Đăng nhập', () => {
  beforeEach(() => {
    // Xóa lịch sử gọi hàm
    jest.clearAllMocks();
    // Giả lập: tạo token JWT thành công
    (jwt.sign as jest.Mock).mockReturnValue('mock_access_token');
    // Giả lập: lưu refresh token vào DB thành công
    (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});
    // Giả lập: cập nhật user thành công
    (prisma.user.update as jest.Mock).mockResolvedValue({});
  });

  it('TC_AUTH_LOGIN_01: Đăng nhập thành công', async () => {
    // Giả lập: tìm thấy user trong DB
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserActive);
    // Giả lập: so sánh mật khẩu đúng
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    // Gọi hàm đăng nhập
    const result = await AuthService.login({ email: 'nguyenvana@example.com', password: 'Password123!' });
    // Kiểm tra: kết quả trả về có chứa access token
    expect(result.accessToken).toBeDefined();
  });

  it('TC_AUTH_LOGIN_02: Email không tồn tại', async () => {
    // Giả lập: không tìm thấy user
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    // Kiểm tra: phải ném lỗi Unauthorized
    await expect(AuthService.login({ email: 'notexist@example.com', password: 'Password123!' })).rejects.toThrow(/Invalid|inactive|expired|not found/);
  });

  it('TC_AUTH_LOGIN_03: Mật khẩu sai', async () => {
    // Giả lập: tìm thấy user
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserActive);
    // Giả lập: so sánh mật khẩu bị sai
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    // Kiểm tra: phải ném lỗi Unauthorized
    await expect(AuthService.login({ email: 'nguyenvana@example.com', password: 'Wrong' })).rejects.toThrow(/Invalid|inactive|expired|not found/);
  });

  it('TC_AUTH_LOGIN_04: Tài khoản INACTIVE', async () => {
    // Giả lập: tìm thấy user nhưng bị khóa
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserInactive);
    // Kiểm tra: phải ném lỗi
    await expect(AuthService.login({ email: 'a@example.com', password: 'Password123!' })).rejects.toThrow(/Invalid|inactive|expired|not found/);
  });

  it('TC_AUTH_LOGIN_05: Tài khoản đã xóa mềm', async () => {
    // Giả lập: tìm thấy user nhưng đã bị xóa (isDeleted = true)
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserDeleted);
    // Kiểm tra: phải ném lỗi
    await expect(AuthService.login({ email: 'a@example.com', password: 'Password123!' })).rejects.toThrow(/Invalid|inactive|expired|not found/);
  });

  it('TC_AUTH_LOGIN_06: Email login sai format', async () => {
    // Kiểm tra: nhập email sai định dạng sẽ ném lỗi Validation
    await expect(AuthService.login({ email: 'not_email', password: 'Password123!' })).rejects.toThrow(/Password validation failed|Validation failed|Invalid|do not match|required|incorrect|different/);
  });

  it('TC_AUTH_LOGIN_07: Password rỗng', async () => {
    // Kiểm tra: bỏ trống mật khẩu sẽ ném lỗi Validation
    await expect(AuthService.login({ email: 'a@example.com', password: '' })).rejects.toThrow(/Password validation failed|Validation failed|Invalid|do not match|required|incorrect|different/);
  });

  it('TC_AUTH_LOGIN_08: First login', async () => {
    // Giả lập: user chưa từng đăng nhập (firstLoginAt = null)
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...mockUserActive, firstLoginAt: null });
    // Giả lập: mật khẩu đúng
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    // Gọi hàm đăng nhập
    const result = await AuthService.login({ email: 'a@example.com', password: 'Password123!' });
    // Kiểm tra: cờ isFirstLogin = true
    expect(result.isFirstLogin).toBe(true);
    // Kiểm tra: lệnh update user (cập nhật ngày login) phải được gọi
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it('TC_AUTH_LOGIN_09: Not first login', async () => {
    // Giả lập: user đã từng đăng nhập
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...mockUserActive, firstLoginAt: new Date() });
    // Giả lập: mật khẩu đúng
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    // Gọi hàm đăng nhập
    const result = await AuthService.login({ email: 'a@example.com', password: 'Password123!' });
    // Kiểm tra: cờ isFirstLogin = false
    expect(result.isFirstLogin).toBe(false);
  });

  it('TC_AUTH_LOGIN_10: rememberMe=true', async () => {
    // Giả lập: tìm thấy user và mật khẩu đúng
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserActive);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    // Gọi đăng nhập có truyền rememberMe = true
    await AuthService.login({ email: 'a@example.com', password: 'Password123!', rememberMe: true });
    // Kiểm tra: lệnh tạo refresh token phải được gọi
    expect(prisma.refreshToken.create).toHaveBeenCalled();
  });
});

describe('TC_AUTH_REFRESH | AuthService.refreshAccessToken', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('TC_AUTH_REFRESH_01: Làm mới token thành công', async () => {
    // Giả lập: giải mã JWT thành công
    (jwt.verify as jest.Mock).mockReturnValue({ userId: 1, tokenId: 'token_id' });
    // Giả lập: refresh token tồn tại trong DB và chưa hết hạn
    (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({ id: 'token_id', token: 'token', expiresAt: new Date(Date.now() + 100000), user: mockUserActive });
    // Giả lập: tạo token mới thành công
    (jwt.sign as jest.Mock).mockReturnValue('new_token');
    // Gọi hàm refresh
    const res = await AuthService.refreshAccessToken('token');
    // Kiểm tra: trả về đúng token mới
    expect(res.accessToken).toBe('new_token');
  });

  it('TC_AUTH_REFRESH_02: Token không tồn tại DB', async () => {
    // Giả lập: giải mã JWT thành công nhưng không có trong DB
    (jwt.verify as jest.Mock).mockReturnValue({ userId: 1, tokenId: 'token_id' });
    (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);
    // Kiểm tra: phải ném lỗi
    await expect(AuthService.refreshAccessToken('token')).rejects.toThrow(/Invalid|inactive|expired|not found/);
  });

  it('TC_AUTH_REFRESH_03: Token hết hạn', async () => {
    // Giả lập: giải mã JWT thành công
    (jwt.verify as jest.Mock).mockReturnValue({ userId: 1, tokenId: 'token_id' });
    // Giả lập: token trong DB đã hết hạn
    (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({ id: 'token_id', token: 'token', expiresAt: new Date(Date.now() - 100000), user: mockUserActive });
    (prisma.refreshToken.delete as jest.Mock).mockResolvedValue({});
    // Kiểm tra: phải ném lỗi
    await expect(AuthService.refreshAccessToken('token')).rejects.toThrow(/Invalid|inactive|expired|not found/);
    // Kiểm tra: token hết hạn phải bị xóa khỏi DB
    expect(prisma.refreshToken.delete).toHaveBeenCalled();
  });

  it('TC_AUTH_REFRESH_04: User inactive', async () => {
    // Giả lập: giải mã thành công
    (jwt.verify as jest.Mock).mockReturnValue({ userId: 1, tokenId: 'token_id' });
    // Giả lập: user của token bị khóa
    (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({ id: 'token_id', token: 'token', expiresAt: new Date(Date.now() + 100000), user: mockUserInactive });
    // Kiểm tra: phải ném lỗi
    await expect(AuthService.refreshAccessToken('token')).rejects.toThrow(/Invalid|inactive|expired|not found/);
  });
});

describe('TC_AUTH_CHANGEPWD | AuthService.changePassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Giả lập lệnh xóa mọi token và cập nhật user
    (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({});
    (prisma.user.update as jest.Mock).mockResolvedValue({});
  });

  it('TC_AUTH_CHANGEPWD_01: Đổi mật khẩu thành công', async () => {
    // Giả lập: tìm user thành công
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ password: 'old' });
    // Giả lập: mật khẩu cũ nhập vào ĐÚNG (lần 1) và mật khẩu mới KHÁC mật khẩu cũ (lần 2)
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    // Giả lập: băm mật khẩu mới thành công
    (bcrypt.hash as jest.Mock).mockResolvedValue('new_hash');
    // Gọi hàm đổi mật khẩu
    await AuthService.changePassword(1, { currentPassword: 'OldPass123!', newPassword: 'NewPass123!', confirmNewPassword: 'NewPass123!' });
    // Kiểm tra: mật khẩu được cập nhật trong DB
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it('TC_AUTH_CHANGEPWD_02: Current password sai', async () => {
    // Giả lập: tìm user thành công
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ password: 'old' });
    // Giả lập: mật khẩu cũ nhập vào BỊ SAI
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    // Kiểm tra: phải ném lỗi validation
    await expect(AuthService.changePassword(1, { currentPassword: 'WrongPass123!', newPassword: 'NewPass123!', confirmNewPassword: 'NewPass123!' })).rejects.toThrow(/Password validation failed|Validation failed|Invalid|do not match|required|incorrect|different/);
  });

  it('TC_AUTH_CHANGEPWD_03: Confirm không khớp', async () => {
    // Gọi hàm với mật khẩu mới và xác nhận khác nhau
    // Kiểm tra: phải ném lỗi validation
    await expect(AuthService.changePassword(1, { currentPassword: 'OldPass123!', newPassword: 'NewPass123!', confirmNewPassword: 'Diff!' })).rejects.toThrow(/Password validation failed|Validation failed|Invalid|do not match|required|incorrect|different/);
  });

  it('TC_AUTH_CHANGEPWD_04: Mật khẩu mới trùng cũ', async () => {
    // Giả lập: tìm user thành công
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ password: 'old' });
    // Giả lập: mật khẩu cũ ĐÚNG và mật khẩu mới GIỐNG mật khẩu cũ
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    // Kiểm tra: phải ném lỗi
    await expect(AuthService.changePassword(1, { currentPassword: 'OldPass123!', newPassword: 'OldPass123!', confirmNewPassword: 'OldPass123!' })).rejects.toThrow(/Password validation failed|Validation failed|Invalid|do not match|required|incorrect|different/);
  });

  it('TC_AUTH_CHANGEPWD_05: User không tồn tại', async () => {
    // Giả lập: không tìm thấy user
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    // Kiểm tra: phải ném lỗi
    await expect(AuthService.changePassword(99, { currentPassword: 'OldPass123!', newPassword: 'NewPass123!', confirmNewPassword: 'NewPass123!' })).rejects.toThrow(/not found/);
  });

  it('TC_AUTH_CHANGEPWD_06: Mật khẩu mới yếu', async () => {
    // Gọi hàm với mật khẩu mới quá ngắn
    // Kiểm tra: ném lỗi
    await expect(AuthService.changePassword(1, { currentPassword: 'OldPass123!', newPassword: '123', confirmNewPassword: '123' })).rejects.toThrow(/Password validation failed|Validation failed|Invalid|do not match|required|incorrect|different/);
  });
});

describe('TC_AUTH_LOGOUT & CLEANUP', () => {
  it('TC_AUTH_LOGOUT_01: Đăng xuất thành công', async () => {
    // Giả lập: giải mã token
    (jwt.verify as jest.Mock).mockReturnValue({ tokenId: 'token_id' });
    // Gọi hàm đăng xuất
    await AuthService.logout('token');
    // Kiểm tra: token bị xóa khỏi DB
    expect(prisma.refreshToken.delete).toHaveBeenCalled();
  });

  it('TC_AUTH_LOGOUT_02: Đăng xuất tất cả thiết bị', async () => {
    // Gọi hàm đăng xuất mọi thiết bị
    await AuthService.logoutAll(1);
    // Kiểm tra: xóa mọi token của user này
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalled();
  });

  it('TC_AUTH_CLEANUP_01: Dọn dẹp token hết hạn', async () => {
    // Giả lập: lệnh xóa trả về 5 dòng bị ảnh hưởng
    (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });
    // Gọi hàm dọn dẹp
    const count = await AuthService.cleanupExpiredTokens();
    // Kiểm tra: đúng 5 dòng
    expect(count).toBe(5);
  });

  it('TC_AUTH_CLEANUP_02: Trả về 0 khi không có token', async () => {
    // Giả lập: lệnh xóa trả về 0 dòng
    (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
    const count = await AuthService.cleanupExpiredTokens();
    expect(count).toBe(0);
  });
});