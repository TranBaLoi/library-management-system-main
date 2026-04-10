import { toaster } from '@/components/ui/Toaster';
import { useDialog } from '@/lib/hooks';
import { useCallback, useEffect, useRef, useState } from 'react';

import { BorrowType } from '@/components/borrow-requests/BorrowRequestForm';

interface BorrowRequestFormState {
  startDate: string;
  endDate: string;
  borrowType: BorrowType;
}

interface BorrowRequestFormErrors {
  startDate?: string;
  endDate?: string;
}

interface UseBorrowRequestFormOptions {
  bookId: number;
  user?: { id: number; fullName: string } | null;
  hasEbook?: boolean;
  availableCount?: number;
  onBorrowFromPartner?: () => void;
  onCreateBorrowRequest?: (data: {
    userId: number;
    bookId: number;
    startDate: string;
    endDate: string;
    borrowType: BorrowType;
  }) => Promise<void>;
}

const initialState: BorrowRequestFormState = {
  startDate: '',
  endDate: '',
  borrowType: 'book-copy',
};

// Helper to get today's date in YYYY-MM-DD format
const getTodayDate = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

// Helper to get date 30 days from start date
const getMaxEndDate = (startDate: string): string => {
  if (!startDate) return '';
  const date = new Date(startDate);
  date.setDate(date.getDate() + 30);
  return date.toISOString().split('T')[0];
};

