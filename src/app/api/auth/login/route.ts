import { ValidationError } from '@/lib/errors';
import { handleRouteError, successResponse } from '@/lib/utils';
import { AuthService } from '@/services/auth.service';
import { LoginRequest } from '@/types/auth';
import { NextRequest } from 'next/server';

// POST /api/auth/login - Login user
export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();

    // Validate required fields
    if (!body.email || !body.password) {
      throw new ValidationError('Email and password are required');
    }

    // Login user
    const result = await AuthService.login(body);

    // Set refresh token as httpOnly cookie
    const response = successResponse(
      {
        userId: result.userId,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        isFirstLogin: result.isFirstLogin,
      },
      'Login successful'
    );

    return response;
  } catch (error) {
    return handleRouteError(error, 'POST /api/auth/login');
  }
}
