import { prisma } from '@/lib/prisma';
import { handleRouteError, successResponse } from '@/lib/utils';
import { requireLibrarian } from '@/middleware/auth.middleware';
import { TopBorrowedBooksResponse } from '@/types/dashboard';
import { NextRequest } from 'next/server';

/**
 * Calculates top 10 most borrowed books.
 * Counts borrows from both physical books (BorrowBook) and ebooks (BorrowEbook).
 * Returns data for TopList component visualization.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = requireLibrarian(async (_request: NextRequest) => {
  try {
    // Get all borrow records for physical books (through BorrowBook -> BookItem -> Book)
    const physicalBorrows = await prisma.borrowBook.findMany({
      where: {
        isDeleted: false,
        borrow: {
          isDeleted: false,
        },
        bookItem: {
          isDeleted: false,
          book: {
            isDeleted: false,
          },
        },
      },
      select: {
        bookItem: {
          select: {
            bookId: true,
            book: {
              select: {
                id: true,
                title: true,
                author: {
                  select: {
                    fullName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Get all borrow records for ebooks (through BorrowEbook -> Book)
    const ebookBorrows = await prisma.borrowEbook.findMany({
      where: {
        isDeleted: false,
        borrow: {
          isDeleted: false,
        },
        book: {
          isDeleted: false,
        },
      },
      select: {
        bookId: true,
        book: {
          select: {
            id: true,
            title: true,
            author: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
    });

    // Combine and count borrows per book
    const bookBorrowCounts = new Map<
      number,
      { bookId: number; title: string; authorName: string; count: number }
    >();

    // Count physical book borrows
    for (const borrow of physicalBorrows) {
      const bookId = borrow.bookItem.bookId;
      const book = borrow.bookItem.book;

      if (!book) continue;

      const existing = bookBorrowCounts.get(bookId);
      if (existing) {
        existing.count += 1;
      } else {
        bookBorrowCounts.set(bookId, {
          bookId,
          title: book.title,
          authorName: book.author.fullName,
          count: 1,
        });
      }
    }

    // Count ebook borrows
    for (const borrow of ebookBorrows) {
      const bookId = borrow.bookId;
      const book = borrow.book;

      if (!book) continue;

      const existing = bookBorrowCounts.get(bookId);
      if (existing) {
        existing.count += 1;
      } else {
        bookBorrowCounts.set(bookId, {
          bookId,
          title: book.title,
          authorName: book.author.fullName,
          count: 1,
        });
      }
    }

    // Convert to array, sort by count descending, and take top 10
    const topBooks = Array.from(bookBorrowCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((book, index) => ({
        id: book.bookId,
        title: book.title,
        subtitle: book.authorName,
        value: book.count,
        rank: index + 1,
      }));

    const response: TopBorrowedBooksResponse = {
      items: topBooks,
    };

    return successResponse<TopBorrowedBooksResponse>(
      response,
      'Top borrowed books data retrieved successfully'
    );
  } catch (error) {
    return handleRouteError(error, 'GET /api/dashboard/top-borrowed-books');
  }
});
