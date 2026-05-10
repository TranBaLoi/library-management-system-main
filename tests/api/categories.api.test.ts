/**
 * FILE: tests/api/categories.api.test.ts
 * Mục tiêu: Unit test cho chức năng Quản lý Danh mục (Category)
 */


jest.mock('@/components', () => ({}));
jest.mock('@/lib/utils/form-utils', () => ({
  validators: { required: jest.fn(), email: jest.fn() },
  transformers: { trimString: jest.fn() },
  handleFormSubmission: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET as getCategories, POST as createCategory } from '@/app/api/categories/route';
import { GET as getAllCategories } from '@/app/api/categories/all/route';
import { GET as getCategoryById, PUT as updateCategory, DELETE as deleteCategory } from '@/app/api/categories/[id]/route';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    category: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/middleware/auth.middleware', () => ({
  requireLibrarian: (handler: any) => handler,
}));

import { prisma } from '@/lib/prisma';

type CategoryRow = {
  id: number;
  name: string;
  description: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function createCategoryRow(data: Partial<CategoryRow> = {}): CategoryRow {
  return {
    id: data.id ?? 1,
    name: data.name ?? 'Science Fiction',
    description: data.description ?? 'Sci-Fi books',
    isDeleted: data.isDeleted ?? false,
    createdAt: data.createdAt ?? new Date('2026-01-01'),
    updatedAt: data.updatedAt ?? new Date('2026-01-01'),
  };
}

function createCategoryMockDb() {
  return { categories: [createCategoryRow()] };
}

function cloneCategoryDb(db: { categories: CategoryRow[] }) {
  return { categories: db.categories.map(c => ({ ...c })) };
}

function printCategoryDb(label: string, db: { categories: CategoryRow[] }, extra: unknown = null) {
  const snapshot = db.categories.map(c => ({
    id: c.id,
    name: c.name,
    isDeleted: c.isDeleted,
  }));
  console.log(`\n[${label}]`, JSON.stringify(snapshot, null, 2));
  if (extra) console.log('[CATEGORY QUERY/OUTPUT]', JSON.stringify(extra, null, 2));
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

function wireCategoryPrismaToDb(db: { categories: CategoryRow[] }) {
  (prisma.category.findMany as jest.Mock).mockImplementation(async (args: any = {}) => {
    let result = [...db.categories];
    if (args.where?.isDeleted !== undefined) {
      result = result.filter(c => c.isDeleted === args.where.isDeleted);
    }
    if (args.where?.OR) {
      const search = String(args.where.OR[0]?.name?.contains ?? '').toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(search));
    }
    return result.slice(args.skip ?? 0, (args.skip ?? 0) + (args.take ?? result.length));
  });

  (prisma.category.count as jest.Mock).mockImplementation(async (args: any = {}) => {
    let result = [...db.categories];
    if (args.where?.isDeleted !== undefined) {
      result = result.filter(c => c.isDeleted === args.where.isDeleted);
    }
    if (args.where?.OR) {
      const search = String(args.where.OR[0]?.name?.contains ?? '').toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(search));
    }
    return result.length;
  });

  (prisma.category.findFirst as jest.Mock).mockImplementation(async ({ where }: any) => {
    return db.categories.find(c => {
      if (where.id !== undefined && c.id !== where.id) return false;
      if (where.isDeleted !== undefined && c.isDeleted !== where.isDeleted) return false;
      return true;
    }) ?? null;
  });

  (prisma.category.create as jest.Mock).mockImplementation(async ({ data }: any) => {
    const created = createCategoryRow({ id: db.categories.length + 1, ...data });
    db.categories.push(created);
    return created;
  });

  (prisma.category.update as jest.Mock).mockImplementation(async ({ where, data }: any) => {
    const index = db.categories.findIndex(c => c.id === where.id);
    if (index === -1) return null;
    db.categories[index] = { ...db.categories[index], ...data, updatedAt: new Date() };
    return db.categories[index];
  });
}

