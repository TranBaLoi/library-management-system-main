export interface CreateAuthorFormState {
  fullName: string;
  bio: string;
  birthDate: string;
  nationality: string;
  isDeleted: boolean;
}

export interface AuthorFormErrors {
  fullName?: string;
  bio?: string;
  birthDate?: string;
  nationality?: string;
}

export function validateCreateAuthor(form: CreateAuthorFormState): {
  errors: AuthorFormErrors;
  firstError: string | null;
} {
  const errors: AuthorFormErrors = {};

  // Validate fullName
  if (!form.fullName.trim()) {
    errors.fullName = 'Full name is required';
  } else if (form.fullName.trim().length < 2) {
    errors.fullName = 'Full name must be at least 2 characters';
  } else if (form.fullName.trim().length > 100) {
    errors.fullName = 'Full name must be less than 100 characters';
  }

  // Validate bio
  if (form.bio.trim().length > 200) {
    errors.bio = 'Bio must be less than 200 characters';
  }

  // Validate birthDate
  if (form.birthDate) {
    const birthDate = new Date(form.birthDate);
    const currentDate = new Date();

    if (isNaN(birthDate.getTime())) {
      errors.birthDate = 'Invalid birth date format';
    } else if (birthDate > currentDate) {
      errors.birthDate = 'Birth date cannot be in the future';
    }
  }

  // Validate nationality
  if (form.nationality && form.nationality.trim().length > 50) {
    errors.nationality = 'Nationality must be less than 50 characters';
  }

  const firstError = Object.values(errors).find(error => error) || null;

  return { errors, firstError };
}
