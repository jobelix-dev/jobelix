/**
 * Header Component
 * 
 * Navigation header with "Back" button.
 * Used by: app/login/page.tsx, app/signup/page.tsx
 * Provides consistent navigation across authentication pages.
 *
 * In Electron the button navigates to /desktop; in the browser it goes to /.
 * z-20 keeps it above the StarNetwork canvas and page content.
 */

'use client';
import { useRouter } from 'next/navigation';
import { useIsElectron } from '@/app/hooks/useClientSide';

export default function Header() {
  const router = useRouter();
  const isElectron = useIsElectron();
  
  return (
    <header className="absolute top-0 left-0 right-0 p-6 pt-14 z-20">
      <button
        onClick={() => router.push(isElectron ? '/desktop' : '/')}
        className="inline-flex items-center gap-2 text-sm font-medium
                   bg-surface/80 backdrop-blur-sm px-3 py-1.5 rounded-md
                   border border-border/40 shadow-sm
                   text-default hover:text-primary hover:border-primary/40
                   transition-colors"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back
      </button>
    </header>
  );
}
