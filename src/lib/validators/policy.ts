export interface CreatePolicyFormState {
  id: string;
  name: string;
  amount: string;
  unit: 'FIXED' | 'PER_DAY';
  isDeleted: boolean;
}

export interface PolicyFormErrors {
  id?: string;
  name?: string;
  amount?: string;
  unit?: string;
}

export function validateCreatePolicy(form: CreatePolicyFormState): {
  errors: PolicyFormErrors;
  firstError: string | null;
} {
  const errors: PolicyFormErrors = {};

  // Validate id
  if (!form.id.trim()) {
    errors.id = 'Policy ID is required';
  } else if (form.id.trim().length < 2) {
    errors.id = 'Policy ID must be at least 2 characters';
  } else if (form.id.trim().length > 50) {
    errors.id = 'Policy ID must be less than 50 characters';
  }

  // Validate name
  if (!form.name.trim()) {
    errors.name = 'Policy name is required';
  } else if (form.name.trim().length < 2) {
    errors.name = 'Policy name must be at least 2 characters';
  } else if (form.name.trim().length > 200) {
    errors.name = 'Policy name must be less than 200 characters';
  }

  // Validate amount
  if (!form.amount.trim()) {
    errors.amount = 'Amount is required';
  } else {
    const amount = parseFloat(form.amount);
    if (isNaN(amount)) {
      errors.amount = 'Amount must be a valid number';
    } else if (amount < 0) {
      errors.amount = 'Amount must be greater than or equal to 0';
    } else if (form.unit === 'FIXED' && amount > 100) {
      errors.amount = 'Percentage must be less than or equal to 100';
    } else if (form.unit === 'PER_DAY' && amount > 1000000000) {
      errors.amount = 'Amount must be less than 1,000,000,000';
    }
  }

  // Validate unit
  if (!form.unit || (form.unit !== 'FIXED' && form.unit !== 'PER_DAY')) {
    errors.unit = 'Unit must be either FIXED or PER_DAY';
  }

  const firstError = Object.values(errors).find(error => error) || null;

  return { errors, firstError };
}
