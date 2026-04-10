import { ForbiddenError, ValidationError } from '@/lib/errors';
import { handleRouteError, successResponse } from '@/lib/utils';
import { AuthenticatedRequest, requireLibrarian } from '@/middleware/auth.middleware';
import { UserService } from '@/services/user.service';
import { Role } from '@prisma/client';

// DELETE /api/users/bulk-delete - Delete multiple users (bulk soft delete) (Admin & Librarian only)
export const DELETE = requireLibrarian(async (request: AuthenticatedRequest) => {
  try {
    const body = await request.json();
    const { ids } = body;

    // Validate required fields
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new ValidationError('User IDs array is required and cannot be empty');
    }

    // Validate all IDs are positive integers
    const userIds = ids.map((id: unknown) => {
      const parsed = typeof id === 'number' ? id : parseInt(String(id), 10);
      if (isNaN(parsed) || parsed <= 0) {
        throw new ValidationError(`Invalid user ID: ${id}`);
      }
      return parsed;
    });

    // Prevent self-deletion
    if (userIds.includes(request.user.id)) {
      throw new ForbiddenError('You cannot delete your own account');
    }

    // Permission check: Librarian can only delete READER users
    if (request.user.role === Role.LIBRARIAN) {
      // Check if all target users are READER role
      const targetUsers = await UserService.getUsersByIds(userIds);
      const nonReaderUsers = targetUsers.filter(user => user.role !== Role.READER);

      if (nonReaderUsers.length > 0) {
        throw new ForbiddenError(
          `Librarians can only delete users with READER role. Found ${nonReaderUsers.length} non-reader user(s).`
        );
      }
    }

    const result = await UserService.deleteBulkUsers(userIds);

    return successResponse(result, `Successfully deleted ${result.deletedCount} user(s)`);
  } catch (error) {
    return handleRouteError(error, 'DELETE /api/users/bulk-delete');
  }
});
