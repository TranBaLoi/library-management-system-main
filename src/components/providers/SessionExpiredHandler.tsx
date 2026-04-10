'use client';

import { Dialog } from '@/components/ui';
import { ROUTES } from '@/constants';
import { useDialog } from '@/lib/hooks';
import { meQueryKey } from '@/lib/hooks/useMe';
import { queryClient } from '@/lib/query-client';
import { clearAuthSession } from '@/lib/utils/auth-utils';
import { onSessionExpired } from '@/lib/utils/fetch-utils';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function SessionExpiredHandler() {
  const router = useRouter();
  const { dialog, openDialog, handleConfirm, closeDialog } = useDialog();

  useEffect(() => {
    // Subscribe to session expired events
    const unsubscribe = onSessionExpired(() => {
      openDialog({
        title: 'Session Expired',
        message: 'Your session has expired. Please login again to continue.',
        confirmText: 'Login',
        cancelText: '', // No cancel button needed
        onConfirm: () => {
          // Clear auth session and user data
          clearAuthSession();
          queryClient.setQueryData(meQueryKey, null);
          queryClient.invalidateQueries({ queryKey: meQueryKey });

          // Redirect to login
          router.push(ROUTES.AUTH.LOGIN);
        },
      });
    });

    return () => {
      unsubscribe();
    };
  }, [openDialog, router]);

  return (
    <Dialog
      isOpen={dialog.isOpen}
      onClose={closeDialog} // Close button only closes the dialog
      title={dialog.title}
      content={dialog.message}
      showCloseButton={true}
      buttons={[
        {
          label: dialog.confirmText,
          onClick: handleConfirm,
          variant: 'primary',
        },
      ]}
    />
  );
}
