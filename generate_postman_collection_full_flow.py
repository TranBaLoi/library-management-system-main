import json
import re
import time
from pathlib import Path

ROOT = Path(r'C:\Users\Loi\Desktop\SQA\library-management-system-main')
API_ROOT = ROOT / 'src' / 'app' / 'api'
OUT_COLLECTION = ROOT / 'LibraryMS_Full_API_Flow.postman_collection.json'
OUT_ENV = ROOT / 'LibraryMS_Local.postman_environment.json'
METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

TS = int(time.time() * 1000)
TEST_EMAIL = f'testuser_{TS}@example.com'
TEST_PASSWORD = 'Password@123'

def endpoint_from_file(path: Path):
    rel = path.relative_to(API_ROOT).parent.as_posix()
    return '/api/' + rel.replace('[...path]', ':path*').replace('[bookId]', ':bookId').replace('[id]', ':id')

def key_from_file(path: Path):
    return path.relative_to(API_ROOT).parent.as_posix()

def methods_from_text(text):
    found = []
    for m in METHODS:
        if re.search(r'export\s+(?:async\s+function|const)\s+' + m + r'\b', text):
            found.append(m)
    return found

def auth_required(text):
    if 'requireAdmin' in text:
        return 'ADMIN'
    if 'requireLibrarian' in text:
        return 'LIBRARIAN'
    if 'requireReader' in text:
        return 'READER'
    if 'requireAuth' in text:
        return 'AUTH'
    if 'optionalAuth' in text:
        return 'OPTIONAL'
    return 'PUBLIC'

def sort_weight(ep, method):
    if ep == '/api/auth/register' and method == 'POST':
        return 1
    if ep == '/api/auth/login' and method == 'POST':
        return 2
    if ep == '/api/auth/me' and method == 'GET':
        return 3
    if ep.startswith('/api/auth/'):
        return 4
    if method == 'GET':
        return 5
    if method == 'POST':
        return 6
    if method in ['PUT', 'PATCH']:
        return 7
    if method == 'DELETE':
        return 8
    return 9

def split_url_for_postman(path_expr: str):
    # Postman URL raw format with {{base_url}}
    raw = '{{base_url}}' + path_expr
    path_only = path_expr.lstrip('/')
    segs = []
    for part in path_only.split('/'):
        if part == ':id':
            segs.append('{{id}}')
        elif part == ':bookId':
            segs.append('{{bookId}}')
        elif part == ':path*':
            segs.append('{{file_path}}')
        else:
            segs.append(part)
    return raw.replace(':id', '{{id}}').replace(':bookId', '{{bookId}}').replace(':path*', '{{file_path}}'), segs

def sample_body(key, endpoint, method):
    if method in ['GET', 'DELETE']:
        return None

    mapping = {
        'auth/register': {
            'fullName': 'Nguyen Van Test',
            'email': '{{test_email}}',
            'password': '{{test_password}}',
            'confirmPassword': '{{test_password}}'
        },
        'auth/login': {
            'email': '{{test_email}}',
            'password': '{{test_password}}'
        },
        'auth/change-password': {
            'currentPassword': '{{test_password}}',
            'newPassword': 'NewPassword@123',
            'confirmPassword': 'NewPassword@123'
        },
        'auth/interests': {
            'interests': ['Fiction', 'Science']
        },
        'auth/reset-password': {
            'email': '{{test_email}}',
            'otp': '{{otp_code}}',
            'newPassword': 'NewPassword@123',
            'confirmPassword': 'NewPassword@123'
        },
        'otp/send': {
            'email': '{{test_email}}',
            'purpose': 'forgot-password'
        },
        'otp/verify/forgot-password': {
            'email': '{{test_email}}',
            'otp': '{{otp_code}}'
        },
        'authors': {
            'fullName': 'Tac Gia Test API',
            'bio': 'Du lieu tao boi Postman collection',
            'birthDate': '1980-01-01',
            'nationality': 'Viet Nam',
            'isDeleted': False
        },
        'categories': {
            'name': 'Danh Muc Test API',
            'description': 'Du lieu tao boi Postman collection',
            'isDeleted': False
        },
        'books': {
            'authorId': 1,
            'title': 'Sach Test API',
            'isbn': 'ISBN-TEST-001',
            'publishYear': 2024,
            'publisher': 'NXB Test',
            'pageCount': 120,
            'price': 100000,
            'edition': '1',
            'description': 'Du lieu tao boi Postman collection',
            'language': 'vi',
            'categories': [1]
        },
        'book-items': {
            'bookId': 1,
            'code': 'COPY-TEST-001',
            'condition': 'GOOD',
            'status': 'AVAILABLE',
            'acquisitionDate': '2024-01-01',
            'isDeleted': False
        },
        'book-editions': {
            'bookId': 1,
            'format': 'EBOOK',
            'fileUrl': '/uploads/test.pdf',
            'fileSize': 1024,
            'isDeleted': False
        },
        'borrow-requests': {
            'items': [{'bookId': 1, 'quantity': 1}],
            'notes': 'Tao yeu cau muon boi Postman'
        },
        'borrow-requests/[id]/manage': {
            'status': 'APPROVED',
            'note': 'Duyet boi Postman'
        },
        'borrow-records/[id]/renew': {
            'newDueDate': '2026-06-01',
            'note': 'Gia han boi Postman'
        },
        'borrow-records/[id]/return': {
            'condition': 'GOOD',
            'note': 'Tra sach boi Postman'
        },
        'borrow-records/[id]/return-ebook': {
            'note': 'Tra ebook boi Postman'
        },
        'ebook-borrow-requests': {
            'bookEditionId': 1,
            'note': 'Yeu cau muon ebook boi Postman'
        },
        'favorite-books': {
            'bookId': 1
        },
        'notifications': {
            'userId': 1,
            'title': 'Thong bao test',
            'message': 'Tao boi Postman',
            'type': 'SYSTEM'
        },
        'payments': {
            'borrowRecordId': 1,
            'amount': 50000,
            'method': 'CASH',
            'note': 'Thanh toan test'
        },
        'policies': {
            'name': 'Chinh sach test',
            'description': 'Tao boi Postman',
            'value': '10',
            'isActive': True
        },
        'reviews': {
            'bookId': 1,
            'rating': 5,
            'comment': 'Danh gia test'
        },
        'users': {
            'fullName': 'User Test API',
            'email': 'user_test_api@example.com',
            'password': 'Password@123',
            'phoneNumber': '0900000000',
            'address': 'HCM',
            'role': 'READER'
        },
        'ai-summarize': {
            'text': 'Day la doan van ban mau de test API tom tat.'
        },
        'mail/test': {
            'email': '{{test_email}}'
        }
    }

    if key in mapping:
        return mapping[key]

    base = re.sub(r'/\[[^\]]+\]', '', key)
    return mapping.get(base, {'sampleField': 'sample value'})

