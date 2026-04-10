import { MAX_EBOOK_SIZE } from '@/constants';
import { ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { FileUtils } from '@/lib/server-utils';
import {
  handleRouteError,
  parseIntParam,
  parsePaginationParams,
  sanitizeString,
  successResponse,
} from '@/lib/utils';
import { requireLibrarian } from '@/middleware/auth.middleware';
import { DRMType, EditionFormat, FileFormat, Prisma } from '@prisma/client';
import crypto from 'crypto';
import { NextRequest } from 'next/server';
import path from 'path';

// GET /api/book-editions - Get book editions with optional filters (no bookId required)
export const GET = requireLibrarian(async (request: NextRequest) => {
  try {
    // Parse pagination params
    const { searchParams } = new URL(request.url);
    const { page, limit, search } = parsePaginationParams(searchParams);

    // Optional sorting
    const sortBy = searchParams.get('sortBy');
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null;

    // Optional filters
    const bookIdsParam = searchParams.getAll('bookIds'); // Support multiple book IDs
    const formatFilter = searchParams.get('format'); // EBOOK or AUDIO
    const fileFormatFilter = searchParams.get('fileFormat'); // EPUB, PDF, etc.
    const drmTypeFilter = searchParams.get('drmType'); // NONE, WATERMARK, etc.
    const statusFilter = searchParams.get('status'); // ACTIVE, etc.

    // Parse bookIds filter (array of book IDs)
    const bookIds =
      bookIdsParam.length > 0
        ? bookIdsParam.map(id => parseIntParam(id, 0)).filter(id => id > 0)
        : [];

    // Build where clause
    const where: Prisma.BookEditionWhereInput = {
      isDeleted: false,
    };

    // Add bookIds filter if provided
    if (bookIds.length > 0) {
      where.bookId = { in: bookIds };
    }

    // Add format filter
    if (formatFilter) {
      const upperFormat = formatFilter.toUpperCase() as EditionFormat;
      if (Object.values(EditionFormat).includes(upperFormat)) {
        where.format = upperFormat;
      }
    }

    // Add file format filter
    if (fileFormatFilter) {
      const upperFileFormat = fileFormatFilter.toUpperCase() as FileFormat;
      if (Object.values(FileFormat).includes(upperFileFormat)) {
        where.fileFormat = upperFileFormat;
      }
    }

    // Add DRM type filter
    if (drmTypeFilter) {
      const upperDrmType = drmTypeFilter.toUpperCase() as DRMType;
      if (Object.values(DRMType).includes(upperDrmType)) {
        where.drmType = upperDrmType;
      }
    }

    // Add status filter
    if (statusFilter) {
      where.status = { contains: statusFilter };
    }

    // Add search filter if provided (search in isbn13 and status)
    if (search) {
      const searchConditions: Prisma.BookEditionWhereInput[] = [];

      // Search in isbn13
      searchConditions.push({ isbn13: { contains: search } });

      // Search in status
      searchConditions.push({ status: { contains: search } });

      // If search is a number, also search by id
      const searchAsNumber = parseInt(search, 10);
      if (!isNaN(searchAsNumber)) {
        searchConditions.push({ id: searchAsNumber });
      }

      where.OR = searchConditions;
    }

    const skip = (page - 1) * limit;

    // Build orderBy clause
    let orderBy: Prisma.BookEditionOrderByWithRelationInput = { createdAt: 'desc' };

    if (sortBy && sortOrder) {
      const sortFieldMap: Record<string, string> = {
        id: 'id',
        bookId: 'bookId',
        format: 'format',
        isbn13: 'isbn13',
        fileFormat: 'fileFormat',
        fileSizeBytes: 'fileSizeBytes',
        drmType: 'drmType',
        status: 'status',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      };

      const dbField = sortFieldMap[sortBy];
      if (dbField) {
        orderBy = { [dbField]: sortOrder };
      }
    }

    // Fetch book editions with pagination
    const [bookEditions, total] = await Promise.all([
      prisma.bookEdition.findMany({
        where,
        skip,
        take: limit,
        orderBy,
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
          book: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
      prisma.bookEdition.count({ where }),
    ]);

    // Convert BigInt to string for JSON serialization
    const serializedEditions = bookEditions.map(edition => ({
      ...edition,
      fileSizeBytes: edition.fileSizeBytes ? edition.fileSizeBytes.toString() : null,
    }));

    return successResponse({
      editions: serializedEditions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleRouteError(error, 'GET /api/book-editions');
  }
});

// POST /api/book-editions - Create book edition (bookId in body, not URL)
export const POST = requireLibrarian(async (request: NextRequest) => {
  try {
    // Check content type
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('multipart/form-data')) {
      throw new ValidationError('Content-Type must be multipart/form-data');
    }

    const formData = await request.formData();

    // Extract bookId from form data (not URL)
    const bookIdStr = formData.get('bookId')?.toString();
    if (!bookIdStr) {
      throw new ValidationError('Book ID is required');
    }

    const bookId = parseIntParam(bookIdStr);
    if (bookId <= 0) {
      throw new ValidationError('Invalid book ID');
    }

    // Check if book exists
    const book = await prisma.book.findFirst({
      where: { id: bookId, isDeleted: false },
      select: { id: true },
    });

    if (!book) {
      throw new ValidationError('Book not found');
    }

    // Extract other form fields
    const format = formData.get('format')?.toString();
    const isbn13 = formData.get('isbn13')?.toString() || undefined;
    const fileFormat = formData.get('fileFormat')?.toString();
    const drmType = formData.get('drmType')?.toString();
    const status = formData.get('status')?.toString() || 'ACTIVE';
    const file = formData.get('file') as File | null;

    // Validate required fields
    if (!format) {
      throw new ValidationError('Format is required');
    }

    if (!fileFormat) {
      throw new ValidationError('File format is required');
    }

    if (!drmType) {
      throw new ValidationError('DRM type is required');
    }

    if (!file || file.size === 0) {
      throw new ValidationError('File is required');
    }

    // Validate format enum
    const validFormats = Object.values(EditionFormat);
    if (!validFormats.includes(format as EditionFormat)) {
      throw new ValidationError(`Invalid format. Must be one of: ${validFormats.join(', ')}`);
    }

    // Validate file format enum
    const validFileFormats = Object.values(FileFormat);
    if (!validFileFormats.includes(fileFormat as FileFormat)) {
      throw new ValidationError(
        `Invalid file format. Must be one of: ${validFileFormats.join(', ')}`
      );
    }

    // Validate DRM type enum
    const validDrmTypes = Object.values(DRMType);
    if (!validDrmTypes.includes(drmType as DRMType)) {
      throw new ValidationError(`Invalid DRM type. Must be one of: ${validDrmTypes.join(', ')}`);
    }

    // Determine allowed extensions based on format
    let allowedExtensions: string[] = [];
    if (format === 'EBOOK') {
      allowedExtensions = ['.epub', '.pdf', '.mobi'];
    } else if (format === 'AUDIO') {
      allowedExtensions = ['.mp3', '.m4a', '.m4b'];
    }

    // Validate file extension
    const fileExtension = path.extname(file.name).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      throw new ValidationError(
        `Invalid file type for ${format}. Allowed types: ${allowedExtensions.join(', ')}`
      );
    }

    // Validate file size (max 100MB for ebooks/audio)
    if (file.size > MAX_EBOOK_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      const maxMB = (MAX_EBOOK_SIZE / (1024 * 1024)).toFixed(0);
      throw new ValidationError(`File is too large (${sizeMB}MB). Maximum size: ${maxMB}MB`);
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
    const sanitizedFileName = `book-${bookId}-edition-${sanitizedOriginalName}-${timestamp}${fileExtension}`;

    // Determine directory based on format
    const directory = format === 'EBOOK' ? 'uploads/ebooks' : 'uploads/audiobooks';

    // Write file to system
    const uploadResult = await FileUtils.writeFileToSystem(buffer, sanitizedFileName, {
      directory,
      overwrite: true,
      createDirectory: true,
    });

    if (!uploadResult.success) {
      throw new Error(`Failed to upload file: ${uploadResult.message}`);
    }

    // Prepare edition data with file metadata
    const editionData: Prisma.BookEditionUncheckedCreateInput = {
      bookId: bookId,
      format: format as 'EBOOK' | 'AUDIO',
      isbn13: isbn13 ? sanitizeString(isbn13) : null,
      fileFormat: fileFormat as 'EPUB' | 'PDF' | 'MOBI' | 'AUDIO_MP3' | 'AUDIO_M4B' | 'OTHER',
      drmType: drmType as 'NONE' | 'WATERMARK' | 'ADOBE_DRM' | 'LCP' | 'CUSTOM',
      status: status,
      fileSizeBytes: BigInt(file.size),
      checksumSha256: checksum,
      storageUrl: `/api/files/${directory}/${sanitizedFileName}`,
      isDeleted: false,
    };

    // Create the book edition
    const created = await prisma.bookEdition.create({
      data: editionData,
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
      ...created,
      fileSizeBytes: created.fileSizeBytes ? created.fileSizeBytes.toString() : null,
    };

    return successResponse(response, 'Book edition created successfully', 201);
  } catch (error) {
    return handleRouteError(error, 'POST /api/book-editions');
  }
});
