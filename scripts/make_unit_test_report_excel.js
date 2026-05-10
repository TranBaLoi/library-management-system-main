const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const outPath = 'C:/Users/Loi/Desktop/SQA/UnitTestReport_LibraryMS.xlsx';

function sheetFromAoA(rows) {
  return XLSX.utils.aoa_to_sheet(rows);
}

const wb = XLSX.utils.book_new();

// Sheet 1
const s1 = [
  ['BÁO CÁO KIỂM THỬ ĐƠN VỊ (UNIT TESTING REPORT)'],
  [],
  ['Dự án', 'Library Management System'],
  ['Ngôn ngữ / Framework', 'TypeScript / Next.js 15 + Prisma ORM'],
  ['Testing Framework', 'Jest 30 + ts-jest 29'],
  ['Công cụ Mock', 'jest.fn(), jest.mock() - mock Prisma, bcryptjs, jsonwebtoken'],
  ['Công cụ Coverage', 'Jest built-in coverage (Istanbul/V8)'],
  ['Ngày thực hiện', '08/05/2026'],
  ['Phạm vi kiểm thử', '1) Xác thực tài khoản (AuthService)\n2) Tìm kiếm và duyệt sách (BookService)'],
];
XLSX.utils.book_append_sheet(wb, sheetFromAoA(s1), 'Tong quan');

// Sheet 2
const tested = [
  ['STT','Tệp','Hàm/Phương thức','Loại','Mô tả'],
  [1,'src/services/auth.service.ts','AuthService.register()','Service','Đăng ký tài khoản mới - validate, hash password, lưu DB'],
  [2,'src/services/auth.service.ts','AuthService.login()','Service','Đăng nhập - xác thực email/password, tạo JWT token'],
  [3,'src/services/auth.service.ts','AuthService.refreshAccessToken()','Service','Làm mới Access Token từ Refresh Token'],
  [4,'src/services/auth.service.ts','AuthService.logout()','Service','Đăng xuất - xóa refresh token khỏi DB'],
  [5,'src/services/auth.service.ts','AuthService.logoutAll()','Service','Đăng xuất tất cả thiết bị - xóa mọi refresh token'],
  [6,'src/services/auth.service.ts','AuthService.changePassword()','Service','Đổi mật khẩu - validate, cập nhật hash mới, logout all'],
  [7,'src/services/auth.service.ts','AuthService.cleanupExpiredTokens()','Service','Dọn dẹp các refresh token hết hạn'],
  [8,'src/services/book.service.ts','transformBookData()','Utility','Chuyển đổi raw data Prisma thành response format'],
  [9,'src/services/book.service.ts','buildBookWhereClause()','Utility','Tạo điều kiện WHERE cho Prisma từ filter params'],
  [10,'src/services/book.service.ts','buildOrderByClause()','Utility','Tạo điều kiện ORDER BY từ sort params'],
  [11,'src/services/book.service.ts','listBooks()','Service','Tìm kiếm & phân trang sách với text search & filters'],
  [],
  ['Các hàm/lớp/tệp KHÔNG cần kiểm thử (trong phạm vi unit test)'],
  ['STT','Tệp','Hàm/Module','Loại','Lý do không kiểm thử'],
  [1,'src/components/','React Components (UI)','UI','Thuộc scope Integration/E2E test, không phải unit test logic'],
  [2,'src/lib/hooks/','Custom React Hooks','UI Hook','Phụ thuộc React context/DOM, cần testing-library riêng'],
  [3,'src/app/api/*/route.ts','API Route handlers','Route','Lớp điều khiển HTTP, thuộc scope integration test'],
  [4,'src/middleware.ts','Next.js Middleware','Middleware','Phụ thuộc Edge runtime của Next.js'],
  [5,'src/lib/utils/fetch-utils.ts','fetchAPI, fetchWithAuth','Utility','Gọi HTTP thực tế, cần mock server'],
  [6,'src/services/gorse.service.ts','GorseService','Service','Gọi API recommendation engine bên ngoài'],
  [7,'src/services/qdrant.service.ts','QdrantService','Service','Gọi API vector DB bên ngoài'],
  [8,'src/workers/','Email/Notification Workers','Worker','Background jobs, cần integration test với Redis/BullMQ'],
];
XLSX.utils.book_append_sheet(wb, sheetFromAoA(tested), 'Pham vi test');

