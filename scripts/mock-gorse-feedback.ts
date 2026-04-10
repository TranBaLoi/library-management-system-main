/**
 * Script to mock feedback directly into Gorse database
 *
 * This script:
 * 1. Gets users from library database (READER role only)
 * 2. Gets books from library database
 * 3. Creates mock feedback directly in Gorse database
 * 4. Feedback types: "star", "like", "comment", "borrow", "reserve", "read"
 */

import { PrismaClient, Role } from '@prisma/client';
import 'dotenv/config';
import mysql from 'mysql2/promise';

const prisma = new PrismaClient();

// Gorse database connection
const gorseDbConfig = {
  host: process.env.GORSE_MYSQL_HOST || 'localhost',
  port: parseInt(process.env.GORSE_MYSQL_PORT || '3307'),
  user: process.env.GORSE_MYSQL_USER || 'gorse_user',
  password: process.env.GORSE_MYSQL_PASSWORD || 'gorse123',
  database: process.env.GORSE_MYSQL_DATABASE || 'gorse_db',
  multipleStatements: true,
};

// Feedback types available
type FeedbackType = 'star' | 'like' | 'comment' | 'borrow' | 'reserve' | 'read';

// Configuration
// INCREASED: More feedback per user = less sparse data = better accuracy
const FEEDBACK_PER_USER_MIN = 20; // Minimum feedback per user (was 5)
const FEEDBACK_PER_USER_MAX = 80; // Maximum feedback per user (was 30)

// Structure: [Opening] + [Main Content] + [Conclusion]
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
  'Finally finished and',
  'Just wow!',
  "Can't believe",
  'After reading this,',
  'From start to finish,',
  'Page after page,',
  'Every chapter',
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
  'it provides a new angle on complex topics',
  'the analysis is insightful and persuasive',
  'complex subjects are explained clearly',
  'it evokes a wide range of emotions',
  'the pacing keeps you hooked throughout',
  'the research behind this is impressive',
  'the themes explored are thought-provoking',
  'the storytelling is masterful and gripping',
  'the descriptions are rich and atmospheric',
  'it challenges conventional thinking',
  'the examples used are relevant and helpful',
  'the narrative voice is authentic and compelling',
  'it balances depth with accessibility perfectly',
  'the arguments are well-supported and convincing',
  'the world-building is detailed and immersive',
  'the dialogue feels natural and realistic',
  'it keeps you guessing until the very end',
  'the emotional depth is truly touching',
  'the concepts are presented brilliantly',
  'every word seems carefully chosen',
  'the structure makes it easy to digest',
  'it offers actionable insights and advice',
  "the author's expertise shines through",
  'the narrative arc is satisfying and complete',
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
  'My new favorite book.',
  'Would read a hundred times over.',
  'This deserves all the praise.',
  'A solid 10/10.',
  'Bookmarked for future re-reads.',
  'Pure literary gold!',
  'Everyone needs this in their collection.',
  'Absolutely worth your time.',
  'Left me wanting more!',
  "A hidden gem I'm glad I found.",
  'This book changed my perspective.',
  'Instant classic in my opinion.',
];

/**
 * Generate random comment using Sentence Mixing strategy
 * Structure: [Opening] + [Main Content] + [Conclusion]
 */
function generateRandomComment(): string {
  const opening = COMMENT_OPENINGS[Math.floor(Math.random() * COMMENT_OPENINGS.length)];
  const mainContent =
    COMMENT_MAIN_CONTENTS[Math.floor(Math.random() * COMMENT_MAIN_CONTENTS.length)];
  const conclusion = COMMENT_CONCLUSIONS[Math.floor(Math.random() * COMMENT_CONCLUSIONS.length)];

  return `${opening} ${mainContent}. ${conclusion}`;
}

/**
 * Generate random date within the last year
 */
function generateRandomDate(): Date {
  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const randomTime = oneYearAgo.getTime() + Math.random() * (now.getTime() - oneYearAgo.getTime());
  return new Date(randomTime);
}

/**
 * Mock feedback for a single user
 */
