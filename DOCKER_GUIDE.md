# Hướng dẫn Chạy Dự Án Với Docker vs Cách Trực Tiếp

> Hướng dẫn chi tiết so sánh 2 cách khác nhau để chạy Hệ Thống Quản Lý Thư Viện

---

## I. Chạy với Docker (Khuyến Nghị)

### 1. Yêu Cầu
- Docker Desktop hoặc Docker Engine
- Docker Compose (thường đi kèm với Docker Desktop)
- ~500MB dung lượng ổ cứng cho images

### 2. Các Bước Thực Hiện

#### Bước 1: Chuẩn Bị Environment Variables

```bash
cp .env.example .env
```

Chỉnh sửa các giá trị trong `.env`:
- `MYSQL_ROOT_PASSWORD`: mật khẩu MySQL admin
- `MYSQL_PASSWORD`: mật khẩu database user
- `REDIS_PASSWORD`: mật khẩu Redis
- `JWT_SECRET`, `JWT_REFRESH_SECRET`: khóa bí mật (dùng `openssl rand -base64 32`)
- `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`: tài khoản admin ban đầu
- Các biến khác tùy theo nhu cầu

#### Bước 2: Khởi Động Tất Cả Services (Dev Mode)

```bash
# Khởi động tất cả services: MySQL, Redis, Web app, Socket Server, Worker
docker compose up -d

# Hoặc với logs (để debug):
docker compose up
```

Services sẽ khởi động:
- **Web App (Next.js)** → `http://localhost:3000`
- **Socket Server** → `http://localhost:4000`
- **MySQL** → `localhost:3307` (được ánh xạ từ 3306 trong container)
- **Redis** → `localhost:6379`
- **Worker**: Chạy background trong container

#### Bước 3: Khởi Tạo Database

```bash
# Generate Prisma Client
docker compose exec web npx prisma generate

# Chạy migrations
docker compose exec web npx prisma migrate dev

# Seed database với admin user mặc định
docker compose exec web npm run seed
```

#### Bước 4: Truy Cập Ứng Dụng

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3000/api
- **Login mặc định**: 
  - Email: `admin@library.com` (hoặc giá trị `DEFAULT_ADMIN_EMAIL`)
  - Password: `Admin@123456` (hoặc giá trị `DEFAULT_ADMIN_PASSWORD`)

#### Bước 5: Dừng Services

```bash
# Dừng tất cả services
docker compose down

# Dừng và xóa volumes (xóa database)
docker compose down -v
```

---

## II. Chạy Trực Tiếp Trên Máy (No Docker)

### 1. Yêu Cầu
- **Node.js 18+** và npm/yarn/pnpm/bun
- **MySQL 8.0+** (cài đặt riêng)
- **Redis 7.0+** (cài đặt riêng)
- ~1GB dung lượng ổ cứng cho node_modules

### 2. Các Bước Thực Hiện

#### Bước 1: Cài Đặt MySQL (Nếu Chưa Có)

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install mysql-server
# Khởi động MySQL
sudo systemctl start mysql
# Đặt mật khẩu root (nếu chưa)
sudo mysql_secure_installation
```

**macOS (với Homebrew):**
```bash
brew install mysql
brew services start mysql
mysql_secure_installation
```

**Windows:**
- Tải từ: https://dev.mysql.com/downloads/mysql/
- Chạy installer và follow hướng dẫn

#### Bước 2: Cài Đặt Redis

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install redis-server
sudo systemctl start redis-server
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Windows:**
- Tải từ: https://github.com/microsoftarchive/redis/releases/ (hoặc dùng WSL2)

#### Bước 3: Kiểm Tra MySQL & Redis Chạy

```bash
# Kiểm tra MySQL
mysql -u root -p -e "SELECT VERSION();"

# Kiểm tra Redis
redis-cli ping
# Kết quả: PONG
```

#### Bước 4: Chuẩn Bị Environment Variables

```bash
cp .env.example .env
```

**Chỉnh sửa `.env` (chạy trực tiếp):**
```env
# Database URL - sử dụng localhost thay vì 'mysql'
DATABASE_URL=mysql://root:your_password@localhost:3306/library_management

# Redis - sử dụng localhost
REDIS_HOST=localhost
REDIS_PORT=6379

# MySQL
MYSQL_DATABASE=library_management
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_PORT=3306
```

#### Bước 5: Cài Đặt Dependencies

```bash
npm install
# hoặc
yarn install
# hoặc
pnpm install
```

#### Bước 6: Khởi Tạo Database

```bash
# Generate Prisma Client
npx prisma generate

