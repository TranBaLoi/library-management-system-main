'use client';

import { BookApi } from '@/api';
import { BookDetail, toaster } from '@/components';
import { ROUTES } from '@/constants';
import { BookDetail as BookDetailType } from '@/types';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function BookPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = Number(params.id);
  const [book, setBook] = useState<BookDetailType | null>(null);

  // Fetch book data
  useEffect(() => {
    const fetchBook = async () => {
      if (!bookId || bookId <= 0) {
        router.push(ROUTES.DASHBOARD.BOOKS);
        return;
      }

      try {
        const bookData = await BookApi.getBookById(bookId);
        setBook(bookData);
      } catch (err) {
        console.error('Error fetching book:', err);
        toaster.create({
          title: 'Error',
          description: 'Book not found',
          type: 'error',
        });
        router.push(ROUTES.DASHBOARD.BOOKS);
      }
    };

    fetchBook();
  }, [bookId, router]);

  if (!book) {
    return null;
  }

  // Check if book has ebook
  const hasEbook = (book.bookEbookCount ?? 0) > 0;

  return (
    <BookDetail
      book={book}
      hasEbook={hasEbook}
      onEditClick={() => router.push(`${ROUTES.DASHBOARD.BOOKS_EDIT}/${book.id}`)}
      onAddBookCopyClick={() =>
        router.push(`${ROUTES.DASHBOARD.BOOKS_COPIES_ADD}?bookId=${book.id}`)
      }
    />
  );
}
