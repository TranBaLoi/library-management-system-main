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
import { CategoriesListPayload, Category, CreateCategoryData } from '@/types';
import { Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';

// GET /api/categories - Get categories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, search } = parsePaginationParams(searchParams);

    // Optional filters
    const sortBy = searchParams.get('sortBy');
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null;
    const isDeletedParam = searchParams.get('isDeleted');

    const where: Prisma.CategoryWhereInput = {
      ...(isDeletedParam !== null ? { isDeleted: isDeletedParam === 'true' } : {}),
    };

    if (search) {
      where.OR = [{ name: { contains: search } }, { description: { contains: search } }];
    }

    const skip = (page - 1) * limit;

    // Build orderBy clause
    let orderBy: Prisma.CategoryOrderByWithRelationInput = { createdAt: 'desc' };

    if (sortBy && sortOrder) {
      // Map frontend sort keys to database fields
      const sortFieldMap: Record<string, string> = {
        id: 'id',
        name: 'name',
        createdAt: 'createdAt',
      };

      const dbField = sortFieldMap[sortBy];
      if (dbField) {
        orderBy = { [dbField]: sortOrder };
      }
    }

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          isDeleted: true,
        },
      }),
      prisma.category.count({ where }),
    ]);

    return successResponse<CategoriesListPayload>({
      categories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleRouteError(error, 'GET /api/categories');
  }
}

// POST /api/categories - Create category
export const POST = requireLibrarian(async request => {
  try {
    const body: CreateCategoryData = await request.json();
    const { name, description, isDeleted } = body;

    // Validate required fields
    const validationError = validateRequiredFields(body as unknown as Record<string, unknown>, [
      'name',
    ]);
    if (validationError) {
      throw new ValidationError(validationError);
    }

    // Prepare data
    const data: Prisma.CategoryUncheckedCreateInput = {
      name: sanitizeString(name),
      description: description ? sanitizeString(description) : null,
      isDeleted: Boolean(isDeleted),
    };

    const created: Category = await prisma.category.create({
      data,
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        isDeleted: true,
      },
    });

    return successResponse<Category>(created, 'Category created successfully', 201);
  } catch (error) {
    return handleRouteError(error, 'POST /api/categories');
  }
});
