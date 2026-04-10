import { NextRequest } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { successResponse, handleRouteError } from '@/lib/utils';
import { UnauthorizedError } from '@/lib/errors';

// POST /api/auth/refresh - Refresh access token
export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie
    const refreshToken = request.cookies.get('refreshToken')?.value;

    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token not found');
    }

    // Refresh access token
    const result = await AuthService.refreshAccessToken(refreshToken);

    return successResponse(result, 'Token refreshed successfully');
  } catch (error) {
    // Clear invalid refresh token cookie for any error
    const response = handleRouteError(error, 'POST /api/auth/refresh');

    response.cookies.set('refreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });

    return response;
  }
}
