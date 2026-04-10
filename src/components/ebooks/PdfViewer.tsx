'use client';

import { EbookBorrowRequestApi } from '@/api';
import { Button, Spinner, toaster } from '@/components';
import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LuArrowLeft } from 'react-icons/lu';

interface PdfViewerProps {
  bookId: number;
  bookTitle?: string;
}

export function PdfViewer({ bookId, bookTitle }: PdfViewerProps) {
  const router = useRouter();

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPdfUrl = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await EbookBorrowRequestApi.getEbookViewUrl(bookId);
        setPdfUrl(response.viewUrl);
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to load ebook. You may not have permission to access this book.';

        setError(errorMessage);
        toaster.create({
          title: 'Error',
          description: errorMessage,
          type: 'error',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPdfUrl();
  }, [bookId]);

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="400px">
        <VStack gap={4}>
          <Spinner />
          <Text color="secondaryText.500">Loading ebook...</Text>
        </VStack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={6}>
        <VStack gap={4} align="stretch">
          <Text fontSize="lg" fontWeight="medium" color="red.500">
            Error loading ebook
          </Text>
          <Text color="secondaryText.500">{error}</Text>
          <HStack>
            <Button
              variantType="secondary"
              onClick={handleBack}
              icon={LuArrowLeft}
              label="Go Back"
            />
            <Button
              variantType="primary"
              onClick={() => {
                setError(null);
                setLoading(true);
                window.location.reload();
              }}
              label="Retry"
            />
          </HStack>
        </VStack>
      </Box>
    );
  }

  if (!pdfUrl) {
    return (
      <Box p={6}>
        <Text color="secondaryText.500">No PDF URL available</Text>
      </Box>
    );
  }

  return (
    <VStack gap={4} align="stretch">
      {/* PDF Viewer */}
      <Box
        height="100vh"
        overflow="auto"
        display="flex"
        justifyContent="center"
        alignItems="flex-start"
      >
        <iframe
          src={pdfUrl}
          width="100%"
          height="100%"
          style={{
            minHeight: '600px',
            border: 'none',
          }}
          title={bookTitle || 'PDF Viewer'}
          allow="fullscreen"
        />
      </Box>

      {/* Note about PDF security */}
      <Box p={3} bg="blue.50" borderRadius="md">
        <Text fontSize="xs" color="blue.700">
          <strong>Note:</strong> This PDF is protected. The access link expires after 1 hour. Please
          do not share or download the file.
        </Text>
      </Box>
    </VStack>
  );
}
