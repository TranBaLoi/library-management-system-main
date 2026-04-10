Library Management System

A monorepo-style Next.js application that includes both the frontend (UI) and backend (API routes) in a single codebase. Backend lives under `src/app/api` and is served by the same Next.js server.

## Prerequisites

- Node.js 18+ and npm/yarn/pnpm/bun
- Docker and Docker Compose (recommended for the database)

## 1) Clone and Install

```bash
git clone <your-repo-url>
cd library-management-system
# choose one package manager
npm install
# or
yarn
# or
pnpm install
# or
bun install
```

## 2) Environment Variables

Copy the `.env.example` file to `.env`:

```bash
cp .env.example .env
```

Then configure the required variables in `.env`. You can use the default values or customize them:

```env
# Database Configuration
DATABASE_URL=mysql://root:root123@localhost:3306/library_management

# Default Admin User (Required for seeding)
DEFAULT_ADMIN_EMAIL="admin@library.com"
DEFAULT_ADMIN_PASSWORD="Admin@123456"
DEFAULT_ADMIN_FULLNAME="System Administrator"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-this-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
```

**Important Notes:**

- All `DEFAULT_ADMIN_*` variables are **required** for the seed script to work
- Change JWT secrets to secure random values for production
- You can customize the admin credentials to your preference

## 3) Start the Database (via Docker)

```bash
docker compose up -d
```

This will provision the database defined in `docker-compose.yml`.

## 4) Initialize Prisma (Backend Data Layer)

```bash
# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed the database with default Admin user
npm run seed
# or
npx prisma db seed
```

**What the seed does:**

- Creates a default Admin user if none exists
- Uses credentials from your `.env` file (`DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`, `DEFAULT_ADMIN_FULLNAME`)
- Safe to run multiple times (won't create duplicates)

**Default Login Credentials:**
After seeding, you can login with:

- **Email**: The value you set in `DEFAULT_ADMIN_EMAIL` (default: `admin@library.com`)
- **Password**: The value you set in `DEFAULT_ADMIN_PASSWORD` (default: `Admin@123456`)

⚠️ **Security Reminder**: Change the admin password after your first login!

## 5) Run in Development (Frontend + Backend)

Both frontend and backend run from the same Next.js dev server.

```bash
npm run dev
# or yarn dev / pnpm dev / bun dev
```

Open `http://localhost:3000` in your browser. The API is available under `/api`, for example:

```bash
curl http://localhost:3000/api/books
```

## 6) Build and Run in Production

```bash
npm run build
npm run start
# or the corresponding yarn/pnpm/bun commands
```

By default the app listens on port 3000. Ensure the same `.env` is available in production with a reachable `DATABASE_URL`.

## Project Structure (Highlights)

- `src/app` — Next.js App Router
  - `src/app/api` — Backend API routes
  - `src/app/(auth)`, `src/app/dashboard` — Frontend routes
- `prisma/schema.prisma` — Data models
- `docker-compose.yml` — Local database services

## Troubleshooting

### Database & Migrations

- If migrations fail, verify `DATABASE_URL` and that the database container is running.
- If API requests fail, check server logs and confirm Prisma client is generated.
- Delete `.next/` and re-run `npm run dev` if hot reload behaves unexpectedly.

### Seeding Issues

- **Error: "DEFAULT_ADMIN_EMAIL is required"**
  - Make sure you have created a `.env` file (copy from `.env.example`)
  - Ensure all three admin variables are set: `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`, `DEFAULT_ADMIN_FULLNAME`
- **"Admin user already exists. Skipping seed."**
  - This is normal behavior. The seed script only creates an admin if none exists.
  - To create a new admin with different credentials, either:
    1. Change the password through the app's change password feature, or
    2. Manually delete the existing admin from the database first

- **Seed script doesn't read .env file**
  - Ensure the `.env` file is in the project root directory
  - Run the seed command from the project root directory
  - Restart your terminal/shell after creating `.env`
