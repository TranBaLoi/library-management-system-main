import { NextRequest } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { RegisterRequest } from '@/types/auth';
import { successResponse, handleRouteError } from '@/lib/utils';
import { ValidationError } from '@/lib/errors';

// POST /api/auth/register - Register new user
export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json();

    // Validate required fields
    const requiredFields = ['fullName', 'email', 'password', 'confirmPassword'];
    const missingFields = requiredFields.filter(field => !body[field as keyof RegisterRequest]);

    if (missingFields.length > 0) {
      throw new ValidationError(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Register user
    const result = await AuthService.register(body);

    return successResponse(result, 'Account created successfully', 201);
  } catch (error) {
    return handleRouteError(error, 'POST /api/auth/register');
  }
}
