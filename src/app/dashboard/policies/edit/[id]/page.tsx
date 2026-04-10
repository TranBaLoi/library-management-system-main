'use client';

import { PolicyForm } from '@/components';
import { useParams } from 'next/navigation';

export default function EditPolicyPage() {
  const params = useParams();
  const policyId = params.id as string;

  return <PolicyForm policyId={policyId} submitLabel="Update Policy" cancelLabel="Cancel" />;
}
