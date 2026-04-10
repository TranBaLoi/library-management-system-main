export interface BookEdition {
  id: number;
  bookId: number;
  format: EditionFormat;
  isbn13: string | null;
  fileFormat: FileFormat | null;
  fileSizeBytes: string | null; // Serialized as string from BigInt
  checksumSha256: string | null;
  storageUrl: string | null;
  drmType: DRMType | null;
  status: string | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export type EditionFormat = 'EBOOK' | 'AUDIO';
export type FileFormat = 'EPUB' | 'PDF' | 'MOBI' | 'AUDIO_MP3' | 'AUDIO_M4B' | 'OTHER';
export type DRMType = 'NONE' | 'WATERMARK' | 'ADOBE_DRM' | 'LCP' | 'CUSTOM';

export interface CreateBookEditionData {
  format: EditionFormat;
  isbn13?: string;
  fileFormat?: FileFormat;
  drmType?: DRMType;
  status?: string;
  file?: File;
}

export interface UpdateBookEditionData {
  format?: EditionFormat;
  isbn13?: string;
  fileFormat?: FileFormat;
  drmType?: DRMType;
  status?: string;
  file?: File;
  isDeleted?: boolean;
}

export interface BookEditionWithBook extends BookEdition {
  book: {
    id: number;
    title: string;
  };
}

export interface BookEditionsListPayload {
  editions: BookEditionWithBook[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BulkDeleteBookEditionData {
  ids: number[];
}

export interface BulkDeleteBookEditionResponse {
  deletedCount: number;
  deletedIds: number[];
  filesDeleted: number;
}

export interface AiSummarizeParams {
  file: File;
  language?: 'vi' | 'en';
  maxLength?: number;
}

export interface AiSummarizeResponse {
  summary: string;
  keywords: string[];
  pdfInfo: {
    pageCount: number;
    title: string | null;
    author: string | null;
  };
}
