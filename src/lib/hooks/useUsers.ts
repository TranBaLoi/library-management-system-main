import { UserApi } from '@/api';
import { CreateUserData, PublicUser, UpdateUserData, UserQueryFilters } from '@/types/user';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * Hook to fetch paginated list of users with filters
 */
export function useUsers(filters?: UserQueryFilters) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: async () => UserApi.getUsers(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch all users
 */
export function useAllUsers() {
  return useQuery({
    queryKey: ['users', 'all'],
    queryFn: async (): Promise<PublicUser[]> => {
      return UserApi.getAllUsers();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch single user by ID
 */
export function useUser(id: number | null) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      if (!id) throw new Error('User ID is required');
      return UserApi.getUserById(id);
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to create new user
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserData) => UserApi.createUser(data),
    onSuccess: () => {
      // Invalidate users list to refetch
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

/**
 * Hook to update user
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserData }) =>
      UserApi.updateUser(id, data),
    onSuccess: (updatedUser: PublicUser) => {
      // Invalidate users list
      queryClient.invalidateQueries({ queryKey: ['users'] });
      // Update specific user cache
      queryClient.setQueryData(['users', updatedUser.id], updatedUser);
    },
  });
}

/**
 * Hook to delete users (single or bulk)
 * Uses bulk delete API for both single and multiple user deletions
 */
export function useDeleteUsers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => UserApi.bulkDeleteUsers(ids),
    onSuccess: result => {
      // Invalidate users list to refetch
      queryClient.invalidateQueries({ queryKey: ['users'] });
      return result;
    },
  });
}

/**
 * @deprecated Use useDeleteUsers instead. This hook is kept for backwards compatibility.
 * Hook to bulk delete users
 */
export function useBulkDeleteUsers() {
  return useDeleteUsers();
}
