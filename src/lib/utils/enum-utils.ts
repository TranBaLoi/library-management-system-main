import { Condition, ItemStatus } from '@prisma/client';

// Helper function to format label from enum value
const formatEnumLabel = (value: string): string => {
  return value
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
};

// Function to convert enum to options
export function enumToOptions<T extends string>(
  enumObject: Record<string, T>,
  customLabels?: Partial<Record<T, string>>
) {
  return Object.values(enumObject).map(value => ({
    value,
    label: customLabels?.[value] || formatEnumLabel(value),
  }));
}

// Book item enum options
export const getConditionOptions = (customLabels?: Partial<Record<Condition, string>>) =>
  enumToOptions(Condition, customLabels);

// Book item status options
export const getStatusOptions = (customLabels?: Partial<Record<ItemStatus, string>>) =>
  enumToOptions(ItemStatus, customLabels);

// Helper to get default value for form
export const getDefaultCondition = (): Condition => 'NEW';
export const getDefaultStatus = (): ItemStatus => 'AVAILABLE';
