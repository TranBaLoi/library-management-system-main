import json, re, time, datetime, subprocess
from pathlib import Path
from urllib.parse import quote
import requests
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Border, Side, Alignment
from openpyxl.utils import get_column_letter

ROOT = Path(r'C:\Users\Loi\Desktop\SQA\library-management-system-main')
API_ROOT = ROOT / 'src' / 'app' / 'api'
OUT = ROOT / 'Bao_Cao_Test_API_Postman_Quan_Ly_Thu_Vien.xlsx'
BASE_URL = 'http://localhost:3000'
METHODS = ['GET','POST','PUT','PATCH','DELETE']
SESSION = requests.Session()
TIMEOUT = 8

login_candidates = [
    {'email':'admin@library.com','password':'Admin@123456'},
    {'email':'librarian@library.com','password':'Librarian@123456'},
    {'email':'reader@library.com','password':'Reader@123456'},
]

def read_text(p): return p.read_text(encoding='utf-8', errors='ignore')

def endpoint_from_file(path: Path):
    rel = path.relative_to(API_ROOT).parent.as_posix()
    return '/api/' + rel.replace('[...path]', ':path*').replace('[bookId]', ':bookId').replace('[id]', ':id')

def key_from_file(path: Path): return path.relative_to(API_ROOT).parent.as_posix()

def methods_from_text(text):
    return [m for m in METHODS if re.search(r'export\s+(?:async\s+function|const)\s+'+m+r'\b', text)]

def desc(text, m, ep):
    candidates = [ep.replace(':id','[id]').replace(':bookId','[bookId]').replace(':path*','[...path]')]
    for c in candidates:
        pat = re.search(r'//\s*'+m+r'\s+'+re.escape(c)+r'\s*-\s*(.+)', text)
        if pat: return pat.group(1).strip()
    return f'{m} {ep}'

def auth_required(text):
    if 'requireAdmin' in text: return 'Cần token ADMIN'
    if 'requireLibrarian' in text: return 'Cần token LIBRARIAN/ADMIN'
    if 'requireAuth' in text: return 'Cần Bearer token'
    if 'optionalAuth' in text: return 'Token tùy chọn'
    return 'Public/không bắt buộc token'

def postman_script(method, positive=True):
    codes = '[200,201]' if positive else '[400,401,403,404,409,422,500]'
    success_expect = 'true' if positive else 'false'
    return f"""pm.test('Mã trạng thái HTTP đúng', function () {{
  pm.expect(pm.response.code).to.be.oneOf({codes});
}});
pm.test('Response đúng chuẩn JSON API', function () {{
  const json = pm.response.json();
  pm.expect(json).to.be.an('object');
  pm.expect(json).to.have.property('success');
  {'pm.expect(json.success).to.eql(true);' if positive else 'pm.expect(json.success).to.not.eql(true);'}
}});
pm.test('Có thông báo phản hồi rõ ràng', function () {{
  const json = pm.response.json();
  pm.expect(json.message || json.error || json.errors || json.data).to.exist;
}});"""

