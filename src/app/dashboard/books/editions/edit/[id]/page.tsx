'use client';

import { BookEditionForm } from '@/components';
import { useParams } from 'next/navigation';
import { Suspense } from 'react';

function EditBookEditionContent() {
  const params = useParams();
  const editionId = parseInt(params.id as string);

  return (
    <BookEditionForm editionId={editionId} submitLabel="Update Edition" cancelLabel="Cancel" />
  );
}

export default function EditBookEditionPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditBookEditionContent />
    </Suspense>
  );
}
