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

// ==========================================
// HELPER: QUAN LY DATABASE GIA LAP CHO AUTH
// ==========================================
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
  // DB before m?c ??nh tr?ng trong unit test n?u testcase kh?ng seed ri?ng
  printAuthDbSnapshot(`${testName} | DB BEFORE (auto)`, createAuthMockDb());
});

afterEach(() => {
  const testName = expect.getState().currentTestName || 'Unknown testcase';
  const dbAfter = buildAuthDbAfterFromMockCalls();
  printAuthDbSnapshot(`${testName} | DB AFTER (auto)`, dbAfter);
});



// ==========================================
// HELPER: QU?N L? DATABASE GI? L?P
// ==========================================
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
  // Xóa toàn bộ lịch sử gọi hàm mock trước mỗi test
  beforeEach(() => { jest.clearAllMocks(); });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTH_REG_01: Dang ky thanh cong thi DB phai them dung thong tin user', async () => {
    // 1) TAO DB GIA LAP BAN DAU (truoc test chua co user)
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const mockDb = createAuthMockDb();
    // Giải thích: In DB BEFORE ra console để thấy dữ liệu trước khi chạy action.
    printAuthDbSnapshot('TC_AUTH_REG_01 | DB BEFORE', mockDb);

    // 2) MOCK PRISMA findUnique: tim user theo email trong DB gia
    // Giải thích: Mock Prisma bằng logic thật trên mảng DB giả lập để mô phỏng thao tác DB.
    (prisma.user.findUnique as jest.Mock).mockImplementation(async ({ where }: any) => {
      // Giải thích: Trả dữ liệu mock về cho service/API như kết quả từ DB.
      return mockDb.users.find(u => u.email === where.email) ?? null;
    // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
    });

    // 3) MOCK PRISMA create: chen user moi vao DB gia
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

    // 4) CHAY NGHIEP VU DANG KY
    const result = await AuthService.register({ fullName: 'Nguyen Van A', email: 'nguyenvana@example.com', password: 'Password123!', confirmPassword: 'Password123!' });

    // 5) IN DB SAU KHI CHAY DE SO SANH
    printAuthDbSnapshot('TC_AUTH_REG_01 | DB AFTER', mockDb);

    // 6) ASSERT NGHIEP VU
    expect(result.message).toBe('Account created successfully');

    // 7) ASSERT DB THAY DOI: tu 0 user -> 1 user
    expect(mockDb.users).toHaveLength(1);

    // 8) ASSERT CHI TIET DU LIEU VUA THEM VAO DB
    const insertedUser = mockDb.users[0];
    expect(insertedUser.fullName).toBe('Nguyen Van A');
    expect(insertedUser.email).toBe('nguyenvana@example.com');
    expect(insertedUser.role).toBe(Role.READER);
    expect(insertedUser.status).toBe(UserStatus.ACTIVE);
    expect(insertedUser.isDeleted).toBe(false);

    // 9) ASSERT BAO MAT: password luu trong DB khong phai plaintext
    expect(insertedUser.password).not.toBe('Password123!');
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTH_REG_02: Email sai định dạng', async () => {
    // Gọi hàm đăng ký với email không có chữ @
    // Kiểm tra: Hàm phải ném ra lỗi validation
    // Giải thích: Kiểm tra promise phải bị reject và ném đúng lỗi mong đợi.
    await expect(AuthService.register({ fullName: 'Nguyen Van A', email: 'invalid-email', password: 'Password123!', confirmPassword: 'Password123!' })).rejects.toThrow(/Password validation failed|Validation failed|Invalid|do not match|required|incorrect|different/);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTH_REG_03: Mật khẩu không khớp confirm', async () => {
    // Gọi hàm đăng ký với mật khẩu và mật khẩu xác nhận khác nhau
    // Kiểm tra: Hàm phải ném ra lỗi validation
    // Giải thích: Kiểm tra promise phải bị reject và ném đúng lỗi mong đợi.
    await expect(AuthService.register({ fullName: 'Nguyen Van A', email: 'a@example.com', password: 'Password123!', confirmPassword: 'Diff!' })).rejects.toThrow(/Password validation failed|Validation failed|Invalid|do not match|required|incorrect|different/);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTH_REG_04: Email đã tồn tại', async () => {
    // Giả lập: tìm user theo email trả về thông tin user (email đã tồn tại)
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserActive);
    // Gọi hàm đăng ký với email cũ
    // Kiểm tra: Hàm phải ném ra lỗi đã tồn tại (ConflictError)
    // Giải thích: Kiểm tra promise phải bị reject và ném đúng lỗi mong đợi.
    await expect(AuthService.register({ fullName: 'Nguyen Van A', email: 'a@example.com', password: 'Password123!', confirmPassword: 'Password123!' })).rejects.toThrow(/already registered/);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTH_REG_05: Mật khẩu yếu', async () => {
    // Gọi hàm đăng ký với mật khẩu quá ngắn và không có ký tự đặc biệt
    // Kiểm tra: Hàm phải ném ra lỗi validation
    // Giải thích: Kiểm tra promise phải bị reject và ném đúng lỗi mong đợi.
    await expect(AuthService.register({ fullName: 'Nguyen Van A', email: 'a@example.com', password: '123', confirmPassword: '123' })).rejects.toThrow(/Password validation failed|Validation failed|Invalid|do not match|required|incorrect|different/);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTH_REG_06: Họ tên rỗng', async () => {
    // Gọi hàm đăng ký với fullName rỗng
    // Kiểm tra: Hàm phải ném ra lỗi validation
    // Giải thích: Kiểm tra promise phải bị reject và ném đúng lỗi mong đợi.
    await expect(AuthService.register({ fullName: '', email: 'a@example.com', password: 'Password123!', confirmPassword: 'Password123!' })).rejects.toThrow(/Password validation failed|Validation failed|Invalid|do not match|required|incorrect|different/);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTH_REG_07: Đăng ký kèm sđt hợp lệ', async () => {
    // Giả lập: email chưa tồn tại
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    // Giả lập: tạo user thành công kèm số điện thoại
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (prisma.user.create as jest.Mock).mockResolvedValue({...mockUserActive, phoneNumber: '0901234567'});
    // Gọi hàm đăng ký
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const result = await AuthService.register({ fullName: 'Nguyen Van A', email: 'a@example.com', password: 'Password123!', confirmPassword: 'Password123!', phoneNumber: '0901234567' });
    // Kiểm tra: số điện thoại được trả về đúng
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(result.user.phoneNumber).toBe('0901234567');
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTH_REG_08: SĐT không đủ 10 chữ số', async () => {
    // Gọi hàm đăng ký với số điện thoại quá ngắn
    // Kiểm tra: Hàm phải ném ra lỗi validation
    // Giải thích: Kiểm tra promise phải bị reject và ném đúng lỗi mong đợi.
    await expect(AuthService.register({ fullName: 'Nguyen Van A', email: 'a@example.com', password: 'Password123!', confirmPassword: 'Password123!', phoneNumber: '123' })).rejects.toThrow(/Password validation failed|Validation failed|Invalid|do not match|required|incorrect|different/);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTH_REG_09: Đăng ký vẫn thành công khi đồng bộ Gorse bị lỗi', async () => {
    // Require lại GorseService để lấy mock
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const { GorseService } = require('@/services/gorse.service');
    // Mock console.error để tránh in log đỏ ra terminal khi chạy test
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // Giả lập: email chưa tồn tại
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    // Giả lập: tạo user trong MySQL thành công
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (prisma.user.create as jest.Mock).mockResolvedValue(mockUserActive);
    // Giả lập: Gorse đồng bộ thất bại
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    GorseService.insertUser.mockRejectedValueOnce(new Error('Gorse down'));
    // Gọi hàm đăng ký
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const result = await AuthService.register({ fullName: 'Gorse Error', email: 'a@example.com', password: 'Password123!', confirmPassword: 'Password123!' });
    // Kiểm tra: đăng ký vẫn thành công (không bị crash)
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(result.message).toBe('Account created successfully');
    // Kiểm tra: console.error đã ghi nhận lỗi đồng bộ
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(consoleSpy).toHaveBeenCalled();
    // Phục hồi lại console.error
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    consoleSpy.mockRestore();
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
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

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTH_LOGIN_01: Dang nhap thanh cong, sinh RefreshToken va update User', async () => {
    // 1) TAO DB GIA LAP BAN DAU: da co user, chua co token
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const mockDb = createAuthMockDb();
    // Giải thích: Thêm bản ghi vào DB giả lập để mô phỏng INSERT hoặc seed dữ liệu.
    mockDb.users.push({ ...mockUserActive, firstLoginAt: null });
    // Giải thích: In DB BEFORE ra console để thấy dữ liệu trước khi chạy action.
    printAuthDbSnapshot('TC_AUTH_LOGIN_01 | DB BEFORE', mockDb);

    // 2) MOCK findUnique: tim user trong DB gia
    // Giải thích: Mock Prisma bằng logic thật trên mảng DB giả lập để mô phỏng thao tác DB.
    (prisma.user.findUnique as jest.Mock).mockImplementation(async ({ where }: any) => {
      // Giải thích: Trả dữ liệu mock về cho service/API như kết quả từ DB.
      return mockDb.users.find(u => u.email === where.email) ?? null;
    // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
    });

    // 3) MOCK compare password: tra ve dung
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    // 4) MOCK create refresh token: chen token vao DB gia
    (prisma.refreshToken.create as jest.Mock).mockImplementation(async ({ data }: any) => {
      const tokenRow = { ...data, createdAt: new Date(), updatedAt: new Date() };
      mockDb.refreshTokens.push(tokenRow);
      return tokenRow;
    });

    // 5) MOCK update user: cap nhat firstLoginAt trong DB gia
    (prisma.user.update as jest.Mock).mockImplementation(async ({ where, data }: any) => {
      const index = mockDb.users.findIndex(u => u.id === where.id);
      if (index !== -1) mockDb.users[index] = { ...mockDb.users[index], ...data };
      return mockDb.users[index];
    });

    // 6) CHAY NGHIEP VU LOGIN
    const result = await AuthService.login({ email: mockUserActive.email, password: 'Password123!' });

    // 7) IN DB SAU KHI CHAY
    printAuthDbSnapshot('TC_AUTH_LOGIN_01 | DB AFTER', mockDb);

    // 8) ASSERT token tra ve
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();

    // 9) ASSERT DB da them 1 refresh token
    expect(mockDb.refreshTokens).toHaveLength(1);
    expect(mockDb.refreshTokens[0].token).toBe(result.refreshToken);
    expect(mockDb.refreshTokens[0].userId).toBe(mockUserActive.id);

    // 10) ASSERT DB da cap nhat firstLoginAt
    expect(mockDb.users[0].firstLoginAt).not.toBeNull();
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTH_LOGIN_02: Email không tồn tại', async () => {
    // Giả lập: không tìm thấy user
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    // Kiểm tra: phải ném lỗi Unauthorized
    // Giải thích: Kiểm tra promise phải bị reject và ném đúng lỗi mong đợi.
    await expect(AuthService.login({ email: 'notexist@example.com', password: 'Password123!' })).rejects.toThrow(/Invalid|inactive|expired|not found/);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTH_LOGIN_03: Mật khẩu sai', async () => {
    // Giả lập: tìm thấy user
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserActive);
    // Giả lập: so sánh mật khẩu bị sai
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    // Kiểm tra: phải ném lỗi Unauthorized
    // Giải thích: Kiểm tra promise phải bị reject và ném đúng lỗi mong đợi.
    await expect(AuthService.login({ email: 'nguyenvana@example.com', password: 'Wrong' })).rejects.toThrow(/Invalid|inactive|expired|not found/);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTH_LOGIN_04: Tài khoản INACTIVE', async () => {
    // Giả lập: tìm thấy user nhưng bị khóa
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserInactive);
    // Kiểm tra: phải ném lỗi
    // Giải thích: Kiểm tra promise phải bị reject và ném đúng lỗi mong đợi.
    await expect(AuthService.login({ email: 'a@example.com', password: 'Password123!' })).rejects.toThrow(/Invalid|inactive|expired|not found/);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTH_LOGIN_05: Tài khoản đã xóa mềm', async () => {
    // Giả lập: tìm thấy user nhưng đã bị xóa (isDeleted = true)
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserDeleted);
    // Kiểm tra: phải ném lỗi
    // Giải thích: Kiểm tra promise phải bị reject và ném đúng lỗi mong đợi.
    await expect(AuthService.login({ email: 'a@example.com', password: 'Password123!' })).rejects.toThrow(/Invalid|inactive|expired|not found/);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTH_LOGIN_06: Email login sai format', async () => {
    // Kiểm tra: nhập email sai định dạng sẽ ném lỗi Validation
    // Giải thích: Kiểm tra promise phải bị reject và ném đúng lỗi mong đợi.
    await expect(AuthService.login({ email: 'not_email', password: 'Password123!' })).rejects.toThrow(/Password validation failed|Validation failed|Invalid|do not match|required|incorrect|different/);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTH_LOGIN_07: Password rỗng', async () => {
    // Kiểm tra: bỏ trống mật khẩu sẽ ném lỗi Validation
    // Giải thích: Kiểm tra promise phải bị reject và ném đúng lỗi mong đợi.
    await expect(AuthService.login({ email: 'a@example.com', password: '' })).rejects.toThrow(/Password validation failed|Validation failed|Invalid|do not match|required|incorrect|different/);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTH_LOGIN_08: First login', async () => {
    // Giả lập: user chưa từng đăng nhập (firstLoginAt = null)
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...mockUserActive, firstLoginAt: null });
    // Giả lập: mật khẩu đúng
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    // Gọi hàm đăng nhập
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const result = await AuthService.login({ email: 'a@example.com', password: 'Password123!' });
    // Kiểm tra: cờ isFirstLogin = true
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(result.isFirstLogin).toBe(true);
    // Kiểm tra: lệnh update user (cập nhật ngày login) phải được gọi
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(prisma.user.update).toHaveBeenCalled();
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTH_LOGIN_09: Not first login', async () => {
    // Giả lập: user đã từng đăng nhập
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...mockUserActive, firstLoginAt: new Date() });
    // Giả lập: mật khẩu đúng
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    // Gọi hàm đăng nhập
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const result = await AuthService.login({ email: 'a@example.com', password: 'Password123!' });
    // Kiểm tra: cờ isFirstLogin = false
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(result.isFirstLogin).toBe(false);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTH_LOGIN_10: rememberMe=true', async () => {
    // Giả lập: tìm thấy user và mật khẩu đúng
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserActive);
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    // Gọi đăng nhập có truyền rememberMe = true
    // Giải thích: Thực thi action chính của test case để tạo output hoặc thay đổi DB cần kiểm tra.
    await AuthService.login({ email: 'a@example.com', password: 'Password123!', rememberMe: true });
    // Kiểm tra: lệnh tạo refresh token phải được gọi
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(prisma.refreshToken.create).toHaveBeenCalled();
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });
});

