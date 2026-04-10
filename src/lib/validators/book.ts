import { SelectOption } from '@/components';
import { validators } from '@/lib/utils';

export type CreateBookFormState = {
  authorId: string;
  title: string;
  isbn: string;
  publishYear: string;
  publisher: string;
  pageCount: string;
  price: string;
  edition: string;
  description: string;
  coverImageUrl: string;
  categories?: SelectOption[];
  isDeleted: boolean;
};

export type FormErrors = {
  authorId?: string;
  title?: string;
  isbn?: string;
  publishYear?: string;
  publisher?: string;
  pageCount?: string;
  price?: string;
  edition?: string;
  description?: string;
  coverImageUrl?: string;
  categories?: string;
  isDeleted?: string;
};

export function validateCreateBook(form: CreateBookFormState): {
  errors: FormErrors;
  firstError: string | null;
} {
  const errors: FormErrors = {};

  const authorIdError = validators.selectRequired(form.authorId, 'Author');
  if (authorIdError) errors.authorId = authorIdError;

  const titleError = validators.required(form.title, 'Book Title');
  if (titleError) errors.title = titleError;

  const publishYearError = validators.numeric(form.publishYear, 'Publish Year');
  if (publishYearError) errors.publishYear = publishYearError;

  const pageCountError = validators.numeric(form.pageCount, 'Page Count');
  if (pageCountError) errors.pageCount = pageCountError;

  const priceError = validators.numeric(form.price, 'Price');
  if (priceError) errors.price = priceError;

  const firstError = Object.values(errors).find(Boolean) || null;

  return { errors, firstError };
}
