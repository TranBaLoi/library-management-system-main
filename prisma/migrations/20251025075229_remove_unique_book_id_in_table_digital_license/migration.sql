-- DropForeignKey
ALTER TABLE `DigitalLicense` DROP FOREIGN KEY `DigitalLicense_bookId_fkey`;

-- DropIndex
DROP INDEX `DigitalLicense_bookId_key` ON `DigitalLicense`;