describe('TC_AUTH_REFRESH | AuthService.refreshAccessToken', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTH_REFRESH_01: Làm mới token thành công', async () => {
    // Giả lập: giải mã JWT thành công
    // Giải thích: Mock giá trị trả về đồng bộ cho thư viện/hàm phụ trợ trong test.
    (jwt.verify as jest.Mock).mockReturnValue({ userId: 1, tokenId: 'token_id' });
    // Giả lập: refresh token tồn tại trong DB và chưa hết hạn
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({ id: 'token_id', token: 'token', expiresAt: new Date(Date.now() + 100000), user: mockUserActive });
    // Giả lập: tạo token mới thành công
    // Giải thích: Mock giá trị trả về đồng bộ cho thư viện/hàm phụ trợ trong test.
    (jwt.sign as jest.Mock).mockReturnValue('new_token');
    // Gọi hàm refresh
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const res = await AuthService.refreshAccessToken('token');
    // Kiểm tra: trả về đúng token mới
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(res.accessToken).toBe('new_token');
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTH_REFRESH_02: Token không tồn tại DB', async () => {
    // Giả lập: giải mã JWT thành công nhưng không có trong DB
    // Giải thích: Mock giá trị trả về đồng bộ cho thư viện/hàm phụ trợ trong test.
    (jwt.verify as jest.Mock).mockReturnValue({ userId: 1, tokenId: 'token_id' });
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);
    // Kiểm tra: phải ném lỗi
    // Giải thích: Kiểm tra promise phải bị reject và ném đúng lỗi mong đợi.
    await expect(AuthService.refreshAccessToken('token')).rejects.toThrow(/Invalid|inactive|expired|not found/);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTH_REFRESH_03: Token hết hạn', async () => {
    // Giả lập: giải mã JWT thành công
    // Giải thích: Mock giá trị trả về đồng bộ cho thư viện/hàm phụ trợ trong test.
    (jwt.verify as jest.Mock).mockReturnValue({ userId: 1, tokenId: 'token_id' });
    // Giả lập: token trong DB đã hết hạn
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({ id: 'token_id', token: 'token', expiresAt: new Date(Date.now() - 100000), user: mockUserActive });
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (prisma.refreshToken.delete as jest.Mock).mockResolvedValue({});
    // Kiểm tra: phải ném lỗi
    // Giải thích: Kiểm tra promise phải bị reject và ném đúng lỗi mong đợi.
    await expect(AuthService.refreshAccessToken('token')).rejects.toThrow(/Invalid|inactive|expired|not found/);
    // Kiểm tra: token hết hạn phải bị xóa khỏi DB
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(prisma.refreshToken.delete).toHaveBeenCalled();
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTH_REFRESH_04: User inactive', async () => {
    // Giả lập: giải mã thành công
    // Giải thích: Mock giá trị trả về đồng bộ cho thư viện/hàm phụ trợ trong test.
    (jwt.verify as jest.Mock).mockReturnValue({ userId: 1, tokenId: 'token_id' });
    // Giả lập: user của token bị khóa
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({ id: 'token_id', token: 'token', expiresAt: new Date(Date.now() + 100000), user: mockUserInactive });
    // Kiểm tra: phải ném lỗi
    // Giải thích: Kiểm tra promise phải bị reject và ném đúng lỗi mong đợi.
    await expect(AuthService.refreshAccessToken('token')).rejects.toThrow(/Invalid|inactive|expired|not found/);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });
});

