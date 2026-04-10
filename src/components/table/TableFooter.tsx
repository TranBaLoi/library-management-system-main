'use client';

import { FormSelect } from '@/components';
import { tablePageSizeOptions } from '@/constants';
import { Box, HStack, Text } from '@chakra-ui/react';
import { PaginationControls } from './PaginationControls';

export type TableFooterProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  highlightColor?: string;
  hidePageSizeSelect?: boolean;
};

export function TableFooter({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = tablePageSizeOptions,
  hidePageSizeSelect = false,
}: TableFooterProps) {
  const pageSizeItems = pageSizeOptions.map(opt => ({ value: String(opt), label: String(opt) }));
  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      borderTop="1px solid"
      borderColor="gray.200"
      pt={4}
    >
      {!hidePageSizeSelect ? (
        <HStack gap={2}>
          <Text fontSize="sm" color="secondaryText.500">
            Show
          </Text>
          <FormSelect
            id="table-page-size-select"
            items={pageSizeItems}
            value={String(pageSize)}
            onChange={val => onPageSizeChange?.(Number(val))}
            width="70px"
            height="32px"
            fontSize="sm"
            triggerSize="xs"
            variantType="filter"
          />
          <Text fontSize="sm" color="secondaryText.500">
            of {total} results
          </Text>
        </HStack>
      ) : (
        <Box />
      )}
      <PaginationControls
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
      />
    </Box>
  );
}
