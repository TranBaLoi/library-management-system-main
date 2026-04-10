import { getAccessTokenFromRequest } from '@/lib/utils/auth-utils';
import { NextRequest, NextResponse } from 'next/server';
import { ROUTES } from './constants';

type JwtPayloadLike = {
  role?: string;
  [key: string]: unknown;
};

// Decode JWT payload without verifying signature
function decodeJwtPayload(token: string): JwtPayloadLike | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(json) as JwtPayloadLike;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const token = getAccessTokenFromRequest(request);
  const { pathname } = request.nextUrl;

  // If user is not authenticated, redirect to the login page
  if (!token) {
    return NextResponse.redirect(new URL(ROUTES.AUTH.LOGIN, request.url));
  }

  // If user is authenticated as READER, block access to any /dashboard route
  const payload = decodeJwtPayload(token);
  const role = payload?.role;

  if (pathname.startsWith('/dashboard') && role === 'READER') {
    return NextResponse.redirect(new URL(ROUTES.HOME, request.url));
  }

  return NextResponse.next();
}

// Apply this middleware only to specific routes
export const config = {
  matcher: ['/dashboard/:path*', '/change-password'],
};
