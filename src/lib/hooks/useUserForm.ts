import { UserApi } from '@/api';
import { ROUTES } from '@/constants';
import { useDialog, useFormSubmission } from '@/lib/hooks';
import {
  CreateUserFormState,
  UserFormErrors,
  validateCreateUser,
  validateUpdateUser,
} from '@/lib/validators';
import { CreateUserData, PublicUser, UpdateUserData } from '@/types/user';
import { Role, UserStatus } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const initialState: CreateUserFormState = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  phoneNumber: '',
  address: '',
  role: Role.READER,
  status: UserStatus.ACTIVE,
};

export function useUserForm(userId?: number) {
  const router = useRouter();
  const [form, setForm] = useState<CreateUserFormState>(initialState);
  const [errors, setErrors] = useState<UserFormErrors>({});
  const [isLoading, setIsLoading] = useState(!!userId);
  const isEditMode = !!userId;

  // Single form submission hook with dynamic messages
  const { submit, isSubmitting } = useFormSubmission<
    CreateUserFormState,
    CreateUserData | UpdateUserData,
    PublicUser
  >({
    successMessage: isEditMode ? 'User updated successfully' : 'User created successfully',
    errorMessage: isEditMode ? 'Failed to update user' : 'Failed to create user',
  });

  const { dialog, openDialog, handleConfirm, handleCancel: handleDialogCancel } = useDialog();

  // Load user data when editing
  useEffect(() => {
    if (!userId) return;

    const loadUser = async () => {
      try {
        setIsLoading(true);
        const user = await UserApi.getUserById(userId);

        // Transform user data to form state
        setForm({
          fullName: user.fullName || '',
          email: user.email || '',
          password: '', // Don't populate password in edit mode
          confirmPassword: '',
          phoneNumber: user.phoneNumber || '',
          address: user.address || '',
          role: user.role,
          status: user.status,
        });
      } catch (error) {
        console.error('Failed to load user:', error);
        // Redirect to users list if user not found
        router.push(ROUTES.DASHBOARD.USERS);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, [userId, router]);

  const setField = useCallback(
    (key: keyof CreateUserFormState, value: string | Role | UserStatus) => {
      setForm(prev => ({ ...prev, [key]: value }));

      // Clear error when user starts typing
      if (key in errors && errors[key as keyof UserFormErrors]) {
        setErrors(prev => ({ ...prev, [key]: undefined }));
      }
    },
    [errors]
  );

  const validate = useCallback((): string | null => {
    if (isEditMode) {
      // For update, only validate fields that are being updated
      const { errors: newErrors, firstError } = validateUpdateUser(form);
      setErrors(newErrors as UserFormErrors);
      return firstError;
    } else {
      // For create, validate all fields
      const { errors: newErrors, firstError } = validateCreateUser(form);
      setErrors(newErrors as UserFormErrors);
      return firstError;
    }
  }, [form, isEditMode]);

  // Transform form data for create
  const transformDataForCreate = useCallback((formData: CreateUserFormState): CreateUserData => {
    return {
      fullName: formData.fullName.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      phoneNumber: formData.phoneNumber.trim() || undefined,
      address: formData.address.trim() || undefined,
      role: formData.role,
    };
  }, []);

  // Transform form data for update
  const transformDataForUpdate = useCallback((formData: CreateUserFormState): UpdateUserData => {
    return {
      fullName: formData.fullName.trim(),
      email: formData.email.trim().toLowerCase(),
      phoneNumber: formData.phoneNumber.trim() || undefined,
      address: formData.address.trim() || undefined,
      role: formData.role,
      status: formData.status,
    };
  }, []);

  const resetForm = useCallback(() => {
    setForm(initialState);
    setErrors({});
  }, []);

  const handleCancel = useCallback(() => {
    const action = isEditMode ? 'Edit' : 'Create';
    openDialog({
      title: `Cancel ${action} User`,
      message: `Are you sure you want to cancel? All unsaved changes will be lost.`,
      confirmText: 'Yes, Cancel',
      cancelText: 'No, Continue',
      onConfirm: () => {
        router.push(ROUTES.DASHBOARD.USERS);
      },
    });
  }, [isEditMode, openDialog, router]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validate form first
      const firstError = validate();
      if (firstError) {
        return;
      }

      // Open confirmation dialog
      const action = isEditMode ? 'update' : 'create';
      const actionText = isEditMode ? 'Update' : 'Create';
      openDialog({
        title: `Confirm ${actionText} User`,
        message: `Do you want to ${action} user "${form.fullName}"${isEditMode ? '' : ' in the system'}?`,
        confirmText: `${actionText} User`,
        cancelText: 'Cancel',
        onConfirm: async () => {
          if (isEditMode) {
            await submit(form, {
              validate,
              transformData: transformDataForUpdate,
              apiCall: (data: UpdateUserData | CreateUserData) =>
                UserApi.updateUser(userId!, data as UpdateUserData),
              onSuccess: () => {
                router.push(ROUTES.DASHBOARD.USERS);
              },
            });
          } else {
            await submit(form, {
              validate,
              transformData: transformDataForCreate,
              apiCall: (data: CreateUserData | UpdateUserData) =>
                UserApi.createUser(data as CreateUserData),
              onSuccess: () => {
                resetForm();
                router.push(ROUTES.DASHBOARD.USERS);
              },
            });
          }
        },
      });
    },
    [
      isEditMode,
      validate,
      form,
      openDialog,
      transformDataForUpdate,
      transformDataForCreate,
      submit,
      userId,
      resetForm,
      router,
    ]
  );

  return {
    form,
    errors,
    isSubmitting,
    isLoading,
    isEditMode,
    setField,
    handleSubmit,
    resetForm,
    handleCancel,
    dialog,
    handleConfirm,
    handleDialogCancel,
  };
}
