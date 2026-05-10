import os, json, re, time, datetime, subprocess
from pathlib import Path
from urllib.parse import quote
import requests
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Border, Side, Alignment
from openpyxl.utils import get_column_letter

ROOT = Path(r'C:\Users\Loi\Desktop\SQA\library-management-system-main')
API_ROOT = ROOT / 'src' / 'app' / 'api'
OUT = ROOT / 'Bao_Cao_Test_API_Theo_Luong_Nghiep_Vu.xlsx'
BASE_URL = 'http://localhost:3000'
METHODS = ['GET','POST','PUT','PATCH','DELETE']
SESSION = requests.Session()
TIMEOUT = 10

# Thông tin tài khoản test sinh động theo thời gian
TIMESTAMP = int(time.time() * 1000)
TEST_EMAIL = f'testuser_{TIMESTAMP}@example.com'
TEST_PASSWORD = 'Password@123'
GLOBAL_TOKEN = ''  # Sẽ được cập nhật sau khi login thành công

def read_text(p): return p.read_text(encoding='utf-8', errors='ignore')

def endpoint_from_file(path: Path):
    rel = path.relative_to(API_ROOT).parent.as_posix()
    return '/api/' + rel.replace('[...path]', ':path*').replace('[bookId]', ':bookId').replace('[id]', ':id')

def key_from_file(path: Path): return path.relative_to(API_ROOT).parent.as_posix()

def methods_from_text(text):
    return [m for m in METHODS if re.search(r'export\s+(?:async\s+function|const)\s+'+m+r'\b', text)]

def auth_required(text):
    if 'requireAdmin' in text: return 'Cần token ADMIN'
    if 'requireLibrarian' in text: return 'Cần token LIBRARIAN/ADMIN'
    if 'requireAuth' in text: return 'Cần Bearer token'
    if 'optionalAuth' in text: return 'Token tùy chọn'
    return 'Public/không bắt buộc token'

sample_body = {
 'auth/register': lambda: {'fullName': 'Nguyen Van Test','email': TEST_EMAIL,'password': TEST_PASSWORD,'confirmPassword': TEST_PASSWORD},
 'auth/login': lambda: {'email': TEST_EMAIL,'password': TEST_PASSWORD},
 'auth/change-password': lambda: {'currentPassword': TEST_PASSWORD,'newPassword':'NewPassword@123','confirmPassword':'NewPassword@123'},
 'auth/interests': lambda: {'categoryIds':[1,2]},
 'auth/reset-password': lambda: {'email': TEST_EMAIL,'otp':'000000','newPassword':'NewPassword@123','confirmPassword':'NewPassword@123'},
 'otp/send': lambda: {'email': TEST_EMAIL,'purpose':'forgot-password'},
 'otp/verify/forgot-password': lambda: {'email': TEST_EMAIL,'otp':'000000'},
 'authors': lambda: {'fullName':f'Tác giả API Test {TIMESTAMP}','bio':'Tạo tự động khi test API','birthDate':'1980-01-01','nationality':'Việt Nam','isDeleted':False},
 'categories': lambda: {'name':f'Danh mục API Test {TIMESTAMP}','description':'Tạo tự động khi test API','isDeleted':False},
 'books': lambda: {'authorId':1,'title':f'Sách API Test {TIMESTAMP}','isbn':f'ISBN-{TIMESTAMP}','publishYear':2024,'publisher':'NXB Test','pageCount':120,'price':100000,'edition':'1','description':'Tạo API test','language':'vi','categories':[1]},
 'book-items': lambda: {'bookId':1,'code':f'COPY-{TIMESTAMP}','condition':'GOOD','status':'AVAILABLE','acquisitionDate':'2024-01-01','isDeleted':False},
 'book-editions': lambda: {'bookId':1,'format':'EBOOK','fileUrl':'/uploads/test.pdf','fileSize':1024,'isDeleted':False},
 'borrow-requests': lambda: {'bookId':1,'borrowDate':'2026-05-09','dueDate':'2026-05-23','note':'Test API'},
 'borrow-requests/[id]/manage': lambda: {'status':'APPROVED','note':'Duyệt bằng API test'},
 'borrow-records/[id]/renew': lambda: {'newDueDate':'2026-06-01','note':'Gia hạn bằng API test'},
 'borrow-records/[id]/return': lambda: {'condition':'GOOD','note':'Trả sách bằng API test'},
 'borrow-records/[id]/return-ebook': lambda: {'note':'Trả ebook bằng API test'},
 'ebook-borrow-requests': lambda: {'bookId':1,'editionId':1,'note':'Test API'},
 'favorite-books': lambda: {'bookId':1},
 'notifications': lambda: {'userId':1,'title':'Thông báo API Test','message':'Tạo tự động khi test API','type':'SYSTEM'},
 'payments': lambda: {'borrowRecordId':1,'amount':50000,'method':'CASH','note':'Test thanh toán'},
 'policies': lambda: {'name':f'Chính sách API Test {TIMESTAMP}','description':'Test API','value':'10','isActive':True},
 'reviews': lambda: {'bookId':1,'rating':5,'comment':'Đánh giá API test'},
 'users': lambda: {'fullName':'User API Test','email':f'user_api_{TIMESTAMP}@example.com','password':'Password@123','phoneNumber':'0900000000','address':'HCM','role':'READER'},
 'ai-summarize': lambda: {'text':'Đây là đoạn văn bản mẫu dùng để kiểm thử API tóm tắt.'},
 'mail/test': lambda: {'email':TEST_EMAIL},
}