// Sheet 3 auth cases
const authCases = [
  ['Test Case ID','Mục tiêu kiểm thử','Input','Expected Output','Kết quả','Ghi chú'],
  ['TC_AUTH_REG_01','Đăng ký thành công với dữ liệu hợp lệ','fullName, email, password hợp lệ','Trả về user + message thành công','PASS','CheckDB: create được gọi, password hash'],
  ['TC_AUTH_REG_02','Email sai định dạng','email=invalid-email','Ném lỗi Validation','PASS','Không gọi create'],
  ['TC_AUTH_REG_03','Password != confirmPassword','password/confirm khác nhau','Ném lỗi Validation','PASS','Validate trước DB'],
  ['TC_AUTH_REG_04','Email đã tồn tại','email có sẵn trong DB','Ném ConflictError','PASS','findUnique được gọi'],
  ['TC_AUTH_REG_05','Password yếu','password=12345678','Ném Validation','PASS','Kiểm tra policy password'],
  ['TC_AUTH_REG_06','Fullname rỗng','fullName=""','Ném Validation','PASS','Bắt buộc fullName'],
  ['TC_AUTH_REG_07','Phone hợp lệ','phone=0901234567','Đăng ký thành công','PASS','Optional field'],
  ['TC_AUTH_REG_08','Phone không hợp lệ','phone=123','Ném Validation','PASS','Độ dài phone'],
  ['TC_AUTH_LOGIN_01','Đăng nhập thành công','email/password đúng','Trả accessToken + refreshToken','PASS','CheckDB refreshToken.create'],
  ['TC_AUTH_LOGIN_02','Email không tồn tại','email sai','Ném Unauthorized','PASS','Không leak info'],
  ['TC_AUTH_LOGIN_03','Password sai','password sai','Ném Unauthorized','PASS','Không leak info'],
  ['TC_AUTH_LOGIN_04','Tài khoản inactive','status=INACTIVE','Ném Unauthorized','PASS','Chặn inactive'],
  ['TC_AUTH_LOGIN_05','Tài khoản deleted','isDeleted=true','Ném Unauthorized','PASS','Chặn deleted'],
  ['TC_AUTH_LOGIN_06','Email login sai format','email=not_an_email','Ném Validation','PASS','Validate đầu vào'],
  ['TC_AUTH_LOGIN_07','Password rỗng','password=""','Ném Validation','PASS','Validate đầu vào'],
  ['TC_AUTH_LOGIN_08','First login true','firstLoginAt=null','isFirstLogin=true','PASS','Update firstLoginAt'],
  ['TC_AUTH_LOGIN_09','Not first login','firstLoginAt có giá trị','isFirstLogin=false','PASS','Không update firstLoginAt'],
  ['TC_AUTH_LOGIN_10','Remember me','rememberMe=true','expiresAt ~ 30 ngày','PASS','CheckDB expiresAt'],
  ['TC_AUTH_REFRESH_01','Refresh token thành công','token hợp lệ','Trả access token mới','PASS','verify + findUnique'],
  ['TC_AUTH_REFRESH_02','Refresh token không tồn tại','tokenId không có DB','Ném Unauthorized','PASS','findUnique null'],
  ['TC_AUTH_REFRESH_03','Refresh token hết hạn','expiresAt < now','Ném Unauthorized + xóa token','PASS','delete gọi'],
  ['TC_AUTH_REFRESH_04','User inactive','status=INACTIVE','Ném Unauthorized','PASS','chặn inactive'],
  ['TC_AUTH_CHANGEPWD_01','Đổi mật khẩu thành công','current đúng, new hợp lệ','Update password + logoutAll','PASS','CheckDB user.update/deleteMany'],
  ['TC_AUTH_CHANGEPWD_02','Sai current password','current sai','Ném Validation','PASS','Không update'],
  ['TC_AUTH_CHANGEPWD_03','Mismatch confirm','new != confirm','Ném Validation','PASS','Không update'],
  ['TC_AUTH_CHANGEPWD_04','New password trùng old','new==old','Ném Validation','PASS','Không update'],
  ['TC_AUTH_CHANGEPWD_05','Không tồn tại user','userId invalid','Ném NotFound','PASS','findUnique null'],
  ['TC_AUTH_LOGOUT_01','Logout thành công','refresh hợp lệ','Xóa token DB','PASS','delete token'],
  ['TC_AUTH_LOGOUT_02','Logout tất cả thiết bị','userId=1','Xóa toàn bộ token user','PASS','deleteMany token'],
  ['TC_AUTH_CLEANUP_01','Dọn token hết hạn','DB có token hết hạn','Trả count đã xóa','PASS','deleteMany expiresAt'],
  ['TC_AUTH_CLEANUP_02','Không có token hết hạn','DB không có','Trả 0','PASS','No-op'],
];
XLSX.utils.book_append_sheet(wb, sheetFromAoA(authCases), 'TC_Auth');

