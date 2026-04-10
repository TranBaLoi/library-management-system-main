import { prisma } from '@/lib/prisma';
import { handleRouteError, successResponse } from '@/lib/utils';
import { Book } from '@/types/book';

// GET /api/books/all - Get all books (no pagination)
export async function GET() {
  try {
    const books: Book[] = await prisma.book.findMany({
      where: {
        isDeleted: false,
      },
      select: {
        id: true,
        authorId: true,
        title: true,
        isbn: true,
        publishYear: true,
        publisher: true,
        pageCount: true,
        price: true,
        edition: true,
        description: true,
        coverImageUrl: true,
        language: true,
        isDeleted: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        title: 'asc',
      },
    });

    return successResponse<Book[]>(books);
  } catch (error) {
    return handleRouteError(error, 'GET /api/books/all');
  }
}
