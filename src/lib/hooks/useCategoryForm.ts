import { CategoryApi } from '@/api';
import { ROUTES } from '@/constants';
import { useDialog, useFormSubmission } from '@/lib/hooks';
import {
  CategoryFormErrors,
  CreateCategoryFormState,
  validateCreateCategory,
} from '@/lib/validators';
import { Category, CreateCategoryData, UpdateCategoryData } from '@/types';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const initialState: CreateCategoryFormState = {
  name: '',
  description: '',
  isDeleted: false,
};

export function useCategoryForm(categoryId?: number) {
  const router = useRouter();
  const [form, setForm] = useState<CreateCategoryFormState>(initialState);
  const [errors, setErrors] = useState<CategoryFormErrors>({});
  const [isLoading, setIsLoading] = useState(!!categoryId);
  const isEditMode = !!categoryId;

  // Single form submission hook with dynamic messages
  const { submit, isSubmitting } = useFormSubmission<
    CreateCategoryFormState,
    CreateCategoryData | UpdateCategoryData,
    Category
  >({
    successMessage: isEditMode ? 'Category updated successfully' : 'Category added successfully',
    errorMessage: isEditMode ? 'Failed to update category' : 'Failed to add category',
  });

  const { dialog, openDialog, handleConfirm, handleCancel: handleDialogCancel } = useDialog();

  // Load category data when editing
  useEffect(() => {
    if (!categoryId) return;

    const loadCategory = async () => {
      try {
        setIsLoading(true);
        const category = await CategoryApi.getCategoryById(categoryId);

        // Transform category data to form state
        setForm({
          name: category.name || '',
          description: category.description || '',
          isDeleted: category.isDeleted,
        });
      } catch (error) {
        console.error('Failed to load category:', error);
        // Redirect to categories list if category not found
        router.push(ROUTES.DASHBOARD.CATEGORIES);
      } finally {
        setIsLoading(false);
      }
    };

    loadCategory();
  }, [categoryId, router]);

  const setField = useCallback(
    (key: keyof CreateCategoryFormState, value: string | boolean) => {
      setForm(prev => ({ ...prev, [key]: value }));

      // Clear error when user starts typing
      if (key in errors && errors[key as keyof CategoryFormErrors]) {
        setErrors(prev => ({ ...prev, [key]: undefined }));
      }
    },
    [errors]
  );

  const validate = useCallback((): string | null => {
    const { errors: newErrors, firstError } = validateCreateCategory(form);
    setErrors(newErrors as CategoryFormErrors);
    return firstError;
  }, [form]);

  // Memoized transform function
  const transformFormData = useCallback(
    (formData: CreateCategoryFormState) => ({
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      isDeleted: formData.isDeleted,
    }),
    []
  );

  const transformDataForCreate = useCallback(
    (formData: CreateCategoryFormState): CreateCategoryData =>
      transformFormData(formData) as CreateCategoryData,
    [transformFormData]
  );

  const transformDataForUpdate = useCallback(
    (formData: CreateCategoryFormState): UpdateCategoryData => ({
      ...transformFormData(formData),
      id: categoryId!,
    }),
    [transformFormData, categoryId]
  );

  const resetForm = useCallback(() => {
    setForm(initialState);
    setErrors({});
  }, []);

  const handleCancel = useCallback(() => {
    const action = isEditMode ? 'Edit' : 'Add';
    openDialog({
      title: `Cancel ${action} Category`,
      message: `Are you sure you want to cancel? All unsaved changes will be lost.`,
      confirmText: 'Yes, Cancel',
      cancelText: 'No, Continue',
      onConfirm: () => {
        router.push(ROUTES.DASHBOARD.CATEGORIES);
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
        title: `Confirm ${actionText} Category`,
        message: `Do you want to ${action} this category "${form.name}"${isEditMode ? '' : ' to the system'}?`,
        confirmText: `${actionText} Category`,
        cancelText: 'Cancel',
        onConfirm: async () => {
          if (isEditMode) {
            await submit(form, {
              validate,
              transformData: transformDataForUpdate,
              apiCall: (data: UpdateCategoryData | CreateCategoryData) =>
                CategoryApi.updateCategory(categoryId!, data as UpdateCategoryData),
              onSuccess: () => {
                router.push(ROUTES.DASHBOARD.CATEGORIES);
              },
            });
          } else {
            await submit(form, {
              validate,
              transformData: transformDataForCreate,
              apiCall: (data: CreateCategoryData | UpdateCategoryData) =>
                CategoryApi.createCategory(data as CreateCategoryData),
              onSuccess: () => {
                resetForm();
                router.push(ROUTES.DASHBOARD.CATEGORIES);
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
      categoryId,
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
