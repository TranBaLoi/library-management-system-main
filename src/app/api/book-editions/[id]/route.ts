import { MAX_EBOOK_SIZE } from '@/constants';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { FileUtils } from '@/lib/server-utils';
import { handleRouteError, parseIntParam, sanitizeString, successResponse } from '@/lib/utils';
import { requireAdmin } from '@/middleware/auth.middleware';
import { DRMType, EditionFormat, FileFormat, Prisma } from '@prisma/client';
import crypto from 'crypto';
import { NextRequest } from 'next/server';
import path from 'path';

// GET /api/book-editions/[id] - Get book edition by ID
export const GET = requireAdmin(async (request: NextRequest, context?: unknown) => {
  const { params } = context as { params: Promise<{ id: string }> };
  try {
    const { id } = await params;
    const editionId = parseIntParam(id);

    if (editionId <= 0) {
      throw new ValidationError('Invalid edition ID');
    }

    const edition = await prisma.bookEdition.findFirst({
      where: { id: editionId, isDeleted: false },
      select: {
        id: true,
        bookId: true,
        format: true,
        isbn13: true,
        fileFormat: true,
        fileSizeBytes: true,
        checksumSha256: true,
        storageUrl: true,
        drmType: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        isDeleted: true,
      },
    });

    if (!edition) {
      throw new NotFoundError('Book edition not found');
    }

    // Convert BigInt to string for JSON serialization
    const response = {
      ...edition,
      fileSizeBytes: edition.fileSizeBytes ? edition.fileSizeBytes.toString() : null,
    };

    return successResponse(response);
  } catch (error) {
    return handleRouteError(error, 'GET /api/book-editions/[id]');
  }
});