describe('TC_CATEGORY | Quản lý danh mục', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_CATEGORY_LIST_01: Lấy danh sách danh mục có phân trang', async () => {
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const db = createCategoryMockDb();
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    wireCategoryPrismaToDb(db);
    // Giải thích: In DB BEFORE ra console để thấy dữ liệu trước khi chạy action.
    printCategoryDb('TC_CATEGORY_LIST_01 | DB BEFORE', db);

    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await getCategories(makeRequest('http://localhost/api/categories?page=1&limit=10') as any);
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const output = await response.json();

    // Giải thích: In DB AFTER ra console để thấy dữ liệu sau khi chạy action.
    printCategoryDb('TC_CATEGORY_LIST_01 | DB AFTER', db, output);

    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(output.success).toBe(true);
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(output.data.categories).toHaveLength(1);
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(prisma.category.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 10 }));
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_CATEGORY_LIST_02: Tìm kiếm danh mục theo keyword', async () => {
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const db = createCategoryMockDb();
    // Giải thích: Thêm bản ghi vào DB giả lập để mô phỏng INSERT hoặc seed dữ liệu.
    db.categories.push(createCategoryRow({ id: 2, name: 'Horror' }));
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    wireCategoryPrismaToDb(db);
    // Giải thích: In DB BEFORE ra console để thấy dữ liệu trước khi chạy action.
    printCategoryDb('TC_CATEGORY_LIST_02 | DB BEFORE', db);

    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await getCategories(makeRequest('http://localhost/api/categories?search=horror') as any);
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const output = await response.json();

    // Giải thích: In DB AFTER ra console để thấy dữ liệu sau khi chạy action.
    printCategoryDb('TC_CATEGORY_LIST_02 | DB AFTER', db, output);

    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(output.data.categories).toHaveLength(1);
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(output.data.categories[0].name).toBe('Horror');
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_CATEGORY_ALL_01: Lấy tất cả danh mục chưa bị xóa', async () => {
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const db = createCategoryMockDb();
    // Giải thích: Thêm bản ghi vào DB giả lập để mô phỏng INSERT hoặc seed dữ liệu.
    db.categories.push(createCategoryRow({ id: 2, name: 'Deleted Cat', isDeleted: true }));
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    wireCategoryPrismaToDb(db);
    // Giải thích: In DB BEFORE ra console để thấy dữ liệu trước khi chạy action.
    printCategoryDb('TC_CATEGORY_ALL_01 | DB BEFORE', db);

    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await getAllCategories();
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const output = await response.json();

    // Giải thích: In DB AFTER ra console để thấy dữ liệu sau khi chạy action.
    printCategoryDb('TC_CATEGORY_ALL_01 | DB AFTER', db, output);

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
  it('TC_CATEGORY_GET_01: Lấy chi tiết danh mục theo ID', async () => {
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const db = createCategoryMockDb();
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    wireCategoryPrismaToDb(db);
    // Giải thích: In DB BEFORE ra console để thấy dữ liệu trước khi chạy action.
    printCategoryDb('TC_CATEGORY_GET_01 | DB BEFORE', db);

    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await getCategoryById(makeRequest('http://localhost/api/categories/1') as any, params('1'));
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const output = await response.json();

    // Giải thích: In DB AFTER ra console để thấy dữ liệu sau khi chạy action.
    printCategoryDb('TC_CATEGORY_GET_01 | DB AFTER', db, output);

    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(output.success).toBe(true);
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(output.data.id).toBe(1);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_CATEGORY_POST_01: Tạo danh mục mới thì DB phải thêm 1 dòng', async () => {
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const db = createCategoryMockDb();
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    wireCategoryPrismaToDb(db);
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const before = cloneCategoryDb(db);
    // Giải thích: In DB BEFORE ra console để thấy dữ liệu trước khi chạy action.
    printCategoryDb('TC_CATEGORY_POST_01 | DB BEFORE', before);

    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await createCategory(makeRequest('http://localhost/api/categories', {
      // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
      name: '  Comedy  ',
      // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
      description: 'Funny books',
    // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
    }) as any);
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const output = await response.json();

    // Giải thích: In DB AFTER ra console để thấy dữ liệu sau khi chạy action.
    printCategoryDb('TC_CATEGORY_POST_01 | DB AFTER', db, output);

    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(response.status).toBe(201);
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(db.categories).toHaveLength(before.categories.length + 1);
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(db.categories[1]).toMatchObject({ name: 'Comedy', description: 'Funny books', isDeleted: false });
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_CATEGORY_POST_02: Thiếu name thì DB không thêm dòng', async () => {
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const db = createCategoryMockDb();
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    wireCategoryPrismaToDb(db);
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const before = cloneCategoryDb(db);
    // Giải thích: In DB BEFORE ra console để thấy dữ liệu trước khi chạy action.
    printCategoryDb('TC_CATEGORY_POST_02 | DB BEFORE', db);

    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await createCategory(makeRequest('http://localhost/api/categories', { description: 'Missing name' }) as any);
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const output = await response.json();

    // Giải thích: In DB AFTER ra console để thấy dữ liệu sau khi chạy action.
    printCategoryDb('TC_CATEGORY_POST_02 | DB AFTER', db, output);

    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(response.status).toBe(400);
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(db.categories).toHaveLength(before.categories.length);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_CATEGORY_PUT_01: Cập nhật danh mục thì DB phải đổi thông tin', async () => {
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const db = createCategoryMockDb();
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    wireCategoryPrismaToDb(db);
    // Giải thích: In DB BEFORE ra console để thấy dữ liệu trước khi chạy action.
    printCategoryDb('TC_CATEGORY_PUT_01 | DB BEFORE', db);

    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await updateCategory(makeRequest('http://localhost/api/categories/1', {
      // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
      name: '  Updated Sci-Fi  ',
    // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
    }) as any, params('1'));
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const output = await response.json();

    // Giải thích: In DB AFTER ra console để thấy dữ liệu sau khi chạy action.
    printCategoryDb('TC_CATEGORY_PUT_01 | DB AFTER', db, output);

    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(output.success).toBe(true);
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(db.categories[0].name).toBe('Updated Sci-Fi');
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_CATEGORY_DELETE_01: Xóa danh mục thì DB phải soft delete', async () => {
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const db = createCategoryMockDb();
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    wireCategoryPrismaToDb(db);
    // Giải thích: In DB BEFORE ra console để thấy dữ liệu trước khi chạy action.
    printCategoryDb('TC_CATEGORY_DELETE_01 | DB BEFORE', db);

    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await deleteCategory(makeRequest('http://localhost/api/categories/1') as any, params('1'));
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const output = await response.json();

    // Giải thích: In DB AFTER ra console để thấy dữ liệu sau khi chạy action.
    printCategoryDb('TC_CATEGORY_DELETE_01 | DB AFTER', db, output);

    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(output.success).toBe(true);
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(db.categories[0].isDeleted).toBe(true);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });


  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_CATEGORY_LIST_03: Sap xep danh muc', async () => {
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const db = createCategoryMockDb();
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    wireCategoryPrismaToDb(db);
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await getCategories(makeRequest('http://localhost/api/categories?sortBy=name&sortOrder=desc') as any);
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(response.status).toBe(200);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_CATEGORY_GET_02: ID khong hop le', async () => {
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await getCategoryById(makeRequest('http://localhost/api/categories/invalid') as any, params('invalid'));
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(response.status).toBe(400);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_CATEGORY_GET_03: Danh muc khong ton tai', async () => {
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const db = createCategoryMockDb();
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    wireCategoryPrismaToDb(db);
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await getCategoryById(makeRequest('http://localhost/api/categories/99') as any, params('99'));
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(response.status).toBe(404);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_CATEGORY_PUT_02: Cap nhat ID khong hop le', async () => {
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await updateCategory(makeRequest('http://localhost/api/categories/invalid', {}) as any, params('invalid'));
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(response.status).toBe(400);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_CATEGORY_PUT_03: Cap nhat Danh muc khong ton tai', async () => {
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const db = createCategoryMockDb();
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    wireCategoryPrismaToDb(db);
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await updateCategory(makeRequest('http://localhost/api/categories/99', {}) as any, params('99'));
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(response.status).toBe(404);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_CATEGORY_DELETE_02: Xoa ID khong hop le', async () => {
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await deleteCategory(makeRequest('http://localhost/api/categories/invalid') as any, params('invalid'));
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(response.status).toBe(400);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_CATEGORY_DELETE_03: Xoa Danh muc khong ton tai', async () => {
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const db = createCategoryMockDb();
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    wireCategoryPrismaToDb(db);
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await deleteCategory(makeRequest('http://localhost/api/categories/99') as any, params('99'));
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(response.status).toBe(404);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_CATEGORY_ALL_02: Error handling', async () => {
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    (prisma.category.findMany as jest.Mock).mockRejectedValue(new Error('DB Error'));
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await getAllCategories();
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(response.status).toBe(500);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });


  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_CATEGORY_POST_03: DB Error', async () => {
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    (prisma.category.create as jest.Mock).mockRejectedValue(new Error('DB error'));
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await createCategory(makeRequest('http://localhost/api/categories', { name: 'Name' }) as any);
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(response.status).toBe(500);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_CATEGORY_PUT_04: Cap nhat full truong', async () => {
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const db = createCategoryMockDb();
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    wireCategoryPrismaToDb(db);
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await updateCategory(makeRequest('http://localhost/api/categories/1', {
      // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
      name: 'Full Name',
      // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
      description: 'New Desc',
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
  it('TC_CATEGORY_PUT_05: Cap nhat xoa truong (null)', async () => {
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const db = createCategoryMockDb();
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    wireCategoryPrismaToDb(db);
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await updateCategory(makeRequest('http://localhost/api/categories/1', {
      // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
      name: 'Full Name',
      // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
      description: '',
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
  it('TC_CATEGORY_LIST_04: DB Error trong GET list', async () => {
    // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
    (prisma.category.findMany as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const response = await getCategories(makeRequest('http://localhost/api/categories') as any);
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(response.status).toBe(500);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });
});
