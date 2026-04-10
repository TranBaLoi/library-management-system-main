import { validators } from '@/lib/utils';

export type LoginFormState = {
  email: string;
  password: string;
};

export type LoginFormErrors = {
  email?: string;
  password?: string;
};

export function validateLogin(form: LoginFormState): {
  errors: LoginFormErrors;
  firstError: string | null;
} {
  const errors: LoginFormErrors = {};

  // Validate email
  const emailRequiredError = validators.required(form.email, 'Email');
  if (emailRequiredError) {
    errors.email = emailRequiredError;
  } else {
    const emailFormatError = validators.email(form.email);
    if (emailFormatError) {
      errors.email = emailFormatError;
    }
  }

  // Validate password
  const passwordError = validators.required(form.password, 'Password');
  if (passwordError) errors.password = passwordError;

  const firstError = Object.values(errors).find(Boolean) || null;

  return { errors, firstError };
}

export type RegisterFormState = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber?: string;
  address?: string;
};

export type RegisterFormErrors = {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  phoneNumber?: string;
  address?: string;
};

export function validateRegister(form: RegisterFormState): {
  errors: RegisterFormErrors;
  firstError: string | null;
} {
  const errors: RegisterFormErrors = {};

  // Full name
  const fullNameError = validators.required(form.fullName, 'Full name');
  if (fullNameError) errors.fullName = fullNameError;

  // Email
  const emailRequiredError = validators.required(form.email, 'Email');
  if (emailRequiredError) {
    errors.email = emailRequiredError;
  } else {
    const emailFormatError = validators.email(form.email);
    if (emailFormatError) errors.email = emailFormatError;
  }

  // Password
  const passwordError = validators.required(form.password, 'Password');
  if (passwordError) errors.password = passwordError;

  // Confirm password
  const confirmError = validators.required(form.confirmPassword, 'Confirm password');
  if (confirmError) errors.confirmPassword = confirmError;
  else if (form.password && form.confirmPassword && form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  const firstError = Object.values(errors).find(Boolean) || null;
  return { errors, firstError };
}