-- AddForeignKey
ALTER TABLE `DigitalLicense` ADD CONSTRAINT `DigitalLicense_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `Book`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