async function mockFeedbackForUser(
  connection: mysql.Connection,
  userId: number,
  gorseUserId: string,
  bookIds: number[]
): Promise<{
  star: number;
  like: number;
  comment: number;
  borrow: number;
  reserve: number;
  read: number;
}> {
  const counts = {
    star: 0,
    like: 0,
    comment: 0,
    borrow: 0,
    reserve: 0,
    read: 0,
  };

  // Determine how many feedback this user will have
  const numFeedback = Math.floor(
    Math.random() * (FEEDBACK_PER_USER_MAX - FEEDBACK_PER_USER_MIN + 1) + FEEDBACK_PER_USER_MIN
  );

  // Randomly select books for this user (avoid duplicates)
  const selectedBookIds = [...bookIds]
    .sort(() => 0.5 - Math.random())
    .slice(0, Math.min(numFeedback, bookIds.length));

  // Create a set to track which (user_id, item_id, feedback_type) combinations we've used
  const usedCombinations = new Set<string>();

  for (const bookId of selectedBookIds) {
    const itemId = `book_${bookId}`;
    const timeStamp = generateRandomDate();

    // Randomly decide which feedback types to create for this book
    // A user can have multiple feedback types for the same book

    // "read" - most common, users read/view many books
    // Value = 1 (basic read signal - weakest positive signal)
    if (Math.random() < 0.7) {
      const key = `${gorseUserId}_${itemId}_read`;
      if (!usedCombinations.has(key)) {
        try {
          await connection.execute(
            `INSERT IGNORE INTO feedback (feedback_type, user_id, item_id, time_stamp, comment, value)
             VALUES (?, ?, ?, ?, ?, ?)`,
            ['read', gorseUserId, itemId, timeStamp, '', 1]
          );
          counts.read++;
          usedCombinations.add(key);
        } catch {
          // Ignore duplicate errors
        }
      }
    }

    // "like" - users like some books they view
    // Value = 4 (high signal - explicit user preference)
    if (Math.random() < 0.4) {
      const key = `${gorseUserId}_${itemId}_like`;
      if (!usedCombinations.has(key)) {
        try {
          await connection.execute(
            `INSERT IGNORE INTO feedback (feedback_type, user_id, item_id, time_stamp, comment, value)
             VALUES (?, ?, ?, ?, ?, ?)`,
            ['like', gorseUserId, itemId, timeStamp, '', 4]
          );
          counts.like++;
          usedCombinations.add(key);
        } catch {
          // Ignore duplicate errors
        }
      }
    }

    // "reserve" - users reserve books they're interested in
    // Value = 4 (high signal - user wants to borrow)
    if (Math.random() < 0.3) {
      const key = `${gorseUserId}_${itemId}_reserve`;
      if (!usedCombinations.has(key)) {
        try {
          await connection.execute(
            `INSERT IGNORE INTO feedback (feedback_type, user_id, item_id, time_stamp, comment, value)
             VALUES (?, ?, ?, ?, ?, ?)`,
            ['reserve', gorseUserId, itemId, timeStamp, '', 4]
          );
          counts.reserve++;
          usedCombinations.add(key);
        } catch {
          // Ignore duplicate errors
        }
      }
    }

    // "borrow" - users borrow books they reserved or liked
    // Value = 5 (highest signal - user actually borrowed the book)
    if (Math.random() < 0.25) {
      const key = `${gorseUserId}_${itemId}_borrow`;
      if (!usedCombinations.has(key)) {
        try {
          await connection.execute(
            `INSERT IGNORE INTO feedback (feedback_type, user_id, item_id, time_stamp, comment, value)
             VALUES (?, ?, ?, ?, ?, ?)`,
            ['borrow', gorseUserId, itemId, timeStamp, '', 5]
          );
          counts.borrow++;
          usedCombinations.add(key);
        } catch {
          // Ignore duplicate errors
        }
      }
    }

    // "star" - users rate books they read (only 4-5 stars)
    // Value = random 4-5 (actual rating value)
    if (Math.random() < 0.15) {
      const key = `${gorseUserId}_${itemId}_star`;
      if (!usedCombinations.has(key)) {
        try {
          const rating = Math.floor(Math.random() * 2) + 4; // Random rating 4-5
          await connection.execute(
            `INSERT IGNORE INTO feedback (feedback_type, user_id, item_id, time_stamp, comment, value)
             VALUES (?, ?, ?, ?, ?, ?)`,
            ['star', gorseUserId, itemId, timeStamp, '', rating]
          );
          counts.star++;
          usedCombinations.add(key);
        } catch {
          // Ignore duplicate errors
        }
      }
    }

    // "comment" - users comment on books they read and liked
    // Value = 3 (medium signal - shows engagement but not necessarily positive)
    if (Math.random() < 0.1) {
      const key = `${gorseUserId}_${itemId}_comment`;
      if (!usedCombinations.has(key)) {
        try {
          const comment = generateRandomComment();
          await connection.execute(
            `INSERT IGNORE INTO feedback (feedback_type, user_id, item_id, time_stamp, comment, value)
             VALUES (?, ?, ?, ?, ?, ?)`,
            ['comment', gorseUserId, itemId, timeStamp, comment, 3]
          );

          // Also save to library database as Review
          const rating = Math.floor(Math.random() * 2) + 4; // Random rating 4-5

          await prisma.review.create({
            data: {
              userId: userId,
              bookId: bookId,
              rating: rating,
              reviewText: comment,
              reviewDate: timeStamp,
              createdAt: timeStamp,
              updatedAt: timeStamp,
            },
          });

          counts.comment++;
          usedCombinations.add(key);
        } catch {
          // Ignore duplicate errors
        }
      }
    }
  }

  return counts;
}

