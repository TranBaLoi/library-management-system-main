'use client';

import {
  BookSelectSearch,
  Button,
  Dialog,
  FormButtons,
  FormDivider,
  FormField,
  FormInput,
  FormSection,
  FormSelect,
} from '@/components';
import {
  DRM_TYPE_OPTIONS,
  EDITION_FORMAT_OPTIONS,
  FILE_FORMAT_OPTIONS,
  MAX_EBOOK_SIZE,
} from '@/constants';
import { useBookEditionForm } from '@/lib/hooks/useBookEditionForm';
import { Box, HStack, Input, Text, VStack } from '@chakra-ui/react';
import { useRef } from 'react';

interface BookEditionFormProps {
  bookId?: number;
  editionId?: number;
  submitLabel?: string;
  cancelLabel?: string;
}

export function BookEditionForm({
  bookId,
  editionId,
  submitLabel,
  cancelLabel = 'Cancel',
}: BookEditionFormProps) {
  const {
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
  } = useBookEditionForm(bookId, editionId);

  // Set default submit label based on mode
  const defaultSubmitLabel = isEditMode ? 'Update Edition' : 'Create Edition';
  const finalSubmitLabel = submitLabel || defaultSubmitLabel;

  // Format file size helper
  const formatFileSize = (sizeString: string | null) => {
    if (!sizeString) return 'Unknown size';
    const bytes = Number(sizeString);
    const mb = bytes / (1024 * 1024);
    if (mb < 1) {
      const kb = bytes / 1024;
      return `${kb.toFixed(2)} KB`;
    }
    return `${mb.toFixed(2)} MB`;
  };

  // Extract filename from storage URL
  const extractFileName = (storageUrl: string | null) => {
    if (!storageUrl) return 'Unknown file';
    const parts = storageUrl.split('/');
    return parts[parts.length - 1] || 'Unknown file';
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleFileChange(file);
  };

  const handleRemoveFile = () => {
    handleFileChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit();
  };

  if (isLoading) {
    return (
      <Box py={8} px={4}>
        <Text>Loading edition data...</Text>
      </Box>
    );
  }

  return (
    <Box p={4} paddingBottom={2}>
      <form onSubmit={handleFormSubmit}>
        <VStack gap={6} align="stretch">
          {/* Basic Information Section */}
          <FormSection title="Basic Information">
            {/* Book Selector */}
            <FormField label="Book *" error={errors.bookId}>
              <BookSelectSearch
                value={
                  form.bookId
                    ? {
                        value: form.bookId.toString(),
                        label: '',
                        title: '',
                        coverImageUrl: null,
                        authorName: '',
                        publishYear: null,
                        isbn: null,
                      }
                    : undefined
                }
                onChange={selected => {
                  if (selected && !Array.isArray(selected)) {
                    const selectedBookId = parseInt(selected.value, 10);
                    handleChange('bookId', selectedBookId);
                  } else {
                    handleChange('bookId', null);
                  }
                }}
                placeholder="Select a book..."
                isDisabled={!!bookId || isSubmitting}
                useLazyLoading={true}
              />
            </FormField>

            {/* Format */}
            <FormField label="Format *" error={errors.format}>
              <FormSelect
                items={EDITION_FORMAT_OPTIONS}
                value={form.format}
                onChange={value => handleChange('format', value)}
                placeholder="Select format"
                disabled={isSubmitting}
              />
            </FormField>

            {/* ISBN-13 */}
            <FormField label="ISBN-13" error={errors.isbn13}>
              <FormInput
                value={form.isbn13}
                onChange={e => handleChange('isbn13', e.target.value)}
                placeholder="Enter ISBN-13 (optional)"
                disabled={isSubmitting}
              />
            </FormField>

            {/* File Format */}
            <FormField label="File Format *" error={errors.fileFormat}>
              <FormSelect
                items={FILE_FORMAT_OPTIONS}
                value={form.fileFormat}
                onChange={value => handleChange('fileFormat', value)}
                placeholder="Select file format"
                disabled={isSubmitting}
              />
            </FormField>

            {/* DRM Type */}
            <FormField label="DRM Type *" error={errors.drmType}>
              <FormSelect
                items={DRM_TYPE_OPTIONS}
                value={form.drmType}
                onChange={value => handleChange('drmType', value)}
                placeholder="Select DRM type"
                disabled={isSubmitting}
              />
            </FormField>
          </FormSection>

          <FormDivider />

          {/* File Upload Section */}
          <FormSection title="File Upload">
            <FormField
              label={isEditMode ? 'Upload New File (Optional)' : 'Upload File *'}
              error={errors.file}
            >
              <VStack align="stretch" gap={3}>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept={
                    form.format === 'EBOOK'
                      ? '.epub,.pdf,.mobi'
                      : form.format === 'AUDIO'
                        ? '.mp3,.m4a,.m4b'
                        : '*'
                  }
                  onChange={handleFileSelect}
                  display="none"
                />

                {/* Show existing file in edit mode */}
                {isEditMode && existingEdition?.storageUrl && !form.file && (
                  <VStack align="stretch" gap={2}>
                    <Text fontSize="sm" fontWeight="medium" color="gray.700">
                      Current File:
                    </Text>
                    <HStack
                      p={3}
                      bg="blue.50"
                      borderRadius="md"
                      border="1px solid"
                      borderColor="blue.200"
                      justify="space-between"
                    >
                      <VStack align="start" gap={0} flex={1}>
                        <Text
                          fontSize="sm"
                          fontWeight="medium"
                          wordBreak="break-all"
                          overflow="hidden"
                          textOverflow="ellipsis"
                          display="-webkit-box"
                          css={{
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {extractFileName(existingEdition.storageUrl)}
                        </Text>
                        <Text fontSize="xs" color="gray.600">
                          {formatFileSize(existingEdition.fileSizeBytes)}
                        </Text>
                      </VStack>
                      <HStack gap={2}>
                        <Button
                          label="Download"
                          variantType="tertiary"
                          size="sm"
                          onClick={() => window.open(existingEdition.storageUrl!, '_blank')}
                        />
                        <Button
                          label="Replace"
                          variantType="secondary"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isSubmitting}
                        />
                      </HStack>
                    </HStack>
                  </VStack>
                )}

                {/* Show new file selection */}
                {!form.file && (!isEditMode || !existingEdition?.storageUrl) && (
                  <Button
                    label="Choose File"
                    variantType="secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                  />
                )}

                {/* Show newly selected file */}
                {form.file && (
                  <VStack align="stretch" gap={2}>
                    <Text fontSize="sm" fontWeight="medium" color="gray.700">
                      New File Selected:
                    </Text>
                    <HStack
                      p={3}
                      bg="green.50"
                      borderRadius="md"
                      border="1px solid"
                      borderColor="green.200"
                      justify="space-between"
                    >
                      <VStack align="start" gap={0}>
                        <Text fontSize="sm" fontWeight="medium">
                          {form.file.name}
                        </Text>
                        <Text fontSize="xs" color="gray.600">
                          {formatFileSize(form.file.size.toString())}
                        </Text>
                      </VStack>
                      <Button
                        label="Remove"
                        variantType="tertiary"
                        size="sm"
                        onClick={handleRemoveFile}
                        disabled={isSubmitting}
                      />
                    </HStack>
                  </VStack>
                )}

                <Text fontSize="xs" color="gray.600">
                  Maximum file size: {(MAX_EBOOK_SIZE / (1024 * 1024)).toFixed(0)}MB
                  {form.format === 'EBOOK' && ' • Supported formats: EPUB, PDF, MOBI'}
                  {form.format === 'AUDIO' && ' • Supported formats: MP3, M4A, M4B'}
                </Text>
              </VStack>
            </FormField>
          </FormSection>

          <FormDivider />

          {/* Form Buttons */}
          <FormButtons
            submitLabel={isSubmitting ? 'Submitting...' : finalSubmitLabel}
            cancelLabel={cancelLabel}
            isSubmitting={isSubmitting}
            onCancel={handleCancel}
          />
        </VStack>
      </form>

      {/* Confirmation Dialog */}
      <Dialog
        isOpen={dialog.isOpen}
        onClose={handleDialogCancel}
        title={dialog.title}
        content={dialog.message}
        buttons={[
          {
            label: dialog.cancelText,
            onClick: handleDialogCancel,
            variant: 'secondary',
          },
          {
            label: dialog.confirmText,
            onClick: handleConfirm,
            variant: 'primary',
          },
        ]}
        showCloseButton={false}
      />
    </Box>
  );
}
