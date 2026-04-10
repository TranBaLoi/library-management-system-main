/**
 * Sync Book to Qdrant Script
 * Synchronizes book data from database to Qdrant vector store
 *
 * Usage:
 *   ts-node scripts/sync-book-qdrant.ts
 *   or
 *   yarn sync:qdrant
 */

// Load environment variables from .env file
import { config } from 'dotenv';
config();

// Register tsconfig paths for @/ alias resolution
import { resolve } from 'path';
import { register } from 'tsconfig-paths';

register({
  baseUrl: resolve(__dirname, '..'),
  paths: {
    '@/*': ['./src/*'],
  },
});

import { prisma } from '../src/lib/prisma';
import { embeddingService } from '../src/services/ollamaEmbedding.service';
import { qdrantService } from '../src/services/qdrant.service';

/**
 * Build text content from book data for embedding
 */
function buildBookTextContent(book: {
  title: string;
  description: string | null;
  author: { fullName: string };
  bookCategories: { category: { name: string } }[];
  publisher: string | null;
  publishYear: number | null;
  language: string | null;
}): string {
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
 * Main sync function
 */
async function syncBookToQdrant() {
  try {
    console.log('[SyncBookQdrant] Starting book sync to Qdrant...');

    // Initialize Qdrant collection if not exists
    await qdrantService.initCollection();

    // Get all active books with author and categories
    const books = await prisma.book.findMany({
      where: {
        isDeleted: false,
      },
      include: {
        author: {
          select: {
            fullName: true,
          },
        },
        bookCategories: {
          where: { isDeleted: false },
          include: {
            category: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    console.log(`[SyncBookQdrant] Found ${books.length} books to sync`);

    if (books.length === 0) {
      console.log('[SyncBookQdrant] No books to sync');
      return;
    }

    let syncedCount = 0;
    let errorCount = 0;

    for (const book of books) {
      try {
        // Build text content for embedding
        const textContent = buildBookTextContent(book);

        // Generate embedding vector
        const vector = await embeddingService.generateVector(textContent);

        // Delete old data for this book (to avoid duplicates)
        await qdrantService.deleteBookData(book.id.toString());

        // Upsert new data to Qdrant
        await qdrantService.upsertChunks(book.id.toString(), [
          {
            text: textContent,
            vector: vector,
          },
        ]);

        syncedCount++;
        console.log(`[SyncBookQdrant] Synced book ID ${book.id}: ${book.title}`);
      } catch (error) {
        errorCount++;
        console.error(
          `[SyncBookQdrant] Error syncing book ID ${book.id}:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    console.log(`[SyncBookQdrant] Sync completed: ${syncedCount} synced, ${errorCount} errors`);
  } catch (error) {
    console.error('[SyncBookQdrant] Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the sync
syncBookToQdrant()
  .then(() => {
    console.log('[SyncBookQdrant] Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('[SyncBookQdrant] Unexpected error:', error);
    process.exit(1);
  });
