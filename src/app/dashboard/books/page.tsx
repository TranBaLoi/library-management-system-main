'use client';

import { BookApi } from '@/api';
import {
  BookColumns,
  BookFilterDialog,
  Button,
  Dialog,
  SearchInput,
  Table,
  toaster,
} from '@/components';
import { ROUTES } from '@/constants';
import { useBookFilters, useDialog } from '@/lib/hooks';
import { Book } from '@/types';
import { HStack } from '@chakra-ui/react';
import { useCallback, useEffect, useState } from 'react';
import { FiFilter } from 'react-icons/fi';
import { IoAddSharp } from 'react-icons/io5';

export default function BookPage() {
  const { dialog, openDialog, handleConfirm, handleCancel } = useDialog();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);

  const {
    isFilterDialogOpen,
    openFilterDialog,
    closeFilterDialog,
    filterState,
    updateFilterState,
    appliedFilters,
    applyFilters,
    clearFilters,
  } = useBookFilters();

  // Fetch books from API
  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);

      const response = await BookApi.getBooks({
        page,
        limit: pageSize,
        search: searchQuery || undefined,
        sortBy: sortBy || undefined,
        sortOrder: sortOrder || undefined,
        authorIds: appliedFilters.authorIds,
        categoryIds: appliedFilters.categoryIds,
        languageCodes: appliedFilters.languageCodes,
        publishYearFrom: appliedFilters.publishYearFrom,
        publishYearTo: appliedFilters.publishYearTo,
        status: appliedFilters.status,
        availableAt: appliedFilters.availableAt,
      });

      setBooks(response.books);
      setTotal(response.pagination.total);
    } catch {
      toaster.create({
        title: 'Failed',
        description: 'Failed to fetch books',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery, sortBy, sortOrder, appliedFilters]);

  // Fetch books when page, pageSize, searchQuery, or appliedFilters changes
  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

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

  // Handle filter actions
  const handleApplyFilter = () => {
    setPage(1); // Reset to first page when applying filter
    applyFilters();
  };

  const handleClearFilter = () => {
    setPage(1);
    clearFilters();
  };

  // Handle book status change
  const handleChangeBookStatus = (book: Book) => {
    const newIsDeleted = !book.isDeleted;
    const actionText = newIsDeleted ? 'deactivate' : 'activate';

    openDialog({
      title: 'Confirm Change Book Status',
      message: `Do you want to ${actionText} this book "${book.title}"?`,
      confirmText: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Book`,
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await BookApi.updateBook(book.id, { isDeleted: newIsDeleted });
          toaster.create({
            title: 'Success',
            description: `Book ${actionText}d successfully`,
            type: 'success',
          });
          fetchBooks();
        } catch (error) {
          console.error('Error changing book status:', error);
          toaster.create({
            title: 'Error',
            description: `Failed to ${actionText} book`,
            type: 'error',
          });
        }
      },
    });
  };

  // Create columns with status change callback
  const bookColumns = BookColumns(handleChangeBookStatus);

  return (
    <>
      <HStack mb={4} gap={4} justifyContent="space-between" alignItems="center">
        <HStack gap={4} alignItems="center">
          <Button
            label="Filter"
            variantType="tertiary"
            w="auto"
            h="40px"
            px={2}
            fontSize="sm"
            icon={FiFilter}
            onClick={openFilterDialog}
          />
          <SearchInput
            width="400px"
            placeholder="Search books by title, author, description or ISBN"
            value={query}
            onChange={handleSearch}
          />
        </HStack>
        <Button
          label="Add Book"
          variantType="primary"
          w="auto"
          h="40px"
          px={2}
          fontSize="sm"
          href={ROUTES.DASHBOARD.BOOKS_ADD}
          icon={IoAddSharp}
        />
      </HStack>
      <Table
        columns={bookColumns}
        data={books}
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

      {/* Filter Dialog */}
      <BookFilterDialog
        isOpen={isFilterDialogOpen}
        onClose={closeFilterDialog}
        onApply={handleApplyFilter}
        onClear={handleClearFilter}
        filterState={filterState}
        onFilterStateChange={updateFilterState}
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
