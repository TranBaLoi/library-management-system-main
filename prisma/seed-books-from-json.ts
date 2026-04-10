import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface BookJsonData {
  ISBN: string;
  Title: string;
  Author: string;
  Year: number;
  Publisher: string;
  category: string | string[]; // Support both string (legacy) and string[] (new format)
  language: string;
  subtitle?: string;
  description?: string; // Added optional description field
  coverImageUrl?: string; // Added optional coverImageUrl field
  price: number; // Price in VND (always present, random 150,000 - 400,000)
}

/**
 * Tìm hoặc tạo Author dựa trên tên (sử dụng cache)
 */
async function findOrCreateAuthor(
  authorName: string,
  authorsCache: Map<string, { id: number; fullName: string }>
) {
  const cacheKey = authorName.toLowerCase();
  const cachedAuthor = authorsCache.get(cacheKey);

  if (cachedAuthor) {
    return cachedAuthor;
  }

  // Tạo author mới nếu không tìm thấy trong cache
  const newAuthor = await prisma.author.create({
    data: {
      fullName: authorName,
      bio: null,
      birthDate: null,
      nationality: null,
    },
    select: { id: true, fullName: true },
  });

  // Thêm vào cache
  authorsCache.set(cacheKey, newAuthor);
  console.log(`Created new author: ${authorName}`);
  return newAuthor;
}

/**
 * Tìm hoặc tạo Category dựa trên tên (sử dụng cache)
 */
async function findOrCreateCategory(
  categoryName: string,
  categoriesCache: Map<string, { id: number; name: string }>
) {
  const cacheKey = categoryName.toLowerCase();
  const cachedCategory = categoriesCache.get(cacheKey);

  if (cachedCategory) {
    return cachedCategory;
  }

  // Tạo category mới nếu không tìm thấy trong cache
  const newCategory = await prisma.category.create({
    data: {
      name: categoryName,
      description: `Category for ${categoryName}`,
    },
    select: { id: true, name: true },
  });

  // Thêm vào cache
  categoriesCache.set(cacheKey, newCategory);
  console.log(`Created new category: ${categoryName}`);
  return newCategory;
}

/**
 * Seed books từ file JSON
 */
async function seedBooksFromJson() {
  console.log('Starting to seed books from google-books.json...');

  // Đọc file JSON
  const jsonPath = path.join(__dirname, 'data-mock', 'google-books.json');
  const jsonData = fs.readFileSync(jsonPath, 'utf-8');
  const booksData: BookJsonData[] = JSON.parse(jsonData);

  console.log(`Found ${booksData.length} books in JSON file`);

  // Cache authors và categories để tránh query nhiều lần
  const authorsCache = new Map<string, { id: number; fullName: string }>();
  const categoriesCache = new Map<string, { id: number; name: string }>();

  // Load tất cả authors và categories vào cache
  const allAuthors = await prisma.author.findMany({
    where: { isDeleted: false },
    select: { id: true, fullName: true },
  });
  allAuthors.forEach((author: { id: number; fullName: string }) => {
    authorsCache.set(author.fullName.toLowerCase(), author);
  });

  const allCategories = await prisma.category.findMany({
    where: { isDeleted: false },
    select: { id: true, name: true },
  });
  allCategories.forEach((category: { id: number; name: string }) => {
    categoriesCache.set(category.name.toLowerCase(), category);
  });

  let createdCount = 0;
  let skippedCount = 0;

  for (const bookData of booksData) {
    try {
      // Kiểm tra xem book đã tồn tại chưa (theo ISBN)
      if (bookData.ISBN) {
        const existingBook = await prisma.book.findFirst({
          where: {
            isbn: bookData.ISBN,
            isDeleted: false,
          },
        });

        if (existingBook) {
          console.log(
            `Skipping book "${bookData.Title}" - already exists (ISBN: ${bookData.ISBN})`
          );
          skippedCount++;
          continue;
        }
      }

      // Tìm hoặc tạo Author (xử lý trường hợp Author rỗng)
      let author;
      if (bookData.Author && bookData.Author.trim() !== '') {
        author = await findOrCreateAuthor(bookData.Author, authorsCache);
      } else {
        // Tạo author mặc định nếu không có author
        author = await findOrCreateAuthor('Unknown Author', authorsCache);
      }

      // Tạo Book với đầy đủ các field bao gồm language, subtitle, description, coverImageUrl và price
      const book = await prisma.book.create({
        data: {
          authorId: author.id,
          title: bookData.Title,
          isbn: bookData.ISBN && bookData.ISBN.trim() !== '' ? bookData.ISBN : null,
          publishYear: bookData.Year && bookData.Year > 0 ? bookData.Year : null,
          publisher:
            bookData.Publisher && bookData.Publisher.trim() !== '' ? bookData.Publisher : null,
          language: bookData.language && bookData.language.trim() !== '' ? bookData.language : null,
          subtitle: bookData.subtitle && bookData.subtitle.trim() !== '' ? bookData.subtitle : null,
          description:
            bookData.description && bookData.description.trim() !== ''
              ? bookData.description
              : null,
          coverImageUrl:
            bookData.coverImageUrl && bookData.coverImageUrl.trim() !== ''
              ? bookData.coverImageUrl
              : null,
          pageCount: null,
          price: bookData.price, // Price is always present (random 150,000 - 400,000 VND)
          edition: null,
        },
      });

      // Tạo BookCategory từ category (hỗ trợ cả string và string[])
      // Xử lý category dạng array hoặc string
      const categoriesToProcess: string[] = [];

      if (Array.isArray(bookData.category)) {
        // Nếu là array, lấy tất cả categories
        categoriesToProcess.push(...bookData.category);
      } else if (
        bookData.category &&
        typeof bookData.category === 'string' &&
        bookData.category.trim() !== ''
      ) {
        // Nếu là string (legacy format), chỉ lấy một category
        categoriesToProcess.push(bookData.category);
      }

      // Tạo BookCategory cho mỗi category
      for (const categoryName of categoriesToProcess) {
        // Bỏ qua category rỗng hoặc chỉ có khoảng trắng
        if (!categoryName || typeof categoryName !== 'string' || categoryName.trim() === '') {
          continue;
        }

        const category = await findOrCreateCategory(categoryName, categoriesCache);

        // Kiểm tra xem BookCategory đã tồn tại chưa để tránh duplicate
        const existingBookCategory = await prisma.bookCategory.findFirst({
          where: {
            bookId: book.id,
            categoryId: category.id,
            isDeleted: false,
          },
        });

        if (!existingBookCategory) {
          await prisma.bookCategory.create({
            data: {
              bookId: book.id,
              categoryId: category.id,
            },
          });
        }
      }

      createdCount++;
      const authorName =
        bookData.Author && bookData.Author.trim() !== '' ? bookData.Author : 'Unknown Author';
      console.log(`Created book: "${bookData.Title}" by ${authorName}`);
    } catch (error) {
      console.error(`Error creating book "${bookData.Title}":`, error);
    }
  }

  console.log('\nSummary:');
  console.log(`   Created: ${createdCount} books`);
  console.log(`   Skipped: ${skippedCount} books`);
  console.log('Books seeding completed!');
}

async function main() {
  try {
    await seedBooksFromJson();
  } catch (error) {
    console.error('Error during seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