sample_body = {
 'auth/register': lambda: {'fullName':'Nguyễn Văn API Test','email':f'api_test_{int(time.time()*1000)}@example.com','password':'Password@123','confirmPassword':'Password@123'},
 'auth/login': lambda: {'email':'admin@library.com','password':'Admin@123456'},
 'auth/change-password': lambda: {'currentPassword':'SaiPassword@123','newPassword':'NewPassword@123','confirmPassword':'NewPassword@123'},
 'auth/interests': lambda: {'categoryIds':[1,2]},
 'auth/reset-password': lambda: {'email':'admin@library.com','otp':'000000','newPassword':'NewPassword@123','confirmPassword':'NewPassword@123'},
 'otp/send': lambda: {'email':'admin@library.com','purpose':'forgot-password'},
 'otp/verify/forgot-password': lambda: {'email':'admin@library.com','otp':'000000'},
 'authors': lambda: {'fullName':f'Tác giả API Test {int(time.time())}','bio':'Tạo tự động khi test API','birthDate':'1980-01-01','nationality':'Việt Nam','isDeleted':False},
 'categories': lambda: {'name':f'Danh mục API Test {int(time.time())}','description':'Tạo tự động khi test API','isDeleted':False},
 'books': lambda: {'authorId':1,'title':f'Sách API Test {int(time.time())}','isbn':f'ISBN-{int(time.time())}','publishYear':2024,'publisher':'NXB Test','pageCount':120,'price':100000,'edition':'1','description':'Tạo tự động khi test API','language':'vi','categories':[1]},
 'book-items': lambda: {'bookId':1,'code':f'COPY-{int(time.time())}','condition':'GOOD','status':'AVAILABLE','acquisitionDate':'2024-01-01','isDeleted':False},
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
 'policies': lambda: {'name':f'Chính sách API Test {int(time.time())}','description':'Test API','value':'10','isActive':True},
 'reviews': lambda: {'bookId':1,'rating':5,'comment':'Đánh giá API test'},
 'users': lambda: {'fullName':'User API Test','email':f'user_api_{int(time.time()*1000)}@example.com','password':'Password@123','phoneNumber':'0900000000','address':'HCM','role':'READER'},
 'ai-summarize': lambda: {'text':'Đây là đoạn văn bản mẫu dùng để kiểm thử API tóm tắt.'},
 'mail/test': lambda: {'email':'admin@library.com'},
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

def request_api(method, url, body=None, token=''):
    headers={'Content-Type':'application/json'}
    if token: headers['Authorization'] = 'Bearer ' + token
    if method == 'GET': return SESSION.get(url, headers=headers, timeout=TIMEOUT)
    if method == 'POST': return SESSION.post(url, headers=headers, json=body, timeout=TIMEOUT)
    if method == 'PUT': return SESSION.put(url, headers=headers, json=body, timeout=TIMEOUT)
    if method == 'PATCH': return SESSION.patch(url, headers=headers, json=body, timeout=TIMEOUT)
    if method == 'DELETE': return SESSION.delete(url, headers=headers, timeout=TIMEOUT)
    raise ValueError(method)

def check_server():
    try:
        r = SESSION.get(BASE_URL, timeout=3)
        return True, f'Server phản hồi HTTP {r.status_code}'
    except Exception as e:
        return False, str(e)

def login():
    for payload in login_candidates:
        try:
            r=SESSION.post(BASE_URL+'/api/auth/login', json=payload, timeout=TIMEOUT)
            txt=r.text[:300]
            if r.status_code in [200,201]:
                data=r.json()
                token=data.get('data',{}).get('accessToken') or data.get('accessToken')
                if token: return token, payload['email'], f'Đăng nhập thành công bằng {payload["email"]}'
            last=f'{payload["email"]}: HTTP {r.status_code} {txt}'
        except Exception as e: last=str(e)
    return '', '', 'Không đăng nhập được: '+last

routes=[]
for p in sorted(API_ROOT.rglob('route.ts')):
    text=read_text(p); ep=endpoint_from_file(p); key=key_from_file(p)
    for m in methods_from_text(text):
        routes.append({'method':m,'endpoint':ep,'key':key,'desc':desc(text,m,ep),'auth':auth_required(text),'file':str(p)})

server_ok, server_note = check_server()
token, login_email, login_note = login() if server_ok else ('','','Server không chạy')
results=[]
case_idx=1
created_records=[]
for r in routes:
    for positive in [True, False]:
        if not positive and not (r['method'] in ['POST','PUT','PATCH'] or ':id' in r['endpoint'] or ':bookId' in r['endpoint']):
            continue
        tcid=f'TC-API-{case_idx:03d}'
        case_idx+=1
        url=normalize_url(r['endpoint'], negative=not positive)
        if r['method']=='GET' and positive and '?' not in url and not any(x in r['endpoint'] for x in ['file','view']):
            url += '?page=1&limit=10&search=test&sortBy=createdAt&sortOrder=desc'
        body = None if r['method'] in ['GET','DELETE'] else (get_body(r['key']) if positive else {})
        expected_codes = [200,201] if positive else [400,401,403,404,409,422,500]
        start=time.time()
        actual=''; note=''; passed=False; status_code='N/A'; resp_text=''
        try:
            use_token = token if ('token' in r['auth'].lower() or 'cần' in r['auth'].lower() or r['auth'].startswith('Token')) else token
            resp=request_api(r['method'], url, body, use_token)
            status_code=resp.status_code
            resp_text=resp.text[:1200]
            try: data=resp.json()
            except Exception: data=None
            contract_ok = isinstance(data, dict) and ('success' in data or 'data' in data or 'message' in data or 'error' in data)
            passed = status_code in expected_codes and contract_ok
            if positive and status_code >= 400:
                passed=False
                note='API positive trả lỗi; có thể thiếu dữ liệu phụ thuộc/quyền/DB seed hoặc service ngoài.'
            elif not positive and status_code < 400:
                passed=False
                note='Negative case không bị reject; cần kiểm tra validation/authorization.'
            else:
                note='Đạt chuẩn response cơ bản.' if passed else 'Response không đúng contract JSON hoặc status code ngoài kỳ vọng.'
            if passed and positive and r['method']=='POST' and data and isinstance(data.get('data'), dict) and data['data'].get('id'):
                created_records.append((r['endpoint'], data['data']['id']))
            actual=f'HTTP {status_code}; {resp_text}'
        except Exception as e:
            actual='Không thực thi được request: '+str(e)
            note='Lỗi kết nối/runtime khi gọi API.'
        results.append({**r,'tcid':tcid,'positive':positive,'url':url,'body':body,'expected_codes':expected_codes,'actual':actual,'status_code':status_code,'pass':passed,'note':note,'duration':round((time.time()-start)*1000,2)})

# rollback simple created resources by DELETE when possible
rollback_logs=[]
for ep, rid in reversed(created_records):
    if ep in ['/api/authors','/api/categories','/api/books','/api/book-items','/api/book-editions','/api/users','/api/policies','/api/reviews','/api/payments','/api/notifications']:
        del_ep=ep+'/'+str(rid)
        try:
            resp=request_api('DELETE', BASE_URL+del_ep, None, token)
            rollback_logs.append(f'{del_ep}: HTTP {resp.status_code}')
        except Exception as e:
            rollback_logs.append(f'{del_ep}: lỗi rollback {e}')

# unit test execution
try:
    unit = subprocess.run(['npm','test','--','--runInBand'], cwd=str(ROOT), text=True, capture_output=True, timeout=120)
    unit_output=(unit.stdout + '\n' + unit.stderr)[-4000:]
    unit_status='PASS' if unit.returncode==0 else 'FAIL'
except Exception as e:
    unit_output=str(e); unit_status='FAIL'

wb=Workbook()
ws=wb.active; ws.title='1. Tổng quan'
summary=[
 ['Hạng mục','Kết quả'],
 ['Ngày tạo báo cáo', datetime.datetime.now().strftime('%d/%m/%Y %H:%M:%S')],
 ['Base URL', BASE_URL],
 ['Tình trạng server', server_note],
 ['Tình trạng đăng nhập', login_note],
 ['Tài khoản dùng test', login_email or 'Không có'],
 ['Tổng số API method phát hiện', len(routes)],
 ['Tổng số test case đã chạy', len(results)],
 ['Số testcase PASS', sum(1 for x in results if x['pass'])],
 ['Số testcase FAIL', sum(1 for x in results if not x['pass'])],
 ['Unit test Jest', unit_status],
 ['Ghi chú', 'Báo cáo bằng tiếng Việt có dấu; kết quả được gọi trực tiếp qua HTTP local server. Một số FAIL có thể do thiếu dữ liệu seed, service ngoài, quyền hoặc validation hiện tại của API.'],
]
for row in summary: ws.append(row)

ws2=wb.create_sheet('2. Danh sách API')
ws2.append(['STT','Method','Endpoint','Mục đích API','Yêu cầu xác thực','File route'])
for i,r in enumerate(routes,1): ws2.append([i,r['method'],r['endpoint'],r['desc'],r['auth'],r['file']])

ws3=wb.create_sheet('3. Test case API')
ws3.append(['Testcase ID','API','Loại test','Mục đích test','Input đầu vào Postman','Expected output','Script test Postman','Kiểm tra giao diện/DB','Rollback','Actual output','Pass/Fail','Ghi chú nếu Fail','Thời gian ms'])
for x in results:
    typ='Positive' if x['positive'] else 'Negative'
    input_pm=json.dumps({'method':x['method'],'url':x['url'],'headers':{'Content-Type':'application/json','Authorization':'Bearer {{access_token}}'},'body':x['body']}, ensure_ascii=False, indent=2)
    expected=f"HTTP {x['expected_codes']}; response JSON có success/message/data/error rõ ràng theo chuẩn API; {'không làm bẩn DB khi lỗi' if not x['positive'] else 'dữ liệu trả về đúng mục đích API'}"
    checkdb='Kiểm tra trên Postman/Windows: status, body JSON, message. Kiểm tra DB MySQL/Prisma theo bảng liên quan; dữ liệu test dùng tiền tố API Test/timestamp.'
    rollback='GET không cần rollback. POST/PUT/DELETE đã cố rollback tự động bằng DELETE khi có id; nếu chưa rollback được thì xóa/khôi phục thủ công trong DB test.'
    ws3.append([x['tcid'],f"{x['method']} {x['endpoint']}",typ,x['desc'],input_pm,expected,postman_script(x['method'], x['positive']),checkdb,rollback,x['actual'],'PASS' if x['pass'] else 'FAIL', '' if x['pass'] else x['note'],x['duration']])

ws4=wb.create_sheet('4. Rollback và DB')
ws4.append(['STT','Nội dung'])
for i,log in enumerate(rollback_logs or ['Không có bản ghi POST tạo thành công cần rollback hoặc rollback không áp dụng.'],1): ws4.append([i,log])
ws4.append([len(rollback_logs)+2,'Nguyên tắc DB: chỉ chạy trên DB test/dev, không chạy DB production; kiểm tra các bảng users, authors, categories, books, bookItems, bookEditions, borrowRequests, borrowRecords, payments, reviews, notifications.'])

ws5=wb.create_sheet('5. Kết quả Unit Test')
ws5.append(['Hạng mục','Nội dung'])
ws5.append(['Trạng thái Jest', unit_status])
ws5.append(['Output', unit_output])

for sheet in wb.worksheets:
    for row in sheet.iter_rows():
        for cell in row:
            cell.alignment=Alignment(vertical='top', wrap_text=True)
            cell.border=Border(left=Side(style='thin'), right=Side(style='thin'), top=Side(style='thin'), bottom=Side(style='thin'))
    for cell in sheet[1]:
        cell.font=Font(bold=True, color='FFFFFF')
        cell.fill=PatternFill('solid', fgColor='1F4E78')
        cell.alignment=Alignment(horizontal='center', vertical='center', wrap_text=True)
    widths=[]
    if sheet.title=='3. Test case API': widths=[16,28,14,40,60,45,55,45,45,60,12,45,14]
    elif sheet.title=='2. Danh sách API': widths=[8,12,35,45,25,70]
    elif sheet.title=='1. Tổng quan': widths=[30,90]
    else: widths=[12,100]
    for i,w in enumerate(widths,1): sheet.column_dimensions[get_column_letter(i)].width=w
    sheet.freeze_panes='A2'

wb.save(OUT)
print('Đã tạo báo cáo:', OUT)
print('Server:', server_note)
print('Login:', login_note)
print('API methods:', len(routes), 'Testcases:', len(results), 'PASS:', sum(1 for x in results if x['pass']), 'FAIL:', sum(1 for x in results if not x['pass']))
print('Unit test:', unit_status)
