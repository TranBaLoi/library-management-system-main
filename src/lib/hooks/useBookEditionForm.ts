import { BookEditionApi } from '@/api';
import { MAX_EBOOK_SIZE, ROUTES } from '@/constants';
import { useDialog } from '@/lib/hooks';
import { BookEdition } from '@/types';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface BookEditionFormState {
  bookId: number | null;
  format: string;
  isbn13: string;
  fileFormat: string;
  drmType: string;
  file: File | null;
}

const initialState: BookEditionFormState = {
  bookId: null,
  format: '',
  isbn13: '',
  fileFormat: '',
  drmType: '',
  file: null,
};

interface FormErrors {
  [key: string]: string;
}

export function useBookEditionForm(initialBookId?: number, editionId?: number) {
  const router = useRouter();
  const [form, setForm] = useState<BookEditionFormState>({
    ...initialState,
    bookId: initialBookId || null,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(!!editionId);
  const [existingEdition, setExistingEdition] = useState<BookEdition | null>(null);
  const isEditMode = !!editionId;

  // Dialog for cancel confirmation
  const { dialog, openDialog, handleConfirm, handleCancel: handleDialogCancel } = useDialog();

  // Load edition data when editing
  useEffect(() => {
    if (!editionId) return;

    const loadEdition = async () => {
      try {
        setIsLoading(true);
        const edition = await BookEditionApi.getBookEditionById(editionId);

        // Store the complete edition data for display
        setExistingEdition(edition);

        setForm({
          bookId: edition.bookId,
          format: edition.format || '',
          isbn13: edition.isbn13 || '',
          fileFormat: edition.fileFormat || '',
          drmType: edition.drmType || '',
          file: null, // File will be shown as existing, not in form state
        });
      } catch (error) {
        console.error('Failed to load edition:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadEdition();
  }, [editionId]);

  // Handle input change
  const handleChange = (
    field: keyof BookEditionFormState,
    value: string | number | File | null
  ) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle file change
  const handleFileChange = (file: File | null) => {
    handleChange('file', file);
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.bookId) {
      newErrors.bookId = 'Book is required';
    }

    if (!form.format) {
      newErrors.format = 'Format is required';
    }

    if (!form.fileFormat) {
      newErrors.fileFormat = 'File format is required';
    }

    if (!form.drmType) {
      newErrors.drmType = 'DRM type is required';
    }

    // File is required for create, optional for update
    if (!isEditMode && !form.file) {
      newErrors.file = 'File is required';
    }

    // Validate file if provided
    if (form.file) {
      // Check file extension based on format
      const fileExtension = form.file.name.split('.').pop()?.toLowerCase();
      if (form.format === 'EBOOK') {
        const validExts = ['epub', 'pdf', 'mobi'];
        if (!fileExtension || !validExts.includes(fileExtension)) {
          newErrors.file = `Invalid file type for EBOOK. Allowed: ${validExts.join(', ')}`;
        }
      } else if (form.format === 'AUDIO') {
        const validExts = ['mp3', 'm4a', 'm4b'];
        if (!fileExtension || !validExts.includes(fileExtension)) {
          newErrors.file = `Invalid file type for AUDIO. Allowed: ${validExts.join(', ')}`;
        }
      }

      // Check file size (max 100MB)
      if (form.file.size > MAX_EBOOK_SIZE) {
        const sizeMB = (form.file.size / (1024 * 1024)).toFixed(2);
        const maxMB = (MAX_EBOOK_SIZE / (1024 * 1024)).toFixed(2);
        newErrors.file = `File is too large (${sizeMB}MB). Maximum size: ${maxMB}MB`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Prepare FormData
      const formData = new FormData();
      formData.append('format', form.format);
      if (form.isbn13) formData.append('isbn13', form.isbn13);
      if (form.fileFormat) formData.append('fileFormat', form.fileFormat);
      if (form.drmType) formData.append('drmType', form.drmType);
      if (form.file) formData.append('file', form.file);

      if (isEditMode && editionId) {
        // Update existing edition
        await BookEditionApi.updateBookEdition(editionId, formData);
      } else {
        // Create new edition
        await BookEditionApi.createBookEdition(form.bookId!, formData);
      }

      // On success, navigate back to book detail or editions list
      router.push(`${ROUTES.DASHBOARD.BOOKS}/${form.bookId}`);
    } catch (error) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} book edition:`, error);
      // Error will be handled by the API layer with toaster
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel
  const handleCancel = useCallback(() => {
    const action = isEditMode ? 'Edit' : 'Create';
    openDialog({
      title: `Cancel ${action} Book Edition`,
      message: `Are you sure you want to cancel? All unsaved changes will be lost.`,
      confirmText: 'Yes, Cancel',
      cancelText: 'No, Continue',
      onConfirm: () => {
        if (form.bookId) {
          router.push(`${ROUTES.DASHBOARD.BOOKS}/${form.bookId}`);
        } else {
          router.push(ROUTES.DASHBOARD.BOOKS_EDITIONS);
        }
      },
    });
  }, [isEditMode, openDialog, router, form.bookId]);

  return {
    form,
    errors,
    isSubmitting,
    isLoading,
    isEditMode,
    existingEdition,
    handleChange,
    handleFileChange,
    handleSubmit,
    handleCancel,
    dialog,
    handleConfirm,
    handleDialogCancel,
  };
}
