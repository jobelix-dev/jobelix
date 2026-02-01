'use client';

import { useIsElectron } from '@/app/hooks/useClientSide';

/**
 * TitleBar Component
 * 
 * Provides a draggable titlebar region for the Electron frameless window.
 * This allows users to drag the window by clicking and holding on the titlebar area.
 * 
 * The titlebar spans the full width of the window and includes space for
 * window controls (minimize, maximize, close) on the right side.
 * 
 * Only renders when running in Electron environment.
 */
export default function TitleBar() {
  const isElectron = useIsElectron();

  if (!isElectron) {
    return null;
  }

  return (
    <div 
      className="fixed top-0 left-0 right-[144px] h-12 z-[9998] select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Invisible draggable area - excludes window controls on right (3 buttons × 48px = 144px) */}
    </div>
  );
}
