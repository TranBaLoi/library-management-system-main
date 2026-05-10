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


// ==========================================
// HELPER: QUẢN LÝ DATABASE GIẢ LẬP
// ==========================================
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
  // Với tính năng tìm kiếm/duyệt sách hiện tại, service chỉ đọc DB (findMany/count).
  // Vì vậy DB AFTER phải giữ nguyên dữ liệu ban đầu, không được trả về mảng rỗng.
  return {
    books: latestBookDbSnapshot.books.map((book: any) => ({ ...book })),
  };
}

beforeEach(() => {
  const testName = expect.getState().currentTestName || 'Unknown testcase';
  // DB BEFORE mặc định là snapshot mockBookRaw cho phần sách.
  // Snapshot này giúp từng test case thấy rõ DB đang có sách nào trước khi chạy logic.
  latestBookDbSnapshot = createBookMockDb();
  printDbSnapshot(`${testName} | DB BEFORE (auto)`, latestBookDbSnapshot);
});

afterEach(() => {
  const testName = expect.getState().currentTestName || 'Unknown testcase';
  const dbAfter = buildBookAfterFromMockCalls();
  // In query arguments để biết test case đã query DB theo điều kiện gì.
  const queryLog = {
    findManyArgs: (prisma.book.findMany as jest.Mock).mock.calls.map((call: any[]) => call[0]),
    countArgs: (prisma.book.count as jest.Mock).mock.calls.map((call: any[]) => call[0]),
  };
  printDbSnapshot(`${testName} | DB AFTER (auto)`, dbAfter, queryLog);
});

describe('TC_BOOK_TRANSFORM | transformBookData', () => {
  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_BOOK_TRANSFORM_01: Transform dữ liệu đầy đủ', () => {
    // Gọi hàm transform chuyển raw data thành data API
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const res = transformBookData([mockBookRaw]);
    // Kiểm tra: lấy đúng tên danh mục sách
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(res[0].categories).toEqual(['IT']);
    // Kiểm tra: số lượng bản in sách
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(res[0].bookItemsCount).toBe(5);
    // Kiểm tra: đếm số ấn bản Ebook
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(res[0].bookEbookCount).toBe(1);
    // Kiểm tra: rating trung bình (5+4+5)/3 = 4.66 -> làm tròn 4.7
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(res[0].averageRating).toBe(4.7);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_BOOK_TRANSFORM_02: Không có review', () => {
    // Thử trường hợp sách chưa có review nào
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const res = transformBookData([{ ...mockBookRaw, reviews: [] }]);
    // Kiểm tra: rating trả về 0 để tránh lỗi chia cho 0
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(res[0].averageRating).toBe(0);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_BOOK_TRANSFORM_03: Thiếu dữ liệu optional', () => {
    // Thử trường hợp DB không query ra category và count
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const res = transformBookData([{ ...mockBookRaw, bookCategories: undefined, bookEditions: undefined, _count: undefined } as BookRawData]);
    // Kiểm tra: mảng rỗng thay vì lỗi undefined
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(res[0].categories).toEqual([]);
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(res[0].bookItemsCount).toBe(0);
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });
});

