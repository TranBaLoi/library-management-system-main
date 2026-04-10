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
import { Author, AuthorsListPayload, CreateAuthorData } from '@/types/author';
import { Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';

// GET /api/authors - Get authors
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, search } = parsePaginationParams(searchParams);

    // Optional filters
    const sortBy = searchParams.get('sortBy');
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null;
    const isDeletedParam = searchParams.get('isDeleted');

    const where: Prisma.AuthorWhereInput = {
      ...(isDeletedParam !== null ? { isDeleted: isDeletedParam === 'true' } : {}),
    };

    if (search) {
      where.OR = [{ fullName: { contains: search } }, { nationality: { contains: search } }];
    }

    const skip = (page - 1) * limit;

    // Build orderBy clause
    let orderBy: Prisma.AuthorOrderByWithRelationInput = { createdAt: 'desc' };

    if (sortBy && sortOrder) {
      // Map frontend sort keys to database fields
      const sortFieldMap: Record<string, string> = {
        id: 'id',
        fullName: 'fullName',
        nationality: 'nationality',
        birthDate: 'birthDate',
        createdAt: 'createdAt',
      };

      const dbField = sortFieldMap[sortBy];
      if (dbField) {
        orderBy = { [dbField]: sortOrder };
      }
    }

    const [authors, total] = await Promise.all([
      prisma.author.findMany({
        where,
        skip,
        take: limit,
        orderBy,
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
      }),
      prisma.author.count({ where }),
    ]);

    return successResponse<AuthorsListPayload>({
      authors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleRouteError(error, 'GET /api/authors');
  }
}

// POST /api/authors - Create author
export const POST = requireLibrarian(async request => {
  try {
    const body: CreateAuthorData = await request.json();
    const { fullName, bio, birthDate, nationality, isDeleted } = body;

    // Validate required fields
    const validationError = validateRequiredFields(body as unknown as Record<string, unknown>, [
      'fullName',
    ]);
    if (validationError) {
      throw new ValidationError(validationError);
    }

    // Prepare data
    const data: Prisma.AuthorUncheckedCreateInput = {
      fullName: sanitizeString(fullName),
      bio: bio ? sanitizeString(bio) : null,
      birthDate: birthDate ? new Date(birthDate) : null,
      nationality: nationality ? sanitizeString(nationality) : null,
      isDeleted: Boolean(isDeleted),
    };

    const created: Author = await prisma.author.create({
      data,
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
    });

    return successResponse<Author>(created, 'Author created successfully', 201);
  } catch (error) {
    return handleRouteError(error, 'POST /api/authors');
  }
});