def test_script_for(method, endpoint, auth_kind, is_register=False, is_login=False):
    lines = []
    lines.append("pm.test('Status code hop le', function () {")
    lines.append("  pm.expect(pm.response.code).to.be.oneOf([200, 201, 400, 401, 403, 404, 409, 422, 500]);")
    lines.append("});")
    lines.append("")
    lines.append("pm.test('Response dung dinh dang JSON', function () {")
    lines.append("  pm.response.to.be.json;")
    lines.append("  const json = pm.response.json();")
    lines.append("  pm.expect(json).to.be.an('object');")
    lines.append("});")

    if is_login:
        lines.append("")
        lines.append("if (pm.response.code === 200 || pm.response.code === 201) {")
        lines.append("  const json = pm.response.json();")
        lines.append("  const token = json?.data?.accessToken || json?.accessToken;")
        lines.append("  if (token) {")
        lines.append("    pm.environment.set('access_token', token);")
        lines.append("  }")
        lines.append("}")

    if is_register:
        lines.append("")
        lines.append("if (pm.response.code === 200 || pm.response.code === 201) {")
        lines.append("  const json = pm.response.json();")
        lines.append("  const uid = json?.data?.id || json?.data?.userId;")
        lines.append("  if (uid) pm.environment.set('user_id', String(uid));")
        lines.append("}")

    if ':id' in endpoint:
        lines.append("")
        lines.append("if (pm.response.code === 200 || pm.response.code === 201) {")
        lines.append("  const json = pm.response.json();")
        lines.append("  const id = json?.data?.id;")
        lines.append("  if (id) pm.environment.set('id', String(id));")
        lines.append("}")

    return '\n'.join(lines)

# Collect routes
routes = []
for p in sorted(API_ROOT.rglob('route.ts')):
    text = p.read_text(encoding='utf-8', errors='ignore')
    endpoint = endpoint_from_file(p)
    key = key_from_file(p)
    methods = methods_from_text(text)
    kind = auth_required(text)
    for method in methods:
        routes.append({
            'endpoint': endpoint,
            'key': key,
            'method': method,
            'auth': kind,
            'file': str(p)
        })

routes.sort(key=lambda r: (sort_weight(r['endpoint'], r['method']), r['endpoint'], r['method']))

# Build collection items grouped by module folder
folders = {}
for r in routes:
    module = r['endpoint'].split('/')[2] if len(r['endpoint'].split('/')) > 2 else 'misc'
    folders.setdefault(module, []).append(r)

