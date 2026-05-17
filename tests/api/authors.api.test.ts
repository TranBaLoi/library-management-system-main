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

function rollbackAuthorDb(db: { authors: AuthorRow[] }, before: { authors: AuthorRow[] }) {
  db.authors = before.authors.map(author => ({ ...author }));
}

function expectAuthorRollbackMatchesBefore(label: string, db: { authors: AuthorRow[] }, before: { authors: AuthorRow[] }) {
  rollbackAuthorDb(db, before);
  printAuthorDb(`${label} | DB AFTER ROLLBACK`, db);
  expect(db).toEqual(before);
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

  it('TC_AUTHOR_LIST_01: Lấy danh sách tác giả có phân trang', async () => {
    const db = createAuthorMockDb();
    wireAuthorPrismaToDb(db);
    printAuthorDb('TC_AUTHOR_LIST_01 | DB BEFORE', db);

    const response = await getAuthors(makeRequest('http://localhost/api/authors?page=1&limit=10') as any);
    const output = await response.json();

    printAuthorDb('TC_AUTHOR_LIST_01 | DB AFTER (không đổi vì chỉ SELECT)', db, output);

    expect(output.success).toBe(true);
    expect(output.data.authors).toHaveLength(1);
    expect(prisma.author.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 10 }));
  });

  it('TC_AUTHOR_LIST_02: Tìm kiếm tác giả theo keyword', async () => {
    const db = createAuthorMockDb();
    db.authors.push(createAuthorRow({ id: 2, fullName: 'Other Author', nationality: 'USA' }));
    wireAuthorPrismaToDb(db);
    printAuthorDb('TC_AUTHOR_LIST_02 | DB BEFORE', db);

    const response = await getAuthors(makeRequest('http://localhost/api/authors?search=nhat') as any);
    const output = await response.json();

    printAuthorDb('TC_AUTHOR_LIST_02 | DB AFTER (không đổi vì chỉ SELECT)', db, output);

    expect(output.data.authors).toHaveLength(1);
    expect(output.data.authors[0].fullName).toBe('Nguyen Nhat Anh');
  });

  it('TC_AUTHOR_ALL_01: Lấy tất cả tác giả chưa bị xóa', async () => {
    const db = createAuthorMockDb();
    db.authors.push(createAuthorRow({ id: 2, fullName: 'Deleted Author', isDeleted: true }));
    wireAuthorPrismaToDb(db);
    printAuthorDb('TC_AUTHOR_ALL_01 | DB BEFORE', db);

    const response = await getAllAuthors();
    const output = await response.json();

    printAuthorDb('TC_AUTHOR_ALL_01 | DB AFTER (không đổi vì chỉ SELECT)', db, output);

    expect(output.success).toBe(true);
    expect(output.data).toHaveLength(1);
    expect(output.data[0].isDeleted).toBe(false);
  });

  it('TC_AUTHOR_GET_01: Lấy chi tiết tác giả theo ID', async () => {
    const db = createAuthorMockDb();
    wireAuthorPrismaToDb(db);
    printAuthorDb('TC_AUTHOR_GET_01 | DB BEFORE', db);

    const response = await getAuthorById(makeRequest('http://localhost/api/authors/1') as any, params('1'));
    const output = await response.json();

    printAuthorDb('TC_AUTHOR_GET_01 | DB AFTER (không đổi vì chỉ SELECT)', db, output);

    expect(output.success).toBe(true);
    expect(output.data.id).toBe(1);
  });

  it('TC_AUTHOR_POST_01: Tạo tác giả mới thì DB phải thêm 1 dòng', async () => {
    const db = createAuthorMockDb();
    wireAuthorPrismaToDb(db);
    const before = cloneAuthorDb(db);
    printAuthorDb('TC_AUTHOR_POST_01 | DB BEFORE', before);

    const response = await createAuthor(makeRequest('http://localhost/api/authors', {
      fullName: '  To Hoai  ',
      bio: '  Writer  ',
      birthDate: '1920-09-27',
      nationality: '  Viet Nam  ',
      isDeleted: false,
    }) as any);
    const output = await response.json();

    printAuthorDb('TC_AUTHOR_POST_01 | DB AFTER', db, output);

    expect(response.status).toBe(201);
    expect(db.authors).toHaveLength(before.authors.length + 1);
    expect(db.authors[1]).toMatchObject({ fullName: 'To Hoai', bio: 'Writer', nationality: 'Viet Nam', isDeleted: false });
    expectAuthorRollbackMatchesBefore('TC_AUTHOR_POST_01', db, before);
  });

  it('TC_AUTHOR_POST_02: Thiếu fullName thì DB không thêm dòng', async () => {
    const db = createAuthorMockDb();
    wireAuthorPrismaToDb(db);
    const before = cloneAuthorDb(db);
    printAuthorDb('TC_AUTHOR_POST_02 | DB BEFORE', db);

    const response = await createAuthor(makeRequest('http://localhost/api/authors', { bio: 'Missing name' }) as any);
    const output = await response.json();

    printAuthorDb('TC_AUTHOR_POST_02 | DB AFTER', db, output);

    expect(response.status).toBe(400);
    expect(db.authors).toHaveLength(before.authors.length);
  });

  it('TC_AUTHOR_PUT_01: Cập nhật tác giả thì DB phải đổi thông tin', async () => {
    const db = createAuthorMockDb();
    wireAuthorPrismaToDb(db);
    const before = cloneAuthorDb(db);
    printAuthorDb('TC_AUTHOR_PUT_01 | DB BEFORE', db);

    const response = await updateAuthor(makeRequest('http://localhost/api/authors/1', {
      fullName: '  Updated Author  ',
      nationality: '  Japan  ',
    }) as any, params('1'));
    const output = await response.json();

    printAuthorDb('TC_AUTHOR_PUT_01 | DB AFTER', db, output);

    expect(output.success).toBe(true);
    expect(db.authors[0].fullName).toBe('Updated Author');
    expect(db.authors[0].nationality).toBe('Japan');
    expectAuthorRollbackMatchesBefore('TC_AUTHOR_PUT_01', db, before);
  });

  it('TC_AUTHOR_DELETE_01: Xóa tác giả thì DB phải soft delete', async () => {
    const db = createAuthorMockDb();
    wireAuthorPrismaToDb(db);
    const before = cloneAuthorDb(db);
    printAuthorDb('TC_AUTHOR_DELETE_01 | DB BEFORE', db);

    const response = await deleteAuthor(makeRequest('http://localhost/api/authors/1') as any, params('1'));
    const output = await response.json();

    printAuthorDb('TC_AUTHOR_DELETE_01 | DB AFTER', db, output);

    expect(output.success).toBe(true);
    expect(db.authors[0].isDeleted).toBe(true);
    expectAuthorRollbackMatchesBefore('TC_AUTHOR_DELETE_01', db, before);
  });


  it('TC_AUTHOR_LIST_03: Sap xep tac gia theo name desc', async () => {
    const db = createAuthorMockDb();
    wireAuthorPrismaToDb(db);
    const response = await getAuthors(makeRequest('http://localhost/api/authors?sortBy=fullName&sortOrder=desc') as any);
    expect(response.status).toBe(200);
  });

  it('TC_AUTHOR_GET_02: ID khong hop le', async () => {
    const response = await getAuthorById(makeRequest('http://localhost/api/authors/invalid') as any, params('invalid'));
    expect(response.status).toBe(400);
  });

  it('TC_AUTHOR_GET_03: Tac gia khong ton tai', async () => {
    const db = createAuthorMockDb();
    wireAuthorPrismaToDb(db); // DB chi co id=1
    const response = await getAuthorById(makeRequest('http://localhost/api/authors/99') as any, params('99'));
    expect(response.status).toBe(404);
  });

  it('TC_AUTHOR_PUT_02: Cap nhat ID khong hop le', async () => {
    const response = await updateAuthor(makeRequest('http://localhost/api/authors/invalid', {}) as any, params('invalid'));
    expect(response.status).toBe(400);
  });

  it('TC_AUTHOR_PUT_03: Cap nhat tac gia khong ton tai', async () => {
    const db = createAuthorMockDb();
    wireAuthorPrismaToDb(db);
    const response = await updateAuthor(makeRequest('http://localhost/api/authors/99', {}) as any, params('99'));
    expect(response.status).toBe(404);
  });

  it('TC_AUTHOR_DELETE_02: Xoa ID khong hop le', async () => {
    const response = await deleteAuthor(makeRequest('http://localhost/api/authors/invalid') as any, params('invalid'));
    expect(response.status).toBe(400);
  });

  it('TC_AUTHOR_DELETE_03: Xoa tac gia khong ton tai', async () => {
    const db = createAuthorMockDb();
    wireAuthorPrismaToDb(db);
    const response = await deleteAuthor(makeRequest('http://localhost/api/authors/99') as any, params('99'));
    expect(response.status).toBe(404);
  });

  it('TC_AUTHOR_ALL_02: Error handling', async () => {
    (prisma.author.findMany as jest.Mock).mockRejectedValue(new Error('DB Error'));
    const response = await getAllAuthors();
    expect(response.status).toBe(500);
  });


  it('TC_AUTHOR_POST_03: DB Error', async () => {
    (prisma.author.create as jest.Mock).mockRejectedValue(new Error('DB error'));
    const response = await createAuthor(makeRequest('http://localhost/api/authors', { fullName: 'Name' }) as any);
    expect(response.status).toBe(500);
  });

  it('TC_AUTHOR_PUT_04: Cap nhat full truong', async () => {
    const db = createAuthorMockDb();
    wireAuthorPrismaToDb(db);
    const before = cloneAuthorDb(db);
    const response = await updateAuthor(makeRequest('http://localhost/api/authors/1', {
      fullName: 'Full Name',
      bio: 'New Bio',
      birthDate: '1990-01-01',
      nationality: 'VN',
      isDeleted: true
    }) as any, params('1'));
    expect(response.status).toBe(200);
    expectAuthorRollbackMatchesBefore('TC_AUTHOR_PUT_04', db, before);
  });

  it('TC_AUTHOR_PUT_05: Cap nhat xoa cac truong (null)', async () => {
    const db = createAuthorMockDb();
    wireAuthorPrismaToDb(db);
    const before = cloneAuthorDb(db);
    const response = await updateAuthor(makeRequest('http://localhost/api/authors/1', {
      fullName: 'Full Name',
      bio: '',
      birthDate: null,
      nationality: '',
      isDeleted: false
    }) as any, params('1'));
    expect(response.status).toBe(200);
    expectAuthorRollbackMatchesBefore('TC_AUTHOR_PUT_05', db, before);
  });


  it('TC_AUTHOR_LIST_04: DB Error trong GET list', async () => {
    (prisma.author.findMany as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
    const response = await getAuthors(makeRequest('http://localhost/api/authors') as any);
    expect(response.status).toBe(500);
  });
});
