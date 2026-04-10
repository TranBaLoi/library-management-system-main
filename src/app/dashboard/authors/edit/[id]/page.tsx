'use client';

import { AuthorForm } from '@/components';
import { useParams } from 'next/navigation';

export default function EditAuthorPage() {
  const params = useParams();
  const authorId = Number(params.id);

  return <AuthorForm authorId={authorId} submitLabel="Update Author" cancelLabel="Cancel" />;
}
