import { PrismaClient, Role, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// List of interest topics
const INTEREST_TOPICS = [
  'computer',
  'programming',
  'technology',
  'science',
  'engineering',
  'business',
  'finance',
  'economics',
  'mathematics',
  'physics',
  'chemistry',
  'biology',
  'medicine',
  'history',
  'philosophy',
  'psychology',
  'sociology',
  'literature',
  'art',
  'music',
  'design',
  'education',
  'law',
  'politics',
  'environment',
  'health',
  'fitness',
  'cooking',
  'travel',
  'sports',
  'gaming',
  'photography',
  'film',
  'theater',
  'fashion',
  'architecture',
  'astronomy',
  'geography',
  'linguistics',
  'religion',
];

// Default password for all mock users
const DEFAULT_PASSWORD = 'Password@123';

/**
 * Generate random interest array as JSON string
 * Each user will have 1-5 random interests
 */
function generateRandomInterests(): string {
  const numInterests = Math.floor(Math.random() * 5) + 1; // 1 to 5 interests
  const shuffled = [...INTEREST_TOPICS].sort(() => 0.5 - Math.random());
  const selectedInterests = shuffled.slice(0, numInterests);
  return JSON.stringify(selectedInterests);
}

/**
 * Generate random Vietnamese full name
 */
function generateRandomFullName(index: number): string {
  const firstNames = [
    'Nguyễn',
    'Trần',
    'Lê',
    'Phạm',
    'Hoàng',
    'Huỳnh',
    'Phan',
    'Vũ',
    'Võ',
    'Đặng',
    'Bùi',
    'Đỗ',
    'Hồ',
    'Ngô',
    'Dương',
    'Lý',
    'Đinh',
    'Đào',
    'Mai',
    'Tạ',
  ];

  const middleNames = [
    'Văn',
    'Thị',
    'Đức',
    'Minh',
    'Quang',
    'Hữu',
    'Thanh',
    'Xuân',
    'Hồng',
    'Thành',
    'Công',
    'Đình',
    'Tuấn',
    'Anh',
    'Hải',
    'Duy',
    'Hoàng',
    'Bảo',
    'Gia',
    'Khánh',
  ];

  const lastNames = [
    'An',
    'Bình',
    'Cường',
    'Dũng',
    'Giang',
    'Hùng',
    'Khang',
    'Long',
    'Minh',
    'Nam',
    'Phong',
    'Quân',
    'Sơn',
    'Thành',
    'Tuấn',
    'Việt',
    'Anh',
    'Bảo',
    'Công',
    'Đức',
    'Gia',
    'Hải',
    'Hoàng',
    'Khánh',
    'Linh',
    'Mai',
    'Nga',
    'Oanh',
    'Phương',
    'Quỳnh',
    'Thảo',
    'Uyên',
    'Vy',
    'Yến',
    'Hương',
    'Lan',
    'My',
    'Nhi',
    'Trang',
    'Vân',
  ];

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const middleName = middleNames[Math.floor(Math.random() * middleNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

  return `${firstName} ${middleName} ${lastName}`;
}

/**
 * Generate random email
 */
function generateRandomEmail(index: number): string {
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'example.com'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  return `user${index}@${domain}`;
}

/**
 * Generate random phone number
 */
function generateRandomPhoneNumber(): string {
  const prefixes = ['090', '091', '092', '093', '094', '095', '096', '097', '098', '099'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(1000000 + Math.random() * 9000000).toString();
  return `${prefix}${suffix}`;
}

/**
 * Generate random address
 */
function generateRandomAddress(): string {
  const streets = [
    'Nguyễn Trãi',
    'Lê Lợi',
    'Trần Hưng Đạo',
    'Hoàng Diệu',
    'Lý Thường Kiệt',
    'Phạm Văn Đồng',
    'Võ Văn Tần',
    'Điện Biên Phủ',
    'Cách Mạng Tháng 8',
    'Nguyễn Văn Cừ',
  ];

  const wards = [
    'Phường 1',
    'Phường 2',
    'Phường 3',
    'Phường 4',
    'Phường 5',
    'Phường Bến Nghé',
    'Phường Đa Kao',
    'Phường Cô Giang',
    'Phường Cầu Kho',
    'Phường Nguyễn Thái Bình',
  ];

  const districts = [
    'Quận 1',
    'Quận 2',
    'Quận 3',
    'Quận 4',
    'Quận 5',
    'Quận 7',
    'Quận 10',
    'Quận 11',
    'Quận Bình Thạnh',
    'Quận Tân Bình',
  ];

  const street = streets[Math.floor(Math.random() * streets.length)];
  const ward = wards[Math.floor(Math.random() * wards.length)];
  const district = districts[Math.floor(Math.random() * districts.length)];
  const number = Math.floor(Math.random() * 500) + 1;

  return `${number} ${street}, ${ward}, ${district}, TP. Hồ Chí Minh`;
}

/**
 * Seed 1000 mock users
 */
async function seedUsers() {
  console.log('Starting to seed 1000 mock users...');

  // Check if users already exist
  const existingUserCount = await prisma.user.count({
    where: {
      role: Role.READER,
      isDeleted: false,
    },
  });

  if (existingUserCount >= 1000) {
    console.log(`Already have ${existingUserCount} users. Skipping user seed.`);
    return;
  }

  // Hash default password once
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  const TOTAL_USERS = 1000;
  const BATCH_SIZE = 100; // Insert in batches to avoid memory issues

  let createdCount = 0;

  for (let i = 0; i < TOTAL_USERS; i += BATCH_SIZE) {
    const batchSize = Math.min(BATCH_SIZE, TOTAL_USERS - i);
    const users = [];

    for (let j = 0; j < batchSize; j++) {
      const index = i + j + 1;
      const interests = generateRandomInterests();

      users.push({
        fullName: generateRandomFullName(index),
        email: generateRandomEmail(index),
        password: hashedPassword,
        phoneNumber: generateRandomPhoneNumber(),
        address: generateRandomAddress(),
        role: Role.READER,
        status: UserStatus.ACTIVE,
        violationPoints: 0,
        interest: interests,
      });
    }

    try {
      await prisma.user.createMany({
        data: users,
        skipDuplicates: true, // Skip if email already exists
      });

      createdCount += users.length;
      console.log(
        `Created batch ${Math.floor(i / BATCH_SIZE) + 1}: ${users.length} users (Total: ${createdCount}/${TOTAL_USERS})`
      );
    } catch (error) {
      console.error(`Error creating batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
    }

    // Small delay between batches to avoid overwhelming the database
    if (i + BATCH_SIZE < TOTAL_USERS) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  const finalCount = await prisma.user.count({
    where: {
      role: Role.READER,
      isDeleted: false,
    },
  });

  console.log(`\n Successfully seeded ${finalCount} users!`);
  console.log(`   Default password for all users: ${DEFAULT_PASSWORD}`);
  console.log(`   Interest topics available: ${INTEREST_TOPICS.length}`);
  console.log(`   Each user has 1-5 random interests stored as JSON array string`);
}

/**
 * Main function
 */
async function main() {
  try {
    await seedUsers();
  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  }
}

// Run the script
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async error => {
    console.error('Fatal error:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