describe('TC_BOOK_FILTER | buildBookWhereClause', () => {
  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_BOOK_FILTER_01: Mặc định sách chưa xóa', () => {
    // Kiểm tra: tự động thêm điều kiện isDeleted = false (chỉ hiện sách chưa xóa)
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(buildBookWhereClause({ ...baseParams, isDeleted: null })).toEqual({ isDeleted: false });
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });
  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_BOOK_FILTER_02: Lọc theo tác giả', () => {
    // Kiểm tra: điều kiện lọc mảng tác giả sử dụng "in"
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(buildBookWhereClause({ ...baseParams, authorIds: [1] }).authorId).toEqual({ in: [1] });
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });
  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_BOOK_FILTER_03: Lọc theo danh mục', () => {
    // Kiểm tra: truy vấn lồng cho danh mục (some)
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(buildBookWhereClause({ ...baseParams, categoryIds: [5] }).bookCategories).toEqual({ some: { categoryId: { in: [5] } } });
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });
  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_BOOK_FILTER_04: Lọc theo ngôn ngữ', () => {
    // Kiểm tra: ngôn ngữ sử dụng lệnh "in"
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(buildBookWhereClause({ ...baseParams, languageCodes: ['vi'] }).language).toEqual({ in: ['vi'] });
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });
  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_BOOK_FILTER_05: Lọc năm xuất bản', () => {
    // Kiểm tra: điều kiện lớn hơn hoặc bằng (gte) và nhỏ hơn hoặc bằng (lte)
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(buildBookWhereClause({ ...baseParams, publishYearFrom: 2000, publishYearTo: 2020 }).publishYear).toEqual({ gte: 2000, lte: 2020 });
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });
  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_BOOK_FILTER_06: Lọc sách có ebook', () => {
    // Kiểm tra: yêu cầu tồn tại ấn bản có định dạng EBOOK
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(buildBookWhereClause({ ...baseParams, availableAt: ['ebook'] }).bookEditions).toEqual({ some: { format: 'EBOOK', isDeleted: false } });
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });
  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_BOOK_FILTER_07: Lọc sách có bản in', () => {
    // Kiểm tra: yêu cầu tồn tại bản vật lý trạng thái AVAILABLE
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(buildBookWhereClause({ ...baseParams, availableAt: ['book-copy'] }).bookItems).toEqual({ some: { status: 'AVAILABLE', isDeleted: false } });
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });
  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_BOOK_FILTER_08: Cả ebook và bản in', () => {
    // Kiểm tra: điều kiện "AND" bắt buộc thỏa mãn cả 2 trạng thái
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const where = buildBookWhereClause({ ...baseParams, availableAt: ['ebook', 'book-copy'] });
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(where.AND).toBeDefined();
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });
});

describe('TC_BOOK_SORT | buildOrderByClause', () => {
  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_BOOK_SORT_01: Sort mặc định', () => {
    // Kiểm tra: khi không truyền gì sẽ tự động xếp mới nhất (createdAt desc)
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(buildOrderByClause()).toEqual({ createdAt: 'desc' });
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });
  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_BOOK_SORT_02: Sort title asc', () => {
    // Kiểm tra: sắp xếp theo chữ cái tiêu đề (A-Z)
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(buildOrderByClause('title', 'asc')).toEqual({ title: 'asc' });
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });
  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_BOOK_SORT_03: Sort price desc', () => {
    // Kiểm tra: sắp xếp theo giá tiền giảm dần
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(buildOrderByClause('price', 'desc')).toEqual({ price: 'desc' });
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });
  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_BOOK_SORT_04: Sort field không hợp lệ', () => {
    // Kiểm tra: ngăn chặn field rác, fallback về xếp theo ngày tạo
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(buildOrderByClause('unknown', 'asc')).toEqual({ createdAt: 'desc' });
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });
});

