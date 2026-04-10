'use client';

import { FormSelectSearch } from '@/components/forms';
import { useAuthors } from '@/lib/hooks/useAuthors';
import type { BookOption } from '@/lib/hooks/useBooks';
import { useBookById, useLazySearchBooks } from '@/lib/hooks/useBooks';
import { Box } from '@chakra-ui/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookCell } from './BookCell';

// BookOption component for displaying individual book option
interface BookOptionProps {
  option: BookOption;
}

export function BookOption({ option }: BookOptionProps) {
  const { title, coverImageUrl, authorName, publishYear, isbn } = option;

  return (
    <Box p={2}>
      <BookCell
        title={title}
        coverImageUrl={coverImageUrl}
        authorName={authorName}
        isbn={isbn}
        publishYear={publishYear}
      />
    </Box>
  );
}

// BookOptionDisplay component for displaying selected option
interface BookOptionDisplayProps {
  value: string;
  options: BookOption[];
}

export function BookOptionDisplay({ value, options }: BookOptionDisplayProps) {
  const selectedOption = options.find(option => option.value === value);

  if (!selectedOption) return null;

  return <BookOption option={selectedOption} />;
}

// InfiniteMenuList component for infinite scroll (extracted outside to prevent re-renders)
const InfiniteMenuList = React.forwardRef<
  HTMLDivElement,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
>((props, ref) => {
  const { children, selectProps } = props;

  const {
    shouldUseLazyLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    scrollRef,
  } = selectProps;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    scrollRef.current = target.scrollTop;

    if (
      target.scrollHeight - target.scrollTop <= target.clientHeight * 1.2 &&
      shouldUseLazyLoading &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  };

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      style={{ maxHeight: 300, overflowY: 'auto' }}
    >
      {children}
      {isFetchingNextPage && (
        <div style={{ padding: 8, textAlign: 'center' }}>
          Loading more...
        </div>
      )}
    </div>
  );
});

InfiniteMenuList.displayName = 'InfiniteMenuList';

// BookSelectSearch component for select dropdown
export interface BookSelectSearchProps {
  value?: BookOption | BookOption[];
  onChange: (value: BookOption | BookOption[]) => void;
  options?: BookOption[];
  placeholder?: string;
  isDisabled?: boolean;
  isLoading?: boolean;
  isClearable?: boolean;
  isRtl?: boolean;
  isSearchable?: boolean;
  name?: string;
  className?: string;
  classNamePrefix?: string;
  variantType?: 'default' | 'filter';
  hideSelectedOptions?: boolean;
  multi?: boolean;
  height?: string;
  width?: string;
  fontSize?: string;
  useLazyLoading?: boolean;
}

