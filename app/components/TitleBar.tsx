'use client';

import { useIsElectron } from '@/app/hooks/useClientSide';

/**
 * TitleBar Component
 * 
 * Provides a draggable titlebar region for the Electron frameless window.
 * 
 * IMPORTANT: This component only provides drag functionality for the EMPTY SPACE
 * to the left of window controls when there's no navigation header visible.
 * 
 * Architecture:
 * - In Electron, the main navigation headers (LandingNav, dashboard header) handle
 *   their own drag regions via WebkitAppRegion styles
 * - This TitleBar acts as a fallback for pages without headers or for the space
 *   above scrollable content
 * - Desktop only (hidden on mobile since window controls are hidden there)
 * 
 * Z-index strategy:
 * - z-[50]: TitleBar fallback (below navigation)
 * - z-[60]: Navigation headers (above TitleBar, handles its own drag via styles)
 * - z-[9999]: WindowControls (always on top)
 * 
 * The navigation headers use WebkitAppRegion: 'drag' on the <nav> element itself,
 * and WebkitAppRegion: 'no-drag' on the inner container with interactive elements.
 * This allows dragging by the nav background while keeping links clickable.
 */
export default function TitleBar() {
  const isElectron = useIsElectron();

  if (!isElectron) {
    return null;
  }

  return (
    <div 
      className="hidden sm:block fixed top-0 left-0 right-[144px] h-12 z-[50] select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Fallback draggable area - sits BELOW navigation headers (z-[60]) */}
      {/* When nav is present, nav's own drag handling takes precedence */}
      {/* Excludes window controls on right (3 buttons × 48px = 144px) */}
    </div>
  );
}
