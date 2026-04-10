'use client';

import { BookItemForm } from '@/components';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function EditBookCopyContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const bookItemId = parseInt(params.id as string);
  const bookId = searchParams.get('bookId');

  return (
    <BookItemForm
      bookItemId={bookItemId}
      submitLabel="Update Book Copy"
      cancelLabel="Cancel"
      bookId={bookId ? Number(bookId) : undefined}
    />
  );
}

export default function EditBookCopyPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditBookCopyContent />
    </Suspense>
  );
}
