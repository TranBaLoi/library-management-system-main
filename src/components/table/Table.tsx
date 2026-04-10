'use client';

import { Spinner } from '@/components';
import { Box, Table as ChakraTable, HStack, IconButton, Text, VStack } from '@chakra-ui/react';
import { useState } from 'react';
import { TiArrowSortedDown, TiArrowSortedUp, TiArrowUnsorted } from 'react-icons/ti';
import { TableFooter } from './TableFooter';

type TableProps<T> = {
  columns: {
    key: keyof T | string;
    header: string;
    render?: (item: T, rowIndex: number) => React.ReactNode;
    sortable?: boolean;
    textAlign?: 'left' | 'center' | 'right';
    width?: string | number;
  }[];
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  loading?: boolean;
  maxHeight?: string | number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onSort?: (key: string, direction: 'asc' | 'desc' | null) => void;
  hidePageSizeSelect?: boolean;
};

export function Table<T>({
  columns,
  data,
  page,
  pageSize,
  total,
  loading = false,
  maxHeight,
  onPageChange,
  onPageSizeChange,
  onSort,
  hidePageSizeSelect,
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [internalPageSize, setInternalPageSize] = useState<number>(pageSize);

  const effectivePageSize = onPageSizeChange ? pageSize : internalPageSize;

  // For server-side pagination, use data directly
  // For client-side pagination, slice the data
  const paginatedData = onPageChange
    ? data
    : data.slice(
        Math.max(0, (page - 1) * effectivePageSize),
        Math.min((page - 1) * effectivePageSize + effectivePageSize, data.length)
      );

  // Handle sort
  const handleSort = (key: string) => {
    const column = columns.find(col => col.key === key);
    if (!column?.sortable) return;

    let newKey: string | null = key;
    let newDirection: 'asc' | 'desc' | null = 'asc';

    if (sortKey === key) {
      if (sortDirection === 'asc') newDirection = 'desc';
      else if (sortDirection === 'desc') {
        newDirection = null;
        newKey = null;
      }
    }

    setSortKey(newKey);
    setSortDirection(newDirection);
    onSort?.(key, newDirection);
  };

  // Get sort icon
  const getSortIcon = (key: string) => {
    if (sortKey !== key || sortDirection === null) {
      return (
        <Text opacity={0.3}>
          <TiArrowUnsorted />
        </Text>
      );
    }
    return sortDirection === 'asc' ? (
      <Text>
        <TiArrowSortedUp />
      </Text>
    ) : (
      <Text>
        <TiArrowSortedDown />
      </Text>
    );
  };

  return (
    <Box height="100%" display="flex" flexDirection="column">
      <Box flex="1" overflow="auto" maxHeight={maxHeight}>
        <ChakraTable.Root size="sm">
          <ChakraTable.Header>
            <ChakraTable.Row>
              {columns.map(col => (
                <ChakraTable.ColumnHeader
                  key={String(col.key)}
                  bg="layoutBg.500"
                  width={col.width}
                  position="sticky"
                  top="0"
                  zIndex="1"
                  _first={{
                    borderTopLeftRadius: 'lg',
                    borderBottomLeftRadius: 'lg',
                  }}
                  _last={{
                    borderTopRightRadius: 'lg',
                    borderBottomRightRadius: 'lg',
                  }}
                >
                  <HStack
                    gap={2}
                    justifyContent={
                      col.textAlign === 'center'
                        ? 'center'
                        : col.textAlign === 'right'
                          ? 'flex-end'
                          : 'flex-start'
                    }
                  >
                    <Text fontWeight="md">{col.header}</Text>
                    {col.sortable && (
                      <IconButton
                        size="xs"
                        variant="ghost"
                        aria-label={`Sort by ${col.header}`}
                        onClick={() => handleSort(String(col.key))}
                      >
                        {getSortIcon(String(col.key))}
                      </IconButton>
                    )}
                  </HStack>
                </ChakraTable.ColumnHeader>
              ))}
            </ChakraTable.Row>
          </ChakraTable.Header>
          <ChakraTable.Body>
            {loading ? (
              <ChakraTable.Row>
                <ChakraTable.Cell colSpan={columns.length}>
                  <VStack minHeight="150px" alignItems="center" justifyContent="center" gap={4}>
                    <Spinner />
                    <Text fontSize="sm" fontWeight="md" color="secondaryText.500">
                      Loading...
                    </Text>
                  </VStack>
                </ChakraTable.Cell>
              </ChakraTable.Row>
            ) : paginatedData.length === 0 ? (
              <ChakraTable.Row>
                <ChakraTable.Cell colSpan={columns.length}>
                  <VStack minHeight="150px" alignItems="center" justifyContent="center" gap={4}>
                    <Text fontSize="sm" fontWeight="md" color="secondaryText.500">
                      No data
                    </Text>
                  </VStack>
                </ChakraTable.Cell>
              </ChakraTable.Row>
            ) : (
              paginatedData.map((item, rowIndex) => (
                <ChakraTable.Row
                  key={rowIndex}
                  h="80px"
                  _hover={{ bg: 'gray.50' }}
                  borderBottomWidth={rowIndex === paginatedData.length - 1 ? 0 : '1px'}
                  borderColor="gray.200"
                >
                  {columns.map(col => (
                    <ChakraTable.Cell
                      key={String(col.key)}
                      width={col.width}
                      verticalAlign="middle"
                      textAlign={
                        col.textAlign === 'center'
                          ? 'center'
                          : col.textAlign === 'right'
                            ? 'right'
                            : 'left'
                      }
                    >
                      {col.render
                        ? col.render(item, rowIndex)
                        : ((item as unknown as Record<string, unknown>)[
                            String(col.key)
                          ] as React.ReactNode)}
                    </ChakraTable.Cell>
                  ))}
                </ChakraTable.Row>
              ))
            )}
          </ChakraTable.Body>
        </ChakraTable.Root>
      </Box>

      <TableFooter
        page={page}
        pageSize={effectivePageSize}
        total={total}
        onPageChange={onPageChange}
        onPageSizeChange={size => {
          if (onPageSizeChange) {
            onPageSizeChange(size);
          } else {
            setInternalPageSize(size);
          }
          onPageChange?.(1);
        }}
        hidePageSizeSelect={hidePageSizeSelect}
      />
    </Box>
  );
}
