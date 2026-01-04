/**
 * DevActions Component
 * Development/testing actions (should be removed in production)
 */

import React from 'react';

interface DevActionsProps {
  onLaunchPython: () => void;
}

export default function DevActions({ onLaunchPython }: DevActionsProps) {
  return (
    <section className="bg-white dark:bg-[#0b0b0b] p-6 rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Test Python Integration</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
        This section is for development testing only.
      </p>
      <button
        onClick={onLaunchPython}
        className="px-5 py-2.5 text-sm font-medium rounded bg-foreground text-background hover:opacity-90 transition-opacity"
      >
        Mass Apply
      </button>
    </section>
  );
}