export const BookSelectSearch: React.FC<BookSelectSearchProps> = ({
  value,
  onChange,
  options: providedOptions,
  placeholder = 'Select book...',
  isDisabled = false,
  isLoading: externalIsLoading = false,
  isClearable = true,
  isRtl = false,
  isSearchable = true,
  name,
  className = 'basic-select',
  classNamePrefix = 'select',
  variantType = 'default',
  hideSelectedOptions = false,
  multi = false,
  height = '50px',
  width = '100%',
  fontSize = '16px',
  useLazyLoading = true,
}) => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const scrollRef = useRef(0);
  const { data: authors } = useAuthors();

  // Use lazy loading if enabled and no options provided
  const shouldUseLazyLoading = useLazyLoading && !providedOptions;

  // Lazy loading hook
  const {
    data: lazyData,
    isLoading: isLazyLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useLazySearchBooks(searchKeyword);

  // Convert lazy loaded books to BookOption format
  const lazyOptions = useMemo(() => {
    if (!lazyData || !authors) return [];

    const authorMap = new Map(authors.map(a => [a.id, a]));

    return lazyData.pages.flatMap(page =>
      page.books.map(book => ({
        value: book.id.toString(),
        label: book.title,
        title: book.title,
        coverImageUrl: book.coverImageUrl,
        authorName: authorMap.get(book.authorId)?.fullName || 'Unknown Author',
        publishYear: book.publishYear,
        isbn: book.isbn,
      }))
    );
  }, [lazyData, authors]);

  // Extract book ID from value if exists but not in options
  const valueBookId = useMemo(() => {
    if (!value || Array.isArray(value)) return undefined;
    const valueId = value.value;
    const currentOptions = providedOptions || lazyOptions;
    const foundInOptions = currentOptions.some(opt => opt.value === String(valueId));
    // Only load if value has no label (incomplete data) and not found in options
    if (!foundInOptions && valueId && !value.label) {
      return String(valueId);
    }
    return undefined;
  }, [value, providedOptions, lazyOptions]);

  // Load book by ID if value exists but not in options
  const { data: loadedBook } = useBookById(valueBookId);

  // Add loaded book to options if it exists
  const optionsWithLoadedBook = useMemo(() => {
    const baseOptions = providedOptions || lazyOptions;
    if (loadedBook && authors && valueBookId) {
      const authorMap = new Map(authors.map(a => [a.id, a]));
      const loadedBookOption: BookOption = {
        value: loadedBook.id.toString(),
        label: loadedBook.title,
        title: loadedBook.title,
        coverImageUrl: loadedBook.coverImageUrl,
        authorName: authorMap.get(loadedBook.authorId)?.fullName || 'Unknown Author',
        publishYear: loadedBook.publishYear,
        isbn: loadedBook.isbn,
      };
      // Check if already in options
      const exists = baseOptions.some(opt => opt.value === loadedBookOption.value);
      return exists ? baseOptions : [loadedBookOption, ...baseOptions];
    }
    return baseOptions;
  }, [providedOptions, lazyOptions, loadedBook, authors, valueBookId]);

  // Use provided options or lazy loaded options
  const options = optionsWithLoadedBook;
  const isLoading = externalIsLoading || (shouldUseLazyLoading && isLazyLoading);

  // Restore scroll position when options update
  useEffect(() => {
    const menu = document.querySelector(`.${classNamePrefix}__menu-list`);
    if (menu && scrollRef.current) {
      menu.scrollTop = scrollRef.current;
    }
  }, [lazyOptions.length, classNamePrefix]);

  // Handle input change for search
  const handleInputChange = useCallback((inputValue: string) => {
    setSearchKeyword(inputValue);
  }, []);

  // Load initial data when menu opens
  useEffect(() => {
    if (menuIsOpen && shouldUseLazyLoading && searchKeyword.length === 0 && lazyOptions.length === 0) {
      // Menu opened, load initial data
      setSearchKeyword('');
    }
  }, [menuIsOpen, shouldUseLazyLoading, searchKeyword, lazyOptions.length]);

  // Find matching option from options list to ensure value matches
  const selectedValue = useMemo(() => {
    if (!value) return undefined;
    if (Array.isArray(value)) {
      const mapped = value
        .map(v => {
          const matchedOption = options.find(opt => opt.value === String(v.value));
          return matchedOption || (v.label ? v : null);
        })
        .filter((v): v is BookOption => v !== null);
      return mapped.length > 0 ? mapped : undefined;
    }
    // Find matching option by value
    const matchedOption = options.find(opt => opt.value === String(value.value));
    // If found, use matched option; otherwise keep original if it has label
    return matchedOption || (value.label ? value : undefined);
  }, [value, options]);

  const formatOptionLabel = (option: BookOption) => {
    return <BookOption option={option} />;
  };

  // Function to get searchable text for each option
  const getOptionLabel = (option: BookOption) => {
    const searchText = [
      option.title,
      option.authorName,
      option.publishYear?.toString() || '',
      option.isbn || '',
    ].join(' ');
    return searchText;
  };

  // Custom filter function
  const filterOption = shouldUseLazyLoading
    ? () => true
    : (
        option: { data: BookOption; label: string; value: string | number },
        inputValue: string
      ) => {
        if (!inputValue) return true;

        const searchText = getOptionLabel(option.data).toLowerCase();
        const searchValue = inputValue.toLowerCase();

        return searchText.includes(searchValue);
      };

  return (
    <FormSelectSearch<BookOption>
      value={selectedValue}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      isDisabled={isDisabled}
      isLoading={isLoading || isFetchingNextPage}
      isClearable={isClearable}
      isRtl={isRtl}
      isSearchable={isSearchable}
      name={name}
      className={className}
      classNamePrefix={classNamePrefix}
      variantType={variantType}
      hideSelectedOptions={hideSelectedOptions}
      multi={multi}
      height={height}
      width={width}
      fontSize={fontSize}
      formatOptionLabel={formatOptionLabel}
      getOptionLabel={getOptionLabel}
      filterOption={filterOption}
      onInputChange={shouldUseLazyLoading ? handleInputChange : undefined}
      onMenuOpen={() => setMenuIsOpen(true)}
      onMenuClose={() => setMenuIsOpen(false)}
      components={shouldUseLazyLoading ? { MenuList: InfiniteMenuList } : undefined}
      selectProps={{
        shouldUseLazyLoading,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
        scrollRef,
      }}
    />
  );
};
