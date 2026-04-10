/*
  Warnings:

  - You are about to drop the `Recommendation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserActionLog` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `Recommendation` DROP FOREIGN KEY `Recommendation_bookId_fkey`;

-- DropForeignKey
ALTER TABLE `Recommendation` DROP FOREIGN KEY `Recommendation_userId_fkey`;

-- DropForeignKey
ALTER TABLE `UserActionLog` DROP FOREIGN KEY `UserActionLog_bookId_fkey`;

-- DropForeignKey
ALTER TABLE `UserActionLog` DROP FOREIGN KEY `UserActionLog_userId_fkey`;

-- DropTable
DROP TABLE `Recommendation`;

-- DropTable
DROP TABLE `UserActionLog`;
