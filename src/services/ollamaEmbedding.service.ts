import { Ollama } from 'ollama';

class OllamaEmbeddingService {
  private ollama: Ollama;
  private modelName: string;

  constructor() {
    // Initialize client with configurable host
    const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.ollama = new Ollama({ host: ollamaHost });
    this.modelName = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';
  }

  /**
   * Generate embedding vector from text
   * Used for:
   * - User search queries (embed the query)
   * - Indexing book chunks
   *
   * @param text - Input text to convert to vector
   * @returns Embedding vector
   */
  async generateVector(text: string) {
    if (!text || text.trim().length === 0) {
      throw new Error('Input text cannot be empty');
    }

    try {
      // Call Ollama API
      const response = await this.ollama.embeddings({
        model: this.modelName,
        prompt: text.replace(/\n/g, ' '),
      });

      return response.embedding;
    } catch (error) {
      console.error(
        `Ollama Error [generateVector]: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  /**
   * Generate embedding vectors for multiple texts
   * Used for:
   * - Batch importing books (instead of calling one by one)
   * Note: Ollama processes sequentially, but this function keeps code cleaner
   *
   * @param texts - Array of texts to convert to vectors
   * @returns Array of embedding vectors
   */
  async generateBatchVectors(texts: string[]) {
    const vectors = [];
    console.log(`Starting vectorization of ${texts.length} text chunks...`);

    // Run sequentially to avoid overloading local GPU
    for (const text of texts) {
      const vector = await this.generateVector(text);
      vectors.push(vector);
    }

    return vectors;
  }
}

export const embeddingService = new OllamaEmbeddingService();
