/**
 * Footer Section
 * 
 * Landing page footer with brand and links.
 */

import Link from "next/link";
import Image from "next/image";
import { Github } from "lucide-react";

export default function Footer() {
  return (
    <footer className="py-8 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2 group">
            <Image 
              src="/icon.png" 
              alt="Jobelix" 
              width={24} 
              height={24} 
              className="rounded-lg transition-transform duration-300 group-hover:scale-110" 
            />
            <span className="text-lg font-bold text-default">Jobelix</span>
          </Link>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-6">
            <a href="#features" className="text-sm text-muted hover:text-primary transition-colors">Features</a>
            <a href="#testimonials" className="text-sm text-muted hover:text-primary transition-colors">Testimonials</a>
            <a href="#faq" className="text-sm text-muted hover:text-primary transition-colors">FAQ</a>
            <Link href="/download" className="text-sm text-muted hover:text-primary transition-colors">Download</Link>
            <Link href="/login" className="text-sm text-muted hover:text-primary transition-colors">Sign In</Link>
            <a 
              href="https://github.com/jobelix-dev/jobelix" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-muted hover:text-primary transition-colors"
              aria-label="GitHub"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
          
          {/* Copyright */}
          <p className="text-xs text-muted/60">
            © 2026 Jobelix
          </p>
        </div>
      </div>
    </footer>
  );
}
