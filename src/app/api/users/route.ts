import { ForbiddenError, ValidationError } from '@/lib/errors';
import {
  handleRouteError,
  isValidEmail,
  parsePaginationParams,
  sanitizeString,
  successResponse,
  validateRequiredFields,
} from '@/lib/utils';
import { AuthenticatedRequest, requireLibrarian } from '@/middleware/auth.middleware';
import { UserService } from '@/services/user.service';
import { Role, UserStatus } from '@prisma/client';

// GET /api/users - Get list of users (Admin & Librarian only)
export const GET = requireLibrarian(async (request: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, search } = parsePaginationParams(searchParams);
    let role = searchParams.get('role') as Role | null;
    const status = searchParams.get('status') as UserStatus | null;
    const sortBy = searchParams.get('sortBy');
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null;

    // Permission check: Librarian can only view READER users
    if (request.user.role === Role.LIBRARIAN) {
      // Force role filter to READER for Librarians
      role = Role.READER;
    }

    const result = await UserService.getUsers({
      page,
      limit,
      search,
      role: role || undefined,
      status: status || undefined,
      sortBy: sortBy || undefined,
      sortOrder: sortOrder || undefined,
    });

    return successResponse(result);
  } catch (error) {
    return handleRouteError(error, 'GET /api/users');
  }
});

// POST /api/users - Create new user (Admin & Librarian only)
export const POST = requireLibrarian(async (request: AuthenticatedRequest) => {
  try {
    const body = await request.json();
    const { fullName, email, password, phoneNumber, address, role } = body;

    // Validate required fields
    const validationError = validateRequiredFields(body, ['fullName', 'email', 'password']);
    if (validationError) {
      throw new ValidationError(validationError);
    }

    // Validate email format
    if (!isValidEmail(email)) {
      throw new ValidationError('Invalid email format');
    }

    // Permission check: Librarian can only create READER role
    const requestedRole = role || Role.READER;
    if (request.user.role === Role.LIBRARIAN && requestedRole !== Role.READER) {
      throw new ForbiddenError('Librarians can only create users with READER role');
    }

    const user = await UserService.createUser({
      fullName: sanitizeString(fullName),
      email: email.toLowerCase().trim(),
      password, // Note: Hash this in production
      phoneNumber: phoneNumber ? sanitizeString(phoneNumber) : undefined,
      address: address ? sanitizeString(address) : undefined,
      role: requestedRole,
    });

    return successResponse(user, 'User created successfully', 201);
  } catch (error) {
    return handleRouteError(error, 'POST /api/users');
  }
});
