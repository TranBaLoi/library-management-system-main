'use client';

import { ButtonGroup, IconButton, Pagination } from '@chakra-ui/react';
import { HiOutlineDotsHorizontal } from 'react-icons/hi';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';

export type PaginationControlsProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange?: (page: number) => void;
  siblingCount?: number;
};

export function PaginationControls({
  page,
  pageSize,
  total,
  onPageChange,
  siblingCount = 2,
}: PaginationControlsProps) {
  return (
    <Pagination.Root
      id="pagination-controls"
      count={total}
      pageSize={pageSize}
      page={page}
      siblingCount={siblingCount}
      onPageChange={e => onPageChange?.(e.page)}
    >
      <ButtonGroup size="xs" wrap="wrap">
        <Pagination.PrevTrigger asChild>
          <IconButton
            aria-label="Previous page"
            bg="paginationBg.500"
            _hover={{ bg: 'primary.200' }}
            color="primaryText.500"
            borderRadius="md"
          >
            <LuChevronLeft />
          </IconButton>
        </Pagination.PrevTrigger>

        <Pagination.Items
          render={p => (
            <IconButton
              bg={p.value === page ? 'primary.500' : 'paginationBg.500'}
              color={p.value === page ? 'white' : 'primaryText.500'}
              _hover={{ bg: p.value === page ? 'primary.500' : 'primary.200' }}
              borderRadius="md"
              fontSize="xs"
              onClick={() => onPageChange?.(p.value)}
              aria-label={`Page ${p.value}`}
            >
              {p.value}
            </IconButton>
          )}
          ellipsis={
            <IconButton
              bg="paginationBg.500"
              color="primaryText.500"
              _hover={{ bg: 'primary.200' }}
              borderRadius="md"
              fontSize="xs"
              aria-label="Ellipsis"
            >
              <HiOutlineDotsHorizontal />
            </IconButton>
          }
        />

        <Pagination.NextTrigger asChild>
          <IconButton
            aria-label="Next page"
            bg="paginationBg.500"
            _hover={{ bg: 'primary.200' }}
            color="primaryText.500"
            borderRadius="md"
          >
            <LuChevronRight />
          </IconButton>
        </Pagination.NextTrigger>
      </ButtonGroup>
    </Pagination.Root>
  );
}