# Chạy migrations
npx prisma migrate dev

# Seed database
npm run seed
```

#### Bước 7: Chạy Development Server

```bash
# Chạy frontend + backend + cron jobs
npm run dev

# Hoặc chia thành 2 terminal riêng:
# Terminal 1: Next.js dev server
npm run dev

# Terminal 2: Socket server (nếu cần)
npm run dev:socket
```

#### Bước 8: Truy Cập Ứng Dụng

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3000/api
- **Login**: admin@library.com / Admin@123456

---

## III. So Sánh Chi Tiết

### Bảng Tóm Tắt

| Aspect | Docker | Trực Tiếp |
|--------|--------|----------|
| **Cài đặt ban đầu** | Yêu cầu Docker, sau đó chạy compose files | Yêu cầu MySQL, Redis, Node.js trên máy |
| **Thời gian setup** | 5-10 phút | 30-60 phút (tùy OS) |
| **Yêu cầu hệ thống** | Docker Desktop (dung lượng RAM) | MySQL, Redis, Node.js riêng lẻ |
| **Isolation** | ✅ Services cách ly, không conflicts | ❌ Có thể conflicts với services khác |
| **Database persistence** | Docker volumes | Volumes cục bộ OS |
| **Ports** | Dễ ánh xạ cổng khác | Phải thay đổi trực tiếp config |
| **Scaling** | Dễ, chỉ cần `docker compose scale` | Phức tạp, cần setup thêm |
| **Cloud deployment** | ✅ Sẵn sàng, chỉ cần push image | ❌ Phải cấu hình lại trên server |
| **Performance** | Nhẹ overhead từ containerization | Hiệu suất gốc, tốc độ tối đa |
| **Debugging** | ✅ Logs từ all services tại 1 chỗ | ❌ Logs phân tán, khó theo dõi |

---

## IV. Ưu Điểm & Nhược Điểm

### ✅ Ưu Điểm Của Docker

1. **Consistency Across Environments**
   - Code chạy giống hệt trên dev, staging, production
   - "It works on my machine" problem được giải quyết

2. **Service Isolation**
   - MySQL, Redis, Web app chạy độc lập
   - Không conflicts giữa services
   - Dễ cập nhật versions độc lập

3. **Easy Cleanup**
   ```bash
   # Xóa tất cả vào 1 lệnh
   docker compose down -v
   ```
   - Không để lại database, cache, hoặc logs phân tán

4. **Built-in Health Checks**
   - Services tự restart nếu crash
   - Health checks được định nghĩa sẵn

5. **Multi-Developer Friendly**
   - Tất cả developers có cùng environment
   - Onboarding developer mới dễ hơn

6. **Production Ready**
   - Dockerfile đã tối ưu cho production
   - Multi-stage build giảm image size
   - Dễ deploy lên cloud (AWS, GCP, Azure, Heroku...)

7. **Reproducibility**
   - Same MySQL version, Redis version, Node.js version
   - No "works for me but not for you" issues

### ❌ Nhược Điểm Của Docker

1. **Learning Curve**
   - Cần học Docker concepts: containers, images, volumes, networks
   - Debugging container issues phức tạp hơn

2. **Performance Overhead**
   - Nhẹ nhưng vẫn có overhead từ virtualization
   - Trên Windows/Mac (qua Docker Desktop), overhead lớn hơn

3. **Storage & Memory**
   - Docker images chiếm dung lượng (nginx:alpine ~50MB, mysql:8.0 ~500MB)
   - Docker Desktop trên Windows/Mac tiêu thụ RAM đáng kể (~2-4GB)

4. **Debugging Complexity**
   - Không thể dùng IDE debugger trực tiếp
   - Phải dùng logs hoặc remote debugging

5. **OS-Specific Issues**
   - Path volumes khác giữa Windows/Linux/Mac
   - Performance Docker on Windows chậm hơn

### ✅ Ưu Điểm Của Chạy Trực Tiếp

1. **Đơn Giản & Nhanh Nhanh**
   - Không cần học Docker
   - Setup tương đối nhanh nếu MySQL/Redis đã có

2. **Better Performance**
   - Không overhead từ containerization
   - Direct access tới database, cache, filesystem
   - Tốc độ phát triển nhanh nhất

3. **Native Debugging**
   - Dùng IDE debugger trực tiếp (VS Code, WebStorm)
   - Breakpoints, console logs dễ dàng

4. **Lower Resource Usage**
   - Không cần Docker Desktop
   - Tiết kiệm RAM hơn

5. **Hot Reload**
   - `next dev` chạy trực tiếp, hot reload native
   - Phát triển nhanh với file watching

### ❌ Nhược Điểm Của Chạy Trực Tiếp

1. **Environment Inconsistency**
   - Dev machine: MySQL 8.0.36, Node 18.17.1
   - Dev machine khác: MySQL 5.7, Node 16.19.0
   - Production: MySQL 8.0.40 - có thể breaking changes!

2. **Hard to Clean**
   - Data vẫn tồn tại dù xóa project
   - MySQL/Redis cần stop/start riêng
   - Config phân tán (bashrc, /etc/mysql, etc.)

3. **Port Conflicts**
   - Nếu MySQL đã chạy, không thể chạy 2 projects cùng lúc
   - Redis port trùng = lỗi

4. **Difficult Scaling**
   - Chạy thêm worker, socket server = edit script thủ công
   - Scaling = phức tạp hơn

5. **Onboarding Nightmare**
   - New developer phải:
     - Cài MySQL (OS-specific)
     - Cài Redis
     - Set environment variables (dễ quên)
     - Có thể mất vài giờ

6. **Cloud Deployment**
   - Phải cấu hình lại tất cả trên cloud
   - Dockerfile + docker compose cần viết từ đầu
   - Dockerize codebase = extra work

---

## V. Khuyến Nghị

### Sử Dụng Docker Nếu:
- ✅ Làm việc với team (consistency)
- ✅ Dự tính deploy lên cloud
- ✅ Muốn quick cleanup/reset database
- ✅ Project có nhiều services (MySQL, Redis, Workers, Socket Server...)
- ✅ Làm việc trên Windows/Mac (WSL2 có Docker support tốt)

### Sử Dụng Trực Tiếp Nếu:
- ✅ Solo project, chỉ mình develop
- ✅ MySQL/Redis đã cài sẵn trên máy
- ✅ Cần absolute maximum performance
- ✅ Muốn dùng IDE debugger native
- ✅ Server đã có MySQL/Redis setup

---

## VI. Phục Hồi Nhanh (Quick Troubleshooting)

### Docker Issues

**MySQL không khởi động:**
```bash
docker compose logs mysql
# Kiểm tra: DATABASE_URL có đúng ko?
```

**Redis connection failed:**
```bash
docker compose exec redis redis-cli ping
```

**Xóa hết và restart sạch:**
```bash
docker compose down -v --remove-orphans
docker system prune -a  # Xóa images không dùng
docker compose up -d
```

---

### Direct Execution Issues

**MySQL không kết nối:**
```bash
# Windows/macOS
brew services list
# Linux
sudo systemctl status mysql

