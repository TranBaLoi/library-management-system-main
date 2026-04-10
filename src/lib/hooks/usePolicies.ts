import { PolicyApi } from '@/api';
import { SelectOption } from '@/components';
import { Policy } from '@/types/policy';
import { useQuery } from '@tanstack/react-query';

export function usePolicies() {
  return useQuery({
    queryKey: ['policies'],
    queryFn: async (): Promise<Policy[]> => {
      return PolicyApi.getAllPolicies();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Helper function to convert policies to SelectOption format
export function usePolicyOptions(): SelectOption[] {
  const { data: policies } = usePolicies();

  return (
    policies?.map(policy => ({
      value: policy.id,
      label: policy.name,
    })) || []
  );
}
