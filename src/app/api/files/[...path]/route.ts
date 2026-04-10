import { DEFAULT_CACHE_CONTROL } from '@/constants/file';
import { FileUtils } from '@/lib/server-utils';
import { errorResponse, handleRouteError } from '@/lib/utils/api-utils';
import { FileMetadata, FileServeData } from '@/types/file';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/files/[...path] - Serve binary files to clients
 *
 * Query parameters:
 * - inline: boolean (default: false) - true for inline display, false for download
 * - filename: string - custom filename for download
 * - cache: string - cache control header (default: DEFAULT_CACHE_CONTROL)
 *
 * Examples:
 * - GET /api/files/uploads/image.jpg - Download image.jpg
 * - GET /api/files/uploads/image.jpg?inline=true - Display image inline
 * - GET /api/files/uploads/document.pdf?filename=custom-name.pdf - Download with custom name
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    const { searchParams } = new URL(request.url);

    // Reconstruct the file path from segments
    const filePath = pathSegments.join('/');

    if (!filePath) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }

    // Parse query parameters
    const inline = searchParams.get('inline') === 'true';
    const customFilename = searchParams.get('filename');
    const cacheControl = searchParams.get('cache') || DEFAULT_CACHE_CONTROL;

    // Prepare file for serving
    const result = await FileUtils.prepareFileForServing(filePath, {
      inline,
      filename: customFilename || undefined,
      cacheControl,
    });

    if (!result.success) {
      const statusCode = result.message.includes('not found')
        ? 404
        : result.message.includes('Access denied')
          ? 403
          : 500;

      return errorResponse(result.message, statusCode);
    }

    const fileData = result.data as FileServeData;

    // Create response with file content
    // Convert Buffer to Uint8Array for NextResponse compatibility
    const response = new NextResponse(new Uint8Array(fileData.buffer));

    // Set headers
    response.headers.set('Content-Type', fileData.mimeType);
    response.headers.set('Content-Length', fileData.size.toString());
    response.headers.set('Cache-Control', fileData.cacheControl);
    response.headers.set('Last-Modified', fileData.lastModified.toUTCString());

    // Set Content-Disposition header
    const disposition = fileData.inline ? 'inline' : 'attachment';
    const encodedFilename = encodeURIComponent(fileData.fileName);
    response.headers.set(
      'Content-Disposition',
      `${disposition}; filename="${fileData.fileName}"; filename*=UTF-8''${encodedFilename}`
    );

    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');

    // For non-inline files, add additional security headers
    if (!fileData.inline) {
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
    }

    return response;
  } catch (error) {
    return handleRouteError(error, 'GET /api/files/[...path]');
  }
}

/**
 * HEAD /api/files/[...path] - Get file metadata without content
 * Useful for checking if a file exists and getting its properties
 */
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    const filePath = pathSegments.join('/');

    if (!filePath) {
      return new NextResponse(null, { status: 400 });
    }

    // Check if file exists and get metadata
    const result = await FileUtils.getFileInfo(filePath);

    if (!result.success) {
      const statusCode = result.message.includes('not found') ? 404 : 500;
      return new NextResponse(null, { status: statusCode });
    }

    const fileData = result.data as FileMetadata;

    // Security check
    if (!FileUtils.isPathAllowed(filePath)) {
      return new NextResponse(null, { status: 403 });
    }

    const mimeType = FileUtils.getMimeType(fileData.name);

    // Create response with headers only
    const response = new NextResponse(null, { status: 200 });
    response.headers.set('Content-Type', mimeType);
    response.headers.set('Content-Length', fileData.size.toString());
    response.headers.set('Last-Modified', fileData.modifiedAt.toUTCString());
    response.headers.set('X-File-Size-MB', fileData.sizeInMB);
    response.headers.set('X-File-Extension', fileData.extension);

    return response;
  } catch (error) {
    return handleRouteError(error, 'HEAD /api/files/[...path]');
  }
}