# Thay credentials trong .env
DATABASE_URL=mysql://NAME:PASSWORD@localhost:3306/DB
```

**Redis connection failed:**
```bash
redis-cli ping
# Nếu not running:
# macOS: brew services start redis
# Linux: sudo systemctl start redis-server
```

**Ports bị chiếm:**
```bash
# Linux/macOS
lsof -i :3000
kill -9 PID

# Windows
netstat -ano | findstr :3000
taskkill /PID PID /F
```

---

## VII. Production Deployment

### Với Docker (Đơn Giản)
```bash
# Build image
docker build -t library-app:latest .

# Push lên Docker Registry
docker push your-registry/library-app:latest

# Deploy
docker run -d --name library-app \
  -e DATABASE_URL=mysql://... \
  -e REDIS_HOST=... \
  -p 3000:3000 \
  library-app:latest
```

### Chạy Trực Tiếp (Phức Tạp)
1. Cài MySQL trên server
2. Cài Redis trên server
3. Cài Node.js
4. Git clone project
5. `.env` setup (credentials production)
6. `npm install && npm run build`
7. `npm start` (PM2, Systemd...)
8. Setup nginx reverse proxy
9. SSL certificates (Let's Encrypt)
10. Monitoring, backups...

---

## Kết Luận

- **Docker**: Recommended cho team, production-ready, consistency + scalability
- **Direct**: Recommended cho solo dev, performance-critical, hoặc prototype nhanh

**Tốt nhất**: Dùng Docker cho development, production-ready, và deploy!
