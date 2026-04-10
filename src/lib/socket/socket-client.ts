// #region Imports
import { getAccessToken, getAccessTokenFromRequest } from '@/lib/utils/auth-utils';
import { NextRequest } from 'next/server';
import { io, Socket } from 'socket.io-client';
// #endregion

// #region Types

/**
 * Socket client connection options
 */
export interface SocketClientOptions {
  /**
   * WebSocket server URL (default: http://localhost:4000)
   */
  url?: string;
  /**
   * Access token for authentication
   * If not provided, will attempt to get from cookies (client-side only)
   */
  token?: string;
  /**
   * Auto-reconnect on disconnect (default: true)
   */
  autoReconnect?: boolean;
  /**
   * Reconnection delay in milliseconds (default: 1000)
   */
  reconnectionDelay?: number;
  /**
   * Maximum reconnection attempts (default: 5)
   */
  maxReconnectionAttempts?: number;
}

/**
 * Socket event callbacks
 */
export interface SocketEventCallbacks {
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
  onReconnect?: (attemptNumber: number) => void;
  onReconnectAttempt?: (attemptNumber: number) => void;
  onReconnectFailed?: () => void;
}

// #endregion

// #region Socket Client Class

/**
 * Socket client for connecting to WebSocket server.
 * Handles authentication, reconnection, and event management.
 */
export class SocketClient {
  private socket: Socket | null = null;
  private url: string;
  private token: string | null = null;
  private isConnecting = false;
  private isConnected = false;
  private callbacks: SocketEventCallbacks = {};
  private reconnectAttempts = 0;

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Check if currently connecting
   */
  getIsConnecting(): boolean {
    return this.isConnecting;
  }

  constructor(options: SocketClientOptions = {}) {
    this.url = options.url || 'http://localhost:4000';
    this.token = options.token || null;
  }

  /**
   * Get current socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Check if socket is connected
   */
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(callbacks?: SocketEventCallbacks): Promise<void> {
    // Check if already connected and socket is actually connected
    if (this.socket?.connected) {
      console.warn('Socket client is already connected');
      return;
    }

    // If connecting, wait a bit and check again
    if (this.isConnecting) {
      console.warn('Socket client is already connecting, waiting...');
      // Wait for connection attempt to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (this.socket?.connected) {
        return;
      }
      // If still not connected, allow reconnection
      this.isConnecting = false;
    }

    // If socket exists but disconnected, clean it up first
    if (this.socket && !this.socket.connected) {
      console.log('Cleaning up disconnected socket before reconnecting');
      this.socket.removeAllListeners();
      this.socket = null;
      this.isConnected = false;
    }

    if (callbacks) {
      this.callbacks = { ...this.callbacks, ...callbacks };
    }

    this.isConnecting = true;

    try {
      // Get token if not provided (client-side only)
      if (!this.token && typeof window !== 'undefined') {
        this.token = getAccessToken();
      }

      if (!this.token) {
        const error = new Error('Access token is required for socket connection');
        console.error('Socket connection failed:', error.message);
        throw error;
      }

      // Token from cookies is already clean (just JWT, no "Bearer " prefix)
      // Remove "Bearer " prefix if somehow present (shouldn't be, but just in case)
      const token = this.token.startsWith('Bearer ') ? this.token.slice(7) : this.token;

      if (!token || token.trim() === '') {
        const error = new Error('Access token is empty or invalid');
        console.error('Socket connection failed:', error.message);
        throw error;
      }

      // Validate token format (basic check - should be a JWT with 3 parts)
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        const error = new Error('Invalid token format');
        console.error('Socket connection failed:', error.message);
        throw error;
      }

      console.log('Connecting to socket server with token:', token.substring(0, 20) + '...');
      console.log('Socket connection options:', {
        url: this.url,
        auth: { token: token.substring(0, 20) + '...' },
        query: { token: token.substring(0, 20) + '...' },
      });

      // Create socket connection with authentication
      // Send token as-is (without "Bearer " prefix) - server will handle it
      // Send token via multiple methods for compatibility:
      // 1. auth object (primary method for Socket.IO) - sent in handshake
      // 2. query parameter (visible in Network tab URL)
      this.socket = io(this.url, {
        auth: {
          token: token, // Send token as-is (server will add "Bearer " if needed)
        },
        query: {
          token: token, // Visible in Network tab as query param
        },
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      // Set up event handlers
      this.setupEventHandlers();

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Socket initialization failed'));
          return;
        }

        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000); // 10 second timeout

