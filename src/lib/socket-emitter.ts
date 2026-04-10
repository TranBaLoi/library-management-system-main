/**
 * Socket Emitter Singleton
 * Allows workers to emit events via the socket server
 * when running in the same process
 */

type EmitToUserFn = (userId: number, event: string, data: unknown) => void;

let emitToUserFn: EmitToUserFn | null = null;

/**
 * Set the emitToUser function (called by socket-server on startup)
 */
export function setEmitToUser(fn: EmitToUserFn): void {
  emitToUserFn = fn;
  console.log('[SocketEmitter] emitToUser function registered');
}

/**
 * Emit event to a specific user via socket
 * Returns true if emit was successful, false if socket not initialized
 */
export function emitToUser(userId: number, event: string, data: unknown): boolean {
  if (!emitToUserFn) {
    console.warn('[SocketEmitter] emitToUser not initialized yet');
    return false;
  }
  emitToUserFn(userId, event, data);
  return true;
}

/**
 * Check if emitter is ready
 */
export function isEmitterReady(): boolean {
  return emitToUserFn !== null;
}
