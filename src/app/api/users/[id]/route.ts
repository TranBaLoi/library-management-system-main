import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
import {
  handleRouteError,
  isValidEmail,
  parseIntParam,
  sanitizeString,
  successResponse,
} from '@/lib/utils';
import { AuthenticatedRequest, requireLibrarian } from '@/middleware/auth.middleware';
import { UserService } from '@/services/user.service';
import { Prisma, Role } from '@prisma/client';

// GET /api/users/[id] - Get user by ID (Admin & Librarian only)
export const GET = requireLibrarian(async (request: AuthenticatedRequest, context?: unknown) => {
  try {
    const { params } = context as { params: Promise<{ id: string }> };
    const { id } = await params;
    const userId = parseIntParam(id);

    if (userId <= 0) {
      throw new ValidationError('Invalid user ID');
    }

    const user = await UserService.getUserById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Permission check: Librarian can only view READER users
    if (request.user.role === Role.LIBRARIAN && user.role !== Role.READER) {
      throw new ForbiddenError('Librarians can only view users with READER role');
    }

    return successResponse(user);
  } catch (error) {
    return handleRouteError(error, 'GET /api/users/[id]');
  }
});

// PATCH /api/users/[id] - Update user (partial update) (Admin & Librarian only)
export const PATCH = requireLibrarian(async (request: AuthenticatedRequest, context?: unknown) => {
  try {
    const { params } = context as { params: Promise<{ id: string }> };
    const { id } = await params;
    const userId = parseIntParam(id);

    if (userId <= 0) {
      throw new ValidationError('Invalid user ID');
    }

    const body = await request.json();
    const { fullName, email, phoneNumber, address, role, status } = body;

    // Validate email format if provided
    if (email && !isValidEmail(email)) {
      throw new ValidationError('Invalid email format');
    }

    // Get the target user to check their role
    const targetUser = await UserService.getUserById(userId);
    if (!targetUser) {
      throw new NotFoundError('User not found');
    }

    // Permission check: Librarian can only update READER users
    if (request.user.role === Role.LIBRARIAN && targetUser.role !== Role.READER) {
      throw new ForbiddenError('Librarians can only manage users with READER role');
    }

    // Permission check: Librarian cannot change role to non-READER
    if (request.user.role === Role.LIBRARIAN && role && role !== Role.READER) {
      throw new ForbiddenError('Librarians cannot assign roles other than READER');
    }

    // Prepare sanitized update data
    const updateData: Prisma.UserUpdateInput = {
      fullName: fullName !== undefined ? { set: sanitizeString(fullName) } : undefined,
      email: email !== undefined ? { set: email.toLowerCase().trim() } : undefined,
      phoneNumber:
        phoneNumber !== undefined
          ? { set: phoneNumber ? sanitizeString(phoneNumber) : null }
          : undefined,
      address:
        address !== undefined ? { set: address ? sanitizeString(address) : null } : undefined,
      role: role !== undefined ? { set: role } : undefined,
      status: status !== undefined ? { set: status } : undefined,
    };

    const updatedUser = await UserService.updateUser(userId, updateData);

    return successResponse(updatedUser, 'User updated successfully');
  } catch (error) {
    return handleRouteError(error, 'PATCH /api/users/[id]');
  }
});
