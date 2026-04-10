'use client';

import { BookItemForm } from '@/components';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function AddBookCopyContent() {
  const searchParams = useSearchParams();
  const bookId = searchParams.get('bookId');

  return (
    <BookItemForm
      submitLabel="Add Book Copy"
      cancelLabel="Cancel"
      bookId={bookId ? Number(bookId) : undefined}
    />
  );
}

export default function AddBookCopyPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AddBookCopyContent />
    </Suspense>
  );
}
