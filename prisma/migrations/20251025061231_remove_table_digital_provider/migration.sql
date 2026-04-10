/*
  Warnings:

  - You are about to drop the column `availableCopies` on the `DigitalLicense` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `DigitalLicense` table. All the data in the column will be lost.
  - You are about to drop the column `providerId` on the `DigitalLicense` table. All the data in the column will be lost.
  - You are about to drop the `DigitalProvider` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[bookId]` on the table `DigitalLicense` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `DigitalLicense` DROP FOREIGN KEY `DigitalLicense_bookId_fkey`;

-- DropForeignKey
ALTER TABLE `DigitalLicense` DROP FOREIGN KEY `DigitalLicense_providerId_fkey`;

-- DropIndex
DROP INDEX `DigitalLicense_bookId_providerId_key` ON `DigitalLicense`;

-- DropIndex
DROP INDEX `DigitalLicense_providerId_fkey` ON `DigitalLicense`;

-- AlterTable
ALTER TABLE `DigitalLicense` DROP COLUMN `availableCopies`,
    DROP COLUMN `expiresAt`,
    DROP COLUMN `providerId`;

-- DropTable
DROP TABLE `DigitalProvider`;

-- CreateIndex
CREATE UNIQUE INDEX `DigitalLicense_bookId_key` ON `DigitalLicense`(`bookId`);