export function useBorrowRequestForm({
  bookId,
  user,
  hasEbook = false,
  availableCount = 0,
  onBorrowFromPartner,
  onCreateBorrowRequest,
}: UseBorrowRequestFormOptions) {
  const { dialog, openDialog, updateDialog, closeDialog } = useDialog();
  const [form, setForm] = useState<BorrowRequestFormState>({
    ...initialState,
    borrowType: hasEbook ? 'book-copy' : 'book-copy', // Default to book-copy
  });
  const [errors, setErrors] = useState<BorrowRequestFormErrors>({});
  const formRef = useRef<BorrowRequestFormState>(form);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Keep formRef in sync with form state
  useEffect(() => {
    formRef.current = form;
  }, [form]);

  // Check if current borrow type is available
  const isCurrentTypeAvailable = useCallback((type: BorrowType): boolean => {
    if (type === 'book-copy') {
      return availableCount > 0;
    }
    if (type === 'ebook') {
      return hasEbook;
    }
    return false;
  }, [availableCount, hasEbook]);

  const setField = useCallback(
    (key: keyof BorrowRequestFormState, value: string | BorrowType) => {
      setForm(prev => {
        const newForm = { ...prev, [key]: value };

        // Auto-update endDate max when startDate changes
        if (key === 'startDate' && typeof value === 'string' && value) {
          const maxEndDate = getMaxEndDate(value);
          // If current endDate is beyond max, adjust it
          if (newForm.endDate && newForm.endDate > maxEndDate) {
            newForm.endDate = maxEndDate;
          }
        }

        return newForm;
      });

      // Clear error when user starts typing (only for string fields)
      if (typeof key === 'string' && errors[key as keyof BorrowRequestFormErrors]) {
        setErrors(prev => ({ ...prev, [key as keyof BorrowRequestFormErrors]: undefined }));
      }
    },
    [errors]
  );

  const validate = useCallback(
    (formData?: BorrowRequestFormState, forceValidation = false): boolean => {
      // Only validate if user has attempted to submit or if forced
      if (!hasAttemptedSubmit && !forceValidation) {
        return true;
      }

      const dataToValidate = formData || formRef.current;
      const newErrors: BorrowRequestFormErrors = {};
      const today = getTodayDate();

      // Validate startDate
      if (!dataToValidate.startDate) {
        newErrors.startDate = 'Please select start date!';
      } else if (dataToValidate.startDate < today) {
        newErrors.startDate = 'Start date cannot be in the past!';
      }

      // Validate endDate
      if (!dataToValidate.endDate) {
        newErrors.endDate = 'Please select return date!';
      } else if (dataToValidate.startDate && dataToValidate.endDate < dataToValidate.startDate) {
        newErrors.endDate = 'Return date must be after start date!';
      } else if (dataToValidate.startDate) {
        const startDate = new Date(dataToValidate.startDate);
        const endDate = new Date(dataToValidate.endDate);
        const diffTime = endDate.getTime() - startDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        if (diffDays > 30) {
          newErrors.endDate = 'Borrow period cannot exceed 30 days!';
        }
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [hasAttemptedSubmit]
  );

  const handleBorrowSubmit = useCallback(
    async (data: BorrowRequestFormState) => {
      if (!user) {
        toaster.create({
          title: 'Error',
          description: 'You must be logged in to borrow books.',
          type: 'error',
          duration: 5000,
        });
        closeDialog();
        return;
      }

      if (!onCreateBorrowRequest) return;

      try {
        setSubmitError(null);
        await onCreateBorrowRequest({
          userId: user.id,
          bookId: bookId,
          startDate: data.startDate,
          endDate: data.endDate,
          borrowType: data.borrowType,
        });
        closeDialog();
        setForm({
          startDate: '',
          endDate: '',
          borrowType: hasEbook ? 'book-copy' : 'book-copy',
        });
        setErrors({});
        setHasAttemptedSubmit(false);
      } catch (error: unknown) {
        console.error('Failed to create borrow request:', error);
        setSubmitError(error instanceof Error ? error.message : 'Failed to create borrow request');
        closeDialog();
      }
    },
    [user, onCreateBorrowRequest, bookId, closeDialog, hasEbook]
  );

  const resetForm = useCallback(() => {
    setForm({
      startDate: '',
      endDate: '',
      borrowType: hasEbook ? 'book-copy' : 'book-copy',
    });
    setErrors({});
    setHasAttemptedSubmit(false);
  }, [hasEbook]);

  // Update dialog button text when borrowType changes
  useEffect(() => {
    if (dialog.isOpen && form.borrowType) {
      const isAvailable = isCurrentTypeAvailable(form.borrowType);
      const newConfirmText = isAvailable ? 'Confirm' : 'Borrow from Partner Libraries';
      
      // Only update if the text has changed to avoid infinite loops
      if (dialog.confirmText !== newConfirmText) {
        updateDialog({
          confirmText: newConfirmText,
          onConfirm: () => {
            if (!isAvailable && onBorrowFromPartner) {
              closeDialog();
              onBorrowFromPartner();
              return;
            }
            setHasAttemptedSubmit(true);
            const currentForm = formRef.current;
            if (validate(currentForm, true)) {
              handleBorrowSubmit(currentForm);
            }
          },
        });
      }
    }
  }, [form.borrowType, dialog.isOpen, dialog.confirmText, isCurrentTypeAvailable, updateDialog, onBorrowFromPartner, closeDialog, validate, handleBorrowSubmit]);

  const openBorrowDialog = useCallback(() => {
    setSubmitError(null);
    const today = getTodayDate();
    setForm({
      startDate: today,
      endDate: '',
      borrowType: hasEbook ? 'book-copy' : 'book-copy',
    });
    setErrors({});
    setHasAttemptedSubmit(false);
    
    const currentType = hasEbook ? 'book-copy' : 'book-copy';
    const isAvailable = isCurrentTypeAvailable(currentType);
    
    openDialog({
      title: 'Borrow Book',
      message: '',
      confirmText: isAvailable ? 'Confirm' : 'Borrow from Partner Libraries',
      cancelText: 'Cancel',
      onConfirm: () => {
        if (!isAvailable && onBorrowFromPartner) {
          closeDialog();
          onBorrowFromPartner();
          return;
        }
        setHasAttemptedSubmit(true);
        const currentForm = formRef.current;
        if (validate(currentForm, true)) {
          handleBorrowSubmit(currentForm);
        }
      },
    });
  }, [openDialog, validate, handleBorrowSubmit, setHasAttemptedSubmit, hasEbook, isCurrentTypeAvailable, onBorrowFromPartner, closeDialog]);

  return {
    form,
    errors,
    setField,
    validate,
    resetForm,
    openBorrowDialog,
    dialog,
    closeDialog,
    submitError,
    hasAttemptedSubmit,
  };
}
