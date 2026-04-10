export interface CreateCategoryFormState {
  name: string;
  description: string;
  isDeleted: boolean;
}

export interface CategoryFormErrors {
  name?: string;
  description?: string;
}

export function validateCreateCategory(form: CreateCategoryFormState): {
  errors: CategoryFormErrors;
  firstError: string | null;
} {
  const errors: CategoryFormErrors = {};

  // Validate name
  if (!form.name.trim()) {
    errors.name = 'Category name is required';
  } else if (form.name.trim().length < 2) {
    errors.name = 'Category name must be at least 2 characters';
  } else if (form.name.trim().length > 100) {
    errors.name = 'Category name must be less than 100 characters';
  }

  // Validate description
  if (form.description && form.description.length > 200) {
    errors.description = 'Description must be less than 200 characters';
  }

  const firstError = Object.values(errors).find(error => error) || null;

  return { errors, firstError };
}
