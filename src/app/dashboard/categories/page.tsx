'use client';

import { CategoryApi } from '@/api';
import { Button, CategoryColumns, Dialog, SearchInput, Table, toaster } from '@/components';
import { ROUTES } from '@/constants';
import { useDialog } from '@/lib/hooks';
import { Category } from '@/types';
import { HStack } from '@chakra-ui/react';
import { useCallback, useEffect, useState } from 'react';
import { IoAddSharp } from 'react-icons/io5';

export default function DashboardCategoriesPage() {
  const { dialog, openDialog, handleConfirm, handleCancel } = useDialog();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);

  // Fetch categories from API
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);

      const response = await CategoryApi.getCategories({
        page,
        limit: pageSize,
        search: searchQuery || undefined,
        sortBy: sortBy || undefined,
        sortOrder: sortOrder || undefined,
      });

      setCategories(response.categories);
      setTotal(response.pagination.total);
    } catch {
      toaster.create({
        title: 'Failed',
        description: 'Failed to fetch categories',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery, sortBy, sortOrder]);

  // Fetch categories when page, pageSize, searchQuery changes
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(query);
      setPage(1); // Reset to first page when searching
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  // Handle sort functionality
  const handleSort = (key: string, direction: 'asc' | 'desc' | null) => {
    setSortBy(direction ? key : null);
    setSortOrder(direction);
    setPage(1); // Reset to first page when sorting
  };

  // Handle search input
  const handleSearch = (value: string) => {
    setQuery(value);
  };

  // Handle category status change
  const handleChangeCategoryStatus = (category: Category) => {
    const newIsDeleted = !category.isDeleted;
    const actionText = newIsDeleted ? 'deactivate' : 'activate';

    openDialog({
      title: 'Confirm Change Category Status',
      message: `Do you want to ${actionText} this category "${category.name}"?`,
      confirmText: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Category`,
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await CategoryApi.updateCategory(category.id, { isDeleted: newIsDeleted });
          toaster.create({
            title: 'Success',
            description: `Category ${actionText}d successfully`,
            type: 'success',
          });
          fetchCategories();
        } catch (error) {
          console.error('Error changing category status:', error);
          toaster.create({
            title: 'Error',
            description: `Failed to ${actionText} category`,
            type: 'error',
          });
        }
      },
    });
  };

  // Create columns with status change callback
  const categoryColumns = CategoryColumns(handleChangeCategoryStatus);

  return (
    <>
      <HStack mb={4} gap={4} justifyContent="space-between" alignItems="center">
        <HStack gap={4} alignItems="center">
          <SearchInput
            width="400px"
            placeholder="Search categories by name or description"
            value={query}
            onChange={handleSearch}
          />
        </HStack>
        <Button
          label="Add Category"
          variantType="primary"
          w="auto"
          h="40px"
          px={2}
          fontSize="sm"
          href={ROUTES.DASHBOARD.CATEGORIES_ADD}
          icon={IoAddSharp}
        />
      </HStack>
      <Table
        columns={categoryColumns}
        data={categories}
        page={page}
        pageSize={pageSize}
        total={total}
        loading={loading}
        onPageChange={setPage}
        onPageSizeChange={(size: number) => {
          setPageSize(size);
          setPage(1);
        }}
        onSort={handleSort}
      />

      {/* Status Change Confirmation Dialog */}
      <Dialog
        isOpen={dialog.isOpen}
        onClose={handleCancel}
        title={dialog.title}
        content={dialog.message}
        buttons={[
          {
            label: dialog.cancelText,
            onClick: handleCancel,
            variant: 'secondary',
          },
          {
            label: dialog.confirmText,
            onClick: handleConfirm,
            variant: 'primary',
          },
        ]}
        showCloseButton={false}
      />
    </>
  );
}
