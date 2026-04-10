import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script để cập nhật interests của users sử dụng các category thực từ database
 * Thay vì sử dụng list interests tự tạo, script này sẽ lấy các category name thực từ bảng Category
 *
 * QUAN TRỌNG: Script đảm bảo MỌI category đều được ít nhất MIN_USERS_PER_CATEGORY users quan tâm
 * để tránh tình trạng category không có feedback trong Gorse
 */

// Số users tối thiểu phải quan tâm mỗi category (để đảm bảo có đủ feedback)
const MIN_USERS_PER_CATEGORY = 10;

/**
 * Lấy ngẫu nhiên 1-5 categories từ danh sách categories
 */
function getRandomCategories(categories: string[]): string[] {
  if (categories.length === 0) {
    console.warn('Không có category nào trong database!');
    return [];
  }

  const numInterests = Math.floor(Math.random() * 5) + 1; // 1 đến 5 interests
  const shuffled = [...categories].sort(() => 0.5 - Math.random());
  const selectedCategories = shuffled.slice(0, Math.min(numInterests, categories.length));

  return selectedCategories;
}

/**
 * Phân phối categories đảm bảo mỗi category có ít nhất MIN_USERS_PER_CATEGORY users
 * Sử dụng thuật toán round-robin kết hợp random để đảm bảo coverage
 */
function distributeCategories(categoryNames: string[], userCount: number): Map<number, string[]> {
  // Map: userIndex -> list of categories
  const userInterests = new Map<number, Set<string>>();

  // Khởi tạo set rỗng cho mỗi user
  for (let i = 0; i < userCount; i++) {
    userInterests.set(i, new Set<string>());
  }

  // Đếm số lần mỗi category được gán
  const categoryCounts = new Map<string, number>();
  categoryNames.forEach(cat => categoryCounts.set(cat, 0));

  // PHASE 1: Đảm bảo minimum coverage cho mỗi category
  // Dùng round-robin để phân phối đều
  console.log(`\nPHASE 1: Dam bao moi category co it nhat ${MIN_USERS_PER_CATEGORY} users...`);

  for (const category of categoryNames) {
    // Lấy danh sách users chưa có category này, ưu tiên users có ít interests
    const availableUsers = Array.from(userInterests.entries())
      .filter(([, interests]) => !interests.has(category) && interests.size < 5)
      .sort((a, b) => a[1].size - b[1].size) // Ưu tiên users có ít interests
      .map(([idx]) => idx);

    // Gán category cho MIN_USERS_PER_CATEGORY users
    const usersToAssign = Math.min(MIN_USERS_PER_CATEGORY, availableUsers.length);
    for (let i = 0; i < usersToAssign; i++) {
      const userIdx = availableUsers[i];
      userInterests.get(userIdx)!.add(category);
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    }
  }

  // PHASE 2: Thêm random interests cho users có ít hơn 2 interests
  console.log('PHASE 2: Bo sung random interests cho users co it interests...');

  for (let userIdx = 0; userIdx < userCount; userIdx++) {
    const interests = userInterests.get(userIdx)!;

    // Nếu user có ít hơn 2 interests, thêm random
    while (interests.size < 2) {
      const availableCategories = categoryNames.filter(cat => !interests.has(cat));
      if (availableCategories.length === 0) break;

      // Ưu tiên categories có ít users
      availableCategories.sort(
        (a, b) => (categoryCounts.get(a) || 0) - (categoryCounts.get(b) || 0)
      );

      const category = availableCategories[0];
      interests.add(category);
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    }
  }

  // Convert Set to Array
  const result = new Map<number, string[]>();
  for (const [idx, interests] of userInterests) {
    result.set(idx, Array.from(interests));
  }

  // Log thống kê coverage
  console.log('\nThong ke category coverage:');
  const sortedCounts = Array.from(categoryCounts.entries()).sort((a, b) => a[1] - b[1]);
  const minCoverage = sortedCounts[0];
  const maxCoverage = sortedCounts[sortedCounts.length - 1];
  console.log(`   Min: ${minCoverage[0]} = ${minCoverage[1]} users`);
  console.log(`   Max: ${maxCoverage[0]} = ${maxCoverage[1]} users`);

  // Cảnh báo nếu có category coverage thấp
  const lowCoverage = sortedCounts.filter(([, count]) => count < MIN_USERS_PER_CATEGORY);
  if (lowCoverage.length > 0) {
    console.log(
      `\n   CANH BAO: ${lowCoverage.length} categories co it hon ${MIN_USERS_PER_CATEGORY} users:`
    );
    lowCoverage.forEach(([cat, count]) => {
      console.log(`      - ${cat}: ${count} users`);
    });
  } else {
    console.log(
      `   Tat ca ${categoryNames.length} categories deu co >= ${MIN_USERS_PER_CATEGORY} users`
    );
  }

  return result;
}

