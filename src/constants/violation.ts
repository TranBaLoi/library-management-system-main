// Default number of days from today for violation payment due date
export const DEFAULT_VIOLATION_DUE_DATE_DAYS = 3;

// Mapping policy ID to violation points
export const VIOLATION_POLICY_POINTS: Record<string, number> = {
  LOST_BOOK: 3,
  DAMAGED_BOOK: 2,
  WORN_BOOK: 1,
  LATE_RETURN: 1,
};

// Default penalty percent for fallback
export const DEFAULT_PENALTY_PERCENT: Record<string, number> = {
  LOST_BOOK: 100,
  DAMAGED_BOOK: 100,
  WORN_BOOK: 50,
  LATE_RETURN: 10000,
};

// Mapping condition to policy ID
export const CONDITION_TO_POLICY_ID: Record<string, string> = {
  LOST: 'LOST_BOOK',
  DAMAGED: 'DAMAGED_BOOK',
  WORN: 'WORN_BOOK',
};

// Mapping policy ID to condition
export const POLICY_ID_TO_CONDITION: Record<string, string> = {
  LOST_BOOK: 'LOST',
  DAMAGED_BOOK: 'DAMAGED',
  WORN_BOOK: 'WORN',
};

export { policyIdToCondition } from '@/lib/utils/violation-utils';

