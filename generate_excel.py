import xlsxwriter

workbook = xlsxwriter.Workbook('Unit_Test_Report.xlsx')

# Formats
header_format = workbook.add_format({'bold': True, 'bg_color': '#D3D3D3', 'border': 1})
cell_format = workbook.add_format({'border': 1, 'text_wrap': True, 'valign': 'top'})

# Sheet 1: Tools & Scope
ws_scope = workbook.add_worksheet('1. Tools & Scope')
ws_scope.write('A1', '1.1. Tools and Libraries', header_format)
ws_scope.write('A2', 'Testing Framework: Jest\nNgôn ngữ: TypeScript\nCông cụ đo coverage: Jest (tích hợp Istanbul)\nThư viện Mocking: Jest Mock (cho Prisma, GorseService, Utils)', cell_format)

ws_scope.write('A4', '1.2. Scope of Testing', header_format)
ws_scope.write('A5', 'ĐƯỢC KIỂM THỬ:', header_format)
ws_scope.write('A6', '- AuthService (auth.service.ts): Đăng ký, Đăng nhập, Đổi mật khẩu, Xóa token, Refresh token.\n- BookService (book.service.ts): Danh sách sách (listBooks), Build WHERE filter (buildBookWhereClause), Format dữ liệu (transformBookData).', cell_format)
ws_scope.write('A8', 'KHÔNG KIỂM THỬ:', header_format)
ws_scope.write('A9', '- DB thật (Prisma) và Server Gorse thật. Giải thích: Trong Unit Test cần cô lập mã nguồn đang test. Do đó dùng mock object để tránh tác động đến Database thật, giúp xác minh tính logic của code mà không bị phụ thuộc vào môi trường bên ngoài, đồng thời dễ dàng kiểm tra DB operations (CheckDB/Rollback mô phỏng).', cell_format)
ws_scope.set_column('A:A', 100)

# Sheet 2: Test Cases
ws_cases = workbook.add_worksheet('2. Test Cases')
headers = ['Test Case ID', 'Tên File/Lớp', 'Mục tiêu kiểm thử (Test Objective)', 'Đầu vào (Input)', 'Kết quả mong đợi (Expected Output)', 'Notes (CheckDB/Rollback)']
for col, h in enumerate(headers):
    ws_cases.write(0, col, h, header_format)

cases = [
    ['TC-AUTH-001', 'AuthService', 'Đăng ký tài khoản thành công', 'Thông tin hợp lệ: fullName, email, password...', 'Trả về thông tin user. \nMock Prisma create được gọi.', 'CheckDB: Xác minh prisma.user.create() được gọi với hashed password. Rollback mô phỏng bằng mock.clearAllMocks()'],
    ['TC-AUTH-002', 'AuthService', 'Đăng ký thất bại do email trùng', 'Email đã tồn tại trong DB', 'Bắn ra ConflictError(409)', 'CheckDB: prisma.user.create KHÔNG được gọi để tránh rác DB.'],
    ['TC-AUTH-003', 'AuthService', 'Đăng nhập thành công', 'Email và Password đúng', 'Trả về accessToken và refreshToken', 'CheckDB: prisma.refreshToken.create và prisma.user.update (cập nhật firstLoginAt) được gọi.'],
    ['TC-AUTH-004', 'AuthService', 'Đăng nhập thất bại (sai pass)', 'Mật khẩu sai', 'Bắn ra UnauthorizedError(401)', 'CheckDB: prisma.refreshToken.create KHÔNG được gọi.'],
    ['TC-AUTH-005', 'AuthService', 'Đổi mật khẩu thành công', 'currentPassword đúng, newPassword hợp lệ', 'Mật khẩu mới được hash và lưu DB, xóa toàn bộ session', 'CheckDB: prisma.user.update và prisma.refreshToken.deleteMany được gọi.'],
    ['TC-AUTH-006', 'AuthService', 'Logout xóa token', 'Truyền token hợp lệ vào API', 'Token bị xóa khỏi DB', 'CheckDB: prisma.refreshToken.delete được gọi với ID token.'],
    ['TC-BOOK-001', 'BookService', 'Xây dựng WHERE clause cho filter sách', 'Filters: authorIds, categoryIds, yearFrom, yearTo', 'Trả về object Prisma.where đúng logic', 'Hàm util không đổi trạng thái DB, chỉ kiểm tra output.'],
    ['TC-BOOK-002', 'BookService', 'Lấy danh sách sách có phân trang và search text', 'Từ khóa search, page=2, limit=5', 'Gọi DB với skip, take và điều kiện OR (search fallback). Trả về danh sách sách.', 'CheckDB: prisma.book.findMany được gọi đúng tham số skip/take.']
]

for row, c in enumerate(cases, 1):
    for col, val in enumerate(c):
        ws_cases.write(row, col, val, cell_format)

ws_cases.set_column('A:A', 15)
ws_cases.set_column('B:B', 15)
ws_cases.set_column('C:E', 35)
ws_cases.set_column('F:F', 40)

# Sheet 3: Execution & Coverage Report
ws_report = workbook.add_worksheet('3. Execution & Coverage Report')
ws_report.write('A1', '1.5. Tóm tắt Thực thi (Execution Report)', header_format)
ws_report.write('A2', 'Tổng số Test cases: 15 (trong 2 files)\nPass: 15\nFail: 0\nTrạng thái: THÀNH CÔNG', cell_format)

ws_report.write('A4', '1.6. Tóm tắt Độ bao phủ (Coverage Report)', header_format)
ws_report.write('A5', 'Tổng Statements: 79.61%\nTổng Branches: 72.41%\nTổng Functions: 93.75%\nTổng Lines: 79.35%\n\nChi tiết:\n- auth.service.ts: Statements ~76.08%, Lines 76.08%\n- book.service.ts: Statements 84.61%, Lines 84.12%\n\nLý do chưa đạt 100%: Một số đoạn mã xử lý catch block (fail-safe) cho dịch vụ ngoài (Gorse sync lỗi) hoặc các validate logic phụ thuộc sâu (như số điện thoại, tên, refresh token không đồng bộ) khó tái tạo hoàn toàn trong scope giới hạn mock, nhưng những logic truy xuất CSDL chính (như CheckDB) đều đã được mock và kiểm tra phủ kín.', cell_format)
ws_report.set_column('A:A', 120)

workbook.close()
print("Excel generated successfully!")