/**
 * Cập nhật interests cho tất cả users dựa trên categories thực
 */
async function updateUserInterests() {
  console.log('Bắt đầu cập nhật interests của users từ categories thực...\n');

  // 1. Lấy tất cả categories từ database
  const categories = await prisma.category.findMany({
    where: {
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (categories.length === 0) {
    console.error('Không tìm thấy category nào trong database!');
    console.log('   Vui lòng seed categories trước khi chạy script này.');
    return;
  }

  console.log(`Tìm thấy ${categories.length} categories trong database:`);
  categories.forEach((cat, index) => {
    console.log(`   ${index + 1}. ${cat.name}`);
  });
  console.log();

  // Lấy danh sách tên category để sử dụng
  const categoryNames = categories.map(cat => cat.name);

  // 2. Lấy tất cả users cần cập nhật (READER role)
  const users = await prisma.user.findMany({
    where: {
      role: Role.READER,
      isDeleted: false,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  });

  console.log(`Tìm thấy ${users.length} users cần cập nhật interests.\n`);

  if (users.length === 0) {
    console.log('Không có user nào cần cập nhật.');
    return;
  }

  // 3. Phân phối categories đảm bảo coverage
  console.log('Phân phối categories với đảm bảo minimum coverage...');
  const distributedInterests = distributeCategories(categoryNames, users.length);

  // 4. Cập nhật interests cho từng user theo batch
  const BATCH_SIZE = 100;
  let updatedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batchUsers = users.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(users.length / BATCH_SIZE);

    console.log(`Đang xử lý batch ${batchNumber}/${totalBatches} (${batchUsers.length} users)...`);

    // Tạo các promises để cập nhật đồng thời trong batch
    const updatePromises = batchUsers.map(async (user, batchIndex) => {
      try {
        const userIndex = i + batchIndex;
        const interests = distributedInterests.get(userIndex) || getRandomCategories(categoryNames);
        const interestJson = JSON.stringify(interests);

        await prisma.user.update({
          where: { id: user.id },
          data: { interest: interestJson },
        });

        return { success: true, userId: user.id };
      } catch (error) {
        console.error(`   Lỗi cập nhật user ${user.id} (${user.email}):`, error);
        return { success: false, userId: user.id };
      }
    });

    const results = await Promise.all(updatePromises);
    const batchSuccessCount = results.filter(r => r.success).length;
    const batchErrorCount = results.filter(r => !r.success).length;

    updatedCount += batchSuccessCount;
    errorCount += batchErrorCount;

    console.log(`   Hoàn thành: ${batchSuccessCount} thành công, ${batchErrorCount} lỗi`);

    // Delay nhỏ giữa các batch để tránh quá tải database
    if (i + BATCH_SIZE < users.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  // 5. Thống kê kết quả
  console.log('\n' + '='.repeat(50));
  console.log('KẾT QUẢ CẬP NHẬT INTERESTS');
  console.log('='.repeat(50));
  console.log(`   Thành công: ${updatedCount} users`);
  console.log(`   Lỗi: ${errorCount} users`);
  console.log(`   Sử dụng ${categoryNames.length} categories từ database`);
  console.log(`   Đảm bảo mỗi category có ít nhất ${MIN_USERS_PER_CATEGORY} users quan tâm`);
  console.log('='.repeat(50));

  // 5. Hiển thị mẫu một số users đã cập nhật
  console.log('\nMẫu 5 users đã cập nhật:');
  const sampleUsers = await prisma.user.findMany({
    where: {
      role: Role.READER,
      isDeleted: false,
      interest: { not: null },
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      interest: true,
    },
    take: 5,
  });

  sampleUsers.forEach((user, index) => {
    try {
      const interests = user.interest ? JSON.parse(user.interest) : [];
      console.log(`   ${index + 1}. ${user.fullName} (${user.email})`);
      console.log(`      Interests: ${interests.join(', ')}`);
    } catch {
      console.log(`   ${index + 1}. ${user.fullName} - Lỗi parse interests`);
    }
  });
}

/**
 * Dry run - chỉ hiển thị thông tin mà không cập nhật
 */
async function dryRun() {
  console.log('DRY RUN MODE - Chỉ xem trước, không cập nhật\n');

  // Lấy categories
  const categories = await prisma.category.findMany({
    where: { isDeleted: false },
    select: { name: true },
  });

  console.log(`Categories hiện có (${categories.length}):`);
  categories.forEach((cat, index) => {
    console.log(`   ${index + 1}. ${cat.name}`);
  });

  // Đếm users
  const userCount = await prisma.user.count({
    where: {
      role: Role.READER,
      isDeleted: false,
    },
  });

  console.log(`\nSố users sẽ được cập nhật: ${userCount}`);

  // Kiểm tra khả năng coverage
  const categoryNames = categories.map(cat => cat.name);
  const minUsersNeeded = categoryNames.length * MIN_USERS_PER_CATEGORY;

  console.log('\n--- Phân tích Coverage ---');
  console.log(`   Số categories: ${categoryNames.length}`);
  console.log(`   Min users/category: ${MIN_USERS_PER_CATEGORY}`);
  console.log(`   Tổng users cần thiết (lý tưởng): ${minUsersNeeded}`);
  console.log(`   Tổng users hiện có: ${userCount}`);

  if (userCount * 5 < minUsersNeeded) {
    console.log(`\n   CẢNH BÁO: Có thể không đủ users để đảm bảo coverage!`);
    console.log(
      `   Mỗi user có tối đa 5 interests, cần ít nhất ${Math.ceil(minUsersNeeded / 5)} users.`
    );
  } else {
    console.log(
      `\n   OK: Đủ users để đảm bảo mỗi category có >= ${MIN_USERS_PER_CATEGORY} users quan tâm.`
    );
  }

  // Mẫu phân phối
  console.log('\nMẫu phân phối interests (5 users đầu tiên):');
  const sampleDistribution = distributeCategories(categoryNames, Math.min(userCount, 20));
  for (let i = 0; i < Math.min(5, userCount); i++) {
    const interests = sampleDistribution.get(i) || [];
    console.log(`   User ${i + 1}: ${interests.join(', ')}`);
  }

  console.log('\nChạy script với --update để thực hiện cập nhật thực sự.');
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--dry-run') || args.includes('-d')) {
    await dryRun();
  } else if (args.includes('--update') || args.includes('-u')) {
    await updateUserInterests();
  } else {
    console.log('Script cập nhật User interests từ Categories thực\n');
    console.log('Cách sử dụng:');
    console.log('  npx ts-node prisma/update-user-interests.ts --dry-run   # Xem trước');
    console.log('  npx ts-node prisma/update-user-interests.ts --update    # Thực hiện cập nhật');
    console.log('\nViết tắt:');
    console.log('  -d  thay cho --dry-run');
    console.log('  -u  thay cho --update');
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
