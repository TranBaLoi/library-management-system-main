import { ApiError } from '@/lib/errors';
import { ApiResponse } from '@/types/api';
import { NextResponse } from 'next/server';

// Success response helper
export function successResponse<T>(data: T, message?: string, status: number = 200): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    } as ApiResponse<T>,
    { status }
  );
}

// Error response helper
export function errorResponse(error: string, status: number = 400): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error,
    } as ApiResponse,
    { status }
  );
}

// Validation helper
export function validateRequiredFields(
  data: Record<string, unknown>,
  requiredFields: string[]
): string | null {
  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

// Parse pagination parameters
export function parsePaginationParams(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
  const search = searchParams.get('search') || '';

  return {
    page,
    limit,
    search,
    skip: (page - 1) * limit,
  };
}

// Parse integer parameter safely
export function parseIntParam(param: string | null, defaultValue: number = 0): number {
  if (!param) return defaultValue;
  const parsed = parseInt(param);
  return isNaN(parsed) ? defaultValue : parsed;
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Sanitize user input
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

// Handle async route errors
export function handleRouteError(error: unknown, context: string = 'API'): NextResponse {
  console.error(`${context} Error:`, error);

  // Handle custom API errors with status codes
  if (error instanceof ApiError) {
    return errorResponse(error.message, error.statusCode);
  }

  return errorResponse('Internal server error', 500);
}
