import { fetchWithAuth, getAccessToken, handleJson } from '@/lib/utils';

export interface AiSummaryResponse {
  summary: string;
  bookInfo: {
    title: string;
    author: string;
  };
}

export class AiApi {
  /**
   * Generate book summary using AI based on title and author
   */
  static async generateBookSummary(
    title: string,
    author: string,
    options?: { language?: 'vi' | 'en'; maxLength?: number }
  ): Promise<AiSummaryResponse> {
    const token = getAccessToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchWithAuth('/api/ai-summarize', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title,
        author,
        language: options?.language || 'en',
        maxLength: options?.maxLength || 200,
      }),
    });

    return await handleJson<AiSummaryResponse>(response);
  }
}
