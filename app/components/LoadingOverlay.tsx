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
    <div className="absolute -inset-2 z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm rounded-lg flex flex-col items-center pt-8">
      <div className="text-center mb-4">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {message}
        </p>
        {submessage && (
          <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
            {submessage}
          </p>
        )}
      </div>
      <Loader2 className="w-8 h-8 animate-spin text-zinc-600 dark:text-zinc-400" />
    </div>
  );
}
