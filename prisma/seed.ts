import { Condition, ItemStatus, PrismaClient, Role, Unit, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Get default admin credentials from environment variables
const DEFAULT_ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL;
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD;
const DEFAULT_ADMIN_FULLNAME = process.env.DEFAULT_ADMIN_FULLNAME;

async function seedAdmin() {
  console.log('Seeding default admin...');

  // Check if there are any admin users
  const existingAdmin = await prisma.user.findFirst({
    where: {
      role: Role.ADMIN,
      isDeleted: false,
    },
  });

  if (existingAdmin) {
    console.log('Admin user already exists. Skipping admin seed.');
    console.log(`Email: ${existingAdmin.email}`);
    return;
  }

  // Create default admin user
  const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD!, 12);

  const adminUser = await prisma.user.create({
    data: {
      fullName: DEFAULT_ADMIN_FULLNAME!,
      email: DEFAULT_ADMIN_EMAIL!,
      password: hashedPassword,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      phoneNumber: null,
      address: null,
    },
  });

  console.log('✅ Default Admin user created successfully!');
  console.log(`Email: ${adminUser.email}`);
  console.log(`Password: ${DEFAULT_ADMIN_PASSWORD}`);
}

async function seedBookItems() {
  console.log('Seeding book items...');

  const count = await prisma.bookItem.count();
  if (count > 0) {
    console.log(`Book items already seeded (${count} records). Skipping book item seed.`);
    return;
  }

  // Check how many books exist
  const bookCount = await prisma.book.count();
  console.log(`Found ${bookCount} books in database`);

  const bookItems = [];

  // Generate 5 book items for each book (bookId 1 to actual book count)
  for (let bookId = 1; bookId <= bookCount; bookId++) {
    for (let itemNumber = 1; itemNumber <= 5; itemNumber++) {
      const code = `BK${bookId.toString().padStart(3, '0')}-${itemNumber.toString().padStart(2, '0')}`;

      // Random condition and status
      const conditions = [Condition.NEW, Condition.GOOD, Condition.WORN, Condition.DAMAGED];
      const statuses = [
        ItemStatus.AVAILABLE,
        ItemStatus.ON_BORROW,
        ItemStatus.RESERVED,
        ItemStatus.MAINTENANCE,
      ];

      const condition = conditions[Math.floor(Math.random() * conditions.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      // Random acquisition date within the last 2 years
      const acquisitionDate = new Date();
      acquisitionDate.setDate(acquisitionDate.getDate() - Math.floor(Math.random() * 730));

      bookItems.push({
        bookId,
        code,
        condition,
        status,
        acquisitionDate,
      });
    }
  }

  await prisma.bookItem.createMany({
    data: bookItems,
  });

  console.log('✅ Book items seeded successfully!');
}

async function seedPolicies() {
  console.log('Seeding policies...');

  const policies = [
    {
      id: 'LOST_BOOK',
      name: 'Lost Book',
      amount: 100,
      unit: Unit.FIXED,
    },
    {
      id: 'DAMAGED_BOOK',
      name: 'Severely Damaged Book',
      amount: 100,
      unit: Unit.FIXED,
    },
    {
      id: 'WORN_BOOK',
      name: 'Worn Book',
      amount: 50,
      unit: Unit.FIXED,
    },
    {
      id: 'LATE_RETURN',
      name: 'Late Return',
      amount: 10000,
      unit: Unit.PER_DAY,
    },
    {
      id: 'LATE_PAYMENT',
      name: 'Late Payment',
      amount: 5000,
      unit: Unit.PER_DAY,
    },
  ];

  // Upsert policies (create if not exists, update if exists)
  for (const policy of policies) {
    await prisma.policy.upsert({
      where: { id: policy.id },
      update: {
        name: policy.name,
        amount: policy.amount,
        unit: policy.unit,
      },
      create: policy,
    });
  }

  console.log('✅ Policies seeded successfully!');
}

async function main() {
  console.log('Starting seed...');
  if (!DEFAULT_ADMIN_EMAIL || !DEFAULT_ADMIN_PASSWORD || !DEFAULT_ADMIN_FULLNAME) {
    throw new Error('⚠️ Missing required admin environment variables in .env');
  }

  await seedAdmin();
  await seedBookItems();
  await seedPolicies();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async e => {
    console.error('❌ Error during seed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
