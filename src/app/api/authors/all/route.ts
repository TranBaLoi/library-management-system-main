import { prisma } from '@/lib/prisma';
import { handleRouteError, successResponse } from '@/lib/utils';
import { Author } from '@/types/author';

// GET /api/authors/all - Get all authors
export async function GET() {
  try {
    const authors: Author[] = await prisma.author.findMany({
      where: {
        isDeleted: false,
      },
      select: {
        id: true,
        fullName: true,
        bio: true,
        birthDate: true,
        nationality: true,
        isDeleted: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        fullName: 'asc',
      },
    });

    return successResponse<Author[]>(authors);
  } catch (error) {
    return handleRouteError(error, 'GET /api/authors/all');
  }
}
