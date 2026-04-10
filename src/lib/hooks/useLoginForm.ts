import { AuthApi } from '@/api';
import { ROUTES } from '@/constants';
import { useFormSubmission } from '@/lib/hooks';
import { meQueryKey } from '@/lib/hooks/useMe';
import { queryClient } from '@/lib/query-client';
import { LoginFormErrors, LoginFormState, validateLogin } from '@/lib/validators';
import { LoginRequest } from '@/types/auth';
import { Role } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const initialState: LoginFormState = {
  email: '',
  password: '',
};

export function useLoginForm() {
  const router = useRouter();
  const [form, setForm] = useState<LoginFormState>(initialState);
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const { submit, isSubmitting } = useFormSubmission<
    LoginFormState,
    LoginRequest,
    { isFirstLogin?: boolean }
  >({
    successMessage: 'Login successful',
    errorMessage: 'Login failed',
  });

  const setField = (key: keyof LoginFormState, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    // Clear error when user starts typing
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: undefined }));
    }
  };

  const validate = (): string | null => {
    const { errors: newErrors, firstError } = validateLogin(form);
    setErrors(newErrors);
    return firstError;
  };

  const transformData = (formData: LoginFormState): LoginRequest => ({
    email: formData.email.trim(),
    password: formData.password,
  });

  const resetForm = () => {
    setForm(initialState);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form first
    const firstError = validate();
    if (firstError) {
      return;
    }

    // Submit form
    await submit(form, {
      validate,
      transformData,
      apiCall: async (data: LoginRequest) => {
        const result = await AuthApi.login(data);
        return result;
      },
      onSuccess: async result => {
        resetForm();
        // Fetch current user after login (ensures data and returns it)
        const user = await AuthApi.me();
        queryClient.setQueryData(meQueryKey, user);

        // Check if this is first login from API response
        // Note: firstLoginAt is already set in DB at this point, so we rely on API response
        const isFirstLogin = result?.isFirstLogin === true;

        // Redirect based on user role and first login status
        if (isFirstLogin && user.role === Role.READER) {
          // First login: set flag and redirect to interest selection
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('isFirstLoginRedirect', 'true');
          }
          router.push(ROUTES.SELECT_INTERESTS);
        } else if (user.role === Role.READER) {
          // READER users go to home page
          router.push(ROUTES.HOME);
        } else {
          // ADMIN and LIBRARIAN go to dashboard
          router.push(ROUTES.DASHBOARD.HOME);
        }
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
