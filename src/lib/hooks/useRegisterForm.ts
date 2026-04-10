import { AuthApi } from '@/api';
import { ROUTES } from '@/constants';
import { useFormSubmission } from '@/lib/hooks';
import { RegisterFormErrors, RegisterFormState, validateRegister } from '@/lib/validators';
import { RegisterRequest } from '@/types/auth';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const initialState: RegisterFormState = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  phoneNumber: '',
  address: '',
};

export function useRegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState<RegisterFormState>(initialState);
  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const { submit, isSubmitting } = useFormSubmission<RegisterFormState, RegisterRequest, void>({
    successMessage: 'Account created successfully',
    errorMessage: 'Registration failed',
  });

  const setField = (key: keyof RegisterFormState, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const validate = (): string | null => {
    const { errors: newErrors, firstError } = validateRegister(form);
    setErrors(newErrors);
    return firstError;
  };

  const transformData = (formData: RegisterFormState): RegisterRequest => ({
    fullName: formData.fullName.trim(),
    email: formData.email.trim(),
    password: formData.password,
    confirmPassword: formData.confirmPassword,
    phoneNumber: formData.phoneNumber?.trim() || undefined,
    address: formData.address?.trim() || undefined,
  });

  const resetForm = () => {
    setForm(initialState);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submit(form, {
      validate,
      transformData,
      apiCall: AuthApi.register,
      onSuccess: () => {
        resetForm();
        router.push(ROUTES.AUTH.LOGIN);
      },
    });
  };

  return {
    form,
    errors,
    isSubmitting,
    setField,
    handleSubmit,
    resetForm,
  };
}
