import { transformBookData, buildBookWhereClause, listBooks } from '@/services/book.service';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    book: {
      findMany: jest.fn(),
      count: jest.fn(),
    }
  }
}));

describe('BookService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('transformBookData', () => {
    it('should transform raw DB books into formatted output with computed counts/ratings', () => {
      const rawBooks = [
        {
          id: 1,
          title: 'Test Book',
          bookCategories: [{ category: { name: 'Fiction' } }],
          bookEditions: [{ id: 1, format: 'EBOOK' }, { id: 2, format: 'AUDIO' }],
          _count: { bookItems: 3 },
          reviews: [{ rating: 4 }, { rating: 5 }],
          author: { id: 1, fullName: 'John Doe' }
        },
        {
          id: 2,
          title: 'Empty Book',
          author: { id: 2, fullName: 'Jane Doe' }
        }
      ] as any[];

      const transformed = transformBookData(rawBooks);

      expect(transformed[0].categories).toEqual(['Fiction']);
      expect(transformed[0].bookEbookCount).toBe(1);
      expect(transformed[0].bookAudioCount).toBe(1);
      expect(transformed[0].bookItemsCount).toBe(3);
      expect(transformed[0].averageRating).toBe(4.5);
      
      expect(transformed[1].categories).toEqual([]);
      expect(transformed[1].bookEbookCount).toBe(0);
      expect(transformed[1].bookAudioCount).toBe(0);
      expect(transformed[1].bookItemsCount).toBe(0);
      expect(transformed[1].averageRating).toBe(0);
    });
  });

  describe('buildBookWhereClause', () => {
    it('should build a comprehensive where clause from filters (TC-BOOK-001)', () => {
      const filters = {
        authorIds: [1, 2],
        categoryIds: [3],
        languageCodes: ['en', 'vi'],
        publishYearFrom: 2000,
        publishYearTo: 2024,
        isDeleted: false,
        page: 1,
        limit: 10
      };

      const where = buildBookWhereClause(filters);

      expect(where.isDeleted).toBe(false);
      expect(where.authorId).toEqual({ in: [1, 2] });
      expect(where.bookCategories).toEqual({ some: { categoryId: { in: [3] } } });
      expect(where.language).toEqual({ in: ['en', 'vi'] });
      expect(where.publishYear).toEqual({ gte: 2000, lte: 2024 });
    });

    it('should filter books based on availability (availableAt)', () => {
      // Test only ebook
      const whereEbook = buildBookWhereClause({ 
        authorIds: [], categoryIds: [], languageCodes: [],
        availableAt: ['ebook'], page: 1, limit: 10 
      });
      expect(whereEbook.bookEditions).toEqual({ some: { format: 'EBOOK', isDeleted: false } });

      // Test both ebook and book-copy
      const whereBoth = buildBookWhereClause({ 
        authorIds: [], categoryIds: [], languageCodes: [],
        availableAt: ['ebook', 'book-copy'], page: 1, limit: 10 
      });
      expect(whereBoth.AND).toBeDefined();
    });
  });

  describe('listBooks (TC-BOOK-002)', () => {
    it('should query Prisma with correct params, include fallback text search, and return paginated data', async () => {
      (prisma.book.findMany as jest.Mock).mockResolvedValue([{ id: 1, title: 'Mock' }]);
      (prisma.book.count as jest.Mock).mockResolvedValue(1);

      const params = {
        search: 'keyword',
        authorIds: [],
        categoryIds: [],
        languageCodes: [],
        page: 2,
        limit: 5,
        sortBy: 'title',
        sortOrder: 'asc' as const
      };

      const result = await listBooks(params);

      // Skip = (page - 1) * limit = (2 - 1) * 5 = 5
      expect(prisma.book.findMany).toHaveBeenCalledWith(expect.objectContaining({
        skip: 5,
        take: 5,
        orderBy: { title: 'asc' },
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { title: { contains: 'keyword' } },
            { isbn: { contains: 'keyword' } }
          ])
        })
      }));
      expect(result.total).toBe(1);
      expect(result.books).toHaveLength(1);
    });
  });
});