        this.socket.once('connect', () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          resolve();
        });

        this.socket.once('connect_error', error => {
          clearTimeout(timeout);
          this.isConnecting = false;
          console.error('Socket connection error:', error.message, error);
          reject(error);
        });
      });
    } catch (error) {
      this.isConnecting = false;
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Set up socket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.callbacks.onConnect?.();
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('Socket disconnected:', reason);
      this.isConnected = false;
      this.callbacks.onDisconnect?.(reason);
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('Socket connection error:', error.message, error);
      this.isConnecting = false;
      this.handleError(error);
    });

    // Reconnection events
    this.socket.io.on('reconnect', (attemptNumber: number) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.callbacks.onReconnect?.(attemptNumber);
    });

    this.socket.io.on('reconnect_attempt', (attemptNumber: number) => {
      console.log('Socket reconnection attempt:', attemptNumber);
      this.reconnectAttempts = attemptNumber;
      this.callbacks.onReconnectAttempt?.(attemptNumber);
    });

    this.socket.io.on('reconnect_failed', () => {
      console.error('Socket reconnection failed');
      this.callbacks.onReconnectFailed?.();
    });

    // Test ping/pong
    this.socket.on('pong', () => {
      console.log('Received pong from server');
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.callbacks = {};
  }

  /**
   * Update authentication token and reconnect if needed
   */
  updateToken(newToken: string): void {
    this.token = newToken;

    // If connected, disconnect and reconnect with new token
    if (this.isConnected) {
      this.disconnect();
      this.connect(this.callbacks).catch(error => {
        console.error('Failed to reconnect with new token:', error);
      });
    }
  }

  /**
   * Emit an event to the server
   */
  emit(event: string, data?: unknown): void {
    if (!this.socket || !this.isConnected) {
      throw new Error('Socket is not connected');
    }
    this.socket.emit(event, data);
  }

  /**
   * Listen to an event from the server
   */
  on(event: string, callback: (...args: unknown[]) => void): void {
    if (!this.socket) {
      throw new Error('Socket is not initialized. Call connect() first.');
    }
    this.socket.on(event, callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback?: (...args: unknown[]) => void): void {
    if (!this.socket) return;
    if (callback) {
      this.socket.off(event, callback);
    } else {
      this.socket.removeAllListeners(event);
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    this.callbacks.onError?.(error);
  }

  /**
   * Send ping to server (for testing connection)
   */
  ping(): void {
    if (!this.socket || !this.isConnected) {
      console.warn('Cannot ping: socket is not connected');
      return;
    }
    this.emit('ping');
  }
}

// #endregion

// #region Server-Side Utilities

/**
 * Create a socket client instance for server-side usage (API routes, server actions).
 * Gets the access token from NextRequest headers or cookies.
 *
 * @param request - NextRequest object containing authentication headers/cookies
 * @param options - Additional socket client options
 * @returns Socket client instance
 *
 * @example
 * // In an API route
 * export async function POST(request: NextRequest) {
 *   const socketClient = createServerSocketClient(request);
 *   await socketClient.connect({
 *     onConnect: () => console.log('Connected to socket server'),
 *   });
 *   socketClient.emit('notify', { message: 'Hello' });
 *   return NextResponse.json({ success: true });
 * }
 */
export function createServerSocketClient(
  request: NextRequest,
  options?: Omit<SocketClientOptions, 'token'>
): SocketClient {
  // Get token from Authorization header first (preferred)
  const authHeader = request.headers.get('authorization');
  let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  // Fallback to cookies if no header token
  if (!token) {
    token = getAccessTokenFromRequest(request);
  }

  if (!token) {
    throw new Error('Access token is required. Make sure the request is authenticated.');
  }

  return new SocketClient({
    ...options,
    token,
  });
}

// #endregion

// #region Singleton Instance

/**
 * Global socket client instance
 */
let globalSocketClient: SocketClient | null = null;

/**
 * Get or create global socket client instance
 * If the existing instance is disconnected, creates a new one
 */
export function getSocketClient(options?: SocketClientOptions): SocketClient {
  // If no existing client or client is disconnected, create/reset
  if (
    !globalSocketClient ||
    (!globalSocketClient.isSocketConnected() && !globalSocketClient.getIsConnecting())
  ) {
    // Clean up old client if exists
    if (globalSocketClient) {
      globalSocketClient.disconnect();
    }
    globalSocketClient = new SocketClient(options);
  } else if (options?.token && globalSocketClient.getToken() !== options.token) {
    // Update token if provided and different
    globalSocketClient.updateToken(options.token);
  }
  return globalSocketClient;
}

/**
 * Reset global socket client instance
 */
export function resetSocketClient(): void {
  if (globalSocketClient) {
    globalSocketClient.disconnect();
    globalSocketClient = null;
  }
}

// #endregion
