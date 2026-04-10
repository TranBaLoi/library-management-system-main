'use client';

import { BookApi } from '@/api';
import { PdfViewer } from '@/components';
import { Box, Heading, Text, VStack } from '@chakra-ui/react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function EbookViewPage() {
  const params = useParams();
  const bookId = params?.bookId ? parseInt(params.bookId as string) : null;

  const [bookTitle, setBookTitle] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState<string | null>(null);
  const [publishYear, setPublishYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookInfo = async () => {
      if (!bookId) {
        setLoading(false);
        return;
      }

      try {
        const book = await BookApi.getBookById(bookId);
        setBookTitle(book.title);
        setAuthorName(book.author?.fullName || null);
        setPublishYear(book.publishYear);
      } catch (error) {
        console.error('Failed to fetch book info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookInfo();
  }, [bookId]);

  if (!bookId) {
    return (
      <Box p={6}>
        <Text color="red.500">Invalid book ID</Text>
      </Box>
    );
  }

  return (
    <VStack gap={2} align="stretch">
      <Box>
        <Heading fontSize="xl" fontWeight="medium">
          {bookTitle
            ? `${bookTitle}${authorName ? ` - ${authorName}` : ''}${publishYear ? ` (${publishYear})` : ''}`
            : 'Ebook Viewer'}
        </Heading>
      </Box>

      <PdfViewer bookId={bookId} bookTitle={bookTitle || undefined} />
    </VStack>
  );
}
