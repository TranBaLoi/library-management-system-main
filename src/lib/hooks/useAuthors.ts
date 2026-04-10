import { AuthorApi } from '@/api';
import { SelectOption } from '@/components';
import { Author } from '@/types';
import { useQuery } from '@tanstack/react-query';

export function useAuthors() {
  return useQuery({
    queryKey: ['authors'],
    queryFn: async (): Promise<Author[]> => {
      return AuthorApi.getAllAuthors();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Helper function to convert authors to SelectOption format
export function useAuthorOptions(): SelectOption[] {
  const { data: authors } = useAuthors();

  return (
    authors?.map(author => ({
      value: author.id.toString(),
      label: author.fullName,
    })) || []
  );
}