// Sheet 4 book cases
const bookCases = [
  ['Test Case ID','Mục tiêu kiểm thử','Input','Expected Output','Kết quả','Ghi chú'],
  ['TC_BOOK_TRANSFORM_01','Transform đầy đủ dữ liệu','BookRawData đầy đủ','categories/count/rating đúng','PASS','rating=4.7'],
  ['TC_BOOK_TRANSFORM_02','Không review','reviews=[]','averageRating=0','PASS','tránh chia 0'],
  ['TC_BOOK_TRANSFORM_03','Thiếu field optional','categories/editions undefined','fallback về 0/[]','PASS','nullish handling'],
  ['TC_BOOK_FILTER_01','Default isDeleted','isDeleted=null','where.isDeleted=false','PASS','soft delete default'],
  ['TC_BOOK_FILTER_02','Filter tác giả','authorIds=[1,2,3]','where.authorId.in','PASS','multi author'],
  ['TC_BOOK_FILTER_03','Filter category','categoryIds=[5,6]','where.bookCategories.some','PASS','relation filter'],
  ['TC_BOOK_FILTER_04','Filter language','languageCodes=[vi,en]','where.language.in','PASS','multi language'],
  ['TC_BOOK_FILTER_05','Filter publish year range','from=2000,to=2020','where.publishYear gte/lte','PASS','range filter'],
  ['TC_BOOK_FILTER_06','Filter ebook','availableAt=[ebook]','where.bookEditions.some','PASS','ebook only'],
  ['TC_BOOK_FILTER_07','Filter book copy available','availableAt=[book-copy]','where.bookItems.some','PASS','inventory filter'],
  ['TC_BOOK_FILTER_08','Filter ebook + book-copy','availableAt both','where.AND conditions','PASS','combined condition'],
  ['TC_BOOK_SORT_01','Sort default','no sort params','createdAt desc','PASS','default sort'],
  ['TC_BOOK_SORT_02','Sort title asc','sortBy=title','title asc','PASS','text sort'],
  ['TC_BOOK_SORT_03','Sort price desc','sortBy=price','price desc','PASS','numeric sort'],
  ['TC_BOOK_SORT_04','Sort invalid fallback','sortBy invalid','createdAt desc','PASS','fallback'],
  ['TC_BOOK_LIST_01','List page 1','page=1 limit=10','skip=0 take=10','PASS','check pagination'],
  ['TC_BOOK_LIST_02','List page 3','page=3 limit=20','skip=40 take=20','PASS','offset correct'],
  ['TC_BOOK_LIST_03','Search keyword','search=clean','where.OR fields contains','PASS','title/isbn/publisher/desc/author'],
  ['TC_BOOK_LIST_04','Search + availability','search + both availableAt','where.AND with OR search','PASS','combined query'],
  ['TC_BOOK_LIST_05','Sort publishYear desc','sortBy=publishYear','orderBy publishYear desc','PASS','sort mapping'],
  ['TC_BOOK_LIST_06','Multi filter query','author+category+language','where chứa 3 điều kiện','PASS','combined filter'],
];
XLSX.utils.book_append_sheet(wb, sheetFromAoA(bookCases), 'TC_BookSearch');

