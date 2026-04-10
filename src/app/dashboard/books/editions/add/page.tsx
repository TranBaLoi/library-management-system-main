'use client';

import { BookEditionForm } from '@/components';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function AddBookEditionContent() {
  const searchParams = useSearchParams();
  const bookId = searchParams.get('bookId');

  return (
    <BookEditionForm
      submitLabel="Create Edition"
      cancelLabel="Cancel"
      bookId={bookId ? Number(bookId) : undefined}
    />
  );
}

export default function AddBookEditionPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AddBookEditionContent />
    </Suspense>
  );
}
