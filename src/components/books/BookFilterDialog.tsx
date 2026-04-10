'use client';

import {
  Dialog,
  FormField,
  FormInput,
  FormRadio,
  FormSelectSearch,
  SelectOption
} from '@/components';
import { LANGUAGE_NAMES } from '@/constants/book';
import { useAuthorOptions, useCategoryOptions } from '@/lib/hooks';
import { HStack, Text, VStack } from '@chakra-ui/react';
import { useMemo } from 'react';

export interface BookFilterState {
  selectedAuthors: SelectOption[];
  selectedCategories: SelectOption[];
  selectedLanguages: SelectOption[];
  publishYearFrom: string;
  publishYearTo: string;
  selectedStatus: string;
  availableAt: 'book-copy' | 'ebook' | 'both' | '';
}

export interface BookFilterParams {
  authorIds?: number[];
  categoryIds?: number[];
  languageCodes?: string[];
  publishYearFrom?: number;
  publishYearTo?: number;
  status?: string;
  availableAt?: ('book-copy' | 'ebook')[];
}

export interface BookFilterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  onClear: () => void;
  filterState: BookFilterState;
  onFilterStateChange: (newState: Partial<BookFilterState>) => void;
}

export function BookFilterDialog({
  isOpen,
  onClose,
  onApply,
  onClear,
  filterState,
  onFilterStateChange,
}: BookFilterDialogProps) {
  const authorOptions = useAuthorOptions();
  const categoryOptions = useCategoryOptions();

  // Language options
  const languageOptions: SelectOption[] = useMemo(() => {
    return Object.entries(LANGUAGE_NAMES).map(([code, name]) => ({
      value: code,
      label: name,
    }));
  }, []);

  const handleAuthorChange = (value: SelectOption | SelectOption[]) => {
    onFilterStateChange({
      selectedAuthors: Array.isArray(value) ? value : [],
    });
  };

  const handleCategoryChange = (value: SelectOption | SelectOption[]) => {
    onFilterStateChange({
      selectedCategories: Array.isArray(value) ? value : [],
    });
  };

  const handleLanguageChange = (value: SelectOption | SelectOption[]) => {
    onFilterStateChange({
      selectedLanguages: Array.isArray(value) ? value : [],
    });
  };

  const handleApplyFilter = () => {
    onApply();
  };

  const handleAvailableAtChange = (value: string) => {
    onFilterStateChange({ 
      availableAt: value as 'book-copy' | 'ebook' | 'both' | '' 
    });
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Filter Books"
      content={
        <VStack gap={4} align="stretch">
          {/* Author Filter */}
          <FormField label="Author">
            <FormSelectSearch
              value={filterState.selectedAuthors}
              onChange={handleAuthorChange}
              options={authorOptions}
              placeholder="Select authors..."
              variantType="filter"
              multi={true}
            />
          </FormField>

          {/* Categories Filter */}
          <FormField label="Categories">
            <FormSelectSearch
              value={filterState.selectedCategories}
              onChange={handleCategoryChange}
              options={categoryOptions}
              placeholder="Select categories..."
              variantType="filter"
              multi={true}
            />
          </FormField>

          {/* Language Filter */}
          <FormField label="Language">
            <FormSelectSearch
              value={filterState.selectedLanguages}
              onChange={handleLanguageChange}
              options={languageOptions}
              placeholder="Select languages..."
              variantType="filter"
              multi={true}
            />
          </FormField>

          {/* Publish Year Filter */}
          <FormField label="Publish Year">
            <HStack gap={2} align="center">
              <FormInput
                placeholder="From year"
                value={filterState.publishYearFrom}
                onChange={e => onFilterStateChange({ publishYearFrom: e.target.value })}
                type="number"
                min="1900"
                max="2025"
              />
              <Text fontSize="sm" color="gray.500">
                to
              </Text>
              <FormInput
                placeholder="To year"
                value={filterState.publishYearTo}
                onChange={e => onFilterStateChange({ publishYearTo: e.target.value })}
                type="number"
                min="1900"
                max="2025"
              />
            </HStack>
          </FormField>

          {/* Available At Filter */}
          <FormField label="Available At">
            <FormRadio
              value={filterState.availableAt || ''}
              onChange={handleAvailableAtChange}
              options={[
                { value: 'book-copy', label: 'Hard Copy' },
                { value: 'ebook', label: 'E-Book' },
                { value: 'both', label: 'Both' },
              ]}
            />
          </FormField>
        </VStack>
      }
      buttons={[
        {
          label: 'Clear',
          variant: 'secondary',
          onClick: onClear,
        },
        {
          label: 'Apply Filter',
          variant: 'primary',
          onClick: handleApplyFilter,
        },
      ]}
    />
  );
}
