import { toaster } from '@/components/ui/Toaster';
import { useDialog } from '@/lib/hooks';
import { ReviewDisplayData } from '@/types';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ReviewFormState {
  rating: number;
  reviewText: string;
}

interface ReviewFormErrors {
  rating?: string;
  reviewText?: string;
}

interface UseReviewFormOptions {
  bookId: number;
  user?: { id: number; fullName: string } | null;
  onCreateReview?: (data: {
    userId: number;
    bookId: number;
    rating: number;
    reviewText: string | null;
    reviewDate: Date;
  }) => Promise<void>;
  onUpdateReview?: (
    id: number,
    data: { rating: number; reviewText: string | null; reviewDate: Date }
  ) => Promise<void>;
  onDeleteReview?: (id: number) => Promise<void>;
}

const initialState: ReviewFormState = {
  rating: 0,
  reviewText: '',
};

export function useReviewForm({
  bookId,
  user,
  onCreateReview,
  onUpdateReview,
  onDeleteReview,
}: UseReviewFormOptions) {
  const { dialog, openDialog, closeDialog } = useDialog();
  const [form, setForm] = useState<ReviewFormState>(initialState);
  const [errors, setErrors] = useState<ReviewFormErrors>({});
  const formRef = useRef<ReviewFormState>(form);
  const [editingReview, setEditingReview] = useState<ReviewDisplayData | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Keep formRef in sync with form state
  useEffect(() => {
    formRef.current = form;
  }, [form]);

  const setField = useCallback(
    (key: keyof ReviewFormState, value: number | string) => {
      setForm(prev => ({ ...prev, [key]: value }));

      // Clear error when user starts typing
      if (errors[key]) {
        setErrors(prev => ({ ...prev, [key]: undefined }));
      }
    },
    [errors]
  );

  const validate = useCallback(
    (formData?: ReviewFormState, forceValidation = false): boolean => {
      // Only validate if user has attempted to submit or if forced
      if (!hasAttemptedSubmit && !forceValidation) {
        return true;
      }

      const dataToValidate = formData || formRef.current;
      const newErrors: ReviewFormErrors = {};

      if (dataToValidate.rating === 0) {
        newErrors.rating = 'Please select a rating!';
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [hasAttemptedSubmit]
  );

  const resetForm = useCallback(() => {
    setForm(initialState);
    setErrors({});
    setHasAttemptedSubmit(false);
  }, []);

  const handleReviewSubmit = useCallback(
    async (data: ReviewFormState) => {
      if (!user) {
        toaster.create({
          title: 'Error',
          description: 'You must be logged in to write a review.',
          type: 'error',
          duration: 5000,
        });
        closeDialog();
        return;
      }

      if (!onCreateReview) return;

      try {
        setSubmitError(null);
        await onCreateReview({
          userId: user.id,
          bookId: bookId,
          rating: data.rating,
          reviewText: data.reviewText || null,
          reviewDate: new Date(),
        });
        closeDialog();
        resetForm();
      } catch (error: unknown) {
        console.error('Failed to create review:', error);
      }
    },
    [user, onCreateReview, bookId, closeDialog, resetForm]
  );

  const handleReviewUpdate = useCallback(
    async (data: ReviewFormState, reviewId?: number) => {
      // Use reviewId parameter if provided, otherwise fallback to editingReview
      const targetReviewId = reviewId || editingReview?.id;

      if (!targetReviewId || !onUpdateReview) {
        return;
      }

      try {
        setSubmitError(null);
        await onUpdateReview(targetReviewId, {
          rating: data.rating,
          reviewText: data.reviewText || null,
          reviewDate: new Date(),
        });
        setEditingReview(null);
        closeDialog();
        resetForm();
      } catch (error: unknown) {
        console.error('Failed to update review:', error);
      }
    },
    [editingReview, onUpdateReview, closeDialog, resetForm]
  );

  const handleReviewDelete = useCallback(
    async (reviewId: number) => {
      if (!onDeleteReview) return;

      try {
        await onDeleteReview(reviewId);
        closeDialog();
      } catch (error: unknown) {
        console.error('Failed to delete review:', error);
      }
    },
    [onDeleteReview, closeDialog]
  );

  const openReviewDialog = useCallback(() => {
    setSubmitError(null);
    setEditingReview(null);
    resetForm();
    openDialog({
      title: 'Write a review',
      message: '',
      confirmText: 'Submit',
      cancelText: 'Cancel',
      onConfirm: () => {
        setHasAttemptedSubmit(true);
        const currentForm = formRef.current;
        if (validate(currentForm, true)) {
          handleReviewSubmit(currentForm);
        }
      },
    });
  }, [openDialog, resetForm, validate, handleReviewSubmit, setHasAttemptedSubmit]);

  const openEditDialog = useCallback(
    (review: ReviewDisplayData) => {
      setSubmitError(null);
      setEditingReview(review);
      setHasAttemptedSubmit(false);
      setErrors({});

      // Set form data directly to ensure it's available immediately
      const formData = {
        rating: review.rating,
        reviewText: review.reviewText,
      };
      setForm(formData);
      formRef.current = formData;

      openDialog({
        title: 'Edit review',
        message: '',
        confirmText: 'Update',
        cancelText: 'Cancel',
        onConfirm: () => {
          setHasAttemptedSubmit(true);
          const currentForm = formRef.current;
          if (validate(currentForm, true)) {
            handleReviewUpdate(currentForm, review.id);
          }
        },
      });
    },
    [openDialog, validate, handleReviewUpdate, setHasAttemptedSubmit]
  );

  const openDeleteDialog = useCallback(
    (review: ReviewDisplayData) => {
      openDialog({
        title: 'Confirm delete review',
        message: 'Are you sure you want to delete this review? This action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        onConfirm: async () => {
          await handleReviewDelete(review.id);
        },
      });
    },
    [openDialog, handleReviewDelete]
  );

  return {
    form,
    errors,
    setField,
    validate,
    resetForm,
    openReviewDialog,
    openEditDialog,
    openDeleteDialog,
    dialog,
    closeDialog,
    editingReview,
    submitError,
    hasAttemptedSubmit,
  };
}
