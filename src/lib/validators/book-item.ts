import { validators } from '@/lib/utils';

export type CreateBookItemFormState = {
  bookId: string;
  code: string;
  condition: 'NEW' | 'GOOD' | 'WORN' | 'DAMAGED' | 'LOST';
  status: 'AVAILABLE' | 'ON_BORROW' | 'RESERVED' | 'MAINTENANCE' | 'RETIRED' | 'LOST';
  acquisitionDate: string;
  isDeleted: boolean;
};

export type BookItemFormErrors = {
  bookId?: string;
  code?: string;
  condition?: string;
  status?: string;
  acquisitionDate?: string;
  isDeleted?: string;
};

export function validateCreateBookItem(form: CreateBookItemFormState): {
  errors: BookItemFormErrors;
  firstError: string | null;
} {
  const errors: BookItemFormErrors = {};

  const bookIdError = validators.selectRequired(form.bookId, 'Book');
  if (bookIdError) errors.bookId = bookIdError;

  const codeError = validators.required(form.code, 'Book Copy Code');
  if (codeError) errors.code = codeError;

  const conditionError = validators.selectRequired(form.condition, 'Condition');
  if (conditionError) errors.condition = conditionError;

  const firstError = Object.values(errors).find(Boolean) || null;

  return { errors, firstError };
}
