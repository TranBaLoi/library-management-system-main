'use client';

import { BookEditionApi } from '@/api';
import {
  BookEditionColumns,
  Button,
  Dialog,
  FormField,
  FormSelectSearch,
  SearchInput,
  SelectOption,
  Table,
  toaster,
} from '@/components';
import { DRM_TYPE_OPTIONS, EDITION_FORMAT_OPTIONS, FILE_FORMAT_OPTIONS } from '@/constants';
import { useBookOptions } from '@/lib/hooks';
import { BookEditionWithBook } from '@/types';
import { Flex, HStack, Text, VStack } from '@chakra-ui/react';
import { useCallback, useEffect, useState } from 'react';
import { FiFilter } from 'react-icons/fi';
import { IoAddSharp } from 'react-icons/io5';

interface BookEditionsTableProps {
  bookId?: number;
  searchPlaceholder?: string;
  showFilter?: boolean;
  showAddButton?: boolean;
  addButtonHref?: string;
  addButtonLabel?: string;
  showHeader?: boolean;
  headerTitle?: string;
  maxHeight?: string | number;
  showBookName?: boolean;
  showId?: boolean;
}

export function BookEditionsTable({
  bookId,
  searchPlaceholder = 'Search editions',
  showFilter = true,
  showAddButton = true,
  addButtonHref,
  addButtonLabel = 'Add Edition',
  showHeader = false,
  headerTitle = 'Book Editions',
  maxHeight,
  showBookName = false,
  showId = true,
}: BookEditionsTableProps) {
  // Get book options for filter
  const bookOptions = useBookOptions();

  // State management
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [editions, setEditions] = useState<BookEditionWithBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);

  // Filter dialog state
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState<SelectOption[]>([]);
  const [formatFilter, setFormatFilter] = useState('');
  const [fileFormatFilter, setFileFormatFilter] = useState('');
  const [drmTypeFilter, setDrmTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editionToDelete, setEditionToDelete] = useState<BookEditionWithBook | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Applied filters
  const [appliedFilters, setAppliedFilters] = useState<{
    bookIds?: number[];
    format?: string;
    fileFormat?: string;
    drmType?: string;
    status?: string;
  }>({});

  // Fetch book editions from API
  const fetchEditions = useCallback(async () => {
    try {
      setLoading(true);

      // Merge bookId prop with filter bookIds
      const filterBookIds = appliedFilters.bookIds || [];
      const finalBookIds =
        bookId && !filterBookIds.includes(bookId) ? [...filterBookIds, bookId] : filterBookIds;

      const response = await BookEditionApi.getBookEditions({
        bookIds: finalBookIds.length > 0 ? finalBookIds : undefined,
        page,
        limit: pageSize,
        search: searchQuery || undefined,
        sortBy: sortBy || undefined,
        sortOrder: sortOrder || undefined,
        format: appliedFilters.format,
        fileFormat: appliedFilters.fileFormat,
        drmType: appliedFilters.drmType,
        status: appliedFilters.status,
      });

      setEditions(response.editions);
      setTotal(response.pagination.total);
    } catch (error) {
      toaster.create({
        title: 'Failed',
        description: 'Failed to fetch book editions',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [bookId, page, pageSize, searchQuery, sortBy, sortOrder, appliedFilters]);

  // Fetch editions when dependencies change
  useEffect(() => {
    fetchEditions();
  }, [fetchEditions]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(query);
      setPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  // Handle sort functionality
  const handleSort = (key: string, direction: 'asc' | 'desc' | null) => {
    setSortBy(direction ? key : null);
    setSortOrder(direction);
    setPage(1);
  };

  // Handle search input
  const handleSearch = (value: string) => {
    setQuery(value);
  };

  // Handle filter dialog
  const handleOpenFilterDialog = () => {
    setIsFilterDialogOpen(true);
  };

  const handleCloseFilterDialog = () => {
    setIsFilterDialogOpen(false);
  };

  const handleApplyFilter = () => {
    setPage(1);
    setIsFilterDialogOpen(false);

    setAppliedFilters({
      bookIds: selectedBooks.length > 0 ? selectedBooks.map(book => Number(book.value)) : undefined,
      format: formatFilter || undefined,
      fileFormat: fileFormatFilter || undefined,
      drmType: drmTypeFilter || undefined,
      status: statusFilter || undefined,
    });
  };

  const handleClearFilter = () => {
    setSelectedBooks([]);
    setFormatFilter('');
    setFileFormatFilter('');
    setDrmTypeFilter('');
    setStatusFilter('');
    setPage(1);
    setAppliedFilters({});
  };

  // Handle book selection change
  const handleBookChange = (value: SelectOption | SelectOption[]) => {
    setSelectedBooks(Array.isArray(value) ? value : []);
  };

  // Handle delete
  const handleDelete = (edition: BookEditionWithBook) => {
    setEditionToDelete(edition);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!editionToDelete) return;

    setIsDeleting(true);
    try {
      // Use bulk delete API with single ID
      await BookEditionApi.bulkDeleteBookEditions([editionToDelete.id]);

      toaster.create({
        title: 'Success',
        description: 'Book edition deleted successfully',
        type: 'success',
      });

      setDeleteDialogOpen(false);
      setEditionToDelete(null);
      fetchEditions();
    } catch (error) {
      toaster.create({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete book edition',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setEditionToDelete(null);
  };

  // Create columns with delete handler
  const columns = BookEditionColumns(handleDelete, showBookName, showId);

  return (
    <>
      {/* Header with title, search and actions */}
      {showHeader && (
        <Flex
          justify="space-between"
          align="center"
          pb={4}
          borderBottom="1px"
          borderColor="gray.200"
          mb={4}
        >
          <Text fontSize="md" fontWeight="semibold">
            {headerTitle}
          </Text>
          <HStack gap={4} alignItems="center">
            <SearchInput
              width="300px"
              placeholder={searchPlaceholder}
              value={query}
              onChange={handleSearch}
            />
            {showAddButton && (
              <Button
                label={addButtonLabel}
                variantType="primary"
                w="auto"
                h="40px"
                px={2}
                fontSize="sm"
                href={addButtonHref}
                icon={IoAddSharp}
              />
            )}
          </HStack>
        </Flex>
      )}

      {/* Header with filters and actions */}
      {!showHeader && (
        <HStack mb={4} gap={4} justifyContent="space-between" alignItems="center">
          <HStack gap={4} alignItems="center">
            {showFilter && (
              <Button
                label="Filter"
                variantType="tertiary"
                w="auto"
                h="40px"
                px={2}
                fontSize="sm"
                icon={FiFilter}
                onClick={handleOpenFilterDialog}
              />
            )}
            <SearchInput
              width="300px"
              placeholder={searchPlaceholder}
              value={query}
              onChange={handleSearch}
            />
          </HStack>
          {showAddButton && (
            <Button
              label={addButtonLabel}
              variantType="primary"
              w="auto"
              h="40px"
              px={2}
              fontSize="sm"
              href={addButtonHref}
              icon={IoAddSharp}
            />
          )}
        </HStack>
      )}

      {/* Table */}
      <Table
        columns={columns}
        data={editions}
        page={page}
        pageSize={pageSize}
        total={total}
        loading={loading}
        maxHeight={maxHeight}
        onPageChange={setPage}
        onPageSizeChange={(size: number) => {
          setPageSize(size);
          setPage(1);
        }}
        onSort={handleSort}
      />

      {/* Filter Dialog */}
      {showFilter && (
        <Dialog
          isOpen={isFilterDialogOpen}
          onClose={handleCloseFilterDialog}
          title="Filter Book Editions"
          content={
            <VStack gap={4} align="stretch">
              {/* Book Filter */}
              <FormField label="Books">
                <FormSelectSearch
                  value={selectedBooks}
                  onChange={handleBookChange}
                  options={bookOptions}
                  placeholder="Select books to filter..."
                  multi
                />
              </FormField>

              {/* Format Filter */}
              <VStack align="start" gap={2}>
                <Text fontWeight="medium">Format</Text>
                <select
                  value={formatFilter}
                  onChange={e => setFormatFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <option value="">All Formats</option>
                  {EDITION_FORMAT_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </VStack>

              {/* File Format Filter */}
              <VStack align="start" gap={2}>
                <Text fontWeight="medium">File Format</Text>
                <select
                  value={fileFormatFilter}
                  onChange={e => setFileFormatFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <option value="">All File Formats</option>
                  {FILE_FORMAT_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </VStack>

              {/* DRM Type Filter */}
              <VStack align="start" gap={2}>
                <Text fontWeight="medium">DRM Type</Text>
                <select
                  value={drmTypeFilter}
                  onChange={e => setDrmTypeFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <option value="">All DRM Types</option>
                  {DRM_TYPE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </VStack>

              {/* Status Filter */}
              <VStack align="start" gap={2}>
                <Text fontWeight="medium">Status</Text>
                <input
                  type="text"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  placeholder="Enter status..."
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #e2e8f0',
                  }}
                />
              </VStack>
            </VStack>
          }
          buttons={[
            {
              label: 'Clear',
              variant: 'secondary',
              onClick: handleClearFilter,
            },
            {
              label: 'Apply Filter',
              variant: 'primary',
              onClick: handleApplyFilter,
            },
          ]}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={deleteDialogOpen}
        onClose={handleDeleteCancel}
        title="Delete Book Edition"
        content={
          <VStack gap={3} align="start">
            <Text>Are you sure you want to delete this book edition?</Text>
            {editionToDelete && (
              <VStack align="start" gap={1} p={3} bg="gray.50" borderRadius="md" width="100%">
                <Text fontSize="sm" fontWeight="medium">
                  ID: {editionToDelete.id}
                </Text>
                <Text fontSize="sm">Format: {editionToDelete.format}</Text>
                {editionToDelete.isbn13 && (
                  <Text fontSize="sm">ISBN-13: {editionToDelete.isbn13}</Text>
                )}
              </VStack>
            )}
            <Text fontSize="sm" color="red.500">
              This action cannot be undone. The associated file will also be deleted.
            </Text>
          </VStack>
        }
        buttons={[
          {
            label: 'Cancel',
            variant: 'secondary',
            onClick: handleDeleteCancel,
          },
          {
            label: isDeleting ? 'Deleting...' : 'Delete',
            variant: 'primary',
            onClick: handleDeleteConfirm,
          },
        ]}
      />
    </>
  );
}
