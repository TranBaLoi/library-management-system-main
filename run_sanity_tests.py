import os, json, requests
from pathlib import Path

BASE_URL = 'http://localhost:3000'
LOGIN_DATA = {'email': 'admin@library.com', 'password': 'Admin@123456'}
token = ''

print("1. Login to get token...")
try:
    r = requests.post(f"{BASE_URL}/api/auth/login", json=LOGIN_DATA, timeout=5)
    if r.status_code == 200 and r.json().get('success'):
        token = r.json()['data']['accessToken']
        print("Login successful.")
    else:
        print(f"Login failed: {r.status_code} - {r.text}")
except Exception as e:
    print(f"Error connecting to server: {e}")

if not token:
    print("Cannot proceed without token.")
    exit(1)

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

tests = [
    {'method': 'GET', 'url': f'{BASE_URL}/api/authors?page=1&limit=5', 'name': 'GET Authors List'},
    {'method': 'GET', 'url': f'{BASE_URL}/api/categories?page=1&limit=5', 'name': 'GET Categories List'},
    {'method': 'GET', 'url': f'{BASE_URL}/api/books?page=1&limit=5', 'name': 'GET Books List'},
    {'method': 'POST', 'url': f'{BASE_URL}/api/categories', 'name': 'POST Create Category', 'json': {'name': 'Test Category API', 'description': 'Auto created'}},
]

print("\n2. Running basic sanity tests...")
for t in tests:
    try:
        if t['method'] == 'GET':
            r = requests.get(t['url'], headers=headers, timeout=5)
        elif t['method'] == 'POST':
            r = requests.post(t['url'], headers=headers, json=t.json, timeout=5)
        
        status = 'PASS' if str(r.status_code).startswith('2') else 'FAIL'
        print(f"[{status}] {t['name']} - HTTP {r.status_code}")
    except Exception as e:
        print(f"[FAIL] {t['name']} - Error: {e}")

