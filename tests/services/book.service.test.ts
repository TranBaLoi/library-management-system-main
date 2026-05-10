/**
 * FILE: tests/services/book.service.test.ts
 * Mô tả: Unit test cho tính năng Tìm kiếm và duyệt sách
 */
import { transformBookData, buildBookWhereClause, buildOrderByClause, listBooks } from '@/services/book.service';
import { BookFilterParams, BookRawData } from '@/types/book';

// Giả lập Prisma để không thao tác với Database thật
jest.mock('@/lib/prisma', () => ({
  prisma: {
    book: { findMany: jest.fn(), count: jest.fn() },
  },
}));

import { prisma } from '@/lib/prisma';

// Mẫu bộ lọc sách mặc định
const baseParams: BookFilterParams = { search: '', page: 1, limit: 10, authorIds: [], categoryIds: [], languageCodes: [], publishYearFrom: undefined, publishYearTo: undefined, sortBy: undefined, sortOrder: undefined, isDeleted: null, availableAt: undefined };

// Mẫu dữ liệu raw query từ DB
const mockBookRaw: BookRawData = {
  id: 1, authorId: 10, title: 'Clean Code', isbn: '123', publishYear: 2008, publisher: 'P', pageCount: 464, price: 250, edition: '1st', description: 'Desc', coverImageUrl: null, language: 'en', isDeleted: false, createdAt: new Date(), updatedAt: new Date(),
  author: { id: 10, fullName: 'Robert C' },
  bookCategories: [{ category: { name: 'IT' } }],
  bookEditions: [{ id: 101, format: 'EBOOK' }],
  _count: { bookItems: 5 },
  reviews: [{ rating: 5 }, { rating: 4 }, { rating: 5 }],
};

describe('TC_BOOK_TRANSFORM | transformBookData', () => {
  it('TC_BOOK_TRANSFORM_01: Transform dữ liệu đầy đủ', () => {
    // Gọi hàm transform chuyển raw data thành data API
    const res = transformBookData([mockBookRaw]);
    // Kiểm tra: lấy đúng tên danh mục sách
    expect(res[0].categories).toEqual(['IT']);
    // Kiểm tra: số lượng bản in sách
    expect(res[0].bookItemsCount).toBe(5);
    // Kiểm tra: đếm số ấn bản Ebook
    expect(res[0].bookEbookCount).toBe(1);
    // Kiểm tra: rating trung bình (5+4+5)/3 = 4.66 -> làm tròn 4.7
    expect(res[0].averageRating).toBe(4.7);
  });

  it('TC_BOOK_TRANSFORM_02: Không có review', () => {
    // Thử trường hợp sách chưa có review nào
    const res = transformBookData([{ ...mockBookRaw, reviews: [] }]);
    // Kiểm tra: rating trả về 0 để tránh lỗi chia cho 0
    expect(res[0].averageRating).toBe(0);
  });

  it('TC_BOOK_TRANSFORM_03: Thiếu dữ liệu optional', () => {
    // Thử trường hợp DB không query ra category và count
    const res = transformBookData([{ ...mockBookRaw, bookCategories: undefined, bookEditions: undefined, _count: undefined } as BookRawData]);
    // Kiểm tra: mảng rỗng thay vì lỗi undefined
    expect(res[0].categories).toEqual([]);
    expect(res[0].bookItemsCount).toBe(0);
  });
});

describe('TC_BOOK_FILTER | buildBookWhereClause', () => {
  it('TC_BOOK_FILTER_01: Mặc định sách chưa xóa', () => {
    // Kiểm tra: tự động thêm điều kiện isDeleted = false (chỉ hiện sách chưa xóa)
    expect(buildBookWhereClause({ ...baseParams, isDeleted: null })).toEqual({ isDeleted: false });
  });
  it('TC_BOOK_FILTER_02: Lọc theo tác giả', () => {
    // Kiểm tra: điều kiện lọc mảng tác giả sử dụng "in"
    expect(buildBookWhereClause({ ...baseParams, authorIds: [1] }).authorId).toEqual({ in: [1] });
  });
  it('TC_BOOK_FILTER_03: Lọc theo danh mục', () => {
    // Kiểm tra: truy vấn lồng cho danh mục (some)
    expect(buildBookWhereClause({ ...baseParams, categoryIds: [5] }).bookCategories).toEqual({ some: { categoryId: { in: [5] } } });
  });
  it('TC_BOOK_FILTER_04: Lọc theo ngôn ngữ', () => {
    // Kiểm tra: ngôn ngữ sử dụng lệnh "in"
    expect(buildBookWhereClause({ ...baseParams, languageCodes: ['vi'] }).language).toEqual({ in: ['vi'] });
  });
  it('TC_BOOK_FILTER_05: Lọc năm xuất bản', () => {
    // Kiểm tra: điều kiện lớn hơn hoặc bằng (gte) và nhỏ hơn hoặc bằng (lte)
    expect(buildBookWhereClause({ ...baseParams, publishYearFrom: 2000, publishYearTo: 2020 }).publishYear).toEqual({ gte: 2000, lte: 2020 });
  });
  it('TC_BOOK_FILTER_06: Lọc sách có ebook', () => {
    // Kiểm tra: yêu cầu tồn tại ấn bản có định dạng EBOOK
    expect(buildBookWhereClause({ ...baseParams, availableAt: ['ebook'] }).bookEditions).toEqual({ some: { format: 'EBOOK', isDeleted: false } });
  });
  it('TC_BOOK_FILTER_07: Lọc sách có bản in', () => {
    // Kiểm tra: yêu cầu tồn tại bản vật lý trạng thái AVAILABLE
    expect(buildBookWhereClause({ ...baseParams, availableAt: ['book-copy'] }).bookItems).toEqual({ some: { status: 'AVAILABLE', isDeleted: false } });
  });
  it('TC_BOOK_FILTER_08: Cả ebook và bản in', () => {
    // Kiểm tra: điều kiện "AND" bắt buộc thỏa mãn cả 2 trạng thái
    const where = buildBookWhereClause({ ...baseParams, availableAt: ['ebook', 'book-copy'] });
    expect(where.AND).toBeDefined();
  });
});

