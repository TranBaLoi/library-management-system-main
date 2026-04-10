'use client';

import { Dialog } from '@/components';
import { generateExternalLibraryUrls } from '@/lib/utils';
import { Icon, Link, Text, VStack } from '@chakra-ui/react';
import { LuExternalLink } from 'react-icons/lu';

export interface ExternalLibrarySearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bookTitle: string;
  authorName?: string;
}

export function ExternalLibrarySearchDialog({
  isOpen,
  onClose,
  bookTitle,
  authorName,
}: ExternalLibrarySearchDialogProps) {
  const libraries = generateExternalLibraryUrls(bookTitle, authorName);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Borrow from Partner Libraries"
      content={
        <VStack gap={3} align="stretch">
          <Text fontSize="sm" color="secondaryText.500" mb={3}>
            Search for &quot;{bookTitle}&quot;{authorName ? ` - ${authorName}` : ''} at:
          </Text>
          {libraries.map((library, index) => (
            <Link
              key={index}
              href={library.url}
              target="_blank"
              rel="noopener noreferrer"
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              p={3}
              border="1px solid"
              borderColor="secondary.500"
              borderRadius="lg"
              color="secondary.500"
              _hover={{ bg: 'secondary.500', color: 'white' }}
            >
              <Text fontSize="sm" fontWeight="medium">
                {library.name}
              </Text>
              <Icon as={LuExternalLink} boxSize={4} />
            </Link>
          ))}
        </VStack>
      }
      buttons={[
        {
          label: 'Close',
          variant: 'secondary',
          onClick: onClose,
        },
      ]}
    />
  );
}

