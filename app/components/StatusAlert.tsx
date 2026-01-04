/**
 * StatusAlert Component
 * Reusable alert component for success, error, and info messages
 */

import React from 'react';

interface StatusAlertProps {
  variant: 'success' | 'error' | 'info';
  children: React.ReactNode;
}

export default function StatusAlert({ variant, children }: StatusAlertProps) {
  const variants = {
    success: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    error: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    info: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  };

  return (
    <div className={`mb-4 rounded px-3 py-2 text-sm ${variants[variant]}`}>
      {children}
    </div>
  );
}
