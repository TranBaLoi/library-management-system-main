'use client';

import { EntityStatusCell, IconButton } from '@/components';
import { ROUTES } from '@/constants';
import { useAuthors } from '@/lib/hooks/useAuthors';
import { Book } from '@/types';
import { HStack, Image, Text, VStack } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { LuEye, LuPencil } from 'react-icons/lu';

// Component to render author name with hook
function AuthorCell({ authorId }: { authorId: number }) {
  const { data: authors } = useAuthors();
  const author = authors?.find(a => a.id === authorId);

  return <Text>{author?.fullName || `Author ID: ${authorId}`}</Text>;
}

// Component to render action buttons
function ActionsCell({ book }: { book: Book }) {
  const router = useRouter();

  const handleEdit = () => {
    router.push(`${ROUTES.DASHBOARD.BOOKS_EDIT}/${book.id}`);
  };

  const handleView = () => {
    router.push(`${ROUTES.DASHBOARD.BOOKS}/${book.id}`);
  };

  return (
    <HStack gap={2} justifyContent="center">
      <IconButton aria-label="View book" onClick={handleView}>
        <LuEye />
      </IconButton>
      <IconButton aria-label="Edit book" onClick={handleEdit}>
        <LuPencil />
      </IconButton>
    </HStack>
  );
}

export const BookColumns = (onChangeStatus?: (book: Book) => void) => [
  {
    key: 'id',
    header: 'ID',
    sortable: true,
    width: '60px',
    render: (book: Book) => <Text>{book.id}</Text>,
  },
  {
    key: 'title',
    header: 'Book',
    sortable: true,
    render: (book: Book) => (
      <HStack gap={3}>
        <Image
          src={book.coverImageUrl ?? undefined}
          alt={book.title}
          width="40px"
          height="60px"
          objectFit="cover"
          borderRadius="sm"
        />
        <VStack align="start" gap={1}>
          <Text fontWeight="medium">{book.title}</Text>
          <Text fontSize="sm" color="gray.600">
            {book.isbn}
          </Text>
        </VStack>
      </HStack>
    ),
  },
  {
    key: 'author',
    header: 'Author',
    sortable: false,
    width: '180px',
    render: (book: Book) => <AuthorCell authorId={book.authorId} />,
  },
  {
    key: 'publisher',
    header: 'Publisher',
    sortable: false,
    width: '120px',
    render: (book: Book) => <Text>{book.publisher ?? 'N/A'}</Text>,
  },
  {
    key: 'publishYear',
    header: 'Publish Year',
    sortable: true,
    width: '150px',
    textAlign: 'center' as const,
    render: (book: Book) => <Text>{book.publishYear ?? 'N/A'}</Text>,
  },
  {
    key: 'edition',
    header: 'Edition',
    sortable: false,
    width: '100px',
    textAlign: 'center' as const,
    render: (book: Book) => <Text>{book.edition ?? 'N/A'}</Text>,
  },
  {
    key: 'pageCount',
    header: 'Page Count',
    sortable: true,
    width: '150px',
    textAlign: 'center' as const,
    render: (book: Book) => <Text>{book.pageCount ?? 'N/A'}</Text>,
  },
  {
    key: 'price',
    header: 'Price',
    sortable: true,
    width: '100px',
    textAlign: 'center' as const,
    render: (book: Book) => (
      <Text>{book.price ? `${book.price.toLocaleString('vi-VN')} VND` : 'N/A'}</Text>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    width: '100px',
    render: (book: Book) => (
      <EntityStatusCell item={book} onChangeStatus={onChangeStatus || (() => {})} />
    ),
  },
  {
    key: 'actions',
    header: 'Actions',
    sortable: false,
    width: '120px',
    textAlign: 'center' as const,
    render: (book: Book) => <ActionsCell book={book} />,
  },
];
