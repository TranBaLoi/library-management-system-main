/*
  Warnings:

  - The primary key for the `BorrowEbook` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `licenseId` on the `BorrowEbook` table. All the data in the column will be lost.
  - You are about to drop the `DigitalLicense` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `bookId` to the `BorrowEbook` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `BorrowEbook` DROP FOREIGN KEY `BorrowEbook_licenseId_fkey`;

-- DropForeignKey
ALTER TABLE `DigitalLicense` DROP FOREIGN KEY `DigitalLicense_bookId_fkey`;

-- DropIndex
DROP INDEX `BorrowEbook_licenseId_fkey` ON `BorrowEbook`;

-- AlterTable
ALTER TABLE `BorrowEbook` DROP PRIMARY KEY,
    DROP COLUMN `licenseId`,
    ADD COLUMN `bookId` INTEGER NOT NULL,
    ADD PRIMARY KEY (`borrowId`, `bookId`);

-- DropTable
DROP TABLE `DigitalLicense`;

-- AddForeignKey
ALTER TABLE `BorrowEbook` ADD CONSTRAINT `BorrowEbook_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `Book`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
