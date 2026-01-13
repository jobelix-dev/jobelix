'use client';

/**
 * TitleBar Component
 * 
 * Provides a draggable titlebar region for the Electron frameless window.
 * This allows users to drag the window by clicking and holding on the titlebar area.
 * 
 * The titlebar spans the full width of the window and includes space for
 * window controls (minimize, maximize, close) on the right side.
 */
export default function TitleBar() {
  return (
    <div 
      className="fixed top-0 left-0 right-0 h-12 z-40 select-none"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      {/* Invisible draggable area */}
    </div>
  );
}
