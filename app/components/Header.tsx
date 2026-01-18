/**
 * Header Component
 * 
 * Navigation header with "Back to Home" link.
 * Used by: app/login/page.tsx, app/signup/page.tsx
 * Provides consistent navigation across authentication pages.
 */

import Link from 'next/link';

export default function Header() {
  return (
    <header className="absolute top-0 left-0 right-0 p-6 pt-14">
      <Link 
        href="/" 
        className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-primary transition-colors"
        style={{ WebkitAppRegion: 'no-drag' } as any}
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
        Back to Home
      </Link>
    </header>
  );
}
