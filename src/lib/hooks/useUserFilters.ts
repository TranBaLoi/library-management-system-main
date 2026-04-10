'use client';

import { UserFilterParams, UserFilterState } from '@/components/users/UserFilterDialog';
import { Role, UserStatus } from '@prisma/client';
import { useCallback, useState } from 'react';

export interface UseUserFiltersReturn {
  // Filter dialog state
  isFilterDialogOpen: boolean;
  openFilterDialog: () => void;
  closeFilterDialog: () => void;

  // Filter state
  filterState: UserFilterState;
  updateFilterState: (newState: Partial<UserFilterState>) => void;

  // Applied filters
  appliedFilters: UserFilterParams;
  setAppliedFilters: (filters: UserFilterParams) => void;

  // Actions
  applyFilters: () => void;
  clearFilters: () => void;
}

export const useUserFilters = (): UseUserFiltersReturn => {
  // Filter dialog state
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);

  // Filter state
  const [filterState, setFilterState] = useState<UserFilterState>({
    selectedRole: '',
    selectedStatus: '',
  });

  // Applied filters
  const [appliedFilters, setAppliedFilters] = useState<UserFilterParams>({});

  const openFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(true);
  }, []);

  const closeFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(false);
  }, []);

  const updateFilterState = useCallback((newState: Partial<UserFilterState>) => {
    setFilterState(prev => ({ ...prev, ...newState }));
  }, []);

  const applyFilters = useCallback(() => {
    const filterParams: UserFilterParams = {
      role: filterState.selectedRole ? (filterState.selectedRole as Role) : undefined,
      status: filterState.selectedStatus ? (filterState.selectedStatus as UserStatus) : undefined,
    };

    setAppliedFilters(filterParams);
    setIsFilterDialogOpen(false);
  }, [filterState]);

  const clearFilters = useCallback(() => {
    setFilterState({
      selectedRole: '',
      selectedStatus: '',
    });
    setAppliedFilters({});
  }, []);

  return {
    isFilterDialogOpen,
    openFilterDialog,
    closeFilterDialog,
    filterState,
    updateFilterState,
    appliedFilters,
    setAppliedFilters,
    applyFilters,
    clearFilters,
  };
};