/**
 * Main function to mock feedback
 */
async function mockFeedback() {
  console.log('Starting to mock feedback into Gorse database...\n');

  // Test Gorse database connection
  const connection = await mysql.createConnection(gorseDbConfig);
  try {
    await connection.ping();
    console.log('Connected to Gorse database\n');
  } catch (error) {
    console.error('Failed to connect to Gorse database:', error);
    throw error;
  }

  // Get users from library database (READER role only)
  console.log('Fetching users from library database...');
  const users = await prisma.user.findMany({
    where: {
      isDeleted: false,
      role: Role.READER,
    },
    select: {
      id: true,
      fullName: true,
    },
  });

  if (users.length === 0) {
    console.log('No users found in library database. Please seed users first.');
    await connection.end();
    return;
  }

  console.log(`Found ${users.length} users\n`);

  // Get books from library database
  console.log('Fetching books from library database...');
  const books = await prisma.book.findMany({
    where: {
      isDeleted: false,
    },
    select: {
      id: true,
    },
  });

  if (books.length === 0) {
    console.log('No books found in library database. Please seed books first.');
    await connection.end();
    return;
  }

  console.log(`Found ${books.length} books\n`);

  const bookIds = books.map(b => b.id);

  // Mock feedback for each user
  console.log('Creating mock feedback...\n');
  const totalCounts = {
    star: 0,
    like: 0,
    comment: 0,
    borrow: 0,
    reserve: 0,
    read: 0,
  };

  const BATCH_SIZE = 50; // Process users in batches
  let processedUsers = 0;

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);

    for (const user of batch) {
      const gorseUserId = `user_${user.id}`;
      const counts = await mockFeedbackForUser(connection, user.id, gorseUserId, bookIds);

      // Add to totals
      Object.keys(counts).forEach(key => {
        totalCounts[key as FeedbackType] += counts[key as FeedbackType];
      });

      processedUsers++;
      if (processedUsers % 100 === 0) {
        console.log(`Processed ${processedUsers}/${users.length} users...`);
      }
    }

    // Small delay between batches
    if (i + BATCH_SIZE < users.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  await connection.end();

  // Get final count from database
  const finalConnection = await mysql.createConnection(gorseDbConfig);
  const [result] = await finalConnection.execute('SELECT COUNT(*) as total FROM feedback');
  const totalFeedback =
    Array.isArray(result) && result.length > 0 ? (result[0] as { total: number }).total : 0;
  await finalConnection.end();

  console.log('\n Mock feedback completed successfully!\n');
  console.log('=== Summary ===');
  console.log(`   Total users processed: ${users.length}`);
  console.log(`   Total books available: ${books.length}`);
  console.log(`   Total feedback created: ${totalFeedback}`);
  console.log('\n   Feedback breakdown:');
  console.log(`   - "read": ${totalCounts.read}`);
  console.log(`   - "like": ${totalCounts.like}`);
  console.log(`   - "reserve": ${totalCounts.reserve}`);
  console.log(`   - "borrow": ${totalCounts.borrow}`);
  console.log(`   - "star": ${totalCounts.star}`);
  console.log(`   - "comment": ${totalCounts.comment}`);
  console.log('\nNext steps:');
  console.log('   1. Restart Gorse: docker compose restart gorse');
  console.log('   2. Check Gorse dashboard to see the feedback data');
  console.log('   3. Wait for Gorse to process the feedback and generate recommendations');
}

/**
 * Main function
 */
async function main() {
  try {
    await mockFeedback();
  } catch (error) {
    console.error('Error mocking feedback:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
