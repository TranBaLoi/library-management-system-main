#!/bin/sh
set -e

echo "Starting Library Management System..."

# Helper function to run Prisma command
run_prisma() {
  local command=$1
  # Use node to run Prisma CLI directly (more reliable than binary in standalone output)
  if [ -f "/app/node_modules/prisma/cli.js" ]; then
    node /app/node_modules/prisma/cli.js $command
  elif [ -f "/app/node_modules/prisma/build/index.js" ]; then
    node /app/node_modules/prisma/build/index.js $command
  elif [ -f "/app/node_modules/@prisma/cli/build/index.js" ]; then
    node /app/node_modules/@prisma/cli/build/index.js $command
  else
    # Last resort: try with npx (may not work in standalone output)
    PATH="/app/node_modules/.bin:$PATH" npx prisma $command || {
      echo "ERROR: Could not find Prisma CLI. Tried:"
      echo "  - /app/node_modules/prisma/cli.js"
      echo "  - /app/node_modules/prisma/build/index.js"
      echo "  - /app/node_modules/@prisma/cli/build/index.js"
      echo "  - npx prisma"
      exit 1
    }
  fi
}

# Wait for MySQL to be ready
echo "Waiting for MySQL to be ready..."
max_attempts=30
attempt=0
until nc -z mysql 3306 || [ $attempt -eq $max_attempts ]; do
  attempt=$((attempt + 1))
  echo "MySQL is unavailable - sleeping (attempt $attempt/$max_attempts)"
  sleep 2
done

if [ $attempt -eq $max_attempts ]; then
  echo "MySQL failed to become available after $max_attempts attempts"
  exit 1
fi
echo "MySQL is up - executing command"

# Wait for Redis to be ready
echo "Waiting for Redis to be ready..."
attempt=0
until nc -z redis 6379 || [ $attempt -eq $max_attempts ]; do
  attempt=$((attempt + 1))
  echo "Redis is unavailable - sleeping (attempt $attempt/$max_attempts)"
  sleep 2
done

if [ $attempt -eq $max_attempts ]; then
  echo "Redis failed to become available after $max_attempts attempts"
  exit 1
fi
echo "Redis is up - executing command"

# Prisma Client is already generated during build, so we skip generation here
# Run database migrations using Prisma CLI (now installed as production dependency)
echo "Running database migrations..."
run_prisma migrate deploy

if [ $? -eq 0 ]; then
  echo "Migrations completed successfully!"
else
  echo "Migration failed!"
  exit 1
fi

# Start cron jobs in background
echo "Starting cron jobs..."
if [ -f "/app/node_modules/ts-node/dist/bin.js" ]; then
  # Run cron job in background
  node /app/node_modules/ts-node/dist/bin.js \
    --project /app/tsconfig.server.json \
    --compiler-options '{"module":"CommonJS"}' \
    /app/scripts/cron.ts &
  echo "Cron jobs started in background"
else
  echo "WARNING: ts-node not found, cron jobs will not run"
fi

# Start Next.js server in foreground (becomes PID 1 for proper signal handling)
echo "Starting Next.js server on port ${PORT:-3000}..."
exec node server.js

