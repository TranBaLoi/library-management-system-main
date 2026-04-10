'use client';

import { Checkbox, Flex } from '@chakra-ui/react';

export interface SelectableCheckboxProps {
  requestId: number;
  bookId: number;
  bookItemId: number;
  bookTitle: string;
  canSelectMore: boolean;
  isBookItemSelected: (requestId: number, bookId: number, bookItemId: number) => boolean;
  onBookItemToggle: (
    requestId: number,
    bookId: number,
    bookItemId: number,
    bookTitle: string
  ) => void;
}

/**
 * Component for checkbox cell with selection state management
 */
export function SelectableCheckbox({
  requestId,
  bookId,
  bookItemId,
  bookTitle,
  canSelectMore,
  isBookItemSelected,
  onBookItemToggle,
}: SelectableCheckboxProps) {
  const isSelected = isBookItemSelected(requestId, bookId, bookItemId);
  const isDisabled = !canSelectMore && !isSelected;

  return (
    <Flex justify="center">
      <Checkbox.Root
        checked={isSelected}
        disabled={isDisabled}
        onCheckedChange={() => {
          if (!isDisabled) {
            onBookItemToggle(requestId, bookId, bookItemId, bookTitle);
          }
        }}
      >
        <Checkbox.HiddenInput />
        <Checkbox.Control
          cursor={isDisabled ? 'not-allowed' : 'pointer'}
          borderWidth="2px"
          borderColor="gray.200"
          _checked={{
            bg: 'primary.500',
            borderColor: 'primary.500',
          }}
          _hover={{
            borderColor: 'primary.500',
          }}
          _disabled={{
            opacity: 0.5,
            cursor: 'not-allowed',
            borderColor: 'gray.200',
          }}
        />
      </Checkbox.Root>
    </Flex>
  );
}
