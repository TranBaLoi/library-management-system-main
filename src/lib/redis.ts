/**
 * Redis Configuration
 * Singleton Redis client for BullMQ and caching
 */

import Redis from 'ioredis';

// Redis connection configuration
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_DB = parseInt(process.env.REDIS_DB || '0', 10);

// Create Redis connection options
const redisOptions = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  db: REDIS_DB,
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false, // Required for BullMQ
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

// Create Redis connection for BullMQ
export const redisConnection = new Redis(redisOptions);

// Handle connection events
redisConnection.on('connect', () => {
  console.log('Redis connected successfully');
});

redisConnection.on('error', error => {
  console.error('Redis connection error:', error);
});

redisConnection.on('close', () => {
  console.log('Redis connection closed');
});

// Export connection options for BullMQ workers
export { redisOptions };
