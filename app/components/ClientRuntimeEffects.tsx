'use client';

import dynamic from 'next/dynamic';
import { isElectronRuntime } from '@/lib/client/runtime';
import { useIsClient } from '@/app/hooks/useClientSide';

const AutoLogin = dynamic(() => import('./AutoLogin'), { ssr: false });
const UpdateNotification = dynamic(() => import('./UpdateNotification'), { ssr: false });
const WebAnalytics = dynamic(() => import('./WebAnalytics'), { ssr: false });

/**
 * Mount runtime-specific global client effects lazily.
 * This avoids loading Electron-only code on web and web analytics code in Electron.
 */
export default function ClientRuntimeEffects() {
  const isClient = useIsClient();
  if (!isClient) return null;

  if (isElectronRuntime()) {
    return (
      <>
        <AutoLogin />
        <UpdateNotification />
      </>
    );
  }

  return <WebAnalytics />;
}