describe('TC_AUTH_CHANGEPWD | AuthService.changePassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Giả lập lệnh xóa mọi token và cập nhật user
    (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({});
    (prisma.user.update as jest.Mock).mockResolvedValue({});
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTH_CHANGEPWD_01: Doi mat khau thanh cong, update user va xoa toan bo token', async () => {
    // 1) TAO DB GIA LAP BAN DAU: user co password cu + 2 token
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const mockDb = createAuthMockDb();
    // Giải thích: Thêm bản ghi vào DB giả lập để mô phỏng INSERT hoặc seed dữ liệu.
    mockDb.users.push({ id: 1, password: 'old_hash' });
    // Giải thích: Thêm bản ghi vào DB giả lập để mô phỏng INSERT hoặc seed dữ liệu.
    mockDb.refreshTokens.push({ id: 'tk1', userId: 1 }, { id: 'tk2', userId: 1 });
    // Giải thích: In DB BEFORE ra console để thấy dữ liệu trước khi chạy action.
    printAuthDbSnapshot('TC_AUTH_CHANGEPWD_01 | DB BEFORE', mockDb);

    // 2) MOCK find user
    // Giải thích: Mock Prisma bằng logic thật trên mảng DB giả lập để mô phỏng thao tác DB.
    (prisma.user.findUnique as jest.Mock).mockImplementation(async ({ where }: any) => {
      // Giải thích: Trả dữ liệu mock về cho service/API như kết quả từ DB.
      return mockDb.users.find(u => u.id === where.id) ?? null;
    // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
    });

    // 3) MOCK compare password: current dung, new khac current
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    // 4) MOCK hash password moi
    (bcrypt.hash as jest.Mock).mockResolvedValue('new_hash');

    // 5) MOCK update user password
    (prisma.user.update as jest.Mock).mockImplementation(async ({ where, data }: any) => {
      const index = mockDb.users.findIndex(u => u.id === where.id);
      if (index !== -1) mockDb.users[index] = { ...mockDb.users[index], ...data };
      return mockDb.users[index];
    });

    // 6) MOCK deleteMany tokens theo userId
    (prisma.refreshToken.deleteMany as jest.Mock).mockImplementation(async ({ where }: any) => {
      mockDb.refreshTokens = mockDb.refreshTokens.filter(t => t.userId !== where.userId);
      return {};
    });

    // 7) CHAY NGHIEP VU DOI MAT KHAU
    await AuthService.changePassword(1, { currentPassword: 'OldPass123!', newPassword: 'NewPass123!', confirmNewPassword: 'NewPass123!' });

    // 8) IN DB SAU KHI CHAY
    printAuthDbSnapshot('TC_AUTH_CHANGEPWD_01 | DB AFTER', mockDb);

    // 9) ASSERT user da doi password hash moi
    expect(mockDb.users[0].password).toBe('new_hash');

    // 10) ASSERT toan bo refresh token bi xoa
    expect(mockDb.refreshTokens).toHaveLength(0);
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTH_CHANGEPWD_02: Current password sai', async () => {
    // Giả lập: tìm user thành công
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ password: 'old' });
    // Giả lập: mật khẩu cũ nhập vào BỊ SAI
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    // Kiểm tra: phải ném lỗi validation
    // Giải thích: Kiểm tra promise phải bị reject và ném đúng lỗi mong đợi.
    await expect(AuthService.changePassword(1, { currentPassword: 'WrongPass123!', newPassword: 'NewPass123!', confirmNewPassword: 'NewPass123!' })).rejects.toThrow(/Password validation failed|Validation failed|Invalid|do not match|required|incorrect|different/);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTH_CHANGEPWD_03: Confirm không khớp', async () => {
    // Gọi hàm với mật khẩu mới và xác nhận khác nhau
    // Kiểm tra: phải ném lỗi validation
    // Giải thích: Kiểm tra promise phải bị reject và ném đúng lỗi mong đợi.
    await expect(AuthService.changePassword(1, { currentPassword: 'OldPass123!', newPassword: 'NewPass123!', confirmNewPassword: 'Diff!' })).rejects.toThrow(/Password validation failed|Validation failed|Invalid|do not match|required|incorrect|different/);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTH_CHANGEPWD_04: Mật khẩu mới trùng cũ', async () => {
    // Giả lập: tìm user thành công
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ password: 'old' });
    // Giả lập: mật khẩu cũ ĐÚNG và mật khẩu mới GIỐNG mật khẩu cũ
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    // Kiểm tra: phải ném lỗi
    // Giải thích: Kiểm tra promise phải bị reject và ném đúng lỗi mong đợi.
    await expect(AuthService.changePassword(1, { currentPassword: 'OldPass123!', newPassword: 'OldPass123!', confirmNewPassword: 'OldPass123!' })).rejects.toThrow(/Password validation failed|Validation failed|Invalid|do not match|required|incorrect|different/);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTH_CHANGEPWD_05: User không tồn tại', async () => {
    // Giả lập: không tìm thấy user
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    // Kiểm tra: phải ném lỗi
    // Giải thích: Kiểm tra promise phải bị reject và ném đúng lỗi mong đợi.
    await expect(AuthService.changePassword(99, { currentPassword: 'OldPass123!', newPassword: 'NewPass123!', confirmNewPassword: 'NewPass123!' })).rejects.toThrow(/not found/);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTH_CHANGEPWD_06: Mật khẩu mới yếu', async () => {
    // Gọi hàm với mật khẩu mới quá ngắn
    // Kiểm tra: ném lỗi
    // Giải thích: Kiểm tra promise phải bị reject và ném đúng lỗi mong đợi.
    await expect(AuthService.changePassword(1, { currentPassword: 'OldPass123!', newPassword: '123', confirmNewPassword: '123' })).rejects.toThrow(/Password validation failed|Validation failed|Invalid|do not match|required|incorrect|different/);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });
});

