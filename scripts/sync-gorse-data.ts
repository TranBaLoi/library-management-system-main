/**
 * Script to sync data from Library Management System to Gorse Recommender System
 *
 * This script:
 * 1. Syncs books from library DB to Gorse items
 * 2. Syncs users from library DB to Gorse users
 * 3. Syncs feedback based on reviews, favorites, borrow records, and borrow requests
 */

import { PrismaClient } from '@prisma/client';
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

/**
 * Sync books to Gorse items
 */
async function syncBooksToItems() {
  console.log('Syncing books to Gorse items...');

  const books = await prisma.book.findMany({
    where: { isDeleted: false },
    include: {
      author: true,
      bookCategories: {
        include: {
          category: true,
        },
      },
    },
    take: 1000, // Limit to avoid memory issues
  });

  console.log(`Found ${books.length} books to sync`);

  const connection = await mysql.createConnection(gorseDbConfig);

  let inserted = 0;
  let updated = 0;

  for (const book of books) {
    const itemId = `book_${book.id}`;

    // Extract categories as JSON array
    const categories = book.bookCategories.map(bc => bc.category.name).filter(Boolean);

    // Create labels from book metadata
    const labels: string[] = [];
    if (book.language) labels.push(book.language);
    if (book.author) {
      labels.push(book.author.fullName);
    }
    if (book.subtitle) {
      labels.push(book.subtitle);
    }

    // Check if item exists
    const [existing] = await connection.execute('SELECT item_id FROM items WHERE item_id = ?', [
      itemId,
    ]);

    const categoriesJson = JSON.stringify(categories);
    const labelsJson = JSON.stringify(labels);
    const comment = book.description || '';
    const timeStamp = book.createdAt || new Date();

    if (Array.isArray(existing) && existing.length > 0) {
      // Update existing item
      await connection.execute(
        `UPDATE items 
         SET time_stamp = ?, labels = ?, comment = ?, categories = ?
         WHERE item_id = ?`,
        [timeStamp, labelsJson, comment, categoriesJson, itemId]
      );
      updated++;
    } else {
      // Insert new item
      await connection.execute(
        `INSERT INTO items (item_id, time_stamp, labels, comment, is_hidden, categories)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [itemId, timeStamp, labelsJson, comment, 0, categoriesJson]
      );
      inserted++;
    }
  }

  await connection.end();
  console.log(`Synced ${inserted} new items, updated ${updated} existing items`);
}

/**
 * Sync users to Gorse users
 * Includes user interests as labels for better recommendations
 */
async function syncUsersToGorse() {
  console.log('Syncing users to Gorse...');

  const users = await prisma.user.findMany({
    where: { isDeleted: false, role: 'READER' }, // Only sync READER users
    select: {
      id: true,
      fullName: true,
      interest: true, // Include interest field
    },
    take: 1000,
  });

  console.log(`Found ${users.length} users to sync`);

  const connection = await mysql.createConnection(gorseDbConfig);

  let inserted = 0;
  let updated = 0;
  let usersWithInterests = 0;

  for (const user of users) {
    const userId = `user_${user.id}`;

    // Create labels from user interests
    const labels: string[] = [];

    // Parse user interests from JSON string
    if (user.interest) {
      try {
        const interests = JSON.parse(user.interest);
        if (Array.isArray(interests)) {
          // Add each interest as a label (keep original category name)
          interests.forEach((interest: string) => {
            if (typeof interest === 'string' && interest.trim()) {
              labels.push(interest.trim());
            }
          });
          if (labels.length > 0) {
            usersWithInterests++;
          }
        }
      } catch (e) {
        console.warn(`  Warning: Failed to parse interests for user ${user.id}:`, e);
      }
    }

    // Check if user exists
    const [existing] = await connection.execute('SELECT user_id FROM users WHERE user_id = ?', [
      userId,
    ]);

    const labelsJson = JSON.stringify(labels);
    const comment = user.fullName || '';

    if (Array.isArray(existing) && existing.length > 0) {
      // Update existing user
      await connection.execute(
        `UPDATE users 
         SET labels = ?, comment = ?
         WHERE user_id = ?`,
        [labelsJson, comment, userId]
      );
      updated++;
    } else {
      // Insert new user
      await connection.execute(
        `INSERT INTO users (user_id, labels, comment)
         VALUES (?, ?, ?)`,
        [userId, labelsJson, comment]
      );
      inserted++;
    }
  }

  await connection.end();
  console.log(`Synced ${inserted} new users, updated ${updated} existing users`);
  console.log(`  - ${usersWithInterests} users have interests synced as labels`);
}

/**
 * Sync feedback from reviews, favorites, borrow records, and borrow requests
 */
async function syncFeedback() {
  console.log('Syncing feedback (reviews, favorites, borrows)...');

  const connection = await mysql.createConnection(gorseDbConfig);

  // 1. Sync reviews as "star" feedback (for ratings >= 4)
  console.log('  - Syncing reviews as "star" feedback...');
  const reviews = await prisma.review.findMany({
    where: { isDeleted: false },
    take: 5000,
  });

  let starFeedback = 0;
  for (const review of reviews) {
    const userId = `user_${review.userId}`;
    const itemId = `book_${review.bookId}`;
    const timeStamp = review.createdAt || new Date();

    // Only create "star" feedback for good ratings (4-5 stars)
    // Value = actual rating (4 or 5) to preserve rating strength
    // Include review text as comment
    if (review.rating >= 4) {
      try {
        const comment = review.reviewText?.trim() || '';
        await connection.execute(
          `INSERT IGNORE INTO feedback (feedback_type, user_id, item_id, time_stamp, comment, value)
           VALUES (?, ?, ?, ?, ?, ?)`,
          ['star', userId, itemId, timeStamp, comment, review.rating]
        );
        starFeedback++;
      } catch {
        // Ignore duplicate errors
      }
    }
  }
  console.log(`    Created ${starFeedback} "star" feedback (ratings >= 4)`);

  // 2. Sync favorites as "like" feedback
  console.log('  - Syncing favorites as "like" feedback...');
  const favorites = await prisma.userFavoriteBook.findMany({
    where: { isDeleted: false },
    take: 5000,
  });

  let favoriteFeedback = 0;
  for (const favorite of favorites) {
    const userId = `user_${favorite.userId}`;
    const itemId = `book_${favorite.bookId}`;
    const feedbackType = 'like';
    const timeStamp = favorite.createdAt || new Date();

    // Value = 4 (high signal - explicit user preference)
    try {
      await connection.execute(
        `INSERT IGNORE INTO feedback (feedback_type, user_id, item_id, time_stamp, comment, value)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [feedbackType, userId, itemId, timeStamp, '', 4]
      );
      favoriteFeedback++;
    } catch {
      // Ignore duplicate errors
    }
  }
  console.log(`    Created ${favoriteFeedback} "like" feedback from favorites`);

  // 3. Sync borrow records as "read" feedback
  console.log('  - Syncing borrow records as "read" feedback...');
  const borrowRecords = await prisma.borrowRecord.findMany({
    where: { isDeleted: false, status: 'RETURNED' },
    include: {
      borrowBooks: {
        include: {
          bookItem: {
            include: {
              book: true,
            },
          },
        },
      },
    },
    take: 5000,
  });

  let readFeedback = 0;
  for (const record of borrowRecords) {
    const userId = `user_${record.userId}`;

    // Process each book in the borrow record
    for (const borrowBook of record.borrowBooks) {
      if (!borrowBook.bookItem) continue;

      const itemId = `book_${borrowBook.bookItem.bookId}`;
      const feedbackType = 'read';
      const timeStamp =
        record.actualReturnDate || record.returnDate || record.borrowDate || new Date();

      // Value = 1 (basic read signal - weakest positive signal)
      try {
        await connection.execute(
          `INSERT IGNORE INTO feedback (feedback_type, user_id, item_id, time_stamp, comment, value)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [feedbackType, userId, itemId, timeStamp, '', 1]
        );
        readFeedback++;
      } catch {
        // Ignore duplicate errors
      }
    }
  }
  console.log(`    Created ${readFeedback} "read" feedback from borrow records`);

  // 4. Sync borrow requests as "borrow" feedback (only for approved/fulfilled)
  console.log('  - Syncing borrow requests as "borrow" feedback...');
  const borrowRequests = await prisma.borrowRequest.findMany({
    where: {
      isDeleted: false,
      status: { in: ['APPROVED', 'FULFILLED'] },
    },
    include: {
      items: true,
    },
    take: 5000,
  });

  let borrowFeedback = 0;
  for (const request of borrowRequests) {
    const userId = `user_${request.userId}`;
    const timeStamp = request.createdAt || new Date();

    for (const item of request.items) {
      const itemId = `book_${item.bookId}`;

      // "borrow" feedback for approved/fulfilled requests
      // Value = 5 (highest signal - user actually borrowed the book)
      try {
        await connection.execute(
          `INSERT IGNORE INTO feedback (feedback_type, user_id, item_id, time_stamp, comment, value)
           VALUES (?, ?, ?, ?, ?, ?)`,
          ['borrow', userId, itemId, timeStamp, '', 5]
        );
        borrowFeedback++;
      } catch {
        // Ignore duplicate errors
      }
    }
  }
  console.log(`    Created ${borrowFeedback} "borrow" feedback from approved/fulfilled requests`);

  await connection.end();

  // Get final count from database (more accurate)
  const finalConnection = await mysql.createConnection(gorseDbConfig);
  const [result] = await finalConnection.execute('SELECT COUNT(*) as total FROM feedback');
  const totalFeedback =
    Array.isArray(result) && result.length > 0 ? (result[0] as { total: number }).total : 0;
  await finalConnection.end();

  console.log(`Total feedback in database: ${totalFeedback}`);
  console.log(
    `   - Synced: ${starFeedback + favoriteFeedback + readFeedback + borrowFeedback} feedback from library database`
  );
}

/**
 * Main function
 */
async function main() {
  console.log('Starting Gorse data sync...\n');

  try {
    // Test Gorse database connection
    const connection = await mysql.createConnection(gorseDbConfig);
    await connection.ping();
    await connection.end();
    console.log('Connected to Gorse database\n');

    // Sync data
    await syncBooksToItems();
    console.log('');

    await syncUsersToGorse();
    console.log('');

    await syncFeedback();
    console.log('');

    console.log('Gorse data sync completed successfully!');
    console.log('\nNext steps:');
    console.log('   1. Restart Gorse: docker compose restart gorse');
    console.log('   2. Check Gorse dashboard to see the data');
    console.log('   3. Wait for Gorse to process the data and generate recommendations');
  } catch (error) {
    console.error('Error syncing data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main().catch(error => {
  console.error(error);
  process.exit(1);
});
