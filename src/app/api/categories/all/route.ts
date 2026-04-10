import { prisma } from '@/lib/prisma';
import { handleRouteError, successResponse } from '@/lib/utils';
import { Category } from '@/types';

// GET /api/categories/all - Get all categories
export async function GET() {
  try {
    const categories: Category[] = await prisma.category.findMany({
      where: {
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        isDeleted: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return successResponse<Category[]>(categories);
  } catch (error) {
    return handleRouteError(error, 'GET /api/categories/all');
  }
}
