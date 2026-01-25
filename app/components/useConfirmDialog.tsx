/**
 * Confirmation Dialog Hook
 * Provides a React hook to replace window.confirm and window.alert
 * Usage:
 *   const { confirm, alert, ConfirmDialogComponent } = useConfirmDialog();
 *   const result = await confirm('Delete this item?');
 *   await alert('Success!');
 */

'use client';

import { useState, useCallback } from 'react';
import ConfirmDialog from './ConfirmDialog';

interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant: 'confirm' | 'alert' | 'danger';
  resolver?: (value: boolean) => void;
}

export function useConfirmDialog() {
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'confirm',
  });

  const confirm = useCallback(
    (
      message: string,
      options?: {
        title?: string;
        confirmText?: string;
        cancelText?: string;
        variant?: 'danger';
      }
    ): Promise<boolean> => {
      return new Promise((resolve) => {
        setDialogState({
          isOpen: true,
          title: options?.title || 'Confirm',
          message,
          confirmText: options?.confirmText,
          cancelText: options?.cancelText,
          variant: options?.variant || 'confirm',
          resolver: resolve,
        });
      });
    },
    []
  );

  const alert = useCallback(
    (
      message: string,
      options?: {
        title?: string;
        confirmText?: string;
      }
    ): Promise<void> => {
      return new Promise((resolve) => {
        setDialogState({
          isOpen: true,
          title: options?.title || 'Notice',
          message,
          confirmText: options?.confirmText || 'OK',
          variant: 'alert',
          resolver: () => resolve(),
        });
      });
    },
    []
  );

  const handleClose = useCallback((confirmed: boolean) => {
    setDialogState((prev) => {
      prev.resolver?.(confirmed);
      return {
        isOpen: false,
        title: '',
        message: '',
        variant: 'confirm',
      };
    });
  }, []);

  const ConfirmDialogComponent = (
    <ConfirmDialog
      isOpen={dialogState.isOpen}
      onClose={handleClose}
      title={dialogState.title}
      message={dialogState.message}
      confirmText={dialogState.confirmText}
      cancelText={dialogState.cancelText}
      variant={dialogState.variant}
    />
  );

  return {
    confirm,
    alert,
    ConfirmDialogComponent,
  };
}
