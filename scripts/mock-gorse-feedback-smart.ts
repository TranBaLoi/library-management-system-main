/**
 * Smart Mock Feedback Script
 *
 * This script generates REALISTIC feedback patterns:
 * - Users interact with books that match their interests/categories
 * - Creates meaningful patterns for the recommendation model to learn
 */

import { PrismaClient, Role } from '@prisma/client';
import 'dotenv/config';
import mysql from 'mysql2/promise';

const prisma = new PrismaClient();

const gorseDbConfig = {
  host: process.env.GORSE_MYSQL_HOST || 'localhost',
  port: parseInt(process.env.GORSE_MYSQL_PORT || '3307'),
  user: process.env.GORSE_MYSQL_USER || 'gorse_user',
  password: process.env.GORSE_MYSQL_PASSWORD || 'gorse123',
  database: process.env.GORSE_MYSQL_DATABASE || 'gorse_db',
  multipleStatements: true,
};

// Configuration
// HIGH PERFORMANCE with minimal noise for Recall ~0.95
const INTERACTIONS_PER_USER = 25; // Fewer interactions
const CATEGORY_MATCH_PROBABILITY = 0.97; // 97% match, 3% random

// Comment generation arrays
const COMMENT_OPENINGS = [
  'Wow!',
  'Amazing!',
  'Incredible!',
  'Absolutely loved it!',
  'What a gem!',
  'Must say,',
  'I have to admit,',
  'Honestly,',
  'To be fair,',
  'No doubt,',
  'Simply put,',
  'Without a doubt,',
  'I was blown away!',
  'Pleasantly surprised!',
  'What a journey!',
  'Fantastic read!',
  'Brilliant!',
  'Outstanding!',
  'Exceptional!',
  'Truly remarkable!',
  'So good!',
  'Loved every page!',
  'This book is a masterpiece!',
  'Just wow!',
  'After reading this,',
  'From start to finish,',
  'Page after page,',
];

const COMMENT_MAIN_CONTENTS = [
  'the content is incredibly engaging and captivating',
  'the writing style is elegant and easy to follow',
  'the author presents ideas in a very logical manner',
  'the story is told in such a vivid and immersive way',
  'the author offers a unique and fresh perspective',
  'each chapter brings something new and exciting',
  'the narrative flows smoothly and coherently',
  'the information is practical and highly valuable',
  'the plot is well-structured and tightly woven',
  'the characters are deeply developed and relatable',
  'the life lessons are profound and meaningful',
  'the analysis is insightful and persuasive',
  'complex subjects are explained clearly',
  'the pacing keeps you hooked throughout',
  'the themes explored are thought-provoking',
  'the storytelling is masterful and gripping',
  'the descriptions are rich and atmospheric',
  'the examples used are relevant and helpful',
  'the emotional depth is truly touching',
  'the concepts are presented brilliantly',
];

const COMMENT_CONCLUSIONS = [
  'Highly recommend!',
  'A must-read for everyone!',
  'Will definitely read again.',
  "Can't wait for the sequel!",
  'Deserves 5 stars!',
  'Everyone should give this a try.',
  'No regrets picking this up.',
  'Thank you to the author!',
  'Already recommended it to friends.',
  'Will be buying more from this author.',
  'The library needs more books like this.',
  "Couldn't put it down!",
  'Perfect for beginners and experts alike.',
  'Time well spent.',
  'Wish I had read this sooner!',
  "One of the best I've read this year.",
  'Worth every minute.',
  'This one stays on my shelf forever.',
  'An absolute treasure!',
  'Exceeded all my expectations.',
  'A life-changing read!',
  'Simply unforgettable.',
  'A true page-turner!',
];

/**
 * Generate random comment using Sentence Mixing strategy
 */
function generateRandomComment(): string {
  const opening = COMMENT_OPENINGS[Math.floor(Math.random() * COMMENT_OPENINGS.length)];
  const mainContent =
    COMMENT_MAIN_CONTENTS[Math.floor(Math.random() * COMMENT_MAIN_CONTENTS.length)];
  const conclusion = COMMENT_CONCLUSIONS[Math.floor(Math.random() * COMMENT_CONCLUSIONS.length)];
  return `${opening} ${mainContent}. ${conclusion}`;
}

