import { BookItemApi } from '@/api';
import { ROUTES } from '@/constants';
import { useDialog, useFormSubmission } from '@/lib/hooks';
import {
  BookItemFormErrors,
  CreateBookItemFormState,
  validateCreateBookItem,
} from '@/lib/validators';
import { BookItem, CreateBookItemData, UpdateBookItemData } from '@/types/book-item';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const initialState: CreateBookItemFormState = {
  bookId: '',
  code: '',
  condition: 'NEW',
  status: 'AVAILABLE',
  acquisitionDate: new Date().toISOString().split('T')[0],
  isDeleted: false,
};

export function useBookItemForm(bookItemId?: number, bookId?: number) {
  const router = useRouter();
  const [form, setForm] = useState<CreateBookItemFormState>(initialState);
  const [errors, setErrors] = useState<BookItemFormErrors>({});
  const [isLoading, setIsLoading] = useState(!!bookItemId);
  const isEditMode = !!bookItemId;

  // Single form submission hook with dynamic messages
  const { submit, isSubmitting } = useFormSubmission<
    CreateBookItemFormState,
    CreateBookItemData | UpdateBookItemData,
    BookItem
  >({
    successMessage: isEditMode ? 'Book copy updated successfully' : 'Book copy added successfully',
    errorMessage: isEditMode ? 'Failed to update book copy' : 'Failed to add book copy',
  });

  const { dialog, openDialog, handleConfirm, handleCancel: handleDialogCancel } = useDialog();

  // Set preselected book ID when provided
  useEffect(() => {
    if (bookId && !bookItemId) {
      setForm(prev => ({ ...prev, bookId: String(bookId) }));
    }
  }, [bookId, bookItemId]);

  // Load book item data when editing
  useEffect(() => {
    if (!bookItemId) return;

    const loadBookItem = async () => {
      try {
        setIsLoading(true);
        const bookItem = await BookItemApi.getBookItemById(bookItemId);

        // Transform book item data to form state
        setForm({
          bookId: String(bookItem.bookId),
          code: bookItem.code || '',
          condition: bookItem.condition,
          status: bookItem.status,
          acquisitionDate: bookItem.acquisitionDate
            ? new Date(bookItem.acquisitionDate).toISOString().split('T')[0]
            : '',
          isDeleted: bookItem.isDeleted,
        });
      } catch (error) {
        console.error('Failed to load book item:', error);
        // Redirect to book items list if book item not found
        router.push(ROUTES.DASHBOARD.BOOKS_COPIES);
      } finally {
        setIsLoading(false);
      }
    };

    loadBookItem();
  }, [bookItemId, router]);

  const setField = useCallback(
    (key: keyof CreateBookItemFormState, value: string | boolean) => {
      setForm(prev => ({ ...prev, [key]: value }));
      // Clear error when user starts typing
      if (errors[key]) {
        setErrors(prev => ({ ...prev, [key]: undefined }));
      }
    },
    [errors]
  );

  const validate = useCallback((): string | null => {
    const { errors: newErrors, firstError } = validateCreateBookItem(form);
    setErrors(newErrors as BookItemFormErrors);
    return firstError;
  }, [form]);

  // Memoized transform function
  const transformFormData = useCallback(
    (formData: CreateBookItemFormState) => ({
      bookId: Number(formData.bookId),
      code: formData.code.trim(),
      condition: formData.condition,
      status: formData.status,
      acquisitionDate: formData.acquisitionDate ? new Date(formData.acquisitionDate) : null,
      isDeleted: formData.isDeleted,
    }),
    []
  );

  const transformDataForCreate = useCallback(
    (formData: CreateBookItemFormState): CreateBookItemData =>
      transformFormData(formData) as CreateBookItemData,
    [transformFormData]
  );

  const transformDataForUpdate = useCallback(
    (formData: CreateBookItemFormState): UpdateBookItemData =>
      transformFormData(formData) as UpdateBookItemData,
    [transformFormData]
  );

  const resetForm = useCallback(() => {
    setForm(initialState);
    setErrors({});
  }, []);

  const handleCancel = useCallback(() => {
    const action = isEditMode ? 'Edit' : 'Add';
    openDialog({
      title: `Cancel ${action} Book Copy`,
      message: `Are you sure you want to cancel? All unsaved changes will be lost.`,
      confirmText: 'Yes, Cancel',
      cancelText: 'No, Continue',
      onConfirm: () => {
        if (bookId) {
          router.push(`${ROUTES.DASHBOARD.BOOKS}/${bookId}`);
        } else {
          router.push(ROUTES.DASHBOARD.BOOKS_COPIES);
        }
      },
    });
  }, [isEditMode, openDialog, router, bookId]);

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
        title: `Confirm ${actionText} Book Copy`,
        message: `Do you want to ${action} this book copy "${form.code}"${isEditMode ? '' : ' to the system'}?`,
        confirmText: `${actionText} Book Copy`,
        cancelText: 'Cancel',
        onConfirm: async () => {
          if (isEditMode) {
            await submit(form, {
              validate,
              transformData: transformDataForUpdate,
              apiCall: (data: UpdateBookItemData) => BookItemApi.updateBookItem(bookItemId!, data),
              onSuccess: () => {
                if (bookId) {
                  router.push(`${ROUTES.DASHBOARD.BOOKS}/${bookId}`);
                } else {
                  router.push(ROUTES.DASHBOARD.BOOKS_COPIES);
                }
              },
            });
          } else {
            await submit(form, {
              validate,
              transformData: transformDataForCreate,
              apiCall: (data: CreateBookItemData | UpdateBookItemData) =>
                BookItemApi.createBookItem(data as CreateBookItemData),
              onSuccess: () => {
                resetForm();
                if (bookId) {
                  router.push(`${ROUTES.DASHBOARD.BOOKS}/${bookId}`);
                } else {
                  router.push(ROUTES.DASHBOARD.BOOKS_COPIES);
                }
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
      bookItemId,
      resetForm,
      router,
      bookId,
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
