import { ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { handleRouteError, successResponse } from '@/lib/utils';
import { requireAuth } from '@/middleware/auth.middleware';
import { GorseService } from '@/services/gorse.service';
import { Role } from '@prisma/client';

/**
 * PUT /api/auth/interests
 * Update user interests (for first login)
 * Also syncs interests to Gorse as user labels for better recommendations
 */
export const PUT = requireAuth(async request => {
  try {
    const userId = request.user.id;
    const body = await request.json();

    // Validate that interests is an array
    if (!Array.isArray(body.interests)) {
      throw new ValidationError('Interests must be an array');
    }

    // Validate that user is READER role
    if (request.user.role !== Role.READER) {
      throw new ValidationError('Only READER users can update interests');
    }

    // Validate interests array (should be category names from database)
    if (body.interests.length === 0) {
      throw new ValidationError('Please select at least one interest');
    }

    // Normalize interests (trim only, keep original case to match category names)
    const normalizedInterests = body.interests
      .filter((i: unknown) => typeof i === 'string' && i.trim())
      .map((i: string) => i.trim());

    // Convert interests array to JSON string
    const interestsJson = JSON.stringify(normalizedInterests);

    // Update user interests in database
    await prisma.user.update({
      where: { id: userId },
      data: { interest: interestsJson },
    });

    // Sync interests to Gorse as user labels (non-blocking)
    try {
      const gorseUserId = GorseService.toGorseUserId(userId);
      await GorseService.updateUser(gorseUserId, {
        Labels: normalizedInterests,
      });
      console.log(`Synced ${normalizedInterests.length} interests to Gorse for user ${userId}`);
    } catch (error) {
      // Log error but don't fail the request if Gorse is unavailable
      console.error('Failed to sync interests to Gorse:', error);
    }

    return successResponse(null, 'Interests updated successfully');
  } catch (error) {
    return handleRouteError(error, 'PUT /api/auth/interests');
  }
});
