'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <div className="md:hidden">
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 text-muted hover:text-default transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Slide-out Side Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100]"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Side Panel */}
          <div className="fixed top-0 right-0 bottom-0 w-[280px] max-w-[85vw] bg-white shadow-2xl z-[101] animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <Link href="/" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
                <Image 
                  src="/icon.png" 
                  alt="Jobelix" 
                  width={28} 
                  height={28} 
                  className="rounded-lg" 
                />
                <span className="text-lg font-bold text-default">Jobelix</span>
              </Link>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-muted hover:text-default hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="flex flex-col p-4">
              <a 
                href="#features" 
                className="py-3 px-4 text-base font-medium text-muted hover:text-default hover:bg-primary/5 rounded-lg transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Features
              </a>
              <a 
                href="#testimonials" 
                className="py-3 px-4 text-base font-medium text-muted hover:text-default hover:bg-primary/5 rounded-lg transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Testimonials
              </a>
              <a 
                href="#faq" 
                className="py-3 px-4 text-base font-medium text-muted hover:text-default hover:bg-primary/5 rounded-lg transition-colors"
                onClick={() => setIsOpen(false)}
              >
                FAQ
              </a>
              
              <div className="border-t border-gray-100 my-4" />
              
              <Link 
                href="/login" 
                className="py-3 px-4 text-base font-medium text-muted hover:text-default hover:bg-primary/5 rounded-lg transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Sign In
              </Link>
              
              <Link
                href="/download"
                className="mt-3 py-3 px-4 bg-primary hover:bg-primary-hover text-white text-base font-medium rounded-lg text-center transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Get Started
              </Link>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