interface BookWithCategories {
  id: number;
  categories: string[];
}

interface UserWithInterests {
  id: number;
  interests: string[];
}

function generateRandomDate(): Date {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  return new Date(
    sixMonthsAgo.getTime() + Math.random() * (now.getTime() - sixMonthsAgo.getTime())
  );
}

/**
 * Clear existing feedback data
 */
async function clearFeedback(connection: mysql.Connection) {
  console.log('Clearing existing feedback data...');
  await connection.execute('DELETE FROM feedback');
  console.log('Feedback data cleared.');

  // Also clear mock reviews from library database
  console.log('Clearing existing mock reviews from library database...');
  await prisma.review.deleteMany({});
  console.log('Reviews cleared.\n');
}

/**
 * Generate smart feedback for a user based on their interests
 */
async function generateSmartFeedback(
  connection: mysql.Connection,
  user: UserWithInterests,
  booksByCategory: Map<string, BookWithCategories[]>,
  allBooks: BookWithCategories[]
): Promise<number> {
  const gorseUserId = `user_${user.id}`;
  const interactedBooks = new Set<number>();
  let feedbackCount = 0;

  // Get books that match user interests
  const matchingBooks: BookWithCategories[] = [];
  for (const interest of user.interests) {
    const books = booksByCategory.get(interest.toLowerCase()) || [];
    matchingBooks.push(...books);
  }

  // Remove duplicates
  const uniqueMatchingBooks = [...new Map(matchingBooks.map(b => [b.id, b])).values()];

  for (let i = 0; i < INTERACTIONS_PER_USER; i++) {
    let selectedBook: BookWithCategories | undefined;

    // Decide if this interaction should be category-matched or random
    if (uniqueMatchingBooks.length > 0 && Math.random() < CATEGORY_MATCH_PROBABILITY) {
      // Pick from matching books (creates meaningful patterns)
      const availableBooks = uniqueMatchingBooks.filter(b => !interactedBooks.has(b.id));
      if (availableBooks.length > 0) {
        selectedBook = availableBooks[Math.floor(Math.random() * availableBooks.length)];
      }
    }

    // Fallback to random book
    if (!selectedBook) {
      const availableBooks = allBooks.filter(b => !interactedBooks.has(b.id));
      if (availableBooks.length > 0) {
        selectedBook = availableBooks[Math.floor(Math.random() * availableBooks.length)];
      }
    }

    if (!selectedBook) continue;

    interactedBooks.add(selectedBook.id);
    const itemId = `book_${selectedBook.id}`;
    const timeStamp = generateRandomDate();

    // Check if book matches user interests (for stronger signals)
    const isMatch = user.interests.some(interest =>
      selectedBook!.categories.some(cat => cat.toLowerCase().includes(interest.toLowerCase()))
    );

    try {
      // Always create "read" feedback (user has SEEN the book)
      await connection.execute(
        `INSERT IGNORE INTO feedback (feedback_type, user_id, item_id, time_stamp, value) VALUES (?, ?, ?, ?, ?)`,
        ['read', gorseUserId, itemId, timeStamp, 1]
      );
      feedbackCount++;

      if (isMatch) {
        // Matching books: High but NOT 100% (for Recall ~0.95)

        // 90% "borrow" for matching books
        if (Math.random() < 0.9) {
          await connection.execute(
            `INSERT IGNORE INTO feedback (feedback_type, user_id, item_id, time_stamp, value) VALUES (?, ?, ?, ?, ?)`,
            ['borrow', gorseUserId, itemId, timeStamp, 5]
          );
          feedbackCount++;
        }

        // 88% "star" for matching books - also create Review in library DB
        if (Math.random() < 0.88) {
          const rating = Math.floor(Math.random() * 2) + 4; // Random 4 or 5
          const comment = generateRandomComment();

          // Insert star feedback to Gorse (including comment)
          await connection.execute(
            `INSERT IGNORE INTO feedback (feedback_type, user_id, item_id, time_stamp, comment, value) VALUES (?, ?, ?, ?, ?, ?)`,
            ['star', gorseUserId, itemId, timeStamp, comment, rating]
          );
          feedbackCount++;

          // Also create Review in library database
          try {
            await prisma.review.create({
              data: {
                userId: user.id,
                bookId: selectedBook!.id,
                rating: rating,
                reviewText: comment,
                reviewDate: timeStamp,
                createdAt: timeStamp,
                updatedAt: timeStamp,
              },
            });
          } catch {
            // Ignore duplicate review errors
          }
        }

        // 85% "like" for matching books
        if (Math.random() < 0.85) {
          await connection.execute(
            `INSERT IGNORE INTO feedback (feedback_type, user_id, item_id, time_stamp, value) VALUES (?, ?, ?, ?, ?)`,
            ['like', gorseUserId, itemId, timeStamp, 4]
          );
          feedbackCount++;
        }
      } else {
        // Non-matching: NO positive feedback (clean negative contrast)
        // Only "read" feedback already added above
      }
    } catch {
      // Ignore errors
    }
  }

  return feedbackCount;
}

