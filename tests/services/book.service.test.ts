/**
 * FILE: tests/services/book.service.test.ts
 * Mô tả: Unit test cho tính năng Tìm kiếm và duyệt sách
 */
import { transformBookData, buildBookWhereClause, buildOrderByClause, listBooks } from '@/services/book.service';
import { BookFilterParams, BookRawData } from '@/types/book';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    book: { findMany: jest.fn(), count: jest.fn() },
  },
}));

import { prisma } from '@/lib/prisma';

const baseParams: BookFilterParams = { search: '', page: 1, limit: 10, authorIds: [], categoryIds: [], languageCodes: [], publishYearFrom: undefined, publishYearTo: undefined, sortBy: undefined, sortOrder: undefined, isDeleted: null, availableAt: undefined };

const mockBookRaw: BookRawData = {
  id: 1, authorId: 10, title: 'Clean Code', isbn: '123', publishYear: 2008, publisher: 'P', pageCount: 464, price: 250, edition: '1st', description: 'Desc', coverImageUrl: null, language: 'en', isDeleted: false, createdAt: new Date(), updatedAt: new Date(),
  author: { id: 10, fullName: 'Robert C' },
  bookCategories: [{ category: { name: 'IT' } }],
  bookEditions: [{ id: 101, format: 'EBOOK' }],
  _count: { bookItems: 5 },
  reviews: [{ rating: 5 }, { rating: 4 }, { rating: 5 }],
};


function createBookMockDb() {
  return {
    books: [mockBookRaw], // Giả lập trong DB có sẵn 1 quyển sách
  };
}

function printDbSnapshot(label: string, db: any, logs: any = null) {
  const snapshot = {
    books: db.books.map((b: any) => ({ id: b.id, title: b.title, author: b.author?.fullName, language: b.language }))
  };
  console.log(`\n[${label}]`, JSON.stringify(snapshot, null, 2));
  if (logs) {
    console.log(`[DB QUERY LOG]`, JSON.stringify(logs, null, 2));
  }
}


type BookTraceDb = { books: any[] };

let latestBookDbSnapshot: BookTraceDb = createBookMockDb();

function buildBookAfterFromMockCalls(): BookTraceDb {
  return {
    books: latestBookDbSnapshot.books.map((book: any) => ({ ...book })),
  };
}

beforeEach(() => {
  const testName = expect.getState().currentTestName || 'Unknown testcase';
  latestBookDbSnapshot = createBookMockDb();
  printDbSnapshot(`${testName} | DB BEFORE (auto)`, latestBookDbSnapshot);
});

afterEach(() => {
  const testName = expect.getState().currentTestName || 'Unknown testcase';
  const dbAfter = buildBookAfterFromMockCalls();
  const queryLog = {
    findManyArgs: (prisma.book.findMany as jest.Mock).mock.calls.map((call: any[]) => call[0]),
    countArgs: (prisma.book.count as jest.Mock).mock.calls.map((call: any[]) => call[0]),
  };
  printDbSnapshot(`${testName} | DB AFTER (auto)`, dbAfter, queryLog);
});

describe('TC_BOOK_TRANSFORM | transformBookData', () => {
  it('TC_BOOK_TRANSFORM_01: Transform dữ liệu đầy đủ', () => {
    const res = transformBookData([mockBookRaw]);
    expect(res[0].categories).toEqual(['IT']);
    expect(res[0].bookItemsCount).toBe(5);
    expect(res[0].bookEbookCount).toBe(1);
    expect(res[0].averageRating).toBe(4.7);
  });

  it('TC_BOOK_TRANSFORM_02: Không có review', () => {
    const res = transformBookData([{ ...mockBookRaw, reviews: [] }]);
    expect(res[0].averageRating).toBe(0);
  });

  it('TC_BOOK_TRANSFORM_03: Thiếu dữ liệu optional', () => {
    const res = transformBookData([{ ...mockBookRaw, bookCategories: undefined, bookEditions: undefined, _count: undefined } as BookRawData]);
    expect(res[0].categories).toEqual([]);
    expect(res[0].bookItemsCount).toBe(0);
  });
});

