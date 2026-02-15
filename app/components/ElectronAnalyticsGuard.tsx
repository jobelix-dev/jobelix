'use client';

/**
 * ElectronAnalyticsGuard
 *
 * Renders Vercel Analytics and SpeedInsights only in the web browser.
 * In Electron, these are skipped entirely to avoid:
 * - ~200-400ms of external script downloads (va.vercel-scripts.com, vitals.vercel-insights.com)
 * - Unnecessary network requests on every page load
 * - Telemetry data that has no value in a desktop app
 */

import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { isElectronRuntime } from '@/lib/client/runtime';

export default function ElectronAnalyticsGuard() {
  const [isElectron, setIsElectron] = useState(true); // Default to true to avoid flash

  useEffect(() => {
    setIsElectron(isElectronRuntime());
  }, []);

  // Skip analytics entirely in Electron
  if (isElectron) return null;

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
