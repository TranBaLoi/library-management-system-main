import { promises as fs } from 'fs';
import path from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

// Result of PDF text extraction
export interface PdfExtractResult {
  success: boolean;
  text: string;
  pageCount: number;
  info?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    creator?: string;
    producer?: string;
  };
  error?: string;
}

// Options for PDF text extraction
export interface PdfExtractOptions {
  maxPages?: number;
  maxChars?: number;
}

// PDF utilities class
export class PdfUtils {
  // Extract text content from a PDF file
  static async extractTextFromPdf(
    filePath: string,
    options?: PdfExtractOptions
  ): Promise<PdfExtractResult> {
    try {
      const { maxPages, maxChars } = options || {};

      // Resolve the full path
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

      // Check if file exists
      try {
        await fs.access(fullPath);
      } catch {
        return {
          success: false,
          text: '',
          pageCount: 0,
          error: `File not found: ${filePath}`,
        };
      }

      // Read the PDF file
      const dataBuffer = await fs.readFile(fullPath);

      // Parse options for pdf-parse
      const parseOptions: { max?: number } = {};
      if (maxPages && maxPages > 0) {
        parseOptions.max = maxPages;
      }

      // Extract text from PDF
      const data = await pdfParse(dataBuffer, parseOptions);

      let extractedText = data.text || '';

      // Limit text length if maxChars is specified
      if (maxChars && maxChars > 0 && extractedText.length > maxChars) {
        extractedText = extractedText.slice(0, maxChars);
      }

      // Clean up the text
      extractedText = this.cleanExtractedText(extractedText);

      return {
        success: true,
        text: extractedText,
        pageCount: data.numpages || 0,
        info: {
          title: data.info?.Title,
          author: data.info?.Author,
          subject: data.info?.Subject,
          keywords: data.info?.Keywords,
          creator: data.info?.Creator,
          producer: data.info?.Producer,
        },
      };
    } catch (error) {
      console.error('Failed to extract text from PDF:', error);
      return {
        success: false,
        text: '',
        pageCount: 0,
        error: `Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // Extract text from a PDF buffer
  static async extractTextFromBuffer(
    buffer: Buffer,
    options?: PdfExtractOptions
  ): Promise<PdfExtractResult> {
    try {
      const { maxPages, maxChars } = options || {};

      // Parse options for pdf-parse
      const parseOptions: { max?: number } = {};
      if (maxPages && maxPages > 0) {
        parseOptions.max = maxPages;
      }

      // Extract text from PDF
      const data = await pdfParse(buffer, parseOptions);

      let extractedText = data.text || '';

      // Limit text length if maxChars is specified
      if (maxChars && maxChars > 0 && extractedText.length > maxChars) {
        extractedText = extractedText.slice(0, maxChars);
      }

      // Clean up the text
      extractedText = this.cleanExtractedText(extractedText);

      return {
        success: true,
        text: extractedText,
        pageCount: data.numpages || 0,
        info: {
          title: data.info?.Title,
          author: data.info?.Author,
          subject: data.info?.Subject,
          keywords: data.info?.Keywords,
          creator: data.info?.Creator,
          producer: data.info?.Producer,
        },
      };
    } catch (error) {
      console.error('Failed to extract text from PDF buffer:', error);
      return {
        success: false,
        text: '',
        pageCount: 0,
        error: `Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // Clean up extracted text
  static cleanExtractedText(text: string): string {
    return (
      text
        // Normalize line breaks
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        // Remove excessive whitespace
        .replace(/ {3,}/g, '  ')
        // Remove excessive line breaks
        .replace(/\n{4,}/g, '\n\n\n')
        // Remove null characters and other control characters
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
        // Trim whitespace
        .trim()
    );
  }

  // Get storage path from API URL
  static getStoragePathFromUrl(storageUrl: string): string {
    if (storageUrl.startsWith('/api/files/')) {
      return storageUrl.replace('/api/files/', '');
    }
    return storageUrl;
  }

  // Check if a file is a PDF based on extension
  static isPdfFile(fileName: string): boolean {
    return path.extname(fileName).toLowerCase() === '.pdf';
  }
}

// Export utility functions
export const {
  extractTextFromPdf,
  extractTextFromBuffer,
  cleanExtractedText,
  getStoragePathFromUrl,
  isPdfFile,
} = PdfUtils;