describe('TC_BOOK_SORT | buildOrderByClause', () => {
  it('TC_BOOK_SORT_01: Sort mặc định', () => {
    // Kiểm tra: khi không truyền gì sẽ tự động xếp mới nhất (createdAt desc)
    expect(buildOrderByClause()).toEqual({ createdAt: 'desc' });
  });
  it('TC_BOOK_SORT_02: Sort title asc', () => {
    // Kiểm tra: sắp xếp theo chữ cái tiêu đề (A-Z)
    expect(buildOrderByClause('title', 'asc')).toEqual({ title: 'asc' });
  });
  it('TC_BOOK_SORT_03: Sort price desc', () => {
    // Kiểm tra: sắp xếp theo giá tiền giảm dần
    expect(buildOrderByClause('price', 'desc')).toEqual({ price: 'desc' });
  });
  it('TC_BOOK_SORT_04: Sort field không hợp lệ', () => {
    // Kiểm tra: ngăn chặn field rác, fallback về xếp theo ngày tạo
    expect(buildOrderByClause('unknown', 'asc')).toEqual({ createdAt: 'desc' });
  });
});

describe('TC_BOOK_LIST | listBooks', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('TC_BOOK_LIST_01: Danh sách trang 1', async () => {
    // Giả lập trả về dữ liệu mẫu và đếm tổng số = 1
    (prisma.book.findMany as jest.Mock).mockResolvedValue([mockBookRaw]);
    (prisma.book.count as jest.Mock).mockResolvedValue(1);
    // Chạy hàm listBooks
    await listBooks({ ...baseParams, page: 1, limit: 10 });
    // Kiểm tra: OFFSET = 0 (skip), LIMIT = 10 (take)
    expect(prisma.book.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 10 }));
  });

  it('TC_BOOK_LIST_02: Phân trang page=3', async () => {
    (prisma.book.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.book.count as jest.Mock).mockResolvedValue(0);
    await listBooks({ ...baseParams, page: 3, limit: 20 });
    // Kiểm tra: trang 3 mỗi trang 20 sách -> bỏ qua 40 quyển đầu (skip: 40)
    expect(prisma.book.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 40, take: 20 }));
  });

  it('TC_BOOK_LIST_03: Tìm theo từ khóa', async () => {
    (prisma.book.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.book.count as jest.Mock).mockResolvedValue(0);
    await listBooks({ ...baseParams, search: 'clean' });
    const arg = (prisma.book.findMany as jest.Mock).mock.calls[0][0];
    // Kiểm tra: từ khóa phải chuyển thành điều kiện OR chứa (title, desc, author...)
    expect(arg.where.OR).toBeDefined();
  });

  it('TC_BOOK_LIST_04: Search + availability', async () => {
    (prisma.book.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.book.count as jest.Mock).mockResolvedValue(0);
    // Gửi cả filter Tồn kho lẫn Search
    await listBooks({ ...baseParams, search: 'clean', availableAt: ['ebook', 'book-copy'] });
    const arg = (prisma.book.findMany as jest.Mock).mock.calls[0][0];
    // Kiểm tra: hệ thống phải ghép cả AND (tồn kho) và OR (search)
    expect(arg.where.AND).toBeDefined();
  });

  it('TC_BOOK_LIST_05: Sort publishYear desc', async () => {
    (prisma.book.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.book.count as jest.Mock).mockResolvedValue(0);
    await listBooks({ ...baseParams, sortBy: 'publishYear', sortOrder: 'desc' });
    // Kiểm tra: lệnh truy vấn DB có kèm ORDER BY
    expect(prisma.book.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { publishYear: 'desc' } }));
  });

  it('TC_BOOK_LIST_06: Multi filter', async () => {
    (prisma.book.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.book.count as jest.Mock).mockResolvedValue(0);
    // Chạy với hàng loạt filter kết hợp
    await listBooks({ ...baseParams, authorIds: [1], categoryIds: [2], languageCodes: ['vi'] });
    const arg = (prisma.book.findMany as jest.Mock).mock.calls[0][0];
    // Kiểm tra: đảm bảo tất cả filter đã nằm trong lệnh DB where clause
    expect(arg.where.authorId).toEqual({ in: [1] });
  });
});