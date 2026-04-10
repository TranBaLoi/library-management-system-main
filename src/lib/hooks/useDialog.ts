import { useState } from 'react';

export interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

const initialState: DialogState = {
  isOpen: false,
  title: '',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  onConfirm: () => {},
  onCancel: () => {},
};

export function useDialog() {
  const [dialog, setDialog] = useState<DialogState>(initialState);

  const openDialog = (config: Omit<DialogState, 'isOpen'>) => {
    setDialog({
      ...config,
      isOpen: true,
    });
  };

  const updateDialog = (config: Partial<Omit<DialogState, 'isOpen'>>) => {
    setDialog(prev => ({
      ...prev,
      ...config,
    }));
  };

  const closeDialog = () => {
    setDialog(initialState);
  };

  const handleConfirm = () => {
    dialog.onConfirm();
    closeDialog();
  };

  const handleCancel = () => {
    if (dialog.onCancel) {
      dialog.onCancel();
    }
    closeDialog();
  };

  return {
    dialog,
    openDialog,
    updateDialog,
    closeDialog,
    handleConfirm,
    handleCancel,
  };
}
