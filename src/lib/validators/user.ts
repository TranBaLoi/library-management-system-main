import { Role, UserStatus } from '@prisma/client';

export interface CreateUserFormState {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  address: string;
  role: Role;
  status: UserStatus;
}

export interface UserFormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  phoneNumber?: string;
  address?: string;
  role?: string;
  status?: string;
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone number validation
const PHONE_REGEX = /^[\d\s+()-]+$/;

export function validateCreateUser(form: CreateUserFormState): {
  errors: UserFormErrors;
  firstError: string | null;
} {
  const errors: UserFormErrors = {};

  // Validate fullName
  if (!form.fullName.trim()) {
    errors.fullName = 'Full name is required';
  } else if (form.fullName.trim().length < 2) {
    errors.fullName = 'Full name must be at least 2 characters';
  } else if (form.fullName.trim().length > 100) {
    errors.fullName = 'Full name must be less than 100 characters';
  }

  // Validate email
  if (!form.email.trim()) {
    errors.email = 'Email is required';
  } else if (!EMAIL_REGEX.test(form.email.trim())) {
    errors.email = 'Invalid email format';
  }

  // Validate password
  if (!form.password) {
    errors.password = 'Password is required';
  } else if (form.password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  } else if (form.password.length > 50) {
    errors.password = 'Password must be less than 50 characters';
  }

  // Validate confirmPassword
  if (!form.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  // Validate phoneNumber
  if (form.phoneNumber && form.phoneNumber.trim()) {
    if (!PHONE_REGEX.test(form.phoneNumber.trim())) {
      errors.phoneNumber = 'Invalid phone number format';
    } else if (form.phoneNumber.trim().length > 20) {
      errors.phoneNumber = 'Phone number must be less than 20 characters';
    }
  }

  // Validate address
  if (form.address && form.address.trim().length > 500) {
    errors.address = 'Address must be less than 500 characters';
  }

  const firstError = Object.values(errors).find(error => error) || null;

  return { errors, firstError };
}

export function validateUpdateUser(form: Partial<CreateUserFormState>): {
  errors: UserFormErrors;
  firstError: string | null;
} {
  const errors: UserFormErrors = {};

  // Validate fullName
  if (form.fullName !== undefined) {
    if (!form.fullName.trim()) {
      errors.fullName = 'Full name is required';
    } else if (form.fullName.trim().length < 2) {
      errors.fullName = 'Full name must be at least 2 characters';
    } else if (form.fullName.trim().length > 100) {
      errors.fullName = 'Full name must be less than 100 characters';
    }
  }

  // Validate email
  if (form.email !== undefined) {
    if (!form.email.trim()) {
      errors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(form.email.trim())) {
      errors.email = 'Invalid email format';
    }
  }

  // Validate phoneNumber
  if (form.phoneNumber && form.phoneNumber.trim()) {
    if (!PHONE_REGEX.test(form.phoneNumber.trim())) {
      errors.phoneNumber = 'Invalid phone number format';
    } else if (form.phoneNumber.trim().length > 20) {
      errors.phoneNumber = 'Phone number must be less than 20 characters';
    }
  }

  // Validate address
  if (form.address && form.address.trim().length > 500) {
    errors.address = 'Address must be less than 500 characters';
  }

  const firstError = Object.values(errors).find(error => error) || null;

  return { errors, firstError };
}
