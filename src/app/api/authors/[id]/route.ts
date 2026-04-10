import { NotFoundError, ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { handleRouteError, parseIntParam, sanitizeString, successResponse } from '@/lib/utils';
import { requireLibrarian } from '@/middleware/auth.middleware';
import { Author, CreateAuthorData } from '@/types/author';
import { Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';

// GET /api/authors/[id] - Get single author
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authorId = parseIntParam(id);

    if (authorId <= 0) {
      throw new ValidationError('Invalid author ID');
    }

    const author = await prisma.author.findFirst({
      where: { id: authorId },
      select: {
        id: true,
        fullName: true,
        bio: true,
        birthDate: true,
        nationality: true,
        createdAt: true,
        updatedAt: true,
        isDeleted: true,
      },
    });

    if (!author) {
      throw new NotFoundError('Author not found');
    }

    return successResponse<Author>(author);
  } catch (error) {
    return handleRouteError(error, 'GET /api/authors/[id]');
  }
}

// PUT /api/authors/[id] - Update author
export const PUT = requireLibrarian(async (request, context) => {
  const { params } = context as { params: Promise<{ id: string }> };
  try {
    const { id } = await params;
    const authorId = parseIntParam(id);

    if (authorId <= 0) {
      throw new ValidationError('Invalid author ID');
    }

    const body: Partial<CreateAuthorData> = await request.json();
    const { fullName, bio, birthDate, nationality, isDeleted } = body;

    const updateData: Prisma.AuthorUncheckedUpdateInput = {};
    if (fullName !== undefined) updateData.fullName = sanitizeString(fullName);
    if (bio !== undefined) updateData.bio = bio ? sanitizeString(bio) : null;
    if (birthDate !== undefined) updateData.birthDate = birthDate ? new Date(birthDate) : null;
    if (nationality !== undefined)
      updateData.nationality = nationality ? sanitizeString(nationality) : null;
    if (isDeleted !== undefined) updateData.isDeleted = Boolean(isDeleted);

    // Ensure author exists
    const existing = await prisma.author.findFirst({
      where: { id: authorId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundError('Author not found');
    }

    const updated: Author = await prisma.author.update({
      where: { id: authorId },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        bio: true,
        birthDate: true,
        nationality: true,
        createdAt: true,
        updatedAt: true,
        isDeleted: true,
      },
    });

    return successResponse<Author>(updated, 'Author updated successfully');
  } catch (error) {
    return handleRouteError(error, 'PUT /api/authors/[id]');
  }
});

// DELETE /api/authors/[id] - Delete author (soft delete)
export const DELETE = requireLibrarian(async (request, context) => {
  const { params } = context as { params: Promise<{ id: string }> };
  try {
    const { id } = await params;
    const authorId = parseIntParam(id);

    if (authorId <= 0) {
      throw new ValidationError('Invalid author ID');
    }

    const existing = await prisma.author.findFirst({
      where: { id: authorId, isDeleted: false },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundError('Author not found');
    }

    await prisma.author.update({
      where: { id: authorId },
      data: { isDeleted: true },
    });

    return successResponse(null, 'Author deleted successfully');
  } catch (error) {
    return handleRouteError(error, 'DELETE /api/authors/[id]');
  }
});
