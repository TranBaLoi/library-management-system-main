import { prisma } from '@/lib/prisma';
import { handleRouteError, successResponse } from '@/lib/utils';
import { AuthenticatedRequest, requireLibrarian } from '@/middleware/auth.middleware';
import { PublicUser } from '@/types/user';
import { Role } from '@prisma/client';

// GET /api/users/all - Get all users (Admin & Librarian only)
export const GET = requireLibrarian(async (request: AuthenticatedRequest) => {
  try {
    // Build where clause
    const where: { isDeleted: boolean; role?: Role } = {
      isDeleted: false,
    };

    // Permission check: Librarian can only view READER users
    if (request.user.role === Role.LIBRARIAN) {
      where.role = Role.READER;
    }

    const users: PublicUser[] = await prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        address: true,
        avatarUrl: true,
        role: true,
        status: true,
        violationPoints: true,
        createdAt: true,
        updatedAt: true,
        inactiveAt: true,
      },
      orderBy: {
        fullName: 'asc',
      },
    });

    return successResponse<PublicUser[]>(users);
  } catch (error) {
    return handleRouteError(error, 'GET /api/users/all');
  }
});
