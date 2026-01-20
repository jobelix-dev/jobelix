/**
 * LoadingOverlay Component
 * 
 * Professional loading overlay with animated spinner and status message.
 * Used during async operations like resume upload/extraction.
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  message?: string;
  submessage?: string;
}

export default function LoadingOverlay({ 
  message = 'Processing...', 
  submessage 
}: LoadingOverlayProps) {
  return (
    <div className="absolute -inset-2 z-10 bg-surface/80/80 backdrop-blur-sm rounded-lg flex flex-col items-center pt-8">
      <div className="text-center mb-4">
        <p className="text-sm font-medium text-muted">
          {message}
        </p>
        {submessage && (
          <p className="text-xs text-muted mt-1">
            {submessage}
          </p>
        )}
      </div>
      <Loader2 className="w-8 h-8 animate-spin text-muted" />
    </div>
  );
}
