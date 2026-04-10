import { ValidationError } from '@/lib/errors';
import { handleRouteError, successResponse } from '@/lib/utils';
import { requireLibrarian } from '@/middleware/auth.middleware';
import { ollamaSummaryService } from '@/services/ollamaSummary.service';
import { NextRequest } from 'next/server';

// Configure route segment for longer processing
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * POST /api/ai-summarize
 *
 * Generate AI summary for a book based on title and author using Ollama.
 *
 * Request body (JSON):
 * - title: string (required) - Book title
 * - author: string (required) - Book author
 * - language: 'vi' | 'en' (optional, default: 'en')
 * - maxLength: number (optional, default: 200)
 *
 * Response:
 * - summary: string
 * - bookInfo: { title, author }
 */
export const POST = requireLibrarian(async (request: NextRequest) => {
  try {
    // Check if Ollama is available
    const isAvailable = await ollamaSummaryService.isAvailable();
    if (!isAvailable) {
      throw new ValidationError(
        'Ollama service is not available. Please ensure Ollama is running.'
      );
    }

    // Parse JSON body
    const body = await request.json();
    const { title, author, language = 'en', maxLength = 200 } = body;

    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim() === '') {
      throw new ValidationError('Title is required and must be a non-empty string.');
    }

    if (!author || typeof author !== 'string' || author.trim() === '') {
      throw new ValidationError('Author is required and must be a non-empty string.');
    }

    // Validate language
    if (language && !['vi', 'en'].includes(language)) {
      throw new ValidationError('Language must be either "vi" or "en".');
    }

    // Validate maxLength
    if (maxLength && (typeof maxLength !== 'number' || maxLength < 50 || maxLength > 2000)) {
      throw new ValidationError('maxLength must be a number between 50 and 2000.');
    }

    // Generate summary using Ollama
    const summaryResult = await ollamaSummaryService.generateBookSummary(
      { title: title.trim(), author: author.trim() },
      { maxLength, language }
    );

    if (!summaryResult.success) {
      throw new ValidationError(`Failed to generate summary: ${summaryResult.error}`);
    }

    return successResponse({
      summary: summaryResult.summary,
      bookInfo: {
        title: title.trim(),
        author: author.trim(),
      },
    });
  } catch (error) {
    return handleRouteError(error, 'POST /api/ai-summarize');
  }
});