def get_body(key):
    if key in sample_body: return sample_body[key]()
    base = re.sub(r'/\[[^\]]+\]', '', key)
    return sample_body.get(base, lambda:{'sampleField':'sample value'})()

def normalize_url(ep, negative=False):
    url = BASE_URL + ep
    url = url.replace(':id', '-1' if negative else '1')
    url = url.replace(':bookId', '-1' if negative else '1')
    url = url.replace(':path*', quote('test.pdf'))
    if ep == '/api/files/:path*': url = BASE_URL + '/api/files/test.pdf'
    return url

# Gom nhóm API theo thứ tự ưu tiên
def get_sort_weight(ep, method):
    if 'auth/register' in ep: return 1
    if 'auth/login' in ep: return 2
    if 'auth/me' in ep: return 3
    if 'auth' in ep: return 4
    if method == 'GET': return 5 # Ưu tiên các method GET (đọc) trước
    if method == 'POST': return 6 # Tạo mới
    if method in ['PUT', 'PATCH']: return 7 # Cập nhật
    if method == 'DELETE': return 8 # Xóa cuối cùng
    return 9

routes = []
for p in sorted(API_ROOT.rglob('route.ts')):
    text=read_text(p); ep=endpoint_from_file(p); key=key_from_file(p)
    for m in methods_from_text(text):
        routes.append({'method':m,'endpoint':ep,'key':key,'auth':auth_required(text),'file':str(p)})

# Sắp xếp danh sách API theo flow logic
routes.sort(key=lambda x: get_sort_weight(x['endpoint'], x['method']))

results = []
case_idx = 1
created_records = []

print("Bắt đầu chạy test case theo luồng...")

for r in routes:
    for positive in [True, False]:
        # Bỏ qua negative case đối với các GET cơ bản (để giảm rác)
        if not positive and not (r['method'] in ['POST','PUT','PATCH'] or ':id' in r['endpoint'] or ':bookId' in r['endpoint']):
            continue
            
        tcid = f'TC-API-{case_idx:03d}'
        case_idx += 1
        url = normalize_url(r['endpoint'], negative=not positive)
        
        if r['method'] == 'GET' and positive and '?' not in url and not any(x in r['endpoint'] for x in ['file','view']):
            url += '?page=1&limit=10&search=test&sortBy=createdAt&sortOrder=desc'
            
        body = None if r['method'] in ['GET','DELETE'] else (get_body(r['key']) if positive else {})
        expected_codes = [200,201] if positive else [400,401,403,404,409,422,500]
        
        start = time.time()
        actual = ''; note = ''; passed = False; status_code = 'N/A'; resp_text = ''
        
        try:
            headers = {'Content-Type': 'application/json'}
            if GLOBAL_TOKEN and ('token' in r['auth'].lower() or 'cần' in r['auth'].lower() or r['auth'].startswith('Token')):
                headers['Authorization'] = f'Bearer {GLOBAL_TOKEN}'

            if r['method'] == 'GET': resp = SESSION.get(url, headers=headers, timeout=TIMEOUT)
            elif r['method'] == 'POST': resp = SESSION.post(url, headers=headers, json=body, timeout=TIMEOUT)
            elif r['method'] == 'PUT': resp = SESSION.put(url, headers=headers, json=body, timeout=TIMEOUT)
            elif r['method'] == 'PATCH': resp = SESSION.patch(url, headers=headers, json=body, timeout=TIMEOUT)
            elif r['method'] == 'DELETE': resp = SESSION.delete(url, headers=headers, timeout=TIMEOUT)
            
            status_code = resp.status_code
            resp_text = resp.text[:1200]
            try: data = resp.json()
            except: data = None
            
            contract_ok = isinstance(data, dict) and any(k in data for k in ['success', 'data', 'message', 'error', 'userId'])
            passed = status_code in expected_codes and contract_ok
            
            # --- ĐẶC BIỆT: Bắt token sau khi login thành công ---
            if positive and r['endpoint'] == '/api/auth/login' and passed and data:
                extracted_token = data.get('data', {}).get('accessToken') or data.get('accessToken')
                if extracted_token:
                    GLOBAL_TOKEN = extracted_token
                    print(f"  [+] Đã lấy được token cho luồng tiếp theo: {GLOBAL_TOKEN[:15]}...")
            
            if positive and status_code >= 400:
                passed = False
                note = 'API positive trả lỗi; Có thể do thiếu dữ liệu phụ thuộc DB, sai quyền hạn (VD: cần Admin nhưng đang dùng Reader) hoặc thiếu service.'
            elif not positive and status_code < 400:
                passed = False
                note = 'Negative case không bị reject; API có thể đang thiếu validate.'
            else:
                note = 'Response trả về đúng mong đợi.' if passed else 'Response sai định dạng hoặc HTTP Status Code không như kỳ vọng.'
            
            # Record created items to rollback later
            if passed and positive and r['method'] == 'POST' and data and isinstance(data.get('data'), dict) and data['data'].get('id'):
                created_records.append((r['endpoint'], data['data']['id']))
                
            actual = f'HTTP {status_code}; {resp_text}'
        except Exception as e:
            actual = 'Không kết nối/thực thi được request: ' + str(e)
            note = 'Lỗi runtime (Server tắt hoặc request timeout).'

        results.append({
            'tcid': tcid, 'method': r['method'], 'endpoint': r['endpoint'], 
            'positive': positive, 'url': url, 'body': body, 'expected_codes': expected_codes, 
            'actual': actual, 'status_code': status_code, 'pass': passed, 
            'note': note, 'duration': round((time.time()-start)*1000, 2),
            'auth_req': r['auth']
        })

