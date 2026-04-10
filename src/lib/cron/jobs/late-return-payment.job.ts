/**
 * Late Return Payment Cron Job
 * Automatically calculates and creates/updates payment for overdue BorrowRecords
 * Runs daily to check BorrowRecords that are overdue but not yet returned
 * Only processes records that are still BORROWED (not returned yet)
 * When a book is returned, payment should be calculated at return time, not by this cron job
 */

import { DEFAULT_VIOLATION_DUE_DATE_DAYS } from '@/constants/violation';
import { prisma } from '@/lib/prisma';
import { getViolationPolicyMetadata } from '@/lib/utils/violation-utils';
import { CronTask } from '../cron-manager';

/**
 * Calculate number of days between two dates
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of days (rounded up)
 */
const calculateDaysDifference = (startDate: Date, endDate: Date): number => {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
};

/**
 * Process late return payments for BorrowRecords
 * Only processes records that are overdue but not yet returned
 * Payment amount increases daily until the book is returned
 */
export const lateReturnPaymentTask: CronTask = async () => {
  try {
    console.log('[LateReturnPayment] ========================================');
    console.log('[LateReturnPayment] Starting overdue payment calculation...');
    console.log('[LateReturnPayment] ========================================');

    // Get LATE_RETURN policy
    const lateReturnPolicy = await prisma.policy.findUnique({
      where: {
        id: 'LATE_RETURN',
        isDeleted: false,
      },
    });

    if (!lateReturnPolicy) {
      console.error('[LateReturnPayment] LATE_RETURN policy not found in database');
      return;
    }

    if (lateReturnPolicy.unit !== 'PER_DAY') {
      console.error(
        '[LateReturnPayment] LATE_RETURN policy unit is not PER_DAY. Expected PER_DAY but got:',
        lateReturnPolicy.unit
      );
      return;
    }

    console.log('[LateReturnPayment] Found LATE_RETURN policy:', {
      id: lateReturnPolicy.id,
      name: lateReturnPolicy.name,
      amount: lateReturnPolicy.amount,
      unit: lateReturnPolicy.unit,
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    /** Find all BorrowRecords that are overdue but not yet returned
     * Conditions:
     * 1. returnDate is not null (has due date)
     * 2. returnDate < today (overdue)
     * 3. actualReturnDate is null (not returned yet)
     * 4. status is BORROWED (still borrowing)
     * 5. isDeleted is false */
    const overdueRecords = await prisma.borrowRecord.findMany({
      where: {
        returnDate: { not: null, lt: today },
        actualReturnDate: null,
        status: 'BORROWED',
        isDeleted: false,
      },
      select: {
        id: true,
        userId: true,
        returnDate: true,
        payments: {
          where: {
            policyId: 'LATE_RETURN',
            isDeleted: false,
          },
          select: {
            id: true,
            amount: true,
            isPaid: true,
            paidAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    console.log(`[LateReturnPayment] Found ${overdueRecords.length} overdue record(s)`);

    if (overdueRecords.length === 0) {
      console.log('[LateReturnPayment] No overdue records to process. Exiting...');
      return;
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Process each overdue record
    for (const record of overdueRecords) {
      try {
        if (!record.returnDate) {
          skippedCount++;
          continue;
        }

        const returnDate = new Date(record.returnDate);
        returnDate.setHours(0, 0, 0, 0);

        // Calculate number of overdue days (today - returnDate)
        const overdueDays = calculateDaysDifference(returnDate, today);

        if (overdueDays <= 0) {
          skippedCount++;
          continue;
        }

        // Calculate due date (DEFAULT_VIOLATION_DUE_DATE_DAYS from today)
        const dueDate = new Date(today);
        dueDate.setDate(today.getDate() + DEFAULT_VIOLATION_DUE_DATE_DAYS);
        dueDate.setHours(23, 59, 59, 999);

        // Find unpaid payment (if exists)
        const unpaidPayment = record.payments.find(p => !p.isPaid);

        // Find last paid payment (if exists)
        const lastPaidPayment = record.payments.find(p => p.isPaid);

        // Check if this is the first payment for this borrow record
        const isFirstPayment = record.payments.length === 0;

        // Get violation points for LATE_RETURN policy
        const violationMetadata = getViolationPolicyMetadata('LATE_RETURN');
        const violationPoints = violationMetadata?.points || 0;

        await prisma.$transaction(async tx => {
          if (unpaidPayment) {
            // Case 1: Has unpaid payment - update it with new amount
            const paymentAmount = overdueDays * lateReturnPolicy.amount;

            if (unpaidPayment.amount !== paymentAmount) {
              await tx.payment.update({
                where: { id: unpaidPayment.id },
                data: {
                  amount: paymentAmount,
                  dueDate: dueDate,
                  updatedAt: new Date(),
                },
              });

              updatedCount++;
              console.log(
                `[LateReturnPayment] Updated payment ${unpaidPayment.id} for borrow record ${record.id} (overdue): ${overdueDays} days × ${lateReturnPolicy.amount} = ${paymentAmount}`
              );
            } else {
              skippedCount++;
              console.log(
                `[LateReturnPayment] Skipped payment ${unpaidPayment.id} for borrow record ${record.id} (amount unchanged)`
              );
            }
          } else if (lastPaidPayment && lastPaidPayment.paidAt) {
            // Case 2: All payments are paid but book not returned yet
            // Calculate overdue days from last payment date to today
            const lastPaidDate = new Date(lastPaidPayment.paidAt);
            lastPaidDate.setHours(0, 0, 0, 0);

            // Only create new payment if there are additional overdue days after last payment
            if (today > lastPaidDate) {
              const additionalOverdueDays = calculateDaysDifference(lastPaidDate, today);

              if (additionalOverdueDays > 0) {
                const paymentAmount = additionalOverdueDays * lateReturnPolicy.amount;

                await tx.payment.create({
                  data: {
                    policyId: 'LATE_RETURN',
                    borrowRecordId: record.id,
                    amount: paymentAmount,
                    isPaid: false,
                    dueDate: dueDate,
                  },
                });

                createdCount++;
                console.log(
                  `[LateReturnPayment] Created new payment for borrow record ${record.id} (overdue after payment): ${additionalOverdueDays} days × ${lateReturnPolicy.amount} = ${paymentAmount}`
                );
              } else {
                skippedCount++;
                console.log(
                  `[LateReturnPayment] Skipped borrow record ${record.id} (no additional overdue days after last payment)`
                );
              }
            } else {
              skippedCount++;
              console.log(
                `[LateReturnPayment] Skipped borrow record ${record.id} (last payment date is today or future)`
              );
            }
          } else {
            // Case 3: No payment exists - create new payment for total overdue days
            const paymentAmount = overdueDays * lateReturnPolicy.amount;

            await tx.payment.create({
              data: {
                policyId: 'LATE_RETURN',
                borrowRecordId: record.id,
                amount: paymentAmount,
                isPaid: false,
                dueDate: dueDate,
              },
            });

            // Add violation points when creating first payment for this borrow record
            if (isFirstPayment && violationPoints > 0) {
              await tx.user.update({
                where: { id: record.userId },
                data: {
                  violationPoints: {
                    increment: violationPoints,
                  },
                },
              });
              console.log(
                `[LateReturnPayment] Added ${violationPoints} violation point(s) to user ${record.userId} for borrow record ${record.id}`
              );
            }

            createdCount++;
            console.log(
              `[LateReturnPayment] Created payment for borrow record ${record.id} (overdue): ${overdueDays} days × ${lateReturnPolicy.amount} = ${paymentAmount}`
            );
          }
        });
      } catch (error) {
        errorCount++;
        console.error(
          `[LateReturnPayment] Error processing borrow record ${record.id}:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    console.log('[LateReturnPayment] ========================================');
    console.log('[LateReturnPayment] Overdue payment calculation completed:', {
      total: overdueRecords.length,
      created: createdCount,
      updated: updatedCount,
      skipped: skippedCount,
      errors: errorCount,
    });
    console.log('[LateReturnPayment] ========================================');
  } catch (error) {
    console.error('[LateReturnPayment] Fatal error in late return payment calculation:', error);
    throw error;
  }
};
