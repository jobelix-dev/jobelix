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
    success: 'bg-success-subtle text-success/20',
    error: 'bg-error-subtle text-error/20',
    info: 'bg-info-subtle text-info/20',
  };

  return (
    <div className={`mb-4 rounded px-3 py-2 text-sm ${variants[variant]}`}>
      {children}
    </div>
  );
}
