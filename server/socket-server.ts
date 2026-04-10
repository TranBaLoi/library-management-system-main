// server/socket-server.ts

// Load environment variables from .env file
import { config } from 'dotenv';
config();

import { Role } from '@prisma/client';
import http from 'http';
import jwt from 'jsonwebtoken';
import { Server, Socket } from 'socket.io';

// Register tsconfig paths for @/ alias resolution (needed for dynamic imports)
import { resolve } from 'path';
import { register } from 'tsconfig-paths';

register({
  baseUrl: resolve(__dirname, '..'),
  paths: {
    '@/*': ['./src/*'],
  },
});

// Import socket emitter to register emitToUser function
import { setEmitToUser } from '@/lib/socket-emitter';

const server = http.createServer();
const io = new Server(server, { cors: { origin: '*' } });

// Track connected users by userId -> Set of socket IDs
const connectedUsers = new Map<number, Set<string>>();

// Middleware: require token
io.use((socket: Socket, next) => {
  try {
    // client: io(url, { auth: { token: "Bearer <JWT>" } })
    console.log('socket.handshake.auth', socket.handshake.auth);
    console.log('socket.handshake.headers', socket.handshake.headers);

    // Get token from multiple sources (in order of preference):
    // 1. auth object (primary method for Socket.IO)
    // 2. Authorization header
    // 3. query parameter (fallback for visibility/debugging)
    const raw =
      (socket.handshake.auth?.token as string | undefined) ||
      socket.handshake.headers?.authorization ||
      (socket.handshake.query?.token as string | undefined);

    if (!raw) {
      console.error('No token found in handshake');
      console.error('Available auth:', socket.handshake.auth);
      console.error('Available headers:', socket.handshake.headers);
      console.error('Available query:', socket.handshake.query);
      return next(new Error('unauthorized'));
    }

    // Extract token (remove "Bearer " prefix if present)
    const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
    if (!token || token.trim() === '') {
      console.error('Token is empty after extraction');
      return next(new Error('unauthorized'));
    }

    // Verify and decode token (ignore expiration for WebSocket connections)
    // Still verifies signature, issuer, and audience for security
    const jwtSecret = process.env.JWT_SECRET || 'jwt-key';
    const payload = jwt.verify(token, jwtSecret, {
      issuer: 'library-management-system',
      audience: 'library-users',
      ignoreExpiration: true, // Don't check expiration time for WebSocket connections
    }) as {
      userId: number;
      email: string;
      role: Role;
      iat?: number;
      exp?: number;
    };

    // Attach user info to socket for later use
    socket.data.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
    };

    console.log('Socket authenticated successfully:', socket.data.user);

    return next();
  } catch (err) {
    // Log the actual error for debugging
    // Note: TokenExpiredError won't occur since we ignore expiration
    if (err instanceof jwt.JsonWebTokenError) {
      console.error('JWT verification error:', err.message);
    } else if (err instanceof jwt.NotBeforeError) {
      console.error('JWT not active yet:', err.date);
    } else {
      console.error('Authentication error:', err);
    }
    return next(new Error('unauthorized'));
  }
});

io.on('connection', socket => {
  console.log('Socket connected');
  const userId = socket.data.user?.id;

  if (userId) {
    // Track connected user
    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, new Set());
    }
    connectedUsers.get(userId)!.add(socket.id);
    console.log(
      `User ${userId} connected (socket: ${socket.id}). Total connections: ${connectedUsers.get(userId)!.size}`
    );
  }

  // Handle ping/pong
  socket.on('ping', () => socket.emit('pong'));

  // Handle disconnection
  socket.on('disconnect', reason => {
    if (userId) {
      const userSockets = connectedUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          connectedUsers.delete(userId);
        }
        console.log(
          `User ${userId} disconnected (socket: ${socket.id}, reason: ${reason}). Remaining connections: ${userSockets.size}`
        );
      }
    }
  });
});

/**
 * Emit event to a specific user (all their connected sockets)
 */
function emitToUser(userId: number, event: string, data: unknown): void {
  const userSockets = connectedUsers.get(userId);
  if (userSockets && userSockets.size > 0) {
    userSockets.forEach(socketId => {
      io.to(socketId).emit(event, data);
    });
    console.log(`Emitted '${event}' to user ${userId} (${userSockets.size} socket(s))`);
  } else {
    console.log(
      `User ${userId} is not connected. Notification will be delivered when they reconnect.`
    );
  }
}

// Register emitToUser with shared module so workers can use it
setEmitToUser(emitToUser);

/**
 * Start workers in the same process
 * This allows workers to directly emit to connected sockets
 */
async function startWorkers(): Promise<void> {
  console.log('Starting workers in socket server process...');

  // Import workers - they will start automatically on import
  const { notificationWorker } = await import('@/workers/notification.worker');
  const { emailWorker } = await import('@/workers/email.worker');

  console.log('Notification worker started');
  console.log('Email worker started');

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down workers...');
    await notificationWorker.close();
    await emailWorker.close();
    console.log('Workers closed');
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// Only start the server if this file is run directly (not imported)
if (require.main === module) {
  server.listen(4000, async () => {
    console.log('Socket server running on :4000');

    // Start workers after socket server is ready
    await startWorkers();
  });
}

// Export for direct use if needed
export { emitToUser, io };
