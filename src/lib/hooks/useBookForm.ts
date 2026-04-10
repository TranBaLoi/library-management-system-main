import { AiApi, BookApi } from '@/api';
import { SelectOption } from '@/components/forms/FormSelectSearch';
import { toaster } from '@/components/ui/Toaster';
import { ROUTES } from '@/constants';
import { useCategoryOptions, useDialog, useFormSubmission } from '@/lib/hooks';
import { CreateBookFormState, FormErrors, validateCreateBook } from '@/lib/validators';
import { Book, CreateBookData, UpdateBookData } from '@/types/book';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

const initialState: CreateBookFormState = {
  authorId: '',
  title: '',
  isbn: '',
  publishYear: '',
  publisher: '',
  pageCount: '',
  price: '',
  edition: '',
  description: '',
  coverImageUrl: '',
  categories: [],
  isDeleted: false,
};

export function useBookForm(bookId?: number) {
  const router = useRouter();
  const categoryOptions = useCategoryOptions();
  const [form, setForm] = useState<CreateBookFormState>(initialState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(!!bookId);
  const isEditMode = !!bookId;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  // Single form submission hook with dynamic messages
  const { submit, isSubmitting } = useFormSubmission<
    CreateBookFormState,
    CreateBookData | UpdateBookData,
    Book
  >({
    successMessage: isEditMode ? 'Book updated successfully' : 'Book added successfully',
    errorMessage: isEditMode ? 'Failed to update book' : 'Failed to add book',
  });

  const { dialog, openDialog, handleConfirm, handleCancel: handleDialogCancel } = useDialog();

  // Load book data when editing
  useEffect(() => {
    if (!bookId) return;

    const loadBook = async () => {
      try {
        setIsLoading(true);
        const book = await BookApi.getBookById(bookId);

        // Transform book data to form state
        setForm({
          authorId: String(book.authorId),
          title: book.title || '',
          isbn: book.isbn || '',
          publishYear: book.publishYear ? String(book.publishYear) : '',
          publisher: book.publisher || '',
          pageCount: book.pageCount ? String(book.pageCount) : '',
          price: book.price ? String(book.price) : '',
          edition: book.edition || '',
          description: book.description || '',
          coverImageUrl: book.coverImageUrl || '',
          categories:
            book.bookCategories?.map(bc => {
              const category = categoryOptions.find(opt => Number(opt.value) === bc.categoryId);
              return category || { value: bc.categoryId.toString(), label: `` };
            }) || [],
          isDeleted: book.isDeleted,
        });
        // Clear cover image preview when loading book data
        setCoverImagePreview(null);
        setCoverImageFile(null);
      } catch (error) {
        console.error('Failed to load book:', error);
        // Redirect to books list if book not found
        router.push(ROUTES.DASHBOARD.BOOKS);
      } finally {
        setIsLoading(false);
      }
    };

    loadBook();
  }, [bookId, router, categoryOptions]);

  const setField = useCallback(
    (key: keyof CreateBookFormState, value: string | SelectOption[] | boolean) => {
      setForm(prev => ({ ...prev, [key]: value }));

      // Clear error when user starts typing
      if (errors[key]) {
        setErrors(prev => ({ ...prev, [key]: undefined }));
      }
    },
    [errors]
  );

  const validate = useCallback((): string | null => {
    const { errors: newErrors, firstError } = validateCreateBook(form);
    setErrors(newErrors as FormErrors);
    return firstError;
  }, [form]);

  // Memoized transform function
  const transformFormData = useCallback(
    (formData: CreateBookFormState) => ({
      authorId: Number(formData.authorId),
      title: formData.title.trim(),
      isbn: formData.isbn.trim() || null,
      publishYear: formData.publishYear ? Number(formData.publishYear) : null,
      publisher: formData.publisher.trim() || null,
      pageCount: formData.pageCount ? Number(formData.pageCount) : null,
      price: formData.price ? Number(formData.price) : null,
      edition: formData.edition.trim() || null,
      description: formData.description.trim() || null,
      coverImageUrl: formData.coverImageUrl.trim() || null,
      isDeleted: formData.isDeleted,
      categories: formData.categories?.map(opt => Number(opt.value)) || [],
    }),
    []
  );

  const transformDataForCreate = useCallback(
    (formData: CreateBookFormState): CreateBookData =>
      transformFormData(formData) as CreateBookData,
    [transformFormData]
  );

  const transformDataForUpdate = useCallback(
    (formData: CreateBookFormState): UpdateBookData =>
      transformFormData(formData) as UpdateBookData,
    [transformFormData]
  );

  const resetForm = useCallback(() => {
    setForm(initialState);
    setErrors({});
    setCoverImageFile(null);
    setCoverImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Helper function to resize image to 3:4 aspect ratio
  const resizeImage = useCallback(
    (file: File, targetWidth: number, targetHeight: number): Promise<File> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = e => {
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
              reject(new Error('Could not get canvas context'));
              return;
            }

            // Calculate dimensions to maintain aspect ratio
            const imgWidth = img.width;
            const imgHeight = img.height;
            const imgAspectRatio = imgWidth / imgHeight;
            const targetAspectRatio = targetWidth / targetHeight;

            let newWidth: number;
            let newHeight: number;
            let offsetX = 0;
            let offsetY = 0;

            // Determine dimensions and cropping
            if (imgAspectRatio > targetAspectRatio) {
              // Image is wider than target ratio, crop sides
              newHeight = targetHeight;
              newWidth = targetHeight * imgAspectRatio;
              offsetX = (newWidth - targetWidth) / 2;
            } else {
              // Image is taller than target ratio, crop top/bottom
              newWidth = targetWidth;
              newHeight = targetWidth / imgAspectRatio;
              offsetY = (newHeight - targetHeight) / 2;
            }

            canvas.width = targetWidth;
            canvas.height = targetHeight;

            // Draw image with cropping (object-fit: cover)
            ctx.drawImage(img, -offsetX, -offsetY, newWidth, newHeight);

            canvas.toBlob(
              blob => {
                if (blob) {
                  const resizedFile = new File([blob], file.name, {
                    type: file.type,
                    lastModified: Date.now(),
                  });
                  resolve(resizedFile);
                } else {
                  reject(new Error('Failed to create blob'));
                }
              },
              file.type,
              0.9 // Quality for JPEG
            );
          };

          img.src = e.target?.result as string;
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
    },
    []
  );

  const handleCoverImageChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          console.error('Invalid file type');
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          return;
        }

        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
          console.error('File too large');
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          return;
        }

        // Resize image to 3:4 aspect ratio (book cover standard size)
        try {
          const resizedFile = await resizeImage(file, 600, 800); // 3:4 aspect ratio
          setCoverImageFile(resizedFile);

          // Create preview
          const reader = new FileReader();
          reader.onloadend = () => {
            setCoverImagePreview(reader.result as string);
          };
          reader.readAsDataURL(resizedFile);
        } catch (error) {
          console.error('Failed to resize image:', error);
          // Fallback to original file if resize fails
          setCoverImageFile(file);
          const reader = new FileReader();
          reader.onloadend = () => {
            setCoverImagePreview(reader.result as string);
          };
          reader.readAsDataURL(file);
        }
      }
    },
    [resizeImage]
  );

  const handleRemoveCoverImage = useCallback(() => {
    setCoverImageFile(null);
    setCoverImagePreview(null);
    setForm(prev => ({ ...prev, coverImageUrl: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleCoverImageClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleGenerateDescription = useCallback(
    async (authorName: string) => {
      if (!form.title.trim() || !authorName.trim()) {
        toaster.create({
          title: 'Missing information',
          description: 'Please enter both title and author before generating description',
          type: 'warning',
          duration: 3000,
        });
        return;
      }

      setIsGeneratingDescription(true);
      try {
        const result = await AiApi.generateBookSummary(form.title.trim(), authorName.trim());
        setField('description', result.summary);
        toaster.create({
          title: 'Description generated',
          description: 'AI has generated a description for this book',
          type: 'success',
          duration: 3000,
        });
      } catch (error) {
        console.error('Failed to generate description:', error);
        toaster.create({
          title: 'Generation failed',
          description: 'Failed to generate description. Please try again.',
          type: 'error',
          duration: 3000,
        });
      } finally {
        setIsGeneratingDescription(false);
      }
    },
    [form.title, setField]
  );

  const handleCancel = useCallback(() => {
    const action = isEditMode ? 'Edit' : 'Add';
    openDialog({
      title: `Cancel ${action} Book`,
      message: `Are you sure you want to cancel? All unsaved changes will be lost.`,
      confirmText: 'Yes, Cancel',
      cancelText: 'No, Continue',
      onConfirm: () => {
        router.push(ROUTES.DASHBOARD.BOOKS);
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
        title: `Confirm ${actionText} Book`,
        message: `Do you want to ${action} this book "${form.title}"${isEditMode ? '' : ' to the system'}?`,
        confirmText: `${actionText} Book`,
        cancelText: 'Cancel',
        onConfirm: async () => {
          try {
            if (isEditMode) {
              // For edit mode, send multipart/form-data if cover image is uploaded
              if (coverImageFile) {
                const transformedData = transformDataForUpdate(form);
                await BookApi.updateBookWithFile(bookId!, transformedData, coverImageFile);
                toaster.create({
                  title: 'Book updated successfully',
                  description: 'Your book has been updated',
                  type: 'success',
                  duration: 3000,
                });
                router.push(ROUTES.DASHBOARD.BOOKS);
              } else {
                await submit(form, {
                  validate,
                  transformData: transformDataForUpdate,
                  apiCall: (data: UpdateBookData) => BookApi.updateBook(bookId!, data),
                  onSuccess: () => {
                    router.push(ROUTES.DASHBOARD.BOOKS);
                  },
                });
              }
            } else {
              // For create mode, send multipart/form-data if cover image is uploaded
              if (coverImageFile) {
                const transformedData = transformDataForCreate(form);
                await BookApi.createBookWithFile(transformedData, coverImageFile);
                toaster.create({
                  title: 'Book added successfully',
                  description: 'Your book has been added',
                  type: 'success',
                  duration: 3000,
                });
                resetForm();
                router.push(ROUTES.DASHBOARD.BOOKS);
              } else {
                await submit(form, {
                  validate,
                  transformData: transformDataForCreate,
                  apiCall: (data: CreateBookData | UpdateBookData) =>
                    BookApi.createBook(data as CreateBookData),
                  onSuccess: () => {
                    resetForm();
                    router.push(ROUTES.DASHBOARD.BOOKS);
                  },
                });
              }
            }
          } catch (error) {
            console.error('Failed to save book:', error);
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
      bookId,
      resetForm,
      router,
      coverImageFile,
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
    coverImageFile,
    coverImagePreview,
    fileInputRef,
    handleCoverImageChange,
    handleRemoveCoverImage,
    handleCoverImageClick,
    isGeneratingDescription,
    handleGenerateDescription,
  };
}
