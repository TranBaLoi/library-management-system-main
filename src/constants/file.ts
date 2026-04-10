import { MimeTypeMap } from '@/types/file';

/**
 * File-related constants for the application
 */

// Default upload directory
export const DEFAULT_UPLOAD_DIR = 'uploads';

// Default maximum file size (10MB)
export const DEFAULT_MAX_SIZE = 10 * 1024 * 1024;

// Maximum file size for ebooks and audiobooks (100MB)
export const MAX_EBOOK_SIZE = 100 * 1024 * 1024;

// Default allowed file extensions
export const DEFAULT_ALLOWED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.pdf',
  '.doc',
  '.docx',
  '.txt',
  '.epub',
  '.mobi',
  '.mp3',
  '.m4b',
  '.m4a',
];

// Default allowed paths for serving files
export const DEFAULT_ALLOWED_SERVE_PATHS = [
  'uploads',
  'uploads/avatars',
  'uploads/ebooks',
  'uploads/audiobooks',
];

// Default cache control header
export const DEFAULT_CACHE_CONTROL = 'public, max-age=3600';

// MIME type mapping for common file extensions
export const MIME_TYPES: MimeTypeMap = {
  // Images
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',

  // Documents
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  // Text files
  '.txt': 'text/plain',
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.csv': 'text/csv',

  // Archives
  '.zip': 'application/zip',
  '.rar': 'application/vnd.rar',
  '.7z': 'application/x-7z-compressed',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',

  // Audio
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.m4b': 'audio/mp4',

  // Ebooks
  '.epub': 'application/epub+zip',
  '.mobi': 'application/x-mobipocket-ebook',
  '.azw': 'application/vnd.amazon.ebook',
  '.azw3': 'application/vnd.amazon.ebook',

  // Video
  '.mp4': 'video/mp4',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.wmv': 'video/x-ms-wmv',
  '.flv': 'video/x-flv',
  '.webm': 'video/webm',
};
