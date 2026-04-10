'use client';

import { IconButton, Tag } from '@/components';
import { ROUTES } from '@/constants';
import { formatDate } from '@/lib/utils';
import { BookEditionWithBook } from '@/types';
import { HStack, Text } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { LuDownload, LuPencil, LuTrash2 } from 'react-icons/lu';

// Component to render format with color coding
function FormatCell({ format }: { format: string }) {
  const getFormatColor = (): 'active' | 'reserved' | 'borrowed' | 'inactive' | 'lost' => {
    switch (format) {
      case 'EBOOK':
        return 'active';
      case 'AUDIO':
        return 'reserved';
      default:
        return 'inactive';
    }
  };

  const formatLabel = format === 'EBOOK' ? 'E-Book' : format === 'AUDIO' ? 'Audio Book' : format;

  return <Tag variantType={getFormatColor()}>{formatLabel}</Tag>;
}

// Component to render file format
function FileFormatCell({ fileFormat }: { fileFormat: string | null }) {
  if (!fileFormat) return <Text color="gray.500">—</Text>;

  const formatLabel: Record<string, string> = {
    EPUB: 'EPUB',
    PDF: 'PDF',
    MOBI: 'MOBI',
    AUDIO_MP3: 'MP3',
    AUDIO_M4B: 'M4B',
    OTHER: 'Other',
  };

  return <Text fontSize="sm">{formatLabel[fileFormat] || fileFormat}</Text>;
}

// Component to render DRM type
function DRMTypeCell({ drmType }: { drmType: string | null }) {
  if (!drmType) return <Text color="gray.500">—</Text>;

  const drmLabel: Record<string, string> = {
    NONE: 'None',
    WATERMARK: 'Watermark',
    ADOBE_DRM: 'Adobe DRM',
    LCP: 'LCP',
    CUSTOM: 'Custom',
  };

  return <Text fontSize="sm">{drmLabel[drmType] || drmType}</Text>;
}

// Component to render file size
function FileSizeCell({ fileSizeBytes }: { fileSizeBytes: string | null }) {
  if (!fileSizeBytes) return <Text color="gray.500">—</Text>;

  const bytes = Number(fileSizeBytes);
  const mb = bytes / (1024 * 1024);

  if (mb < 1) {
    const kb = bytes / 1024;
    return <Text fontSize="sm">{kb.toFixed(2)} KB</Text>;
  }

  return <Text fontSize="sm">{mb.toFixed(2)} MB</Text>;
}

// Component to render status
function StatusCell({ status }: { status: string | null }) {
  if (!status) return <Text color="gray.500">—</Text>;

  const getStatusColor = (): 'active' | 'inactive' => {
    return status === 'ACTIVE' ? 'active' : 'inactive';
  };

  return <Tag variantType={getStatusColor()}>{status}</Tag>;
}

// Component to render action buttons
function ActionsCell({
  edition,
  onDelete,
}: {
  edition: BookEditionWithBook;
  onDelete: (edition: BookEditionWithBook) => void;
}) {
  const router = useRouter();

  const handleEdit = () => {
    router.push(`${ROUTES.DASHBOARD.BOOKS_EDITIONS}/edit/${edition.id}`);
  };

  const handleDownload = () => {
    if (edition.storageUrl) {
      window.open(edition.storageUrl, '_blank');
    }
  };

  return (
    <HStack gap={2} justifyContent="center">
      {edition.storageUrl && (
        <IconButton aria-label="Download file" onClick={handleDownload}>
          <LuDownload />
        </IconButton>
      )}
      <IconButton aria-label="Edit edition" onClick={handleEdit}>
        <LuPencil />
      </IconButton>
      <IconButton
        aria-label="Delete edition"
        onClick={() => onDelete(edition)}
        colorScheme="red"
        variant="ghost"
      >
        <LuTrash2 />
      </IconButton>
    </HStack>
  );
}

export const BookEditionColumns = (
  onDelete: (edition: BookEditionWithBook) => void,
  showBookName: boolean = false,
  showId: boolean = true
) => [
  ...(showId
    ? [
        {
          key: 'id',
          header: 'ID',
          sortable: true,
          width: '60px',
          render: (edition: BookEditionWithBook) => <Text>{edition.id}</Text>,
        },
      ]
    : []),
  ...(showBookName
    ? [
        {
          key: 'bookTitle',
          header: 'Book Name',
          sortable: false,
          width: '200px',
          render: (edition: BookEditionWithBook) => (
            <Text fontSize="sm" fontWeight="medium">
              {edition.book.title}
            </Text>
          ),
        },
      ]
    : []),
  {
    key: 'format',
    header: 'Format',
    sortable: true,
    width: '120px',
    textAlign: 'center' as const,
    render: (edition: BookEditionWithBook) => <FormatCell format={edition.format} />,
  },
  {
    key: 'isbn13',
    header: 'ISBN-13',
    sortable: true,
    width: '150px',
    render: (edition: BookEditionWithBook) => (
      <Text fontSize="sm">{edition.isbn13 || <Text color="gray.500">—</Text>}</Text>
    ),
  },
  {
    key: 'fileFormat',
    header: 'File Format',
    sortable: true,
    width: '100px',
    textAlign: 'center' as const,
    render: (edition: BookEditionWithBook) => <FileFormatCell fileFormat={edition.fileFormat} />,
  },
  {
    key: 'fileSizeBytes',
    header: 'File Size',
    sortable: true,
    width: '100px',
    textAlign: 'center' as const,
    render: (edition: BookEditionWithBook) => (
      <FileSizeCell fileSizeBytes={edition.fileSizeBytes} />
    ),
  },
  {
    key: 'drmType',
    header: 'DRM',
    sortable: true,
    width: '120px',
    textAlign: 'center' as const,
    render: (edition: BookEditionWithBook) => <DRMTypeCell drmType={edition.drmType} />,
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    width: '100px',
    textAlign: 'center' as const,
    render: (edition: BookEditionWithBook) => <StatusCell status={edition.status} />,
  },
  {
    key: 'createdAt',
    header: 'Created At',
    sortable: true,
    width: '120px',
    textAlign: 'center' as const,
    render: (edition: BookEditionWithBook) => (
      <Text fontSize="sm" color="gray.600">
        {formatDate(edition.createdAt)}
      </Text>
    ),
  },
  {
    key: 'actions',
    header: 'Actions',
    sortable: false,
    width: '150px',
    textAlign: 'center' as const,
    render: (edition: BookEditionWithBook) => <ActionsCell edition={edition} onDelete={onDelete} />,
  },
];
