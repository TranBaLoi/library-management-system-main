import { prisma } from '@/lib/prisma';
import { QdrantClient } from '@qdrant/js-client-rest';
import { v4 as uuidv4 } from 'uuid';

/**
 * Book data structure for building vector text content
 */
interface BookForVector {
  id: number;
  title: string;
  description: string | null;
  bookCategories: { category: { name: string } }[];
}

class QdrantService {
  private client: QdrantClient;
  private collectionName: string;
  private vectorSize: number;

  constructor() {
    // Connect to Qdrant
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
    });

    this.collectionName = 'library_books_rag';
    this.vectorSize = 768;
  }

  /**
   * Build text content from book data for embedding
   * Combines title, categories, and description into searchable text
   */
  private buildBookTextContent(book: BookForVector): string {
    const parts: string[] = [];

    // Title
    parts.push(`Title: ${book.title}`);

    // Categories
    if (book.bookCategories.length > 0) {
      const categoryNames = book.bookCategories.map(bc => bc.category.name).join(', ');
      parts.push(`Categories: ${categoryNames}`);
    }

    // Description
    if (book.description) {
      parts.push(`Description: ${book.description}`);
    }

    return parts.join('. ');
  }

  /**
   * Initialize collection
   * Creates the collection if it doesn't exist.
   * Should be run once during project initialization.
   */
  async initCollection() {
    try {
      const result = await this.client.getCollections();
      const exists = result.collections.some(c => c.name === this.collectionName);

      if (!exists) {
        console.log(`Creating collection: ${this.collectionName}...`);
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: this.vectorSize,
            distance: 'Cosine',
          },
        });
        console.log('Collection created!');

        await this.client.createPayloadIndex(this.collectionName, {
          field_name: 'book_id',
          field_schema: 'keyword',
        });
      } else {
        console.log('Collection already exists.');
      }
    } catch (error) {
      console.error('Qdrant Init Error:', error);
    }
  }

  /**
   * Upsert chunks (Save data)
   * Saves vectors to the database.
   *
   * @param bookId - Book ID (for filtering later)
   * @param chunks - Array of objects { text: "content...", vector: [0.1, ...] }
   */
  async upsertChunks(bookId: string, chunks: { text: string; vector: number[] }[]) {
    // Qdrant receives data as "Points"
    const points = chunks.map(chunk => ({
      id: uuidv4(),
      vector: chunk.vector,
      payload: {
        book_id: bookId,
        content: chunk.text,
      },
    }));

    try {
      await this.client.upsert(this.collectionName, {
        wait: true,
        points: points,
      });
      console.log(`Saved ${points.length} chunks for book ID ${bookId}`);
    } catch (error) {
      console.error('Qdrant Upsert Error:', error);
      throw error;
    }
  }

  /**
   * Search similar vectors
   * Finds the most relevant text chunks for a query.
   *
   * @param queryVector - Query vector (from Ollama)
   * @param limit - Number of results to return (typically 3-5)
   * @param filterBookId - (Optional) Filter to search within a specific book only
   * @returns Array of search results with score, content, and bookId
   */
  async searchSimilar(queryVector: number[], limit = 5, filterBookId = null) {
    try {
      const filter = filterBookId
        ? {
            must: [{ key: 'book_id', match: { value: filterBookId } }],
          }
        : undefined;

      const searchResult = await this.client.search(this.collectionName, {
        vector: queryVector,
        limit: limit,
        filter: filter,
        with_payload: true,
      });

      return searchResult.map(item => ({
        score: item.score,
        content: item.payload?.content,
        bookId: item.payload?.book_id,
      }));
    } catch (error) {
      console.error('Qdrant Search Error:', error);
      throw error;
    }
  }

  /**
   * Delete book data
   * Removes all vectors for a book when it's deleted from the main database.
   *
   * @param bookId - Book ID to delete vectors for
   */
  async deleteBookData(bookId: string) {
    await this.client.delete(this.collectionName, {
      filter: {
        must: [{ key: 'book_id', match: { value: bookId } }],
      },
    });
  }

  /**
   * Sync a single book to Qdrant vector database
   * Fetches book data, generates embedding, and upserts to Qdrant.
   * Used when a book is created or updated.
   *
   * @param bookId - Book ID to sync
   * @throws Error if book not found or sync fails
   */
  async syncBookToQdrant(bookId: number): Promise<void> {
    // Import embedding service here to avoid circular dependency
    const { embeddingService } = await import('@/services/ollamaEmbedding.service');

    // Fetch book with required relations
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: {
        id: true,
        title: true,
        description: true,
        isDeleted: true,
        bookCategories: {
          where: { isDeleted: false },
          select: {
            category: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!book) {
      throw new Error(`Book with ID ${bookId} not found`);
    }

    // If book is soft-deleted, remove from Qdrant
    if (book.isDeleted) {
      await this.deleteBookData(bookId.toString());
      console.log(`[Qdrant] Removed soft-deleted book ID ${bookId} from vector store`);
      return;
    }

    // Build text content for embedding
    const textContent = this.buildBookTextContent(book);

    // Generate embedding vector
    const vector = await embeddingService.generateVector(textContent);

    // Delete old data for this book (to avoid duplicates)
    await this.deleteBookData(bookId.toString());

    // Upsert new data to Qdrant
    await this.upsertChunks(bookId.toString(), [
      {
        text: textContent,
        vector: vector,
      },
    ]);

    console.log(`[Qdrant] Synced book ID ${bookId}: ${book.title}`);
  }

  /**
   * Sync book to Qdrant (non-blocking)
   * Wraps syncBookToQdrant in a try-catch to prevent failures from affecting the main request.
   * Logs errors but does not throw.
   *
   * @param bookId - Book ID to sync
   */
  async syncBookToQdrantNonBlocking(bookId: number): Promise<void> {
    try {
      await this.syncBookToQdrant(bookId);
    } catch (error) {
      console.error(
        `[Qdrant] Failed to sync book ID ${bookId}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  /**
   * Remove book from Qdrant (non-blocking)
   * Used when a book is deleted.
   *
   * @param bookId - Book ID to remove
   */
  async removeBookFromQdrantNonBlocking(bookId: number): Promise<void> {
    try {
      await this.deleteBookData(bookId.toString());
      console.log(`[Qdrant] Removed book ID ${bookId} from vector store`);
    } catch (error) {
      console.error(
        `[Qdrant] Failed to remove book ID ${bookId}:`,
        error instanceof Error ? error.message : error
      );
    }
  }
}

export const qdrantService = new QdrantService();
