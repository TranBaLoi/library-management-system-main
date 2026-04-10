'use client';

import { CategoryForm } from '@/components';
import { useParams } from 'next/navigation';

export default function EditCategoryPage() {
  const params = useParams();
  const categoryId = Number(params.id);

  return (
    <CategoryForm categoryId={categoryId} submitLabel="Update Category" cancelLabel="Cancel" />
  );
}
