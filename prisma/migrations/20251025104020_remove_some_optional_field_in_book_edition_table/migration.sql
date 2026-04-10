/*
  Warnings:

  - Made the column `fileFormat` on table `BookEdition` required. This step will fail if there are existing NULL values in that column.
  - Made the column `storageUrl` on table `BookEdition` required. This step will fail if there are existing NULL values in that column.
  - Made the column `drmType` on table `BookEdition` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `BookEdition` MODIFY `fileFormat` ENUM('EPUB', 'PDF', 'MOBI', 'AUDIO_MP3', 'AUDIO_M4B', 'OTHER') NOT NULL DEFAULT 'OTHER',
    MODIFY `storageUrl` VARCHAR(191) NOT NULL,
    MODIFY `drmType` ENUM('NONE', 'WATERMARK', 'ADOBE_DRM', 'LCP', 'CUSTOM') NOT NULL DEFAULT 'NONE';
