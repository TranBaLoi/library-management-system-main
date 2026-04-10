import { AuthorApi } from '@/api';
import { ROUTES } from '@/constants';
import { useDialog, useFormSubmission } from '@/lib/hooks';
import { AuthorFormErrors, CreateAuthorFormState, validateCreateAuthor } from '@/lib/validators';
import { Author, CreateAuthorData, UpdateAuthorData } from '@/types';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const initialState: CreateAuthorFormState = {
  fullName: '',
  bio: '',
  birthDate: '',
  nationality: '',
  isDeleted: false,
};

export function useAuthorForm(authorId?: number) {
  const router = useRouter();
  const [form, setForm] = useState<CreateAuthorFormState>(initialState);
  const [errors, setErrors] = useState<AuthorFormErrors>({});
  const [isLoading, setIsLoading] = useState(!!authorId);
  const isEditMode = !!authorId;

  // Single form submission hook with dynamic messages
  const { submit, isSubmitting } = useFormSubmission<
    CreateAuthorFormState,
    CreateAuthorData | UpdateAuthorData,
    Author
  >({
    successMessage: isEditMode ? 'Author updated successfully' : 'Author added successfully',
    errorMessage: isEditMode ? 'Failed to update author' : 'Failed to add author',
  });

  const { dialog, openDialog, handleConfirm, handleCancel: handleDialogCancel } = useDialog();

  // Load author data when editing
  useEffect(() => {
    if (!authorId) return;

    const loadAuthor = async () => {
      try {
        setIsLoading(true);
        const author = await AuthorApi.getAuthorById(authorId);

        // Transform author data to form state
        setForm({
          fullName: author.fullName || '',
          bio: author.bio || '',
          birthDate: author.birthDate ? new Date(author.birthDate).toISOString().split('T')[0] : '',
          nationality: author.nationality || '',
          isDeleted: author.isDeleted,
        });
      } catch (error) {
        console.error('Failed to load author:', error);
        // Redirect to authors list if author not found
        router.push(ROUTES.DASHBOARD.AUTHORS);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuthor();
  }, [authorId, router]);

  const setField = useCallback(
    (key: keyof CreateAuthorFormState, value: string | boolean) => {
      setForm(prev => ({ ...prev, [key]: value }));

      // Clear error when user starts typing
      if (key in errors && errors[key as keyof AuthorFormErrors]) {
        setErrors(prev => ({ ...prev, [key]: undefined }));
      }
    },
    [errors]
  );

  const validate = useCallback((): string | null => {
    const { errors: newErrors, firstError } = validateCreateAuthor(form);
    setErrors(newErrors as AuthorFormErrors);
    return firstError;
  }, [form]);

  // Memoized transform function
  const transformFormData = useCallback(
    (formData: CreateAuthorFormState) => ({
      fullName: formData.fullName.trim(),
      bio: formData.bio.trim() || undefined,
      birthDate: formData.birthDate ? new Date(formData.birthDate).toISOString() : undefined,
      nationality: formData.nationality.trim() || undefined,
      isDeleted: formData.isDeleted,
    }),
    []
  );

  const transformDataForCreate = useCallback(
    (formData: CreateAuthorFormState): CreateAuthorData =>
      transformFormData(formData) as CreateAuthorData,
    [transformFormData]
  );

  const transformDataForUpdate = useCallback(
    (formData: CreateAuthorFormState): UpdateAuthorData => ({
      ...transformFormData(formData),
      id: authorId!,
    }),
    [transformFormData, authorId]
  );

  const resetForm = useCallback(() => {
    setForm(initialState);
    setErrors({});
  }, []);

  const handleCancel = useCallback(() => {
    const action = isEditMode ? 'Edit' : 'Add';
    openDialog({
      title: `Cancel ${action} Author`,
      message: `Are you sure you want to cancel? All unsaved changes will be lost.`,
      confirmText: 'Yes, Cancel',
      cancelText: 'No, Continue',
      onConfirm: () => {
        router.push(ROUTES.DASHBOARD.AUTHORS);
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
      const action = isEditMode ? 'update' : 'add';
      const actionText = isEditMode ? 'Update' : 'Add';
      openDialog({
        title: `Confirm ${actionText} Author`,
        message: `Do you want to ${action} this author "${form.fullName}"${isEditMode ? '' : ' to the system'}?`,
        confirmText: `${actionText} Author`,
        cancelText: 'Cancel',
        onConfirm: async () => {
          if (isEditMode) {
            await submit(form, {
              validate,
              transformData: transformDataForUpdate,
              apiCall: (data: UpdateAuthorData | CreateAuthorData) =>
                AuthorApi.updateAuthor(authorId!, data as UpdateAuthorData),
              onSuccess: () => {
                router.push(ROUTES.DASHBOARD.AUTHORS);
              },
            });
          } else {
            await submit(form, {
              validate,
              transformData: transformDataForCreate,
              apiCall: (data: CreateAuthorData | UpdateAuthorData) =>
                AuthorApi.createAuthor(data as CreateAuthorData),
              onSuccess: () => {
                resetForm();
                router.push(ROUTES.DASHBOARD.AUTHORS);
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
      authorId,
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
