/**
 * StatusAlert Component
 * Reusable alert component for success, error, and info messages
 */

import React from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

interface StatusAlertProps {
  variant: 'success' | 'error' | 'info' | 'warning';
  children: React.ReactNode;
}

export default function StatusAlert({ variant, children }: StatusAlertProps) {
  const variants = {
    success: 'bg-success-subtle/20 text-success border-success/30',
    error: 'bg-error-subtle/20 text-error border-error/30',
    info: 'bg-info-subtle/20 text-info border-info/30',
    warning: 'bg-warning-subtle/20 text-warning border-warning/30',
  };

  const icons = {
    success: <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />,
    error: <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />,
    info: <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />,
    warning: <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />,
  };

  return (
    <div className={`mb-4 rounded-lg border px-3 py-2.5 text-sm flex items-start gap-2 ${variants[variant]}`}>
      {icons[variant]}
      <span>{children}</span>
    </div>
  );
}
