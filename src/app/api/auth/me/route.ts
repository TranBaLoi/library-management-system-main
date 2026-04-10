import { ValidationError } from '@/lib/errors';
import { FileUtils } from '@/lib/server-utils';
import { handleRouteError, successResponse } from '@/lib/utils';
import { requireAuth } from '@/middleware/auth.middleware';
import { UserService } from '@/services/user.service';
import path from 'path';

// GET /api/auth/me - Get current user profile
export const GET = requireAuth(async request => {
  // User is already authenticated and attached to request by middleware
  const user = request.user;

  return successResponse(user, 'User profile retrieved successfully');
});

// PUT /api/auth/me - Update current user profile
export const PUT = requireAuth(async request => {
  try {
    const userId = request.user.id;
    const contentType = request.headers.get('content-type');

    // Check if the request is FormData
    if (!contentType?.includes('multipart/form-data')) {
      throw new ValidationError('Content-Type must be multipart/form-data');
    }

    const formData = await request.formData();

    // Extract form fields
    const fullName = formData.get('fullName')?.toString();
    const phoneNumber = formData.get('phoneNumber')?.toString() || undefined;
    const address = formData.get('address')?.toString() || undefined;
    const avatar = formData.get('avatar') as File | null;
    const removeAvatar = formData.get('removeAvatar') === 'true';

    // Validate required fields
    if (!fullName) {
      throw new ValidationError('Full name is required');
    }

    // Prepare update data (email is not editable)
    const updateData: {
      fullName: string;
      phoneNumber: string | null;
      address: string | null;
      avatarUrl?: string | null;
    } = {
      fullName,
      phoneNumber: phoneNumber || null,
      address: address || null,
    };

    // Handle avatar removal
    if (removeAvatar) {
      // Delete old avatar if exists
      if (request.user.avatarUrl) {
        const oldAvatarPath = request.user.avatarUrl.replace('/api/files/', '');
        await FileUtils.deleteFileFromSystem(oldAvatarPath, {
          force: true,
          checkExists: true,
        });
      }
      // Set avatarUrl to null to remove from database
      updateData.avatarUrl = null;
    }
    // Handle avatar upload (optional)
    else if (avatar && avatar.size > 0) {
      // Validate file is an image
      const allowedImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const fileExtension = path.extname(avatar.name).toLowerCase();

      if (!allowedImageExtensions.includes(fileExtension)) {
        throw new ValidationError(
          `Invalid file type. Allowed types: ${allowedImageExtensions.join(', ')}`
        );
      }

      // Check file size (max 5MB for avatars)
      const maxAvatarSize = 5 * 1024 * 1024; // 5MB
      if (avatar.size > maxAvatarSize) {
        const sizeInMB = (avatar.size / (1024 * 1024)).toFixed(2);
        const maxSizeInMB = (maxAvatarSize / (1024 * 1024)).toFixed(2);
        throw new ValidationError(
          `File ${avatar.name} is too large. Size: ${sizeInMB}MB, Max allowed: ${maxSizeInMB}MB`
        );
      }

      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedFileName = `avatar-${userId}-${timestamp}${fileExtension}`;

      // Convert File to Buffer
      const arrayBuffer = await avatar.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Write file to uploads/avatars directory
      const uploadResult = await FileUtils.writeFileToSystem(buffer, sanitizedFileName, {
        directory: 'uploads/avatars',
        overwrite: true,
        createDirectory: true,
      });

      if (!uploadResult.success) {
        throw new Error(`Failed to upload avatar: ${uploadResult.message}`);
      }

      // Delete old avatar if exists
      if (request.user.avatarUrl) {
        const oldAvatarPath = request.user.avatarUrl.replace('/api/files/', '');
        await FileUtils.deleteFileFromSystem(oldAvatarPath, {
          force: true,
          checkExists: true,
        });
      }

      // Set avatar URL (path to serve via /api/files)
      updateData.avatarUrl = `/api/files/uploads/avatars/${sanitizedFileName}`;
    }

    // Update user in database
    const updatedUser = await UserService.updateUser(userId, updateData);

    return successResponse(updatedUser, 'Profile updated successfully');
  } catch (error) {
    return handleRouteError(error, 'PUT /api/auth/me');
  }
});
