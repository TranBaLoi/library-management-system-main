/**
 * FILE: tests/api/authors.api.test.ts
 * Mục tiêu: Unit test cho chức năng Quản lý tác giả
 * Đặc biệt: Mỗi test case đều in DB BEFORE / DB AFTER và assert dữ liệu thêm/sửa/xóa trong DB mock.
 */


jest.mock('@/components', () => ({}));
jest.mock('@/lib/utils/form-utils', () => ({
  validators: { required: jest.fn(), email: jest.fn() },
  transformers: { trimString: jest.fn() },
  handleFormSubmission: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET as getAuthors, POST as createAuthor } from '@/app/api/authors/route';
import { GET as getAllAuthors } from '@/app/api/authors/all/route';
import { GET as getAuthorById, PUT as updateAuthor, DELETE as deleteAuthor } from '@/app/api/authors/[id]/route';

// Mock Prisma để không chạm DB thật.
jest.mock('@/lib/prisma', () => ({
  prisma: {
    author: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock middleware: cho phép gọi POST/PUT/DELETE như user LIBRARIAN đã đăng nhập.
jest.mock('@/middleware/auth.middleware', () => ({
  requireLibrarian: (handler: any) => handler,
}));

import { prisma } from '@/lib/prisma';

type AuthorRow = {
  id: number;
  fullName: string;
  bio: string | null;
  birthDate: Date | null;
  nationality: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function createAuthorRow(data: Partial<AuthorRow> = {}): AuthorRow {
  return {
    id: data.id ?? 1,
    fullName: data.fullName ?? 'Nguyen Nhat Anh',
    bio: data.bio ?? 'Vietnamese author',
    birthDate: data.birthDate ?? new Date('1955-05-07'),
    nationality: data.nationality ?? 'Viet Nam',
    isDeleted: data.isDeleted ?? false,
    createdAt: data.createdAt ?? new Date('2026-01-01'),
    updatedAt: data.updatedAt ?? new Date('2026-01-01'),
  };
}

function createAuthorMockDb() {
  return {
    authors: [createAuthorRow()],
  };
}

function cloneAuthorDb(db: { authors: AuthorRow[] }) {
  return {
    authors: db.authors.map(author => ({ ...author })),
  };
}

function printAuthorDb(label: string, db: { authors: AuthorRow[] }, extra: unknown = null) {
  const snapshot = db.authors.map(author => ({
    id: author.id,
    fullName: author.fullName,
    nationality: author.nationality,
    isDeleted: author.isDeleted,
  }));
  console.log(`\n[${label}]`, JSON.stringify(snapshot, null, 2));
  if (extra) console.log('[AUTHOR QUERY/OUTPUT]', JSON.stringify(extra, null, 2));
}

function makeRequest(url: string, body?: unknown) {
  return new NextRequest(url, {
    method: body ? 'POST' : 'GET',
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'content-type': 'application/json' } : undefined,
  });
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function wireAuthorPrismaToDb(db: { authors: AuthorRow[] }) {
  (prisma.author.findMany as jest.Mock).mockImplementation(async (args: any = {}) => {
    let result = [...db.authors];

    if (args.where?.isDeleted !== undefined) {
      result = result.filter(author => author.isDeleted === args.where.isDeleted);
    }

    if (args.where?.OR) {
      const search = String(args.where.OR[0]?.fullName?.contains ?? '').toLowerCase();
      result = result.filter(author =>
        author.fullName.toLowerCase().includes(search) ||
        String(author.nationality ?? '').toLowerCase().includes(search)
      );
    }

    return result.slice(args.skip ?? 0, (args.skip ?? 0) + (args.take ?? result.length));
  });

  (prisma.author.count as jest.Mock).mockImplementation(async (args: any = {}) => {
    let result = [...db.authors];
    if (args.where?.isDeleted !== undefined) {
      result = result.filter(author => author.isDeleted === args.where.isDeleted);
    }
    if (args.where?.OR) {
      const search = String(args.where.OR[0]?.fullName?.contains ?? '').toLowerCase();
      result = result.filter(author =>
        author.fullName.toLowerCase().includes(search) ||
        String(author.nationality ?? '').toLowerCase().includes(search)
      );
    }
    return result.length;
  });

  (prisma.author.findFirst as jest.Mock).mockImplementation(async ({ where }: any) => {
    return db.authors.find(author => {
      if (where.id !== undefined && author.id !== where.id) return false;
      if (where.isDeleted !== undefined && author.isDeleted !== where.isDeleted) return false;
      return true;
    }) ?? null;
  });

  (prisma.author.create as jest.Mock).mockImplementation(async ({ data }: any) => {
    const created = createAuthorRow({ id: db.authors.length + 1, ...data });
    db.authors.push(created);
    return created;
  });

  (prisma.author.update as jest.Mock).mockImplementation(async ({ where, data }: any) => {
    const index = db.authors.findIndex(author => author.id === where.id);
    if (index === -1) return null;
    db.authors[index] = { ...db.authors[index], ...data, updatedAt: new Date() };
    return db.authors[index];
  });
}

describe('TC_AUTHOR | Quản lý tác giả', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTHOR_LIST_01: Lấy danh sách tác giả có phân trang', async () => {
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const db = createAuthorMockDb();
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    wireAuthorPrismaToDb(db);
    // Giải thích: In DB BEFORE ra console để thấy dữ liệu trước khi chạy action.
    printAuthorDb('TC_AUTHOR_LIST_01 | DB BEFORE', db);

    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await getAuthors(makeRequest('http://localhost/api/authors?page=1&limit=10') as any);
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const output = await response.json();

    // Giải thích: In DB AFTER ra console để thấy dữ liệu sau khi chạy action.
    printAuthorDb('TC_AUTHOR_LIST_01 | DB AFTER (không đổi vì chỉ SELECT)', db, output);

    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(output.success).toBe(true);
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(output.data.authors).toHaveLength(1);
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(prisma.author.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 10 }));
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTHOR_LIST_02: Tìm kiếm tác giả theo keyword', async () => {
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const db = createAuthorMockDb();
    // Giải thích: Thêm bản ghi vào DB giả lập để mô phỏng INSERT hoặc seed dữ liệu.
    db.authors.push(createAuthorRow({ id: 2, fullName: 'Other Author', nationality: 'USA' }));
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    wireAuthorPrismaToDb(db);
    // Giải thích: In DB BEFORE ra console để thấy dữ liệu trước khi chạy action.
    printAuthorDb('TC_AUTHOR_LIST_02 | DB BEFORE', db);

    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await getAuthors(makeRequest('http://localhost/api/authors?search=nhat') as any);
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const output = await response.json();

    // Giải thích: In DB AFTER ra console để thấy dữ liệu sau khi chạy action.
    printAuthorDb('TC_AUTHOR_LIST_02 | DB AFTER (không đổi vì chỉ SELECT)', db, output);

    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(output.data.authors).toHaveLength(1);
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(output.data.authors[0].fullName).toBe('Nguyen Nhat Anh');
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTHOR_ALL_01: Lấy tất cả tác giả chưa bị xóa', async () => {
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const db = createAuthorMockDb();
    // Giải thích: Thêm bản ghi vào DB giả lập để mô phỏng INSERT hoặc seed dữ liệu.
    db.authors.push(createAuthorRow({ id: 2, fullName: 'Deleted Author', isDeleted: true }));
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    wireAuthorPrismaToDb(db);
    // Giải thích: In DB BEFORE ra console để thấy dữ liệu trước khi chạy action.
    printAuthorDb('TC_AUTHOR_ALL_01 | DB BEFORE', db);

    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await getAllAuthors();
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const output = await response.json();

    // Giải thích: In DB AFTER ra console để thấy dữ liệu sau khi chạy action.
    printAuthorDb('TC_AUTHOR_ALL_01 | DB AFTER (không đổi vì chỉ SELECT)', db, output);

    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(output.success).toBe(true);
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(output.data).toHaveLength(1);
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(output.data[0].isDeleted).toBe(false);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTHOR_GET_01: Lấy chi tiết tác giả theo ID', async () => {
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const db = createAuthorMockDb();
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    wireAuthorPrismaToDb(db);
    // Giải thích: In DB BEFORE ra console để thấy dữ liệu trước khi chạy action.
    printAuthorDb('TC_AUTHOR_GET_01 | DB BEFORE', db);

    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await getAuthorById(makeRequest('http://localhost/api/authors/1') as any, params('1'));
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const output = await response.json();

    // Giải thích: In DB AFTER ra console để thấy dữ liệu sau khi chạy action.
    printAuthorDb('TC_AUTHOR_GET_01 | DB AFTER (không đổi vì chỉ SELECT)', db, output);

    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(output.success).toBe(true);
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(output.data.id).toBe(1);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTHOR_POST_01: Tạo tác giả mới thì DB phải thêm 1 dòng', async () => {
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const db = createAuthorMockDb();
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    wireAuthorPrismaToDb(db);
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const before = cloneAuthorDb(db);
    // Giải thích: In DB BEFORE ra console để thấy dữ liệu trước khi chạy action.
    printAuthorDb('TC_AUTHOR_POST_01 | DB BEFORE', before);

    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await createAuthor(makeRequest('http://localhost/api/authors', {
      // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
      fullName: '  To Hoai  ',
      // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
      bio: '  Writer  ',
      // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
      birthDate: '1920-09-27',
      // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
      nationality: '  Viet Nam  ',
      // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
      isDeleted: false,
    // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
    }) as any);
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const output = await response.json();

    // Giải thích: In DB AFTER ra console để thấy dữ liệu sau khi chạy action.
    printAuthorDb('TC_AUTHOR_POST_01 | DB AFTER', db, output);

    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(response.status).toBe(201);
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(db.authors).toHaveLength(before.authors.length + 1);
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(db.authors[1]).toMatchObject({ fullName: 'To Hoai', bio: 'Writer', nationality: 'Viet Nam', isDeleted: false });
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTHOR_POST_02: Thiếu fullName thì DB không thêm dòng', async () => {
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const db = createAuthorMockDb();
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    wireAuthorPrismaToDb(db);
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const before = cloneAuthorDb(db);
    // Giải thích: In DB BEFORE ra console để thấy dữ liệu trước khi chạy action.
    printAuthorDb('TC_AUTHOR_POST_02 | DB BEFORE', db);

    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await createAuthor(makeRequest('http://localhost/api/authors', { bio: 'Missing name' }) as any);
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const output = await response.json();

    // Giải thích: In DB AFTER ra console để thấy dữ liệu sau khi chạy action.
    printAuthorDb('TC_AUTHOR_POST_02 | DB AFTER', db, output);

    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(response.status).toBe(400);
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(db.authors).toHaveLength(before.authors.length);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTHOR_PUT_01: Cập nhật tác giả thì DB phải đổi thông tin', async () => {
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const db = createAuthorMockDb();
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    wireAuthorPrismaToDb(db);
    // Giải thích: In DB BEFORE ra console để thấy dữ liệu trước khi chạy action.
    printAuthorDb('TC_AUTHOR_PUT_01 | DB BEFORE', db);

    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await updateAuthor(makeRequest('http://localhost/api/authors/1', {
      // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
      fullName: '  Updated Author  ',
      // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
      nationality: '  Japan  ',
    // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
    }) as any, params('1'));
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const output = await response.json();

    // Giải thích: In DB AFTER ra console để thấy dữ liệu sau khi chạy action.
    printAuthorDb('TC_AUTHOR_PUT_01 | DB AFTER', db, output);

    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(output.success).toBe(true);
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(db.authors[0].fullName).toBe('Updated Author');
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(db.authors[0].nationality).toBe('Japan');
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTHOR_DELETE_01: Xóa tác giả thì DB phải soft delete', async () => {
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const db = createAuthorMockDb();
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    wireAuthorPrismaToDb(db);
    // Giải thích: In DB BEFORE ra console để thấy dữ liệu trước khi chạy action.
    printAuthorDb('TC_AUTHOR_DELETE_01 | DB BEFORE', db);

    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await deleteAuthor(makeRequest('http://localhost/api/authors/1') as any, params('1'));
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const output = await response.json();

    // Giải thích: In DB AFTER ra console để thấy dữ liệu sau khi chạy action.
    printAuthorDb('TC_AUTHOR_DELETE_01 | DB AFTER', db, output);

    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(output.success).toBe(true);
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(db.authors[0].isDeleted).toBe(true);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });


  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTHOR_LIST_03: Sap xep tac gia theo name desc', async () => {
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const db = createAuthorMockDb();
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    wireAuthorPrismaToDb(db);
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await getAuthors(makeRequest('http://localhost/api/authors?sortBy=fullName&sortOrder=desc') as any);
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(response.status).toBe(200);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTHOR_GET_02: ID khong hop le', async () => {
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await getAuthorById(makeRequest('http://localhost/api/authors/invalid') as any, params('invalid'));
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(response.status).toBe(400);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTHOR_GET_03: Tac gia khong ton tai', async () => {
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const db = createAuthorMockDb();
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    wireAuthorPrismaToDb(db); // DB chi co id=1
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await getAuthorById(makeRequest('http://localhost/api/authors/99') as any, params('99'));
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(response.status).toBe(404);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTHOR_PUT_02: Cap nhat ID khong hop le', async () => {
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await updateAuthor(makeRequest('http://localhost/api/authors/invalid', {}) as any, params('invalid'));
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(response.status).toBe(400);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTHOR_PUT_03: Cap nhat tac gia khong ton tai', async () => {
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const db = createAuthorMockDb();
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    wireAuthorPrismaToDb(db);
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await updateAuthor(makeRequest('http://localhost/api/authors/99', {}) as any, params('99'));
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(response.status).toBe(404);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTHOR_DELETE_02: Xoa ID khong hop le', async () => {
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await deleteAuthor(makeRequest('http://localhost/api/authors/invalid') as any, params('invalid'));
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(response.status).toBe(400);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTHOR_DELETE_03: Xoa tac gia khong ton tai', async () => {
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const db = createAuthorMockDb();
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    wireAuthorPrismaToDb(db);
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await deleteAuthor(makeRequest('http://localhost/api/authors/99') as any, params('99'));
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(response.status).toBe(404);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTHOR_ALL_02: Error handling', async () => {
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    (prisma.author.findMany as jest.Mock).mockRejectedValue(new Error('DB Error'));
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await getAllAuthors();
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(response.status).toBe(500);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });


  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTHOR_POST_03: DB Error', async () => {
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    (prisma.author.create as jest.Mock).mockRejectedValue(new Error('DB error'));
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await createAuthor(makeRequest('http://localhost/api/authors', { fullName: 'Name' }) as any);
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(response.status).toBe(500);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTHOR_PUT_04: Cap nhat full truong', async () => {
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const db = createAuthorMockDb();
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    wireAuthorPrismaToDb(db);
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await updateAuthor(makeRequest('http://localhost/api/authors/1', {
      // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
      fullName: 'Full Name',
      // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
      bio: 'New Bio',
      // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
      birthDate: '1990-01-01',
      // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
      nationality: 'VN',
      // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
      isDeleted: true
    // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
    }) as any, params('1'));
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(response.status).toBe(200);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTHOR_PUT_05: Cap nhat xoa cac truong (null)', async () => {
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const db = createAuthorMockDb();
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    wireAuthorPrismaToDb(db);
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await updateAuthor(makeRequest('http://localhost/api/authors/1', {
      // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
      fullName: 'Full Name',
      // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
      bio: '',
      // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
      birthDate: null,
      // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
      nationality: '',
      // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
      isDeleted: false
    // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
    }) as any, params('1'));
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(response.status).toBe(200);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });


  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_AUTHOR_LIST_04: DB Error trong GET list', async () => {
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    (prisma.author.findMany as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await getAuthors(makeRequest('http://localhost/api/authors') as any);
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(response.status).toBe(500);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });
});
