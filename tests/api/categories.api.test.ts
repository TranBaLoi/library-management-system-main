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

function rollbackCategoryDb(db: { categories: CategoryRow[] }, before: { categories: CategoryRow[] }) {
  db.categories = before.categories.map(category => ({ ...category }));
}

function expectCategoryRollbackMatchesBefore(label: string, db: { categories: CategoryRow[] }, before: { categories: CategoryRow[] }) {
  rollbackCategoryDb(db, before);
  printCategoryDb(`${label} | DB AFTER ROLLBACK`, db);
  expect(db).toEqual(before);
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

  it('TC_CATEGORY_LIST_01: Lấy danh sách danh mục có phân trang', async () => {
    const db = createCategoryMockDb();
    wireCategoryPrismaToDb(db);
    printCategoryDb('TC_CATEGORY_LIST_01 | DB BEFORE', db);

    const response = await getCategories(makeRequest('http://localhost/api/categories?page=1&limit=10') as any);
    const output = await response.json();

    printCategoryDb('TC_CATEGORY_LIST_01 | DB AFTER', db, output);

    expect(output.success).toBe(true);
    expect(output.data.categories).toHaveLength(1);
    expect(prisma.category.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 10 }));
  });

  it('TC_CATEGORY_LIST_02: Tìm kiếm danh mục theo keyword', async () => {
    const db = createCategoryMockDb();
    db.categories.push(createCategoryRow({ id: 2, name: 'Horror' }));
    wireCategoryPrismaToDb(db);
    printCategoryDb('TC_CATEGORY_LIST_02 | DB BEFORE', db);

    const response = await getCategories(makeRequest('http://localhost/api/categories?search=horror') as any);
    const output = await response.json();

    printCategoryDb('TC_CATEGORY_LIST_02 | DB AFTER', db, output);

    expect(output.data.categories).toHaveLength(1);
    expect(output.data.categories[0].name).toBe('Horror');
  });

  it('TC_CATEGORY_ALL_01: Lấy tất cả danh mục chưa bị xóa', async () => {
    const db = createCategoryMockDb();
    db.categories.push(createCategoryRow({ id: 2, name: 'Deleted Cat', isDeleted: true }));
    wireCategoryPrismaToDb(db);
    printCategoryDb('TC_CATEGORY_ALL_01 | DB BEFORE', db);

    const response = await getAllCategories();
    const output = await response.json();

    printCategoryDb('TC_CATEGORY_ALL_01 | DB AFTER', db, output);

    expect(output.success).toBe(true);
    expect(output.data).toHaveLength(1);
    expect(output.data[0].isDeleted).toBe(false);
  });

  it('TC_CATEGORY_GET_01: Lấy chi tiết danh mục theo ID', async () => {
    const db = createCategoryMockDb();
    wireCategoryPrismaToDb(db);
    printCategoryDb('TC_CATEGORY_GET_01 | DB BEFORE', db);

    const response = await getCategoryById(makeRequest('http://localhost/api/categories/1') as any, params('1'));
    const output = await response.json();

    printCategoryDb('TC_CATEGORY_GET_01 | DB AFTER', db, output);

    expect(output.success).toBe(true);
    expect(output.data.id).toBe(1);
  });

  it('TC_CATEGORY_POST_01: Tạo danh mục mới thì DB phải thêm 1 dòng', async () => {
    const db = createCategoryMockDb();
    wireCategoryPrismaToDb(db);
    const before = cloneCategoryDb(db);
    printCategoryDb('TC_CATEGORY_POST_01 | DB BEFORE', before);

    const response = await createCategory(makeRequest('http://localhost/api/categories', {
      name: '  Comedy  ',
      description: 'Funny books',
    }) as any);
    const output = await response.json();

    printCategoryDb('TC_CATEGORY_POST_01 | DB AFTER', db, output);

    expect(response.status).toBe(201);
    expect(db.categories).toHaveLength(before.categories.length + 1);
    expect(db.categories[1]).toMatchObject({ name: 'Comedy', description: 'Funny books', isDeleted: false });
    expectCategoryRollbackMatchesBefore('TC_CATEGORY_POST_01', db, before);
  });

  it('TC_CATEGORY_POST_02: Thiếu name thì DB không thêm dòng', async () => {
    const db = createCategoryMockDb();
    wireCategoryPrismaToDb(db);
    const before = cloneCategoryDb(db);
    printCategoryDb('TC_CATEGORY_POST_02 | DB BEFORE', db);

    const response = await createCategory(makeRequest('http://localhost/api/categories', { description: 'Missing name' }) as any);
    const output = await response.json();

    printCategoryDb('TC_CATEGORY_POST_02 | DB AFTER', db, output);

    expect(response.status).toBe(400);
    expect(db.categories).toHaveLength(before.categories.length);
  });

  it('TC_CATEGORY_PUT_01: Cập nhật danh mục thì DB phải đổi thông tin', async () => {
    const db = createCategoryMockDb();
    wireCategoryPrismaToDb(db);
    const before = cloneCategoryDb(db);
    printCategoryDb('TC_CATEGORY_PUT_01 | DB BEFORE', db);

    const response = await updateCategory(makeRequest('http://localhost/api/categories/1', {
      name: '  Updated Sci-Fi  ',
    }) as any, params('1'));
    const output = await response.json();

    printCategoryDb('TC_CATEGORY_PUT_01 | DB AFTER', db, output);

    expect(output.success).toBe(true);
    expect(db.categories[0].name).toBe('Updated Sci-Fi');
    expectCategoryRollbackMatchesBefore('TC_CATEGORY_PUT_01', db, before);
  });

  it('TC_CATEGORY_DELETE_01: Xóa danh mục thì DB phải soft delete', async () => {
    const db = createCategoryMockDb();
    wireCategoryPrismaToDb(db);
    const before = cloneCategoryDb(db);
    printCategoryDb('TC_CATEGORY_DELETE_01 | DB BEFORE', db);

    const response = await deleteCategory(makeRequest('http://localhost/api/categories/1') as any, params('1'));
    const output = await response.json();

    printCategoryDb('TC_CATEGORY_DELETE_01 | DB AFTER', db, output);

    expect(output.success).toBe(true);
    expect(db.categories[0].isDeleted).toBe(true);
    expectCategoryRollbackMatchesBefore('TC_CATEGORY_DELETE_01', db, before);
  });


  it('TC_CATEGORY_LIST_03: Sap xep danh muc', async () => {
    const db = createCategoryMockDb();
    wireCategoryPrismaToDb(db);
    const response = await getCategories(makeRequest('http://localhost/api/categories?sortBy=name&sortOrder=desc') as any);
    expect(response.status).toBe(200);
  });

  it('TC_CATEGORY_GET_02: ID khong hop le', async () => {
    const response = await getCategoryById(makeRequest('http://localhost/api/categories/invalid') as any, params('invalid'));
    expect(response.status).toBe(400);
  });

  it('TC_CATEGORY_GET_03: Danh muc khong ton tai', async () => {
    const db = createCategoryMockDb();
    wireCategoryPrismaToDb(db);
    const response = await getCategoryById(makeRequest('http://localhost/api/categories/99') as any, params('99'));
    expect(response.status).toBe(404);
  });

  it('TC_CATEGORY_PUT_02: Cap nhat ID khong hop le', async () => {
    const response = await updateCategory(makeRequest('http://localhost/api/categories/invalid', {}) as any, params('invalid'));
    expect(response.status).toBe(400);
  });

  it('TC_CATEGORY_PUT_03: Cap nhat Danh muc khong ton tai', async () => {
    const db = createCategoryMockDb();
    wireCategoryPrismaToDb(db);
    const response = await updateCategory(makeRequest('http://localhost/api/categories/99', {}) as any, params('99'));
    expect(response.status).toBe(404);
  });

  it('TC_CATEGORY_DELETE_02: Xoa ID khong hop le', async () => {
    const response = await deleteCategory(makeRequest('http://localhost/api/categories/invalid') as any, params('invalid'));
    expect(response.status).toBe(400);
  });

  it('TC_CATEGORY_DELETE_03: Xoa Danh muc khong ton tai', async () => {
    const db = createCategoryMockDb();
    wireCategoryPrismaToDb(db);
    const response = await deleteCategory(makeRequest('http://localhost/api/categories/99') as any, params('99'));
    expect(response.status).toBe(404);
  });

  it('TC_CATEGORY_ALL_02: Error handling', async () => {
    (prisma.category.findMany as jest.Mock).mockRejectedValue(new Error('DB Error'));
    const response = await getAllCategories();
    expect(response.status).toBe(500);
  });


  it('TC_CATEGORY_POST_03: DB Error', async () => {
    (prisma.category.create as jest.Mock).mockRejectedValue(new Error('DB error'));
    const response = await createCategory(makeRequest('http://localhost/api/categories', { name: 'Name' }) as any);
    expect(response.status).toBe(500);
  });

  it('TC_CATEGORY_PUT_04: Cap nhat full truong', async () => {
    const db = createCategoryMockDb();
    wireCategoryPrismaToDb(db);
    const before = cloneCategoryDb(db);
    const response = await updateCategory(makeRequest('http://localhost/api/categories/1', {
      name: 'Full Name',
      description: 'New Desc',
      isDeleted: true
    }) as any, params('1'));
    expect(response.status).toBe(200);
    expectCategoryRollbackMatchesBefore('TC_CATEGORY_PUT_04', db, before);
  });

  it('TC_CATEGORY_PUT_05: Cap nhat xoa truong (null)', async () => {
    const db = createCategoryMockDb();
    wireCategoryPrismaToDb(db);
    const before = cloneCategoryDb(db);
    const response = await updateCategory(makeRequest('http://localhost/api/categories/1', {
      name: 'Full Name',
      description: '',
      isDeleted: false
    }) as any, params('1'));
    expect(response.status).toBe(200);
    expectCategoryRollbackMatchesBefore('TC_CATEGORY_PUT_05', db, before);
  });


  it('TC_CATEGORY_LIST_04: DB Error trong GET list', async () => {
    (prisma.category.findMany as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
    const response = await getCategories(makeRequest('http://localhost/api/categories') as any);
    expect(response.status).toBe(500);
  });
});
