import { CategoryApi } from '@/api';
import { SelectOption } from '@/components';
import { Category } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async (): Promise<Category[]> => {
      return CategoryApi.getAllCategories();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Helper hook to convert categories to SelectOption format
export function useCategoryOptions(): SelectOption[] {
  const { data: categories, isLoading } = useCategories();

  return useMemo(() => {
    if (isLoading || !categories) return [];

    return categories.map(category => ({
      value: category.id.toString(),
      label: category.name,
    }));
  }, [categories, isLoading]);
}
