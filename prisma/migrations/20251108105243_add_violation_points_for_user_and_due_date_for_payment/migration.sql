-- AlterTable
ALTER TABLE `Payment` ADD COLUMN `dueDate` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `violationPoints` INTEGER NOT NULL DEFAULT 0;