print(f"Hoàn thành kiểm thử {len(results)} cases. Đang xuất báo cáo...")

# Tạo Excel
wb = Workbook()
ws = wb.active; ws.title = '1. Tổng quan Luồng'
ws.append(['Hạng mục', 'Kết quả / Giá trị'])
ws.append(['Thời gian chạy', datetime.datetime.now().strftime('%d/%m/%Y %H:%M:%S')])
ws.append(['Tài khoản tự động tạo', TEST_EMAIL])
ws.append(['Mật khẩu', TEST_PASSWORD])
ws.append(['Trạng thái Token', 'Đã lấy thành công' if GLOBAL_TOKEN else 'Không lấy được Token'])
ws.append(['Tổng số Testcase', len(results)])
ws.append(['Số Testcase PASS', sum(1 for x in results if x['pass'])])
ws.append(['Số Testcase FAIL', sum(1 for x in results if not x['pass'])])

ws_cases = wb.create_sheet('2. Kết Quả Chạy Chi Tiết')
ws_cases.append(['Mã TC', 'Endpoint', 'Method', 'Phân loại', 'Yêu cầu Quyền', 'Input (Mô phỏng Postman)', 'Mã HTTP mong đợi', 'Mã HTTP thực tế', 'Kết quả', 'Ghi chú / Phân tích', 'Thời gian (ms)'])

for x in results:
    typ = 'Positive (Hợp lệ)' if x['positive'] else 'Negative (Cố tình làm lỗi)'
    req_json = json.dumps({'url': x['url'], 'body': x['body']}, ensure_ascii=False, indent=2)
    ws_cases.append([
        x['tcid'], x['endpoint'], x['method'], typ, x['auth_req'],
        req_json, str(x['expected_codes']), str(x['status_code']),
        'PASS' if x['pass'] else 'FAIL', x['note'] + '\n' + x['actual'][:500], x['duration']
    ])

# Định dạng
for sheet in wb.worksheets:
    for cell in sheet[1]:
        cell.font = Font(bold=True, color='FFFFFF')
        cell.fill = PatternFill('solid', fgColor='1F4E78')
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    for row in sheet.iter_rows():
        for cell in row:
            cell.alignment = Alignment(vertical='top', wrap_text=True)
            cell.border = Border(left=Side(style='thin'), right=Side(style='thin'), top=Side(style='thin'), bottom=Side(style='thin'))
    if sheet.title == '2. Kết Quả Chạy Chi Tiết':
        widths = [12, 35, 10, 20, 25, 45, 18, 18, 12, 60, 12]
        for i, w in enumerate(widths, 1): sheet.column_dimensions[get_column_letter(i)].width = w
    else:
        sheet.column_dimensions['A'].width = 30
        sheet.column_dimensions['B'].width = 80

wb.save(OUT)
print(f'Đã lưu báo cáo tại: {OUT}')