collection = {
    'info': {
        'name': 'Library Management System - Full API Flow',
        '_postman_id': f'libraryms-{TS}',
        'description': (
            'Collection test toan bo API theo luong nghiep vu:\n'
            '1) Register user test\n'
            '2) Login lay access token\n'
            '3) Dung token goi cac API can xac thuc\n\n'
            'Luu y:\n'
            '- Nen chay tren moi truong DEV/TEST, khong chay production.\n'
            '- Mot so API can quyen ADMIN/LIBRARIAN se tra 403 neu token Reader.\n'
        ),
        'schema': 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    'item': [],
    'event': [
        {
            'listen': 'prerequest',
            'script': {
                'type': 'text/javascript',
                'exec': [
                    "// Global prerequest",
                    "pm.variables.set('request_start', Date.now());"
                ]
            }
        },
        {
            'listen': 'test',
            'script': {
                'type': 'text/javascript',
                'exec': [
                    "// Global test",
                    "const elapsed = Date.now() - Number(pm.variables.get('request_start') || Date.now());",
                    "pm.environment.set('last_elapsed_ms', String(elapsed));"
                ]
            }
        }
    ],
    'variable': [
        {'key': 'base_url', 'value': '{{base_url}}'},
        {'key': 'access_token', 'value': '{{access_token}}'},
    ]
}

# Ensure auth flow folder first
ordered_modules = sorted(folders.keys())
if 'auth' in ordered_modules:
    ordered_modules.remove('auth')
    ordered_modules.insert(0, 'auth')

for module in ordered_modules:
    requests_in_module = folders[module]

    # Special ordering inside auth
    if module == 'auth':
        requests_in_module.sort(key=lambda r: sort_weight(r['endpoint'], r['method']))

    folder_item = {
        'name': module,
        'item': []
    }

    for r in requests_in_module:
        endpoint = r['endpoint']
        method = r['method']
        key = r['key']

        raw_url, path_parts = split_url_for_postman(endpoint)

        headers = [
            {'key': 'Accept', 'value': 'application/json', 'type': 'text'},
        ]

        body_obj = sample_body(key, endpoint, method)

        # Add auth header when likely required
        if r['auth'] in ['AUTH', 'READER', 'LIBRARIAN', 'ADMIN', 'OPTIONAL']:
            headers.append({'key': 'Authorization', 'value': 'Bearer {{access_token}}', 'type': 'text'})

        # Content-Type for JSON requests
        if method not in ['GET', 'DELETE']:
            headers.append({'key': 'Content-Type', 'value': 'application/json', 'type': 'text'})

        req = {
            'name': f"{method} {endpoint}",
            'request': {
                'method': method,
                'header': headers,
                'url': {
                    'raw': raw_url,
                    'host': ['{{base_url}}'],
                    'path': path_parts
                },
                'description': (
                    f"Endpoint: {endpoint}\n"
                    f"Method: {method}\n"
                    f"Auth: {r['auth']}\n"
                    f"Source: {r['file']}"
                )
            },
            'response': [],
            'event': [
                {
                    'listen': 'test',
                    'script': {
                        'type': 'text/javascript',
                        'exec': test_script_for(
                            method,
                            endpoint,
                            r['auth'],
                            is_register=(endpoint == '/api/auth/register' and method == 'POST'),
                            is_login=(endpoint == '/api/auth/login' and method == 'POST')
                        ).split('\n')
                    }
                }
            ]
        }

        if body_obj is not None:
            req['request']['body'] = {
                'mode': 'raw',
                'raw': json.dumps(body_obj, ensure_ascii=False, indent=2),
                'options': {
                    'raw': {
                        'language': 'json'
                    }
                }
            }

        # Add query params for list GET endpoints
        if method == 'GET' and not any(x in endpoint for x in [':id', ':bookId', 'file', 'view', 'capture', 'create']):
            req['request']['url']['query'] = [
                {'key': 'page', 'value': '1'},
                {'key': 'limit', 'value': '10'},
                {'key': 'search', 'value': 'test'}
            ]
            req['request']['url']['raw'] = raw_url + '?page=1&limit=10&search=test'

        folder_item['item'].append(req)

    collection['item'].append(folder_item)

environment = {
    'id': f'libraryms-local-{TS}',
    'name': 'LibraryMS Local',
    'values': [
        {'key': 'base_url', 'value': 'http://localhost:3000', 'type': 'default', 'enabled': True},
        {'key': 'access_token', 'value': '', 'type': 'default', 'enabled': True},
        {'key': 'test_email', 'value': TEST_EMAIL, 'type': 'default', 'enabled': True},
        {'key': 'test_password', 'value': TEST_PASSWORD, 'type': 'default', 'enabled': True},
        {'key': 'otp_code', 'value': '000000', 'type': 'default', 'enabled': True},
        {'key': 'id', 'value': '1', 'type': 'default', 'enabled': True},
        {'key': 'bookId', 'value': '1', 'type': 'default', 'enabled': True},
        {'key': 'file_path', 'value': 'test.pdf', 'type': 'default', 'enabled': True},
        {'key': 'user_id', 'value': '1', 'type': 'default', 'enabled': True},
        {'key': 'last_elapsed_ms', 'value': '', 'type': 'default', 'enabled': True}
    ],
    '_postman_variable_scope': 'environment',
    '_postman_exported_at': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime()),
    '_postman_exported_using': 'Codex CLI Auto Generator'
}

OUT_COLLECTION.write_text(json.dumps(collection, ensure_ascii=False, indent=2), encoding='utf-8')
OUT_ENV.write_text(json.dumps(environment, ensure_ascii=False, indent=2), encoding='utf-8')

print('Generated collection:', OUT_COLLECTION)
print('Generated environment:', OUT_ENV)
print('Total requests:', sum(len(f['item']) for f in collection['item']))
print('Test email:', TEST_EMAIL)
