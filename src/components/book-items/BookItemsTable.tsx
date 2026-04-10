'use client';

import { BookItemApi } from '@/api';
import {
  Button,
  Dialog,
  FormField,
  FormInput,
  FormSelectSearch,
  SearchInput,
  SelectOption,
  Table,
  toaster,
} from '@/components';
import { BOOK_ITEM_CONDITION_OPTIONS, BOOK_ITEM_STATUS_OPTIONS, ROUTES } from '@/constants';
import { useAuthorOptions, useBookOptions } from '@/lib/hooks';
import { BookItemWithBook, Column } from '@/types';
import { Flex, HStack, Text, VStack } from '@chakra-ui/react';
import { useCallback, useEffect, useState } from 'react';
import { FiFilter } from 'react-icons/fi';
import { IoAddSharp } from 'react-icons/io5';

interface BookItemsTableProps {
  // Table columns configuration
  columns: Column<BookItemWithBook>[];
  // Optional filters to pre-populate
  initialFilters?: {
    authorIds?: number[];
    bookIds?: number[];
    conditions?: string[];
    statuses?: string[];
    acquisitionDateFrom?: string;
    acquisitionDateTo?: string;
  };
  // Optional book IDs to filter by (for book detail page)
  bookIds?: number[];
  // Optional search placeholder
  searchPlaceholder?: string;
  // Whether to show the filter button
  showFilter?: boolean;
  // Whether to show the add button
  showAddButton?: boolean;
  // Custom add button href
  addButtonHref?: string;
  // Custom add button label
  addButtonLabel?: string;
  // Whether to search only by code (for book detail page)
  searchByCodeOnly?: boolean;
  // Whether to show header with title
  showHeader?: boolean;
  // Custom header title
  headerTitle?: string;
  // Maximum height for the table
  maxHeight?: string | number;
  // Callback when data changes
  onDataChange?: (data: BookItemWithBook[], total: number) => void;
}

