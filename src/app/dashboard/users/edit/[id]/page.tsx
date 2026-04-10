'use client';

import { UserForm } from '@/components/users';
import { use } from 'react';

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const userId = parseInt(id, 10);

  return <UserForm userId={userId} submitLabel="Update User" />;
}
