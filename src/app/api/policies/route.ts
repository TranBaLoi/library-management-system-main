import { ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import {
  handleRouteError,
  parsePaginationParams,
  sanitizeString,
  successResponse,
  validateRequiredFields,
} from '@/lib/utils';
import { requireLibrarian } from '@/middleware/auth.middleware';
import { CreatePolicyData, PoliciesListPayload, Policy } from '@/types/policy';
import { Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';

// GET /api/policies - Get policies
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, search } = parsePaginationParams(searchParams);

    // Optional filters
    const sortBy = searchParams.get('sortBy');
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null;
    const isDeletedParam = searchParams.get('isDeleted');

    const where: Prisma.PolicyWhereInput = {
      ...(isDeletedParam !== null ? { isDeleted: isDeletedParam === 'true' } : {}),
    };

    if (search) {
      where.OR = [{ name: { contains: search } }, { id: { contains: search } }];
    }

    const skip = (page - 1) * limit;

    // Build orderBy clause
    let orderBy: Prisma.PolicyOrderByWithRelationInput = { createdAt: 'desc' };

    if (sortBy && sortOrder) {
      // Map frontend sort keys to database fields
      const sortFieldMap: Record<string, string> = {
        id: 'id',
        name: 'name',
        amount: 'amount',
        unit: 'unit',
        createdAt: 'createdAt',
      };

      const dbField = sortFieldMap[sortBy];
      if (dbField) {
        orderBy = { [dbField]: sortOrder };
      }
    }

    const [policies, total] = await Promise.all([
      prisma.policy.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          name: true,
          amount: true,
          unit: true,
          isDeleted: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.policy.count({ where }),
    ]);

    return successResponse<PoliciesListPayload>({
      policies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleRouteError(error, 'GET /api/policies');
  }
}

// POST /api/policies - Create policy
export const POST = requireLibrarian(async request => {
  try {
    const body: CreatePolicyData = await request.json();
    const { id, name, amount, unit, isDeleted } = body;

    // Validate required fields
    const validationError = validateRequiredFields(body as unknown as Record<string, unknown>, [
      'id',
      'name',
      'amount',
      'unit',
    ]);
    if (validationError) {
      throw new ValidationError(validationError);
    }

    // Validate amount
    if (amount < 0) {
      throw new ValidationError('Amount must be greater than or equal to 0');
    }

    // Validate unit
    if (unit !== 'FIXED' && unit !== 'PER_DAY') {
      throw new ValidationError('Unit must be either FIXED or PER_DAY');
    }

    // Check if policy with same id already exists
    const existing = await prisma.policy.findUnique({
      where: { id },
      select: { id: true },
    });
    if (existing) {
      throw new ValidationError('Policy with this ID already exists');
    }

    // Prepare data
    const data: Prisma.PolicyUncheckedCreateInput = {
      id: sanitizeString(id),
      name: sanitizeString(name),
      amount,
      unit,
      isDeleted: Boolean(isDeleted),
    };

    const created: Policy = await prisma.policy.create({
      data,
      select: {
        id: true,
        name: true,
        amount: true,
        unit: true,
        isDeleted: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return successResponse<Policy>(created, 'Policy created successfully', 201);
  } catch (error) {
    return handleRouteError(error, 'POST /api/policies');
  }
});
