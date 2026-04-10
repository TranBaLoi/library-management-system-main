import { getConditionOptions, getStatusOptions } from '@/lib/utils/enum-utils';
import { Condition, ItemStatus } from '@prisma/client';

// Custom labels for condition
export const CONDITION_LABELS: Partial<Record<Condition, string>> = {
  NEW: 'New',
  GOOD: 'Good',
  WORN: 'Worn',
  DAMAGED: 'Damaged',
  LOST: 'Lost',
};

// Custom labels for status
export const STATUS_LABELS: Partial<Record<ItemStatus, string>> = {
  AVAILABLE: 'Available',
  ON_BORROW: 'On Borrow',
  RESERVED: 'Reserved',
  MAINTENANCE: 'Maintenance',
  RETIRED: 'Retired',
  LOST: 'Lost',
};

// Book item options
export const BOOK_ITEM_CONDITION_OPTIONS = getConditionOptions(CONDITION_LABELS);
export const BOOK_ITEM_STATUS_OPTIONS = getStatusOptions(STATUS_LABELS);

// Book sort options for user search
export const BOOK_SORT_OPTIONS = [
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'Title A-Z', value: 'title-asc' },
  { label: 'Title Z-A', value: 'title-desc' },
  { label: 'Year Newest', value: 'year-newest' },
  { label: 'Year Oldest', value: 'year-oldest' },
];

// Book Edition Format options
export const EDITION_FORMAT_OPTIONS = [
  { label: 'E-Book', value: 'EBOOK' },
  { label: 'Audio Book', value: 'AUDIO' },
];

// Book Edition File Format options
export const FILE_FORMAT_OPTIONS = [
  { label: 'EPUB', value: 'EPUB' },
  { label: 'PDF', value: 'PDF' },
  { label: 'MOBI', value: 'MOBI' },
  { label: 'MP3 Audio', value: 'AUDIO_MP3' },
  { label: 'M4B Audio', value: 'AUDIO_M4B' },
  { label: 'Other', value: 'OTHER' },
];

// DRM Type options
export const DRM_TYPE_OPTIONS = [
  { label: 'None', value: 'NONE' },
  { label: 'Watermark', value: 'WATERMARK' },
  { label: 'Adobe DRM', value: 'ADOBE_DRM' },
  { label: 'LCP (Licensed Content Protection)', value: 'LCP' },
  { label: 'Custom', value: 'CUSTOM' },
];

// Language code to full name mapping
export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  vi: 'Vietnamese',
  'zh-CN': 'Chinese',
  es: 'Spanish',
};

/**
 * Parse language code to full language name
 * @param languageCode - Language code
 * @returns Full language name
 */
export function getLanguageName(languageCode: string | null | undefined): string {
  if (!languageCode) return 'N/A';
  const trimmedCode = languageCode.trim();
  
  // Check if the code is in the LANGUAGE_NAMES object
  if (LANGUAGE_NAMES[trimmedCode]) {
    return LANGUAGE_NAMES[trimmedCode];
  }
  
  // Check if the code is in the LANGUAGE_NAMES object in lowercase
  const normalizedCode = trimmedCode.toLowerCase();
  if (LANGUAGE_NAMES[normalizedCode]) {
    return LANGUAGE_NAMES[normalizedCode];
  }
  
  // Check if the code is in the LANGUAGE_NAMES object with case-insensitive lookup
  const matchedKey = Object.keys(LANGUAGE_NAMES).find(
    key => key.toLowerCase() === normalizedCode
  );
  
  if (matchedKey) {
    return LANGUAGE_NAMES[matchedKey];
  }
  
  // Return original code if no match found
  return trimmedCode;
}