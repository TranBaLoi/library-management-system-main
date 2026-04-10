'use client';

// #region Imports
import { getSocketClient, SocketClient } from '@/lib/socket';
import { getAccessToken } from '@/lib/utils/auth-utils';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
// #endregion

// #region Types

/**
 * Socket context value
 */
interface SocketContextValue {
  /**
   * Socket client instance
   */
  socketClient: SocketClient | null;
  /**
   * Connection status
   */
  isConnected: boolean;
  /**
   * Whether connection is in progress
   */
  isConnecting: boolean;
  /**
   * Connection error, if any
   */
  error: Error | null;
  /**
   * Manually reconnect to socket server
   */
  reconnect: () => Promise<void>;
  /**
   * Disconnect from socket server
   */
  disconnect: () => void;
}

// #endregion

// #region Context

/**
 * Socket context for accessing socket client throughout the app
 */
const SocketContext = createContext<SocketContextValue | null>(null);

// #endregion

// #region Socket Provider Component

/**
 * Socket provider that automatically connects to WebSocket server on mount.
 * Provides socket client instance to all child components via context.
 */
export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socketClient, setSocketClient] = useState<SocketClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const socketClientRef = useRef<SocketClient | null>(null);
  const reconnectRef = useRef<(() => Promise<void>) | null>(null);
  const isInitializingRef = useRef(false);
  const tokenCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize socket client and connect
  useEffect(() => {
    let mounted = true;

    // Prevent multiple initialization attempts (React Strict Mode)
    if (isInitializingRef.current) {
      console.log('Socket initialization already in progress, skipping...');
      return;
    }

    const initializeSocket = async () => {
      isInitializingRef.current = true;
      try {
        // Check if user is authenticated (has access token)
        const token = getAccessToken();
        if (!token) {
          console.log('No access token found, skipping socket connection');
          if (mounted) {
            setIsConnecting(false);
            setIsConnected(false);
          }
          // Set up polling to check for token when user logs in
          if (mounted && !tokenCheckIntervalRef.current) {
            tokenCheckIntervalRef.current = setInterval(() => {
              const newToken = getAccessToken();
              if (
                newToken &&
                !isInitializingRef.current &&
                !socketClientRef.current?.isSocketConnected()
              ) {
                console.log('Token found, attempting to connect socket...');
                initializeSocket();
              }
            }, 2000); // Check every 2 seconds
          }
          return;
        }

        setIsConnecting(true);
        setError(null);

        // Get socket URL from environment variable
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

        // Get or create socket client instance
        const client = getSocketClient({
          url: socketUrl,
        });

        // Set up connection event handlers
        await client.connect({
          onConnect: () => {
            if (mounted) {
              setIsConnected(true);
              setIsConnecting(false);
              setError(null);
              console.log('Socket connected successfully');
            }
          },
          onDisconnect: (reason: string) => {
            if (mounted) {
              setIsConnected(false);
              console.log('Socket disconnected:', reason);

              // Auto-reconnect on unexpected disconnects (not manual disconnect)
              if (reason !== 'io client disconnect' && reason !== 'transport close') {
                // Wait a bit before attempting to reconnect
                reconnectTimeoutRef.current = setTimeout(() => {
                  if (mounted && getAccessToken() && reconnectRef.current) {
                    reconnectRef.current();
                  }
                }, 2000);
              }
            }
          },
          onError: (err: Error) => {
            if (mounted) {
              setIsConnecting(false);
              setIsConnected(false);
              setError(err);
              console.error('Socket connection error:', err);
            }
          },
          onReconnect: (attemptNumber: number) => {
            if (mounted) {
              setIsConnected(true);
              setIsConnecting(false);
              setError(null);
              console.log('Socket reconnected after', attemptNumber, 'attempts');
            }
          },
          onReconnectAttempt: (attemptNumber: number) => {
            if (mounted) {
              setIsConnecting(true);
              console.log('Socket reconnection attempt:', attemptNumber);
            }
          },
          onReconnectFailed: () => {
            if (mounted) {
              setIsConnecting(false);
              setIsConnected(false);
              setError(new Error('Socket reconnection failed'));
              console.error('Socket reconnection failed');
            }
          },
        });

        if (mounted) {
          setSocketClient(client);
          socketClientRef.current = client;
          // Clear token check interval once connected
          if (tokenCheckIntervalRef.current) {
            clearInterval(tokenCheckIntervalRef.current);
            tokenCheckIntervalRef.current = null;
          }
        }
      } catch (err) {
        if (mounted) {
          setIsConnecting(false);
          setIsConnected(false);
          const error =
            err instanceof Error ? err : new Error('Failed to connect to socket server');
          setError(error);
          console.error('Failed to initialize socket:', error);
        }
      } finally {
        isInitializingRef.current = false;
      }
    };

    // Initialize socket connection
    initializeSocket();

    // Cleanup on unmount
    return () => {
      mounted = false;
      isInitializingRef.current = false;

      // Clear token check interval
      if (tokenCheckIntervalRef.current) {
        clearInterval(tokenCheckIntervalRef.current);
        tokenCheckIntervalRef.current = null;
      }

      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Disconnect socket if connected
      if (socketClientRef.current) {
        socketClientRef.current.disconnect();
        setSocketClient(null);
        socketClientRef.current = null;
        setIsConnected(false);
      }
    };
  }, []); // Only run on mount

  /**
   * Manually reconnect to socket server
   */
  const reconnect = useCallback(async () => {
    // Clear any pending reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Disconnect existing connection if any
    if (socketClientRef.current) {
      socketClientRef.current.disconnect();
      setSocketClient(null);
      socketClientRef.current = null;
      setIsConnected(false);
    }

    try {
      setIsConnecting(true);
      setError(null);

      const token = getAccessToken();
      if (!token) {
        throw new Error('No access token found');
      }

      // Get socket URL from environment variable
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

      const client = getSocketClient({
        url: socketUrl,
      });

      await client.connect({
        onConnect: () => {
          setIsConnected(true);
          setIsConnecting(false);
          setError(null);
        },
        onError: (err: Error) => {
          setIsConnecting(false);
          setIsConnected(false);
          setError(err);
        },
      });

      setSocketClient(client);
      socketClientRef.current = client;
    } catch (err) {
      setIsConnecting(false);
      const error = err instanceof Error ? err : new Error('Reconnection failed');
      setError(error);
      console.error('Failed to reconnect:', error);
    }
  }, []);

  // Store reconnect function in ref for use in useEffect
  reconnectRef.current = reconnect;

  /**
   * Disconnect from socket server
   */
  const disconnect = useCallback(() => {
    if (socketClientRef.current) {
      socketClientRef.current.disconnect();
      setSocketClient(null);
      socketClientRef.current = null;
      setIsConnected(false);
      setIsConnecting(false);
    }
  }, []);

  const value: SocketContextValue = {
    socketClient,
    isConnected,
    isConnecting,
    error,
    reconnect,
    disconnect,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

// #endregion

// #region Hook

/**
 * Hook to access socket client and connection status
 *
 * @returns Socket context value with client instance and connection status
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { socketClient, isConnected, emit } = useSocket();
 *
 *   useEffect(() => {
 *     if (isConnected && socketClient) {
 *       socketClient.emit('message', { text: 'Hello' });
 *     }
 *   }, [isConnected, socketClient]);
 *
 *   return <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>;
 * }
 * ```
 */
export function useSocket(): SocketContextValue {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }

  return context;
}

// #endregion