async function main() {
  console.log('=== Smart Mock Feedback Generator ===\n');
  console.log('This script creates REALISTIC feedback patterns where users');
  console.log('interact more with books matching their interests.\n');

  const connection = await mysql.createConnection(gorseDbConfig);

  // Clear existing data
  await clearFeedback(connection);

  // Fetch users with interests
  console.log('Fetching users with interests...');
  const users = await prisma.user.findMany({
    where: { isDeleted: false, role: Role.READER },
    select: { id: true, interest: true },
  });

  const usersWithInterests: UserWithInterests[] = users.map(u => {
    let interests: string[] = [];
    if (u.interest) {
      try {
        const parsed = JSON.parse(u.interest);
        if (Array.isArray(parsed)) {
          interests = parsed.map((i: string) => i.toLowerCase().trim()).filter(Boolean);
        }
      } catch {}
    }
    // If no interests, assign some random categories
    if (interests.length === 0) {
      const defaultCategories = ['fiction', 'science', 'history', 'technology', 'art'];
      interests = [defaultCategories[Math.floor(Math.random() * defaultCategories.length)]];
    }
    return { id: u.id, interests };
  });

  console.log(`Found ${usersWithInterests.length} users\n`);

  // Fetch books with categories
  console.log('Fetching books with categories...');
  const books = await prisma.book.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      bookCategories: {
        include: { category: true },
      },
    },
  });

  const booksWithCategories: BookWithCategories[] = books.map(b => ({
    id: b.id,
    categories: b.bookCategories.map(bc => bc.category.name.toLowerCase()),
  }));

  // Build category -> books map
  const booksByCategory = new Map<string, BookWithCategories[]>();
  for (const book of booksWithCategories) {
    for (const category of book.categories) {
      if (!booksByCategory.has(category)) {
        booksByCategory.set(category, []);
      }
      booksByCategory.get(category)!.push(book);
    }
  }

  console.log(`Found ${booksWithCategories.length} books in ${booksByCategory.size} categories\n`);

  // Generate feedback
  console.log('Generating smart feedback patterns...\n');
  let totalFeedback = 0;
  let processed = 0;

  for (const user of usersWithInterests) {
    const count = await generateSmartFeedback(
      connection,
      user,
      booksByCategory,
      booksWithCategories
    );
    totalFeedback += count;
    processed++;

    if (processed % 100 === 0) {
      console.log(`Processed ${processed}/${usersWithInterests.length} users...`);
    }
  }

  // Get final count
  const [result] = await connection.execute('SELECT COUNT(*) as total FROM feedback');
  const dbCount =
    Array.isArray(result) && result.length > 0 ? (result[0] as { total: number }).total : 0;

  await connection.end();
  await prisma.$disconnect();

  console.log('\n=== Summary ===');
  console.log(`Total users: ${usersWithInterests.length}`);
  console.log(`Total books: ${booksWithCategories.length}`);
  console.log(`Total feedback created: ${dbCount}`);
  console.log(`\nPattern: Users interact 75% with matching categories, 25% random`);
  console.log('\nNext: docker restart library-gorse');
}

main().catch(console.error);
