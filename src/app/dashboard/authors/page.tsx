'use client';

import { AuthorApi } from '@/api';
import { AuthorColumns, Button, Dialog, SearchInput, Table, toaster } from '@/components';
import { ROUTES } from '@/constants';
import { useDialog } from '@/lib/hooks';
import { Author } from '@/types';
import { HStack } from '@chakra-ui/react';
import { useCallback, useEffect, useState } from 'react';
import { IoAddSharp } from 'react-icons/io5';

export default function AuthorsPage() {
  const { dialog, openDialog, handleConfirm, handleCancel } = useDialog();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);

  // Fetch authors from API
  const fetchAuthors = useCallback(async () => {
    try {
      setLoading(true);

      const response = await AuthorApi.getAuthors({
        page,
        limit: pageSize,
        search: searchQuery || undefined,
        sortBy: sortBy || undefined,
        sortOrder: sortOrder || undefined,
      });

      setAuthors(response.authors);
      setTotal(response.pagination.total);
    } catch {
      toaster.create({
        title: 'Failed',
        description: 'Failed to fetch authors',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery, sortBy, sortOrder]);

  // Fetch authors when page, pageSize, searchQuery changes
  useEffect(() => {
    fetchAuthors();
  }, [fetchAuthors]);

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

  // Handle author status change
  const handleChangeAuthorStatus = (author: Author) => {
    const newIsDeleted = !author.isDeleted;
    const actionText = newIsDeleted ? 'deactivate' : 'activate';

    openDialog({
      title: 'Confirm Change Author Status',
      message: `Do you want to ${actionText} this author "${author.fullName}"?`,
      confirmText: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Author`,
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await AuthorApi.updateAuthor(author.id, { isDeleted: newIsDeleted });
          toaster.create({
            title: 'Success',
            description: `Author ${actionText}d successfully`,
            type: 'success',
          });
          fetchAuthors();
        } catch (error) {
          console.error('Error changing author status:', error);
          toaster.create({
            title: 'Error',
            description: `Failed to ${actionText} author`,
            type: 'error',
          });
        }
      },
    });
  };

  // Create columns with status change callback
  const authorColumns = AuthorColumns(handleChangeAuthorStatus);

  return (
    <>
      <HStack mb={4} gap={4} justifyContent="space-between" alignItems="center">
        <HStack gap={4} alignItems="center">
          <SearchInput
            width="400px"
            placeholder="Search authors by name or nationality"
            value={query}
            onChange={handleSearch}
          />
        </HStack>
        <Button
          label="Add Author"
          variantType="primary"
          w="auto"
          h="40px"
          px={2}
          fontSize="sm"
          href={ROUTES.DASHBOARD.AUTHORS_ADD}
          icon={IoAddSharp}
        />
      </HStack>
      <Table
        columns={authorColumns}
        data={authors}
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
