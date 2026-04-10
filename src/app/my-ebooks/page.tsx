'use client';

import { EbookBorrowRequestApi } from '@/api';
import { Button, MyEbooksList } from '@/components';
import { ROUTES } from '@/constants';
import { MyEbookItem } from '@/types/ebook-borrow-request';
import { Box, Spinner, Text } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export default function MyEbooksPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [ebooks, setEbooks] = useState<MyEbookItem[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const fetchMyEbooks = useCallback(
    async (isInitial = false) => {
      try {
        if (isInitial) {
          setIsInitialLoading(true);
        } else {
          setIsFetchingData(true);
        }

        const response = await EbookBorrowRequestApi.getMyEbooks({
          page,
          limit: pageSize,
        });

        setEbooks(response.ebooks);
        setTotal(response.pagination.total);
        setHasLoadedOnce(true);
      } catch (error) {
        console.error('Failed to fetch ebooks:', error);
      } finally {
        if (isInitial) {
          setIsInitialLoading(false);
        } else {
          setIsFetchingData(false);
        }
      }
    },
    [page, pageSize]
  );

  useEffect(() => {
    // Only treat first load as initial loading
    const isFirstLoad = !hasLoadedOnce;
    fetchMyEbooks(isFirstLoad);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  // Show initial loading spinner only on first load
  if (isInitialLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="400px">
        <Spinner size="xl" />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box mb={6}>
        <Text fontSize="2xl" fontWeight="bold" mb={2}>
          My Ebooks
        </Text>
        <Text fontSize="sm" color="secondaryText.500">
          View and manage your borrowed ebooks
        </Text>
      </Box>

      {/* Results Info */}
      <Box mb={4}>
        <Text fontSize="sm" color="secondaryText.500">
          {total > 0
            ? `Total borrowed ebooks: ${total} book${total !== 1 ? 's' : ''}`
            : 'No ebooks currently borrowed'}
        </Text>
      </Box>

      {/* Loading overlay for data fetching */}
      {isFetchingData && (
        <Box display="flex" justifyContent="center" alignItems="center" py={8}>
          <Spinner size="lg" />
        </Box>
      )}

      {/* Ebooks List */}
      {!isFetchingData && ebooks.length === 0 ? (
        <Box
          textAlign="center"
          py={12}
          px={6}
          bg="white"
          borderRadius="lg"
          border="1px solid"
          borderColor="gray.200"
        >
          <Text fontSize="lg" fontWeight="semibold" mb={2}>
            No ebooks currently borrowed
          </Text>
          <Text fontSize="sm" color="secondaryText.500" mb={4}>
            Borrow an ebook to see it here
          </Text>
          <Button
            label="Browse Books"
            variantType="primary"
            onClick={() => router.push(ROUTES.SEARCH)}
            width="200px"
          />
        </Box>
      ) : !isFetchingData ? (
        <Box bg="white" borderRadius="lg" p={6} h="100%">
          <MyEbooksList
            ebooks={ebooks}
            page={page}
            pageSize={pageSize}
            total={total}
            loading={false}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onRefresh={() => fetchMyEbooks(false)}
          />
        </Box>
      ) : null}
    </Box>
  );
}