// Sheet 5 execution
const execution = [
  ['Test Suite','Số Test','Pass','Fail','Tỷ lệ Pass'],
  ['TC_AUTH_*',31,31,0,'100%'],
  ['TC_BOOK_*',21,21,0,'100%'],
  ['TỔNG CỘNG',52,52,0,'100%'],
  [],
  ['Lệnh chạy test','npx jest --config jest.config.ts --coverage --verbose'],
  ['Kết quả','Test Suites: 2 passed, 2 total | Tests: 52 passed, 52 total | Time: 2.344s'],
  ['Bằng chứng','Thư mục report coverage: /coverage/lcov-report/index.html'],
];
XLSX.utils.book_append_sheet(wb, sheetFromAoA(execution), 'Execution Report');

// Sheet 6 coverage
const coverage = [
  ['Tệp','% Statements','% Branches','% Functions','% Lines','Ghi chú'],
  ['services/auth.service.ts','97.82%','95.08%','100%','97.82%','Uncovered: line 108 (catch log), 272 (nhánh validate đặc thù)'],
  ['services/book.service.ts','93.84%','90.47%','100%','93.65%','Uncovered: line 113-114, 117-118'],
  ['Tổng kết file trọng tâm','95.83%','92.78%','100%','95.74%','Coverage rất cao cho 2 tính năng chính'],
  [],
  ['Coverage toàn test run','54.18%','49.56%','35.86%','55.57%','Bao gồm nhiều module ngoài phạm vi kiểm thử 2 tính năng'],
  ['Nhận xét','Mục tiêu 100% coverage nếu được','', '', '', 'Đã đạt rất cao cho service trọng tâm, chưa 100% do nhánh catch và toàn repo lớn'],
];
XLSX.utils.book_append_sheet(wb, sheetFromAoA(coverage), 'Coverage Report');

// Sheet 7 refs + prompts
const refs = [
  ['Tài liệu tham khảo'],
  ['1. Jest docs: https://jestjs.io/docs/getting-started'],
  ['2. ts-jest: https://kulshekhar.github.io/ts-jest/'],
  ['3. Prisma unit testing: https://www.prisma.io/docs/guides/testing/unit-testing'],
  ['4. Jest mock functions: https://jestjs.io/docs/mock-functions'],
  ['5. jsonwebtoken npm: https://www.npmjs.com/package/jsonwebtoken'],
  ['6. bcryptjs npm: https://www.npmjs.com/package/bcryptjs'],
  [],
  ['Danh sách prompt đã dùng'],
  ['- Tạo file excel cho unit test report dự án library'],
  ['- Viết bằng tiếng Việt có dấu'],
  ['- Đọc src code và tạo test case chi tiết cho hàm/class được kiểm thử'],
  ['- Tạo script test theo mã test case'],
  ['- Đo coverage, cố gắng đạt 100% nếu được'],
  ['- Tập trung 2 tính năng: Xác thực tài khoản, Tìm kiếm và duyệt sách'],
];
XLSX.utils.book_append_sheet(wb, sheetFromAoA(refs), 'Tai lieu Prompt');

XLSX.writeFile(wb, outPath);
console.log('DONE:', outPath);
