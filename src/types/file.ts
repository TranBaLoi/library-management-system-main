export interface FileValidationOptions {
  allowedExtensions?: string[];
  maxSizeInBytes?: number;
  minSizeInBytes?: number;
}

export interface FileOperationResult {
  success: boolean;
  message: string;
  data?: unknown;
}

export interface FileInfo {
  name: string;
  size: number;
  extension: string;
  path: string;
}

export interface FileServeOptions {
  inline?: boolean; // true for inline display, false for download
  filename?: string; // custom filename for download
  cacheControl?: string; // cache control header
  allowedPaths?: string[]; // allowed base paths for security
}

export interface MimeTypeMap {
  [key: string]: string;
}

export interface FileServeData {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  size: number;
  inline: boolean;
  cacheControl: string;
  lastModified: Date;
  extension: string;
}

export interface FileMetadata {
  name: string;
  size: number;
  extension: string;
  sizeInMB: string;
  createdAt: Date;
  modifiedAt: Date;
  isFile: boolean;
}
