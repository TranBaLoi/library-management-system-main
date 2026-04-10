'use client';

import { BorrowRecordApi, PaymentApi } from '@/api';
import { Button, FormField, FormInput, Tag, toaster } from '@/components';
import { ROUTES } from '@/constants';
import { policyIdToCondition } from '@/constants/violation';
import { usePayPalSDK, useViolationPolicyById } from '@/lib/hooks';
import { formatDate } from '@/lib/utils';
import { PaymentWithDetails } from '@/types';
import { BookItemForViolation, BorrowRecordWithDetails } from '@/types/borrow-record';
import { Box, Grid, GridItem, HStack, Text, VStack } from '@chakra-ui/react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function MyViolationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentId = Number(params.id);
  const [payment, setPayment] = useState<PaymentWithDetails | null>(null);
  const [borrowRecord, setBorrowRecord] = useState<BorrowRecordWithDetails | null>(null);
  const [bookItem, setBookItem] = useState<BookItemForViolation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refReady, setRefReady] = useState(false);
  const paypalButtonRef = useRef<HTMLDivElement>(null);
  const paypalButtonsInstanceRef = useRef<{
    render: (container: string | HTMLElement) => void;
  } | null>(null);

  // Use PayPal SDK hook
  const { isLoaded: paypalSdkLoaded, error: paypalError } = usePayPalSDK();

  // Callback ref to track when DOM element is ready
  const setPaypalButtonRef = (node: HTMLDivElement | null) => {
    if (node) {
      paypalButtonRef.current = node;
      setRefReady(true);
    }
  };

  // Get violation policy from database using payment.policyId
  const policy = useViolationPolicyById(payment?.policyId || '');

  // Log PayPal SDK error if any
  useEffect(() => {
    if (paypalError) {
      console.error('PayPal SDK error:', paypalError);
    }
  }, [paypalError]);

  // Handle PayPal callback
  useEffect(() => {
    const paypalStatus = searchParams.get('paypal');
    if (paypalStatus === 'success' && payment && !payment.isPaid) {
      // Reload payment data to check if it was paid
      const checkPayment = async () => {
        try {
          const updatedPayment = await PaymentApi.getPaymentById(paymentId);
          if (updatedPayment.isPaid) {
            setPayment(updatedPayment);
            toaster.create({
              title: 'Success',
              description: 'Payment completed successfully',
              type: 'success',
            });
          }
        } catch (err) {
          console.error('Error checking payment status:', err);
        }
      };
      checkPayment();
    } else if (paypalStatus === 'cancel') {
      toaster.create({
        title: 'Cancelled',
        description: 'Payment was cancelled',
        type: 'warning',
      });
    }
  }, [searchParams, payment, paymentId]);

  // Fetch payment and related data
  useEffect(() => {
    const fetchData = async () => {
      if (!paymentId || paymentId <= 0) {
        router.push(ROUTES.MY_VIOLATIONS);
        return;
      }

      try {
        setLoading(true);

        // Fetch payment
        const paymentData = await PaymentApi.getPaymentById(paymentId);
        setPayment(paymentData);

        // Fetch borrow record with book items
        const borrowRecordData = await BorrowRecordApi.getBorrowRecordById(
          paymentData.borrowRecordId
        );
        setBorrowRecord(borrowRecordData);

        // Find bookItem based on policy condition
        const condition = policyIdToCondition(paymentData.policyId);
        
        // Only set bookItem if condition exists
        if (condition) {
          const matchingBookItem = borrowRecordData.borrowBooks?.find(
            bb => bb.bookItem.condition === condition
          )?.bookItem;

          // If no matching condition, use first bookItem
          const selectedBookItem = matchingBookItem || borrowRecordData.borrowBooks?.[0]?.bookItem;

          if (selectedBookItem) {
            setBookItem({
              id: selectedBookItem.id,
              code: selectedBookItem.code,
              condition: selectedBookItem.condition,
              book: selectedBookItem.book
                ? {
                    id: selectedBookItem.book.id,
                    title: selectedBookItem.book.title,
                    price: selectedBookItem.book.price,
                    author: selectedBookItem.book.author
                      ? {
                          id: selectedBookItem.book.author.id,
                          fullName: selectedBookItem.book.author.fullName,
                        }
                      : undefined,
                  }
                : null,
            });
          }
        } else {
          setBookItem(null);
        }
      } catch (err) {
        console.error('Error fetching violation details:', err);
        toaster.create({
          title: 'Error',
          description: 'Failed to load violation details',
          type: 'error',
        });
        router.push(ROUTES.MY_VIOLATIONS);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [paymentId, router]);

  // Initialize PayPal button
  useEffect(() => {
    // Cleanup previous button instance
    if (paypalButtonsInstanceRef.current && paypalButtonRef.current) {
      paypalButtonRef.current.innerHTML = '';
      paypalButtonsInstanceRef.current = null;
    }

    if (
      !payment ||
      payment.isPaid ||
      !paypalSdkLoaded ||
      !window.paypal ||
      !paypalButtonRef.current
    ) {
      return;
    }

    try {
      const buttons = window.paypal.Buttons({
        createOrder: async () => {
          try {
            const { orderId } = await PaymentApi.createPayPalOrder(paymentId);
            return orderId;
          } catch (err) {
            console.error('Error creating PayPal order:', err);
            toaster.create({
              title: 'Error',
              description: 'Failed to create payment order',
              type: 'error',
            });
            throw err;
          }
        },
        onApprove: async data => {
          try {
            await PaymentApi.capturePayPalPayment(paymentId, data.orderID);
            const updatedPayment = await PaymentApi.getPaymentById(paymentId);
            setPayment(updatedPayment);
            toaster.create({
              title: 'Success',
              description: 'Payment completed successfully',
              type: 'success',
            });
            router.refresh();
          } catch (err) {
            console.error('Error capturing payment:', err);
            toaster.create({
              title: 'Error',
              description: 'Failed to process payment',
              type: 'error',
            });
          }
        },
        onError: err => {
          console.error('PayPal error:', err);
          toaster.create({
            title: 'Error',
            description: 'An error occurred with PayPal',
            type: 'error',
          });
        },
        style: {
          layout: 'horizontal',
          color: 'gold',
          shape: 'rect',
          label: 'paypal',
        },
      });

      buttons.render(paypalButtonRef.current);
      paypalButtonsInstanceRef.current = buttons;
    } catch (err) {
      console.error('Error rendering PayPal button:', err);
    }
  }, [payment, paymentId, paypalSdkLoaded, refReady, router]);

  const handleBack = () => {
    router.push(ROUTES.MY_VIOLATIONS);
  };

  if (loading) {
    return null;
  }

  if (!payment || !borrowRecord) {
    return null;
  }

  if (!policy) {
    return null;
  }

  const bookPrice = bookItem?.book?.price || 0;
  const dueDate = payment.dueDate ? new Date(payment.dueDate).toISOString().split('T')[0] : '';

  return (
    <Box height="100%" bg="white" borderRadius="lg" p={4}>
      <HStack mb={0} justifyContent="space-between" alignItems="flex-start">
        <Text fontSize="xl" fontWeight="bold">
          Violation Details
        </Text>
        <Box display="flex" gap={4} alignItems="flex-start">
          {!payment.isPaid && <Box ref={setPaypalButtonRef} minW="200px" minH="40px"></Box>}
          <Button variantType="secondary" height="35px" onClick={handleBack} label="Back" />
        </Box>
      </HStack>

      <VStack gap={6} align="stretch">
        {/* Borrower Information */}
        <Box>
          <Text fontWeight="semibold" mb={3} fontSize="md">
            Borrower
          </Text>
          <VStack align="start" gap={2} fontSize="sm">
            <HStack>
              <Text fontWeight="medium">Name:</Text>
              <Text>{borrowRecord.user?.fullName || 'N/A'}</Text>
            </HStack>
            <HStack>
              <Text fontWeight="medium">Email:</Text>
              <Text>{borrowRecord.user?.email || 'N/A'}</Text>
            </HStack>
            <HStack>
              <Text fontWeight="medium">Current Violation Points:</Text>
              <Text>{borrowRecord.user?.violationPoints || 0} points</Text>
            </HStack>
          </VStack>
        </Box>

        {/* Book Information - Only show for policies that relate to book items */}
        {bookItem && (
          <Box>
            <Text fontWeight="semibold" mb={3} fontSize="md">
              Violated Book
            </Text>
            <VStack align="start" gap={2} fontSize="sm">
              <HStack>
                <Text fontWeight="medium">Book Title:</Text>
                <Text>{bookItem.book?.title || 'N/A'}</Text>
              </HStack>
              <HStack>
                <Text fontWeight="medium">Book Copy Code:</Text>
                <Text>{bookItem.code}</Text>
              </HStack>
              <HStack>
                <Text fontWeight="medium">Price:</Text>
                <Text>{bookPrice.toLocaleString('vi-VN')} VND</Text>
              </HStack>
              <HStack>
                <Text fontWeight="medium">Borrow Record ID:</Text>
                <Text>{borrowRecord.id}</Text>
              </HStack>
            </VStack>
          </Box>
        )}

        {/* Borrow Record Information - Show when no bookItem */}
        {!bookItem && (
          <Box>
            <Text fontWeight="semibold" mb={3} fontSize="md">
              Borrow Record Information
            </Text>
            <VStack align="start" gap={2} fontSize="sm">
              <HStack>
                <Text fontWeight="medium">Borrow Record ID:</Text>
                <Text>{borrowRecord.id}</Text>
              </HStack>
              <HStack>
                <Text fontWeight="medium">Borrow Date:</Text>
                <Text>{formatDate(borrowRecord.borrowDate)}</Text>
              </HStack>
              <HStack>
                <Text fontWeight="medium">Expected Return Date:</Text>
                <Text>{formatDate(borrowRecord.returnDate)}</Text>
              </HStack>
              {borrowRecord.actualReturnDate && (
                <HStack>
                  <Text fontWeight="medium">Actual Return Date:</Text>
                  <Text>{formatDate(borrowRecord.actualReturnDate)}</Text>
                </HStack>
              )}
              <HStack>
                <Text fontWeight="medium">Renewal Count:</Text>
                <Text>{borrowRecord.renewalCount}</Text>
              </HStack>
            </VStack>

            {/* List of Books in Borrow Record */}
            {(borrowRecord.borrowBooks && borrowRecord.borrowBooks.length > 0) ||
            (borrowRecord.borrowEbooks && borrowRecord.borrowEbooks.length > 0) ? (
              <Box mt={2}>
                <Text fontWeight="medium" mb={2} fontSize="sm">
                  Books in this Record:
                </Text>
                <VStack align="start" gap={2} fontSize="sm">
                  {borrowRecord.borrowBooks?.map((bb, index) => (
                    <HStack key={bb.bookItem.id}>
                      <Text fontWeight="medium">{index + 1}.</Text>
                      <Text>
                        {bb.bookItem.book?.title || 'N/A'}
                        {bb.bookItem.book?.author?.fullName && ` - ${bb.bookItem.book.author.fullName}`}
                        {` (Code: ${bb.bookItem.code})`}
                      </Text>
                    </HStack>
                  ))}
                  {borrowRecord.borrowEbooks?.map((eb, index) => (
                    <HStack key={eb.book.id}>
                      <Text fontWeight="medium">
                        {index + (borrowRecord.borrowBooks?.length || 0) + 1}.
                      </Text>
                      <Text>
                        {eb.book.title}
                        {eb.book.author?.fullName && ` - ${eb.book.author.fullName}`}
                        {` (eBook)`}
                        {eb.book.isbn && ` - ISBN: ${eb.book.isbn}`}
                      </Text>
                    </HStack>
                  ))}
                </VStack>
              </Box>
            ) : null}
          </Box>
        )}

        {/* Violation Information */}
        <Box>
          <Text fontWeight="semibold" mb={3} fontSize="md">
            Violation Information
          </Text>
          <Grid templateColumns="repeat(2, 1fr)" gap={3}>
            <GridItem>
              <FormField label="Violation Type" fontSize="sm" width="100%">
                <FormInput value={policy?.name} fontSize="sm" height="40px" disabled />
              </FormField>
            </GridItem>

            <GridItem>
              <FormField label="Violation Fee" fontSize="sm" width="100%">
                <FormInput
                  type="text"
                  fontSize="sm"
                  value={payment.amount.toLocaleString('vi-VN') + ' VND'}
                  height="40px"
                  disabled
                />
              </FormField>
            </GridItem>

            <GridItem>
              <FormField label="Violation Points" fontSize="sm" width="100%">
                <FormInput
                  value={`+${policy.points} points`}
                  fontSize="sm"
                  height="40px"
                  disabled
                />
              </FormField>
            </GridItem>

            <GridItem>
              <FormField label="Due Date" fontSize="sm" width="100%">
                <FormInput type="date" fontSize="sm" height="40px" value={dueDate} disabled />
              </FormField>
            </GridItem>
          </Grid>
        </Box>

        {/* Payment Information */}
        <Box>
          <Text fontWeight="semibold" mb={3} fontSize="md">
            Payment Information
          </Text>
          <VStack align="start" gap={2} fontSize="sm">
            <HStack>
              <Text fontWeight="medium">Payment ID:</Text>
              <Text>{payment.id}</Text>
            </HStack>
            <HStack>
              <Text fontWeight="medium">Status:</Text>
              <Tag variantType={payment.isPaid ? 'active' : 'inactive'}>
                {payment.isPaid ? 'Paid' : 'Unpaid'}
              </Tag>
            </HStack>
            {payment.isPaid && payment.paidAt && (
              <HStack>
                <Text fontWeight="medium">Paid At:</Text>
                <Text>{formatDate(payment.paidAt)}</Text>
              </HStack>
            )}
            <HStack>
              <Text fontWeight="medium">Created At:</Text>
              <Text>{formatDate(payment.createdAt)}</Text>
            </HStack>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
}
