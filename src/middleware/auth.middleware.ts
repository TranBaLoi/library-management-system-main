import { JWTUtils, errorResponse } from '@/lib/utils';
import { UserService } from '@/services/user.service';
import { AuthUser } from '@/types/auth';
import { Role } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

// Module augmentation for NextRequest
declare module 'next' {
  interface NextRequest {
    user?: AuthUser;
  }
}

// Extending NextRequest
export interface AuthenticatedRequest extends NextRequest {
  user: AuthUser;
}

// Authentication middleware
export async function authenticateToken(
  request: NextRequest
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return {
        success: false,
        error: 'Access token required',
      };
    }

    // Verify token
    const payload = JWTUtils.verifyAccessToken(token);

    // Get user from database
    const publicUser = await UserService.getUserById(payload.userId);

    if (!publicUser) {
      return {
        success: false,
        error: 'User not found or inactive',
      };
    }

    // Transform PublicUser to AuthUser
    // Ensure violationPoints is always a number (default to 0 if undefined)
    const user: AuthUser = {
      id: publicUser.id,
      fullName: publicUser.fullName,
      email: publicUser.email,
      phoneNumber: publicUser.phoneNumber,
      address: publicUser.address,
      avatarUrl: publicUser.avatarUrl,
      role: publicUser.role,
      status: publicUser.status,
      violationPoints: publicUser.violationPoints ?? 0,
      createdAt: publicUser.createdAt,
      updatedAt: publicUser.updatedAt,
      firstLoginAt: publicUser.firstLoginAt,
      interest: publicUser.interest,
    };

    return {
      success: true,
      user,
    };
  } catch {
    return {
      success: false,
      error: 'Invalid or expired token',
    };
  }
}

// Authorization middleware - check if user has required role
export function authorizeRoles(allowedRoles: Role[]) {
  return (user: AuthUser): boolean => {
    return allowedRoles.includes(user.role);
  };
}

// Middleware wrapper for API routes
export function withAuth(
  handler: (req: AuthenticatedRequest, context?: unknown) => Promise<NextResponse>,
  options?: {
    roles?: Role[];
    optional?: boolean;
  }
) {
  return async (request: NextRequest, context?: unknown): Promise<NextResponse> => {
    // Authenticate user
    const authResult = await authenticateToken(request);

    if (!authResult.success) {
      if (options?.optional) {
        // If auth is optional, continue without user
        return handler(request as AuthenticatedRequest, context);
      }

      return errorResponse(authResult.error || 'Authentication failed', 401);
    }

    // Check role authorization if specified
    if (options?.roles && options.roles.length > 0) {
      const hasPermission = authorizeRoles(options.roles)(authResult.user!);

      if (!hasPermission) {
        return errorResponse('Insufficient permissions', 403);
      }
    }

    // Add user to request
    (request as AuthenticatedRequest).user = authResult.user!;

    return handler(request as AuthenticatedRequest, context);
  };
}

// Helper functions for common role checks
export const requireAuth = (
  handler: (req: AuthenticatedRequest, context?: unknown) => Promise<NextResponse>
) => withAuth(handler);

export const requireAdmin = (
  handler: (req: AuthenticatedRequest, context?: unknown) => Promise<NextResponse>
) => withAuth(handler, { roles: [Role.ADMIN] });

export const requireLibrarian = (
  handler: (req: AuthenticatedRequest, context?: unknown) => Promise<NextResponse>
) => withAuth(handler, { roles: [Role.ADMIN, Role.LIBRARIAN] });

export const requireReader = (
  handler: (req: AuthenticatedRequest, context?: unknown) => Promise<NextResponse>
) => withAuth(handler, { roles: [Role.READER] });

export const optionalAuth = (
  handler: (req: AuthenticatedRequest, context?: unknown) => Promise<NextResponse>
) => withAuth(handler, { optional: true });