export function BookItemsTable({
  columns,
  initialFilters = {},
  bookIds: filterBookIds,
  searchPlaceholder = 'Search book copies',
  showFilter = true,
  showAddButton = true,
  addButtonHref = ROUTES.DASHBOARD.BOOKS_COPIES_ADD,
  addButtonLabel = 'Add Book Copy',
  searchByCodeOnly = false,
  showHeader = false,
  headerTitle = 'Book Copies',
  maxHeight,
  onDataChange,
}: BookItemsTableProps) {
  const authorOptions = useAuthorOptions();
  const bookOptions = useBookOptions();

  // State management
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [bookItems, setBookItems] = useState<BookItemWithBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);

  // Filter dialog state
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [selectedAuthors, setSelectedAuthors] = useState<SelectOption[]>([]);
  const [selectedBooks, setSelectedBooks] = useState<SelectOption[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<SelectOption[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<SelectOption[]>([]);
  const [acquisitionDateFrom, setAcquisitionDateFrom] = useState<string>('');
  const [acquisitionDateTo, setAcquisitionDateTo] = useState<string>('');

  // Current applied filters state
  const [appliedFilters, setAppliedFilters] = useState<{
    authorIds?: number[];
    bookIds?: number[];
    conditions?: string[];
    statuses?: string[];
    acquisitionDateFrom?: string;
    acquisitionDateTo?: string;
  }>(initialFilters);

  // Initialize filters from props
  useEffect(() => {
    if (initialFilters.authorIds) {
      const authorOptions = initialFilters.authorIds.map(id => ({
        value: id.toString(),
        label: `Author ${id}`,
      }));
      setSelectedAuthors(authorOptions);
    }
    if (initialFilters.bookIds) {
      const bookOptions = initialFilters.bookIds.map(id => ({
        value: id.toString(),
        label: `Book ${id}`,
      }));
      setSelectedBooks(bookOptions);
    }
    if (initialFilters.conditions) {
      const conditionOptions = initialFilters.conditions.map(condition => ({
        value: condition,
        label: condition,
      }));
      setSelectedConditions(conditionOptions);
    }
    if (initialFilters.statuses) {
      const statusOptions = initialFilters.statuses.map(status => ({
        value: status,
        label: status,
      }));
      setSelectedStatuses(statusOptions);
    }
    if (initialFilters.acquisitionDateFrom) {
      setAcquisitionDateFrom(initialFilters.acquisitionDateFrom);
    }
    if (initialFilters.acquisitionDateTo) {
      setAcquisitionDateTo(initialFilters.acquisitionDateTo);
    }
  }, [initialFilters]);

  // Fetch book items from API
  const fetchBookItems = useCallback(async () => {
    try {
      setLoading(true);

      const response = await BookItemApi.getBookItems({
        page,
        limit: pageSize,
        search: searchQuery || undefined,
        searchByCodeOnly: searchByCodeOnly,
        sortBy: sortBy || undefined,
        sortOrder: sortOrder || undefined,
        authorIds: appliedFilters.authorIds,
        bookIds: filterBookIds || appliedFilters.bookIds,
        conditions: appliedFilters.conditions,
        statuses: appliedFilters.statuses,
        acquisitionDateFrom: appliedFilters.acquisitionDateFrom,
        acquisitionDateTo: appliedFilters.acquisitionDateTo,
      });

      setBookItems(response.bookItems as BookItemWithBook[]);
      setTotal(response.pagination.total);

      // Notify parent component about data changes
      if (onDataChange) {
        onDataChange(response.bookItems as BookItemWithBook[], response.pagination.total);
      }
    } catch {
      toaster.create({
        title: 'Failed',
        description: 'Failed to fetch book copies',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    searchQuery,
    searchByCodeOnly,
    sortBy,
    sortOrder,
    appliedFilters,
    filterBookIds,
    onDataChange,
  ]);

  // Fetch book items when dependencies change
  useEffect(() => {
    fetchBookItems();
  }, [fetchBookItems]);

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

  // Handle filter dialog
  const handleOpenFilterDialog = () => {
    setIsFilterDialogOpen(true);
  };

  const handleCloseFilterDialog = () => {
    setIsFilterDialogOpen(false);
  };

  const handleApplyFilter = () => {
    // Reset to first page when applying filter
    setPage(1);
    setIsFilterDialogOpen(false);

    // Prepare filter parameters
    const filterParams = {
      authorIds:
        selectedAuthors.length > 0
          ? selectedAuthors.map(author => Number(author.value))
          : undefined,
      bookIds: selectedBooks.length > 0 ? selectedBooks.map(book => Number(book.value)) : undefined,
      conditions:
        selectedConditions.length > 0
          ? selectedConditions.map(condition => String(condition.value))
          : undefined,
      statuses:
        selectedStatuses.length > 0
          ? selectedStatuses.map(status => String(status.value))
          : undefined,
      acquisitionDateFrom: acquisitionDateFrom || undefined,
      acquisitionDateTo: acquisitionDateTo || undefined,
    };

    // Save applied filters
    setAppliedFilters(filterParams);
  };

  const handleClearFilter = () => {
    setSelectedAuthors([]);
    setSelectedBooks([]);
    setSelectedConditions([]);
    setSelectedStatuses([]);
    setAcquisitionDateFrom('');
    setAcquisitionDateTo('');
    setPage(1);
    // Clear applied filters
    setAppliedFilters({});
  };

  // Wrapper functions for FormSelectSearch
  const handleAuthorChange = (value: SelectOption | SelectOption[]) => {
    setSelectedAuthors(Array.isArray(value) ? value : []);
  };

  const handleBookChange = (value: SelectOption | SelectOption[]) => {
    setSelectedBooks(Array.isArray(value) ? value : []);
  };

  const handleConditionChange = (value: SelectOption | SelectOption[]) => {
    setSelectedConditions(Array.isArray(value) ? value : []);
  };

  const handleStatusChange = (value: SelectOption | SelectOption[]) => {
    setSelectedStatuses(Array.isArray(value) ? value : []);
  };

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
        data={bookItems}
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
          title="Filter Book Copies"
          content={
            <VStack gap={4} align="stretch">
              {/* Author Filter */}
              <FormField label="Author">
                <FormSelectSearch
                  value={selectedAuthors}
                  onChange={handleAuthorChange}
                  options={authorOptions}
                  placeholder="Select authors..."
                  variantType="filter"
                  multi={true}
                />
              </FormField>

              {/* Book Filter */}
              <FormField label="Book">
                <FormSelectSearch
                  value={selectedBooks}
                  onChange={handleBookChange}
                  options={bookOptions}
                  placeholder="Select books..."
                  variantType="filter"
                  multi={true}
                />
              </FormField>

              {/* Condition Filter */}
              <FormField label="Condition">
                <FormSelectSearch
                  value={selectedConditions}
                  onChange={handleConditionChange}
                  options={BOOK_ITEM_CONDITION_OPTIONS}
                  placeholder="Select conditions..."
                  variantType="filter"
                  multi={true}
                />
              </FormField>

              {/* Status Filter */}
              <FormField label="Status">
                <FormSelectSearch
                  value={selectedStatuses}
                  onChange={handleStatusChange}
                  options={BOOK_ITEM_STATUS_OPTIONS}
                  placeholder="Select statuses..."
                  variantType="filter"
                  multi={true}
                />
              </FormField>

              {/* Acquisition Date Range Filter */}
              <HStack gap={4} align="stretch" w="100%">
                <FormField label="Acquisition Date">
                  <HStack gap={4} align="center" w="100%">
                    <Text>From</Text>
                    <FormInput
                      type="date"
                      value={acquisitionDateFrom}
                      onChange={e => setAcquisitionDateFrom(e.target.value)}
                      placeholder="From date"
                    />
                    <Text>To</Text>
                    <FormInput
                      type="date"
                      value={acquisitionDateTo}
                      onChange={e => setAcquisitionDateTo(e.target.value)}
                      placeholder="To date"
                    />
                  </HStack>
                </FormField>
              </HStack>
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
    </>
  );
}
