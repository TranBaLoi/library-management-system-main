import { NotFoundError, ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { handleRouteError, parseIntParam, sanitizeString, successResponse } from '@/lib/utils';
import { requireLibrarian } from '@/middleware/auth.middleware';
import { Category, CreateCategoryData } from '@/types';
import { Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';

// GET /api/categories/[id] - Get single category
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const categoryId = parseIntParam(id);

    if (categoryId <= 0) {
      throw new ValidationError('Invalid category ID');
    }

    const category = await prisma.category.findFirst({
      where: { id: categoryId },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        isDeleted: true,
      },
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    return successResponse<Category>(category);
  } catch (error) {
    return handleRouteError(error, 'GET /api/categories/[id]');
  }
}

// PUT /api/categories/[id] - Update category
export const PUT = requireLibrarian(async (request, context) => {
  const { params } = context as { params: Promise<{ id: string }> };
  try {
    const { id } = await params;
    const categoryId = parseIntParam(id);

    if (categoryId <= 0) {
      throw new ValidationError('Invalid category ID');
    }

    const body: Partial<CreateCategoryData> = await request.json();
    const { name, description, isDeleted } = body;

    const updateData: Prisma.CategoryUncheckedUpdateInput = {};
    if (name !== undefined) updateData.name = sanitizeString(name);
    if (description !== undefined)
      updateData.description = description ? sanitizeString(description) : null;
    if (isDeleted !== undefined) updateData.isDeleted = Boolean(isDeleted);

    // Ensure category exists
    const existing = await prisma.category.findFirst({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundError('Category not found');
    }

    const updated: Category = await prisma.category.update({
      where: { id: categoryId },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        isDeleted: true,
      },
    });

    return successResponse<Category>(updated, 'Category updated successfully');
  } catch (error) {
    return handleRouteError(error, 'PUT /api/categories/[id]');
  }
});

// DELETE /api/categories/[id] - Delete category (soft delete)
export const DELETE = requireLibrarian(async (request, context) => {
  const { params } = context as { params: Promise<{ id: string }> };
  try {
    const { id } = await params;
    const categoryId = parseIntParam(id);

    if (categoryId <= 0) {
      throw new ValidationError('Invalid category ID');
    }

    const existing = await prisma.category.findFirst({
      where: { id: categoryId, isDeleted: false },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundError('Category not found');
    }

    await prisma.category.update({
      where: { id: categoryId },
      data: { isDeleted: true },
    });

    return successResponse(null, 'Category deleted successfully');
  } catch (error) {
    return handleRouteError(error, 'DELETE /api/categories/[id]');
  }
});
