'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/client/api';

const FALLBACK_HREF = '/login';

export default function BackToDashboardLink() {
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function resolveDestination() {
      try {
        const response = await api.getProfile();
        if (!isMounted) return;
        setHref(response.profile ? '/dashboard' : FALLBACK_HREF);
      } catch {
        if (!isMounted) return;
        setHref(FALLBACK_HREF);
      }
    }

    resolveDestination();

    return () => {
      isMounted = false;
    };
  }, []);

  const isReady = href !== null;

  return (
    <Link
      href={href ?? FALLBACK_HREF}
      aria-disabled={!isReady}
      className={`inline-flex items-center gap-2 rounded-lg border border-border bg-white/80 px-3 py-2 text-sm font-medium text-default shadow-sm transition-colors hover:bg-primary-subtle ${
        isReady ? '' : 'pointer-events-none opacity-60'
      }`}
    >
      <ArrowLeft className="h-4 w-4" />
      <span>Back to Dashboard</span>
    </Link>
  );
}
