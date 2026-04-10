import { ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { FileUtils } from '@/lib/server-utils';
import { handleRouteError, successResponse, validateRequiredFields } from '@/lib/utils';
import { requireAdmin } from '@/middleware/auth.middleware';
import { BulkDeleteBookEditionData, BulkDeleteBookEditionResponse } from '@/types';
import { NextRequest } from 'next/server';

// DELETE /api/book-editions/bulk-delete - Bulk soft delete book editions
export const DELETE = requireAdmin(async (request: NextRequest) => {
  try {
    const body: BulkDeleteBookEditionData = await request.json();
    const { ids } = body;

    // Validate required fields
    const validationError = validateRequiredFields(body as unknown as Record<string, unknown>, [
      'ids',
    ]);
    if (validationError) {
      throw new ValidationError(validationError);
    }

    // Validate that ids is an array and not empty
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new ValidationError('ids must be a non-empty array');
    }

    // Validate that all ids are positive integers
    const validIds = ids.filter(id => Number.isInteger(id) && id > 0);
    if (validIds.length === 0) {
      throw new ValidationError('No valid book edition IDs provided');
    }

    if (validIds.length !== ids.length) {
      throw new ValidationError('All IDs must be positive integers');
    }

    // Find existing book editions that are not already deleted
    const existingEditions = await prisma.bookEdition.findMany({
      where: {
        id: { in: validIds },
      },
      select: {
        id: true,
        storageUrl: true,
      },
    });

    const existingIds = existingEditions.map(edition => edition.id);

    if (existingIds.length === 0) {
      return successResponse<BulkDeleteBookEditionResponse>(
        {
          deletedCount: 0,
          deletedIds: [],
          filesDeleted: 0,
        },
        'No book editions found to delete'
      );
    }

    // Delete associated files from server storage
    let filesDeletedCount = 0;
    for (const edition of existingEditions) {
      if (edition.storageUrl) {
        try {
          const filePath = edition.storageUrl.replace('/api/files/', '');
          const deleteResult = await FileUtils.deleteFileFromSystem(filePath, {
            force: true,
            checkExists: true,
          });

          if (deleteResult.success) {
            filesDeletedCount++;
          }
        } catch (error) {
          // Log error but continue with deletion
          console.error(
            `Failed to delete file for edition ${edition.id}:`,
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
      }
    }

    // Perform soft delete (bulk update)
    await prisma.bookEdition.updateMany({
      where: {
        id: { in: existingIds },
      },
      data: {
        isDeleted: true,
      },
    });

    return successResponse<BulkDeleteBookEditionResponse>(
      {
        deletedCount: existingIds.length,
        deletedIds: existingIds,
        filesDeleted: filesDeletedCount,
      },
      `Successfully deleted ${existingIds.length} book edition(s) and ${filesDeletedCount} file(s)`
    );
  } catch (error) {
    return handleRouteError(error, 'DELETE /api/book-editions/bulk-delete');
  }
});
