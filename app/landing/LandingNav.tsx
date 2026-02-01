'use client';

import Link from 'next/link';
import Image from 'next/image';
import MobileNav from './MobileNav';
import { useIsElectron } from '@/app/hooks/useClientSide';

/**
 * Landing page navigation component
 * 
 * Handles Electron window controls overlap by adding padding-right
 * when running in the Electron environment (desktop only, sm: breakpoint).
 * Window controls are hidden on mobile, so no padding needed there.
 */
export default function LandingNav() {
  const isElectron = useIsElectron();

  return (
    <nav 
      className={`bg-white/80 sticky top-0 z-[60] shadow-[0_1px_0_rgba(0,0,0,0.04)] ${
        isElectron ? 'sm:pr-[144px]' : ''
      }`}
    >
      <div 
        className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between" 
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image 
            src="/icon.png" 
            alt="Jobelix" 
            width={32} 
            height={32} 
            className="rounded-lg transition-transform duration-300 group-hover:scale-110" 
          />
          <span className="text-xl font-bold text-default">Jobelix</span>
        </Link>
        
        {/* Nav Links - Desktop */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="nav-link text-sm font-medium text-muted hover:text-default transition-colors">
            Features
          </a>
          <a href="#testimonials" className="nav-link text-sm font-medium text-muted hover:text-default transition-colors">
            Testimonials
          </a>
          <a href="#faq" className="nav-link text-sm font-medium text-muted hover:text-default transition-colors">
            FAQ
          </a>
        </div>
        
        {/* CTAs */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link 
            href="/login" 
            className="text-sm font-medium text-muted hover:text-default transition-colors hidden sm:block"
          >
            Sign In
          </Link>
          <Link
            href="/download"
            className="hidden sm:inline-flex px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 active:translate-y-0 btn-glow"
          >
            Get Started
          </Link>
          {/* Mobile menu - always at the right edge */}
          <MobileNav />
        </div>
      </div>
    </nav>
  );
}
