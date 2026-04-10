import { prisma } from '@/lib/prisma';
import { handleRouteError, successResponse } from '@/lib/utils';
import { Policy } from '@/types/policy';

// GET /api/policies/all - Get all policies
export async function GET() {
  try {
    const policies: Policy[] = await prisma.policy.findMany({
      where: {
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        amount: true,
        unit: true,
        isDeleted: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return successResponse<Policy[]>(policies);
  } catch (error) {
    return handleRouteError(error, 'GET /api/policies/all');
  }
}