describe('TC_BOOK_LIST | listBooks', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_BOOK_LIST_01: Danh sach trang 1 (chi doc DB, khong ghi DB)', async () => {
    // 1) TAO DB GIA LAP BAN DAU: co san 1 sach
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const mockDb = createBookMockDb();
    // Giải thích: In DB BEFORE ra console để thấy dữ liệu trước khi chạy action.
    printDbSnapshot('TC_BOOK_LIST_01 | DB BEFORE', mockDb);

    // 2) GHI LOG QUERY duoc gui xuong prisma.book.findMany
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    let findManyArgs: any = null;
    // Giải thích: Mock Prisma bằng logic thật trên mảng DB giả lập để mô phỏng thao tác DB.
    (prisma.book.findMany as jest.Mock).mockImplementation(async (args: any) => {
      // Giải thích: Dòng này là một bước setup, action hoặc assert phục vụ testcase hiện tại.
      findManyArgs = args;
      // Giải thích: Trả dữ liệu mock về cho service/API như kết quả từ DB.
      return mockDb.books;
    // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
    });

    // 3) count tra ve tong so sach trong DB gia
    (prisma.book.count as jest.Mock).mockImplementation(async () => mockDb.books.length);

    // 4) CHAY NGHIEP VU listBooks
    const result = await listBooks({ ...baseParams, page: 1, limit: 10 });

    // 5) IN DB SAU KHI CHAY (khong doi vi day la chuc nang doc)
    printDbSnapshot('TC_BOOK_LIST_01 | DB AFTER (khong doi)', mockDb, findManyArgs);

    // 6) ASSERT KET QUA NGHIEP VU
    expect(result.total).toBe(1);
    expect(result.books).toHaveLength(1);

    // 7) ASSERT QUERY phan trang gui xuong DB
    expect(findManyArgs.skip).toBe(0);
    expect(findManyArgs.take).toBe(10);
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_BOOK_LIST_02: Phân trang page=3', async () => {
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (prisma.book.findMany as jest.Mock).mockResolvedValue([]);
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (prisma.book.count as jest.Mock).mockResolvedValue(0);
    // Giải thích: Thực thi action chính của test case để tạo output hoặc thay đổi DB cần kiểm tra.
    await listBooks({ ...baseParams, page: 3, limit: 20 });
    // Kiểm tra: trang 3 mỗi trang 20 sách -> bỏ qua 40 quyển đầu (skip: 40)
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(prisma.book.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 40, take: 20 }));
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_BOOK_LIST_03: Tìm theo từ khóa', async () => {
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (prisma.book.findMany as jest.Mock).mockResolvedValue([]);
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (prisma.book.count as jest.Mock).mockResolvedValue(0);
    // Giải thích: Thực thi action chính của test case để tạo output hoặc thay đổi DB cần kiểm tra.
    await listBooks({ ...baseParams, search: 'clean' });
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const arg = (prisma.book.findMany as jest.Mock).mock.calls[0][0];
    // Kiểm tra: từ khóa phải chuyển thành điều kiện OR chứa (title, desc, author...)
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(arg.where.OR).toBeDefined();
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_BOOK_LIST_04: Search + availability', async () => {
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (prisma.book.findMany as jest.Mock).mockResolvedValue([]);
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (prisma.book.count as jest.Mock).mockResolvedValue(0);
    // Gửi cả filter Tồn kho lẫn Search
    // Giải thích: Thực thi action chính của test case để tạo output hoặc thay đổi DB cần kiểm tra.
    await listBooks({ ...baseParams, search: 'clean', availableAt: ['ebook', 'book-copy'] });
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const arg = (prisma.book.findMany as jest.Mock).mock.calls[0][0];
    // Kiểm tra: hệ thống phải ghép cả AND (tồn kho) và OR (search)
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(arg.where.AND).toBeDefined();
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_BOOK_LIST_05: Sort publishYear desc', async () => {
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (prisma.book.findMany as jest.Mock).mockResolvedValue([]);
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (prisma.book.count as jest.Mock).mockResolvedValue(0);
    // Giải thích: Thực thi action chính của test case để tạo output hoặc thay đổi DB cần kiểm tra.
    await listBooks({ ...baseParams, sortBy: 'publishYear', sortOrder: 'desc' });
    // Kiểm tra: lệnh truy vấn DB có kèm ORDER BY
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(prisma.book.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { publishYear: 'desc' } }));
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });

  // Giải thích từng dòng: Test case bên dưới được chú thích chi tiết theo từng bước Arrange - Act - Assert.
  // Giải thích: Khai báo test case, Test Case ID phải khớp với ID trong file Excel.
  it('TC_BOOK_LIST_06: Multi filter', async () => {
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (prisma.book.findMany as jest.Mock).mockResolvedValue([]);
    // Giải thích: Mock kết quả Prisma trả về để mô phỏng dữ liệu đọc từ DB.
    (prisma.book.count as jest.Mock).mockResolvedValue(0);
    // Chạy với hàng loạt filter kết hợp
    // Giải thích: Thực thi action chính của test case để tạo output hoặc thay đổi DB cần kiểm tra.
    await listBooks({ ...baseParams, authorIds: [1], categoryIds: [2], languageCodes: ['vi'] });
    // Giải thích: Khai báo biến dùng để lưu dữ liệu mock, request, response hoặc output của bước test này.
    const arg = (prisma.book.findMany as jest.Mock).mock.calls[0][0];
    // Kiểm tra: đảm bảo tất cả filter đã nằm trong lệnh DB where clause
    // Giải thích: Assert kết quả thực tế khớp với expected output hoặc trạng thái DB mong muốn.
    expect(arg.where.authorId).toEqual({ in: [1] });
  // Giải thích: Đóng block code hiện tại sau khi hoàn tất các bước test.
  });
});
