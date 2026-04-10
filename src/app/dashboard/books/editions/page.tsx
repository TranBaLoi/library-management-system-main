'use client';

import { BookEditionsTable } from '@/components';
import { ROUTES } from '@/constants';

export default function BookEditionsPage() {
  return (
    <BookEditionsTable
      showBookName={true} // Show Book Name column when displaying all editions
      searchPlaceholder="Search by ISBN, ID, or status..."
      addButtonHref={ROUTES.DASHBOARD.BOOKS_EDITIONS_ADD}
    />
  );
}
