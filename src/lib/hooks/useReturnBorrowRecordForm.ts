import { BorrowRecordApi } from '@/api';
import { createReturnBorrowRecordColumns } from '@/components/table/borrow-record';
import { toaster } from '@/components/ui/Toaster';
import { DEFAULT_VIOLATION_DUE_DATE_DAYS, policyIdToCondition } from '@/constants';
import { conditionToPolicyId, getViolationPolicyMetadata } from '@/lib/utils/violation-utils';
import { BookItemForViolation, BorrowRecordWithDetails } from '@/types/borrow-record';
import { Violation } from '@/types/violation';
import { useCallback, useMemo, useState } from 'react';
import { useViolationPolicies } from './useViolationPolicies';

type ItemUpdate = {
  status?: string;
  condition?: string;
};

type FormSelectItem = { value: string; label: string };

interface UseReturnBorrowRecordFormOptions {
  borrowRecord: BorrowRecordWithDetails;
  onSuccess?: () => void;
  readOnly?: boolean;
}

export function useReturnBorrowRecordForm({
  borrowRecord,
  onSuccess,
  readOnly = false,
}: UseReturnBorrowRecordFormOptions) {
  // Get violation policies from database
  const { violationPolicies } = useViolationPolicies();

  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updates, setUpdates] = useState<Record<number, ItemUpdate>>({});
  const [pendingViolations, setPendingViolations] = useState<Record<number, Violation>>({});
  const [violationDialogOpen, setViolationDialogOpen] = useState(false);
  const [selectedBookItem, setSelectedBookItem] = useState<BookItemForViolation | null>(null);
  const [editingViolation, setEditingViolation] = useState<Violation | null>(null);

  const items = useMemo(() => borrowRecord.borrowBooks || [], [borrowRecord.borrowBooks]);

  const conditionOptions: FormSelectItem[] = useMemo(
    () => [
      { value: '', label: 'Keep current' },
      { value: 'NEW', label: 'NEW' },
      { value: 'GOOD', label: 'GOOD' },
      { value: 'WORN', label: 'WORN' },
      { value: 'DAMAGED', label: 'DAMAGED' },
      { value: 'LOST', label: 'LOST' },
    ],
    []
  );

  const setItemUpdate = useCallback((bookItemId: number, patch: ItemUpdate) => {
    setUpdates(prev => ({ ...prev, [bookItemId]: { ...prev[bookItemId], ...patch } }));
  }, []);

  const handleRemoveViolation = useCallback((bookItemId: number) => {
    setPendingViolations(prev => {
      const newViolations = { ...prev };
      delete newViolations[bookItemId];
      return newViolations;
    });
  }, []);

  const handleViewViolation = useCallback(
    (violation: Violation) => {
      const bookItem = items.find(bb => bb.bookItem.id === violation.bookItemId)?.bookItem;
      if (!bookItem) return;

      // Map policyId back to condition
      const condition = policyIdToCondition(violation.policyId);

      // Set condition in updates so dialog can read it
      setItemUpdate(violation.bookItemId, { condition });

      setSelectedBookItem({
        id: bookItem.id,
        code: bookItem.code,
        condition: bookItem.condition,
        book: bookItem.book
          ? {
              id: bookItem.book.id,
              title: bookItem.book.title,
              price:
                'price' in bookItem.book ? (bookItem.book.price as number | null) || null : null,
              author: bookItem.book.author,
            }
          : null,
      });
      setEditingViolation(violation);
      setViolationDialogOpen(true);
    },
    [items, setItemUpdate]
  );

  const handleConditionChange = useCallback(
    (bookItemId: number, condition: string) => {
      setItemUpdate(bookItemId, { condition });

      // Auto-create violation when condition is LOST, WORN, or DAMAGED (without opening dialog)
      if (condition === 'LOST' || condition === 'WORN' || condition === 'DAMAGED') {
        const bookItem = items.find(bb => bb.bookItem.id === bookItemId)?.bookItem;
        if (!bookItem) return;

        // Get policy for the condition from database
        const policyId = conditionToPolicyId(condition);
        if (!policyId || !violationPolicies) return;
        const policy = violationPolicies[policyId];
        if (!policy) return;

        // Check if violation already exists for this book item
        const existingViolation = pendingViolations[bookItemId];

        // If violation exists, check if the condition matches the violation's policy
        if (existingViolation) {
          const existingCondition = policyIdToCondition(existingViolation.policyId);
          // If condition changed, remove old violation and create new one
          if (existingCondition !== condition) {
            handleRemoveViolation(bookItemId);
          } else {
            // Condition unchanged, keep existing violation
            return;
          }
        }

        // Calculate violation amount
        const bookPrice =
          bookItem.book && 'price' in bookItem.book
            ? (bookItem.book.price as number | null) || 0
            : 0;
        const amount = Math.floor((bookPrice * policy.penaltyPercent) / 100);

        // Calculate default due date (3 days from today)
        const defaultDueDate = new Date();
        defaultDueDate.setDate(defaultDueDate.getDate() + DEFAULT_VIOLATION_DUE_DATE_DAYS);
        const dueDate = defaultDueDate.toISOString().split('T')[0];

        // Auto-create violation without opening dialog
        const newViolation: Violation = {
          bookItemId,
          policyId: policy.id,
          amount,
          dueDate,
        };

        setPendingViolations(prev => ({
          ...prev,
          [bookItemId]: newViolation,
        }));
      } else {
        // If condition is changed to non-violation, remove violation if exists
        if (pendingViolations[bookItemId]) {
          handleRemoveViolation(bookItemId);
        }
      }
    },
    [items, pendingViolations, setItemUpdate, handleRemoveViolation, violationPolicies]
  );

  const handleViolationConfirm = useCallback((violation: Violation) => {
    setPendingViolations(prev => ({
      ...prev,
      [violation.bookItemId]: violation,
    }));
    setEditingViolation(null);
  }, []);

  const totalViolationAmount = useMemo(() => {
    return Object.values(pendingViolations).reduce((sum, v) => sum + v.amount, 0);
  }, [pendingViolations]);

  const totalViolationPoints = useMemo(() => {
    return Object.values(pendingViolations).reduce((sum, v) => {
      const policy = violationPolicies?.[v.policyId];
      return sum + (policy?.points || 0);
    }, 0);
  }, [pendingViolations, violationPolicies]);

  const tableData = useMemo(() => items.map(bb => bb.bookItem), [items]);

  const columns = useMemo(
    () =>
      createReturnBorrowRecordColumns({
        tableData: tableData as Array<{
          id: number;
          code: string;
          condition?: string;
          book?: {
            title?: string;
            author?: { fullName?: string };
            coverImageUrl?: string | null;
            publishYear?: number | null;
          } | null;
        }>,
        updates: readOnly ? undefined : updates,
        conditionOptions: readOnly ? undefined : conditionOptions,
        onConditionChange: readOnly ? undefined : handleConditionChange,
        readOnly,
      }),
    [tableData, updates, conditionOptions, handleConditionChange, readOnly]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        setIsSubmitting(true);

        // Prepare violations array
        const violations = Object.values(pendingViolations).map(v => ({
          bookItemId: v.bookItemId,
          policyId: v.policyId,
          amount: v.amount,
          dueDate: v.dueDate,
        }));

        // Prepare condition updates (include all items with condition changes)
        const conditionUpdates: Record<number, string> = {};
        for (const bb of items) {
          const u = updates[bb.bookItem.id];
          if (u?.condition) {
            conditionUpdates[bb.bookItem.id] = u.condition;
          }
        }

        // Call return API with violations and condition updates
        await BorrowRecordApi.returnBorrowRecord(borrowRecord.id, {
          violations,
          conditionUpdates,
        });

        const violationCount = violations.length;
        const message =
          violationCount > 0
            ? `Book return processed successfully. ${violationCount} violation(s) recorded.`
            : 'Book return processed successfully.';

        toaster.create({
          title: 'Success',
          description: message,
          type: 'success',
        });

        onSuccess?.();
      } catch (error: unknown) {
        toaster.create({
          title: 'Error',
          description: (error as Error)?.message || 'Failed to process book return',
          type: 'error',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [borrowRecord.id, items, pendingViolations, updates, onSuccess]
  );

  const selectedBookItemNewCondition = useMemo(
    () => (selectedBookItem ? updates[selectedBookItem.id]?.condition || '' : ''),
    [selectedBookItem, updates]
  );

  const initialViolationData = useMemo(
    () =>
      editingViolation
        ? { amount: editingViolation.amount, dueDate: editingViolation.dueDate }
        : undefined,
    [editingViolation]
  );

  const handleCloseViolationDialog = useCallback(() => {
    setViolationDialogOpen(false);
    setSelectedBookItem(null);
    setEditingViolation(null);
  }, []);

  return {
    // State
    isSubmitting,
    updates,
    pendingViolations,
    violationDialogOpen,
    selectedBookItem,
    editingViolation,
    items,
    conditionOptions,
    tableData,
    columns,
    totalViolationAmount,
    totalViolationPoints,
    selectedBookItemNewCondition,
    initialViolationData,

    // Handlers
    setItemUpdate,
    handleViolationConfirm,
    handleRemoveViolation,
    handleViewViolation,
    handleSubmit,
    handleCloseViolationDialog,
    getViolationPolicyInfo: useCallback(
      (policyId: string) => {
        const policy = violationPolicies?.[policyId];
        if (policy) {
          return { name: policy.name, points: policy.points };
        }
        // Fallback: get metadata only
        const metadata = getViolationPolicyMetadata(policyId);
        return {
          name: 'Unknown',
          points: metadata?.points || 0,
        };
      },
      [violationPolicies]
    ),
  };
}
