'use client';

import React, { useState, useEffect } from 'react';
import { Minus, Square, X } from 'lucide-react';

/**
 * WindowControls Component
 * 
 * Provides custom window control buttons (minimize, maximize/restore, close)
 * for the Electron app when running in frameless mode.
 * 
 * Features:
 * - Minimize window
 * - Maximize/Restore window (toggles based on state)
 * - Close window
 * - Only renders when running in Electron environment
 */
export default function WindowControls() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // Check if running in Electron
    setIsElectron(typeof window !== 'undefined' && window.electronAPI !== undefined);

    // Get initial maximized state
    const checkMaximized = async () => {
      if (window.electronAPI?.windowIsMaximized) {
        const maximized = await window.electronAPI.windowIsMaximized();
        setIsMaximized(maximized);
      }
    };

    checkMaximized();
  }, []);

  // Don't render if not in Electron
  if (!isElectron) {
    return null;
  }

  const handleMinimize = () => {
    window.electronAPI?.windowMinimize();
  };

  const handleMaximize = async () => {
    if (isMaximized) {
      await window.electronAPI?.windowUnmaximize();
      setIsMaximized(false);
    } else {
      await window.electronAPI?.windowMaximize();
      setIsMaximized(true);
    }
  };

  const handleClose = () => {
    window.electronAPI?.windowClose();
  };

  return (
    <div 
      className="hidden sm:flex fixed top-0 right-0 z-[60] items-center h-12 gap-0 select-none"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      {/* Minimize Button */}
      <button
        onClick={handleMinimize}
        className="h-12 w-12 flex items-center justify-center hover:bg-primary-subtle transition-colors"
        aria-label="Minimize"
        title="Minimize"
      >
        <Minus className="w-4 h-4 text-muted" />
      </button>

      {/* Maximize/Restore Button */}
      <button
        onClick={handleMaximize}
        className="h-12 w-12 flex items-center justify-center hover:bg-primary-subtle transition-colors"
        aria-label={isMaximized ? "Restore" : "Maximize"}
        title={isMaximized ? "Restore" : "Maximize"}
      >
        <Square className="w-3.5 h-3.5 text-muted" />
      </button>

      {/* Close Button */}
      <button
        onClick={handleClose}
        className="h-12 w-12 flex items-center justify-center hover:bg-error transition-colors group"
        aria-label="Close"
        title="Close"
      >
        <X className="w-4 h-4 text-muted group-hover:text-white" />
      </button>
    </div>
  );
}
