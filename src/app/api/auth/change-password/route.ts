import { AuthService } from '@/services/auth.service';
import { ChangePasswordRequest } from '@/types/auth';
import { requireAuth } from '@/middleware/auth.middleware';
import { successResponse, handleRouteError } from '@/lib/utils';
import { ValidationError } from '@/lib/errors';

// POST /api/auth/change-password - Change user password
export const POST = requireAuth(async request => {
  try {
    const body: ChangePasswordRequest = await request.json();
    const userId = request.user.id;

    // Validate required fields
    const requiredFields = ['currentPassword', 'newPassword', 'confirmNewPassword'];
    const missingFields = requiredFields.filter(
      field => !body[field as keyof ChangePasswordRequest]
    );

    if (missingFields.length > 0) {
      throw new ValidationError(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Change password
    await AuthService.changePassword(userId, body);

    return successResponse(null, 'Password changed successfully');
  } catch (error) {
    return handleRouteError(error, 'POST /api/auth/change-password');
  }
});
