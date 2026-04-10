'use client';

import { BookForm } from '@/components';
import { useParams } from 'next/navigation';

export default function EditBookPage() {
  const params = useParams();
  const bookId = Number(params.id);

  return <BookForm bookId={bookId} submitLabel="Update Book" cancelLabel="Cancel" />;
}
