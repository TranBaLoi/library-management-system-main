/**
 * Gemini AI Service
 *
 * Service for interacting with Google Gemini AI API.
 * Used for text summarization and keyword extraction from book information.
 */

import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

// Gemini API configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Initialize Gemini client
const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Default model for text generation
// Available models: 'gemini-1.5-flash-latest', 'gemini-1.5-pro-latest', 'gemini-1.0-pro'
// See: https://ai.google.dev/gemini-api/docs/models/gemini
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

/**
 * Summary result interface
 */
export interface SummaryResult {
  summary: string;
  success: boolean;
  error?: string;
}

/**
 * Book info input for summary generation
 */
export interface BookSummaryInput {
  title: string;
  author: string;
}

/**
 * Options for summary generation
 */
export interface SummaryOptions {
  maxLength?: number;
  language?: 'vi' | 'en';
}

/**
 * Gemini Service for AI-powered text analysis
 */
export class GeminiService {
  /**
   * Check if Gemini API is configured
   */
  static isConfigured(): boolean {
    return !!GEMINI_API_KEY && !!genAI;
  }

  /**
   * Generate a complete summary with keywords based on book title and author
   *
   * @param bookInfo - The book title and author
   * @param options - Options for summarization
   * @returns SummaryResult with summary and keywords
   */
  static async generateBookSummary(
    bookInfo: BookSummaryInput,
    options?: SummaryOptions
  ): Promise<SummaryResult> {
    if (!this.isConfigured()) {
      return {
        summary: '',
        success: false,
        error: 'Gemini API is not configured. Please set GEMINI_API_KEY in environment variables.',
      };
    }

    const { title, author } = bookInfo;
    const maxLength = options?.maxLength || 200;
    const language = options?.language || 'vi';

    const languageInstruction =
      language === 'vi' ? 'Respond in Vietnamese.' : 'Respond in English.';

    const prompt = `${languageInstruction}

    Based on the following book information:
    - Title: "${title}"
    - Author: "${author}"

    Please provide a concise summary of the book's content (maximum ${maxLength} words). If you are unfamiliar with this book, please provide a description based on the title and author.

    Respond in the following JSON format (do not use markdown code blocks):
    {
      "summary": "Summary content..."
    }`;

    try {
      const response = await genAI.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
      });

      const responseText = response.text || '';

      // Try to parse JSON from response
      // Remove markdown code blocks if present
      const cleanedResponse = responseText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();

      const parsed = JSON.parse(cleanedResponse);

      return {
        summary: parsed.summary || '',
        success: true,
      };
    } catch (error) {
      console.error('Failed to generate book summary:', error);
      return {
        summary: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
