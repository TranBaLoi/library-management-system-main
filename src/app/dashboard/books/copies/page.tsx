'use client';

import { BookItemColumns, BookItemsTable } from '@/components';

export default function BookCopiesPage() {
  // Create columns
  const bookItemColumns = BookItemColumns();

  return <BookItemsTable columns={bookItemColumns} />;
}
