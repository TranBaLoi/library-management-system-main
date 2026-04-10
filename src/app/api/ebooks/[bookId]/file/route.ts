import { prisma } from '@/lib/prisma';
import { FileUtils } from '@/lib/server-utils';
import { parseIntParam, verifySignedUrlToken } from '@/lib/utils';
import { UserService } from '@/services/user.service';
import { FileServeData } from '@/types/file';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

// GET /api/ebooks/[bookId]/file - Stream PDF file with authentication
// Note: This route doesn't use requireReader because iframe requests don't send Authorization headers
export async function GET(request: NextRequest, context?: unknown) {
  try {
    const { params } = context as { params: Promise<{ bookId: string }> };
    const { bookId: bookIdParam } = await params;
    const bookId = parseIntParam(bookIdParam);

    if (bookId <= 0) {
      return NextResponse.json({ error: 'Invalid book ID' }, { status: 400 });
    }

    // Get token from query params
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Verify token
    const tokenData = verifySignedUrlToken(token);
    if (!tokenData.valid) {
      return NextResponse.json(
        { error: tokenData.error || 'Invalid or expired token' },
        { status: 403 }
      );
    }

    // Get user from token
    if (!tokenData.userId) {
      return NextResponse.json({ error: 'Invalid token: missing user ID' }, { status: 403 });
    }

    const user = await UserService.getUserById(tokenData.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify token matches request
    if (tokenData.bookId !== bookId) {
      return NextResponse.json({ error: 'Token does not match request' }, { status: 403 });
    }

    // Double-check user has permission to access this ebook
    const borrowRecord = await prisma.borrowRecord.findFirst({
      where: {
        userId: tokenData.userId,
        status: 'BORROWED',
        isDeleted: false,
        returnDate: { gte: new Date() }, // Not expired
        borrowEbooks: {
          some: {
            bookId: bookId,
            isDeleted: false,
          },
        },
      },
      include: {
        borrowEbooks: {
          where: {
            bookId: bookId,
            isDeleted: false,
          },
        },
      },
    });

    if (!borrowRecord) {
      return NextResponse.json(
        { error: 'You do not have permission to access this ebook' },
        { status: 403 }
      );
    }

    // Verify that the correct BorrowEbook was found
    if (borrowRecord.borrowEbooks.length === 0) {
      return NextResponse.json(
        { error: 'You do not have permission to access this ebook' },
        { status: 403 }
      );
    }

    // Get storage URL from token
    const storageUrl = tokenData.storageUrl;
    if (!storageUrl) {
      return NextResponse.json({ error: 'Storage URL not found' }, { status: 404 });
    }

    // Prepare file for serving
    let filePath = storageUrl;

    // Remove leading /api/files/ if present
    if (filePath.startsWith('/api/files/')) {
      filePath = filePath.replace(/^\/api\/files\//, '');
    }

    // Remove leading slash if present (to make it relative)
    filePath = filePath.replace(/^\/+/, '');

    // Normalize path separators (handle both / and \)
    filePath = path.normalize(filePath).replace(/\\/g, '/');

    const result = await FileUtils.prepareFileForServing(filePath, {
      inline: true, // Display PDF inline
      cacheControl: 'no-cache, no-store, must-revalidate', // Don't cache
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message || 'File not found' }, { status: 404 });
    }

    const fileData = result.data as FileServeData;

    // Create response with file content
    const response = new NextResponse(new Uint8Array(fileData.buffer));

    // Set headers
    response.headers.set('Content-Type', 'application/pdf');
    response.headers.set('Content-Length', fileData.size.toString());
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Content-Disposition', `inline; filename="${fileData.fileName}"`);

    return response;
  } catch (error) {
    console.error('[EbookFile] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