// PATCH /api/book-editions/[id] - Update book edition
export const PATCH = requireAdmin(async (request: NextRequest, context?: unknown) => {
  const { params } = context as { params: Promise<{ id: string }> };
  try {
    const { id } = await params;
    const editionId = parseIntParam(id);

    if (editionId <= 0) {
      throw new ValidationError('Invalid edition ID');
    }

    // Check if edition exists
    const existingEdition = await prisma.bookEdition.findFirst({
      where: { id: editionId, isDeleted: false },
      select: {
        id: true,
        bookId: true,
        format: true,
        storageUrl: true,
      },
    });

    if (!existingEdition) {
      throw new NotFoundError('Book edition not found');
    }

    // Check content type
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('multipart/form-data')) {
      throw new ValidationError('Content-Type must be multipart/form-data');
    }

    const formData = await request.formData();

    // Extract form fields
    const format = formData.get('format')?.toString() || undefined;
    const isbn13 = formData.get('isbn13')?.toString() || undefined;
    const fileFormat = formData.get('fileFormat')?.toString() || undefined;
    const drmType = formData.get('drmType')?.toString() || undefined;
    const status = formData.get('status')?.toString() || undefined;
    const removeFile = formData.get('removeFile') === 'true';
    const file = formData.get('file') as File | null;

    // Validate format enum if provided
    if (format) {
      const validFormats = Object.values(EditionFormat);
      if (!validFormats.includes(format as EditionFormat)) {
        throw new ValidationError(`Invalid format. Must be one of: ${validFormats.join(', ')}`);
      }
    }

    // Validate file format enum if provided
    if (fileFormat) {
      const validFileFormats = Object.values(FileFormat);
      if (!validFileFormats.includes(fileFormat as FileFormat)) {
        throw new ValidationError(
          `Invalid file format. Must be one of: ${validFileFormats.join(', ')}`
        );
      }
    }

    // Validate DRM type enum if provided
    if (drmType) {
      const validDrmTypes = Object.values(DRMType);
      if (!validDrmTypes.includes(drmType as DRMType)) {
        throw new ValidationError(`Invalid DRM type. Must be one of: ${validDrmTypes.join(', ')}`);
      }
    }

    // Prepare update data
    const updateData: Prisma.BookEditionUncheckedUpdateInput = {};

    if (format !== undefined) {
      updateData.format = format as 'EBOOK' | 'AUDIO';
    }
    if (isbn13 !== undefined) {
      updateData.isbn13 = isbn13 ? sanitizeString(isbn13) : null;
    }
    if (fileFormat !== undefined) {
      updateData.fileFormat = fileFormat as
        | 'EPUB'
        | 'PDF'
        | 'MOBI'
        | 'AUDIO_MP3'
        | 'AUDIO_M4B'
        | 'OTHER'
        | undefined;
    }
    if (drmType !== undefined) {
      updateData.drmType = drmType as
        | 'NONE'
        | 'WATERMARK'
        | 'ADOBE_DRM'
        | 'LCP'
        | 'CUSTOM'
        | undefined;
    }
    if (status !== undefined) {
      updateData.status = status;
    }

    // Handle file removal
    if (removeFile) {
      // Delete old file if exists
      if (existingEdition.storageUrl) {
        const oldFilePath = existingEdition.storageUrl.replace('/api/files/', '');
        await FileUtils.deleteFileFromSystem(oldFilePath, {
          force: true,
          checkExists: true,
        });
      }

      // Clear file metadata
      updateData.fileSizeBytes = null;
      updateData.checksumSha256 = null;
      updateData.storageUrl = '';
    }
    // Handle file upload (new file or replacement)
    else if (file && file.size > 0) {
      // Get format for validation (use existing format if not updating)
      const targetFormat = (format || existingEdition.format) as 'EBOOK' | 'AUDIO';

      // Determine allowed extensions based on format
      let allowedExtensions: string[] = [];
      if (targetFormat === 'EBOOK') {
        allowedExtensions = ['.epub', '.pdf', '.mobi'];
      } else if (targetFormat === 'AUDIO') {
        allowedExtensions = ['.mp3', '.m4a', '.m4b'];
      }

      // Validate file extension
      const fileExtension = path.extname(file.name).toLowerCase();
      if (!allowedExtensions.includes(fileExtension)) {
        throw new ValidationError(
          `Invalid file type for ${targetFormat}. Allowed types: ${allowedExtensions.join(', ')}`
        );
      }

      // Validate file size (max 100MB for ebooks/audio)
      if (file.size > MAX_EBOOK_SIZE) {
        throw new ValidationError(
          `File size exceeds maximum allowed size of ${MAX_EBOOK_SIZE / (1024 * 1024)}MB`
        );
      }

      // Convert File to Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Calculate SHA-256 checksum
      const hash = crypto.createHash('sha256');
      hash.update(buffer);
      const checksum = hash.digest('hex');

      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedOriginalName = path.basename(file.name, fileExtension);
      const sanitizedFileName = `book-${existingEdition.bookId}-edition-${sanitizedOriginalName}-${timestamp}${fileExtension}`;

      // Determine directory based on format
      const directory = targetFormat === 'EBOOK' ? 'uploads/ebooks' : 'uploads/audiobooks';

      // Write file to system
      const uploadResult = await FileUtils.writeFileToSystem(buffer, sanitizedFileName, {
        directory,
        overwrite: true,
        createDirectory: true,
      });

      if (!uploadResult.success) {
        throw new Error(`Failed to upload file: ${uploadResult.message}`);
      }

      // Delete old file if exists
      if (existingEdition.storageUrl) {
        const oldFilePath = existingEdition.storageUrl.replace('/api/files/', '');
        await FileUtils.deleteFileFromSystem(oldFilePath, {
          force: true,
          checkExists: true,
        });
      }

      // Set file metadata in update data
      updateData.fileSizeBytes = BigInt(file.size);
      updateData.checksumSha256 = checksum;
      updateData.storageUrl = `/api/files/${directory}/${sanitizedFileName}`;
    }

    // Update the book edition
    const updated = await prisma.bookEdition.update({
      where: { id: editionId },
      data: updateData,
      select: {
        id: true,
        bookId: true,
        format: true,
        isbn13: true,
        fileFormat: true,
        fileSizeBytes: true,
        checksumSha256: true,
        storageUrl: true,
        drmType: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        isDeleted: true,
      },
    });

    // Convert BigInt to string for JSON serialization
    const response = {
      ...updated,
      fileSizeBytes: updated.fileSizeBytes ? updated.fileSizeBytes.toString() : null,
    };

    return successResponse(response, 'Book edition updated successfully');
  } catch (error) {
    return handleRouteError(error, 'PATCH /api/book-editions/[id]');
  }
});
