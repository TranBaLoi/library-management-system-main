import { NotFoundError, ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { handleRouteError, sanitizeString, successResponse } from '@/lib/utils';
import { requireLibrarian } from '@/middleware/auth.middleware';
import { CreatePolicyData, Policy } from '@/types/policy';
import { Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';

// GET /api/policies/[id] - Get single policy
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id || id.trim() === '') {
      throw new ValidationError('Invalid policy ID');
    }

    const policy = await prisma.policy.findFirst({
      where: { id },
      select: {
        id: true,
        name: true,
        amount: true,
        unit: true,
        createdAt: true,
        updatedAt: true,
        isDeleted: true,
      },
    });

    if (!policy) {
      throw new NotFoundError('Policy not found');
    }

    return successResponse<Policy>(policy);
  } catch (error) {
    return handleRouteError(error, 'GET /api/policies/[id]');
  }
}

// PUT /api/policies/[id] - Update policy
export const PUT = requireLibrarian(async (request, context) => {
  const { params } = context as { params: Promise<{ id: string }> };
  try {
    const { id } = await params;

    if (!id || id.trim() === '') {
      throw new ValidationError('Invalid policy ID');
    }

    const body: Partial<CreatePolicyData> = await request.json();
    const { name, amount, unit, isDeleted } = body;

    const updateData: Prisma.PolicyUncheckedUpdateInput = {};
    if (name !== undefined) updateData.name = sanitizeString(name);
    if (amount !== undefined) {
      if (amount < 0) {
        throw new ValidationError('Amount must be greater than or equal to 0');
      }
      updateData.amount = amount;
    }
    if (unit !== undefined) {
      if (unit !== 'FIXED' && unit !== 'PER_DAY') {
        throw new ValidationError('Unit must be either FIXED or PER_DAY');
      }
      updateData.unit = unit;
    }
    if (isDeleted !== undefined) updateData.isDeleted = Boolean(isDeleted);

    // Ensure policy exists
    const existing = await prisma.policy.findFirst({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundError('Policy not found');
    }

    const updated: Policy = await prisma.policy.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        amount: true,
        unit: true,
        createdAt: true,
        updatedAt: true,
        isDeleted: true,
      },
    });

    return successResponse<Policy>(updated, 'Policy updated successfully');
  } catch (error) {
    return handleRouteError(error, 'PUT /api/policies/[id]');
  }
});

// DELETE /api/policies/[id] - Delete policy (soft delete)
export const DELETE = requireLibrarian(async (request, context) => {
  const { params } = context as { params: Promise<{ id: string }> };
  try {
    const { id } = await params;

    if (!id || id.trim() === '') {
      throw new ValidationError('Invalid policy ID');
    }

    const existing = await prisma.policy.findFirst({
      where: { id, isDeleted: false },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundError('Policy not found');
    }

    await prisma.policy.update({
      where: { id },
      data: { isDeleted: true },
    });

    return successResponse(null, 'Policy deleted successfully');
  } catch (error) {
    return handleRouteError(error, 'DELETE /api/policies/[id]');
  }
});