describe('TC_AUTH_LOGOUT & CLEANUP', () => {
  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTH_LOGOUT_01: Dang xuat thanh cong thi xoa token khoi DB', async () => {
    // 1) TAO DB GIA LAP BAN DAU: co 1 refresh token
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const mockDb = createAuthMockDb();
    // Giải thích: Thêm bản ghi vào DB giả lập để mô phỏng INSERT hoặc seed dữ liệu.
    mockDb.refreshTokens.push({ id: 'token_id', userId: 1, token: 'refresh_demo' });
    // Giải thích: In DB BEFORE ra console để thấy dữ liệu trước khi chạy action.
    printAuthDbSnapshot('TC_AUTH_LOGOUT_01 | DB BEFORE', mockDb);

    // 2) MOCK verify token de lay tokenId can xoa
    // Giải thích: Mock giá trị trả về đồng bộ cho thư viện/hàm phụ trợ trong test.
    (jwt.verify as jest.Mock).mockReturnValue({ tokenId: 'token_id' });

    // 3) MOCK delete token: xoa token trong DB gia
    // Giải thích: Mock Prisma bằng logic thật trên mảng DB giả lập để mô phỏng thao tác DB.
    (prisma.refreshToken.delete as jest.Mock).mockImplementation(async ({ where }: any) => {
      // Giải thích: Cập nhật mảng DB giả lập bằng cách lọc bỏ bản ghi, mô phỏng DELETE.
      mockDb.refreshTokens = mockDb.refreshTokens.filter(t => t.id !== where.id);
      // Giải thích: Trả dữ liệu mock về cho service/API như kết quả từ DB.
      return {};
    // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
    });

    // 4) CHAY NGHIEP VU LOGOUT
    await AuthService.logout('token');

    // 5) IN DB SAU KHI CHAY
    printAuthDbSnapshot('TC_AUTH_LOGOUT_01 | DB AFTER', mockDb);

    // 6) ASSERT DB da xoa token
    expect(mockDb.refreshTokens).toHaveLength(0);
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTH_LOGOUT_02: Đăng xuất tất cả thiết bị', async () => {
    // Gọi hàm đăng xuất mọi thiết bị
    // Giải thích: Thực thi action chính của test case để tạo output hoặc thay đổi DB cần kiểm tra.
    await AuthService.logoutAll(1);
    // Kiểm tra: xóa mọi token của user này
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalled();
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTH_CLEANUP_01: Dọn dẹp token hết hạn', async () => {
    // Giả lập: lệnh xóa trả về 5 dòng bị ảnh hưởng
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });
    // Gọi hàm dọn dẹp
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const count = await AuthService.cleanupExpiredTokens();
    // Kiểm tra: đúng 5 dòng
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(count).toBe(5);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTH_CLEANUP_02: Trả về 0 khi không có token', async () => {
    // Giả lập: lệnh xóa trả về 0 dòng
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const count = await AuthService.cleanupExpiredTokens();
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(count).toBe(0);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });
});