describe('TC_BOOK_FILTER | buildBookWhereClause', () => {
  it('TC_BOOK_FILTER_01: Mặc định sách chưa xóa', () => {
    expect(buildBookWhereClause({ ...baseParams, isDeleted: null })).toEqual({ isDeleted: false });
  });
  it('TC_BOOK_FILTER_02: Lọc theo tác giả', () => {
    expect(buildBookWhereClause({ ...baseParams, authorIds: [1] }).authorId).toEqual({ in: [1] });
  });
  it('TC_BOOK_FILTER_03: Lọc theo danh mục', () => {
    expect(buildBookWhereClause({ ...baseParams, categoryIds: [5] }).bookCategories).toEqual({ some: { categoryId: { in: [5] } } });
  });
  it('TC_BOOK_FILTER_04: Lọc theo ngôn ngữ', () => {
    expect(buildBookWhereClause({ ...baseParams, languageCodes: ['vi'] }).language).toEqual({ in: ['vi'] });
  });
  it('TC_BOOK_FILTER_05: Lọc năm xuất bản', () => {
    expect(buildBookWhereClause({ ...baseParams, publishYearFrom: 2000, publishYearTo: 2020 }).publishYear).toEqual({ gte: 2000, lte: 2020 });
  });
  it('TC_BOOK_FILTER_06: Lọc sách có ebook', () => {
    expect(buildBookWhereClause({ ...baseParams, availableAt: ['ebook'] }).bookEditions).toEqual({ some: { format: 'EBOOK', isDeleted: false } });
  });
  it('TC_BOOK_FILTER_07: Lọc sách có bản in', () => {
    expect(buildBookWhereClause({ ...baseParams, availableAt: ['book-copy'] }).bookItems).toEqual({ some: { status: 'AVAILABLE', isDeleted: false } });
  });
  it('TC_BOOK_FILTER_08: Cả ebook và bản in', () => {
    const where = buildBookWhereClause({ ...baseParams, availableAt: ['ebook', 'book-copy'] });
    expect(where.AND).toBeDefined();
  });
});

describe('TC_BOOK_SORT | buildOrderByClause', () => {
  it('TC_BOOK_SORT_01: Sort mặc định', () => {
    expect(buildOrderByClause()).toEqual({ createdAt: 'desc' });
  });
  it('TC_BOOK_SORT_02: Sort title asc', () => {
    expect(buildOrderByClause('title', 'asc')).toEqual({ title: 'asc' });
  });
  it('TC_BOOK_SORT_03: Sort price desc', () => {
    expect(buildOrderByClause('price', 'desc')).toEqual({ price: 'desc' });
  });
  it('TC_BOOK_SORT_04: Sort field không hợp lệ', () => {
    expect(buildOrderByClause('unknown', 'asc')).toEqual({ createdAt: 'desc' });
  });
});

describe('TC_BOOK_LIST | listBooks', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('TC_BOOK_LIST_01: Danh sach trang 1 (chi doc DB, khong ghi DB)', async () => {
    const mockDb = createBookMockDb();
    printDbSnapshot('TC_BOOK_LIST_01 | DB BEFORE', mockDb);

    let findManyArgs: any = null;
    (prisma.book.findMany as jest.Mock).mockImplementation(async (args: any) => {
      findManyArgs = args;
      return mockDb.books;
    });

    (prisma.book.count as jest.Mock).mockImplementation(async () => mockDb.books.length);

    const result = await listBooks({ ...baseParams, page: 1, limit: 10 });

    printDbSnapshot('TC_BOOK_LIST_01 | DB AFTER (khong doi)', mockDb, findManyArgs);

    expect(result.total).toBe(1);
    expect(result.books).toHaveLength(1);

    expect(findManyArgs.skip).toBe(0);
    expect(findManyArgs.take).toBe(10);
  });

  it('TC_BOOK_LIST_02: Phân trang page=3', async () => {
    (prisma.book.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.book.count as jest.Mock).mockResolvedValue(0);
    await listBooks({ ...baseParams, page: 3, limit: 20 });
    expect(prisma.book.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 40, take: 20 }));
  });

  it('TC_BOOK_LIST_03: Tìm theo từ khóa', async () => {
    (prisma.book.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.book.count as jest.Mock).mockResolvedValue(0);
    await listBooks({ ...baseParams, search: 'clean' });
    const arg = (prisma.book.findMany as jest.Mock).mock.calls[0][0];
    expect(arg.where.OR).toBeDefined();
  });

  it('TC_BOOK_LIST_04: Search + availability', async () => {
    (prisma.book.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.book.count as jest.Mock).mockResolvedValue(0);
    await listBooks({ ...baseParams, search: 'clean', availableAt: ['ebook', 'book-copy'] });
    const arg = (prisma.book.findMany as jest.Mock).mock.calls[0][0];
    expect(arg.where.AND).toBeDefined();
  });

  it('TC_BOOK_LIST_05: Sort publishYear desc', async () => {
    (prisma.book.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.book.count as jest.Mock).mockResolvedValue(0);
    await listBooks({ ...baseParams, sortBy: 'publishYear', sortOrder: 'desc' });
    expect(prisma.book.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { publishYear: 'desc' } }));
  });

  it('TC_BOOK_LIST_06: Multi filter', async () => {
    (prisma.book.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.book.count as jest.Mock).mockResolvedValue(0);
    await listBooks({ ...baseParams, authorIds: [1], categoryIds: [2], languageCodes: ['vi'] });
    const arg = (prisma.book.findMany as jest.Mock).mock.calls[0][0];
    expect(arg.where.authorId).toEqual({ in: [1] });
  });
});
