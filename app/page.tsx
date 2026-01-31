/**
 * Home Page (Landing Page)
 * 
 * Enterprise-grade landing page with scroll-based animations,
 * animated metrics, and polished interactions.
 * 
 * Route: / (root)
 * Accessible to: Everyone (non-authenticated users)
 */

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";
import {
  SITE_NAME,
  canonicalUrl,
  defaultOpenGraphImages,
  defaultTwitterImages,
  organizationJsonLd,
  softwareApplicationJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import {
  HeroSection,
  StatsSection,
  FeaturesSection,
  StepsSection,
  TestimonialsSection,
  FAQSection,
  CTASection,
  Footer,
} from "./landing/sections";
import LogoCarousel from "./landing/LogoCarousel";
import MobileNav from "./landing/MobileNav";
import NewsletterForm from "./landing/NewsletterForm";
import ScrollReveal from "./landing/ScrollReveal";

const title = "AI Job Matching and Auto-Apply";
const description =
  "Jobelix connects top talent with employers using AI-powered matching and automated applications. Download the desktop app and land roles faster.";
const canonical = canonicalUrl("/");

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical,
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title,
    description,
    url: canonical,
    siteName: SITE_NAME,
    type: "website",
    images: defaultOpenGraphImages(),
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: defaultTwitterImages(),
  },
};

export default function Home() {
  const organizationSchema = organizationJsonLd();
  const websiteSchema = websiteJsonLd();
  const softwareSchema = softwareApplicationJsonLd({
    urlPath: "/",
    description,
  });

  return (
    <div className="min-h-screen bg-background scroll-smooth">
    <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />

      {/* Navigation */}
      <nav className="bg-white/80 sticky top-0 z-[60] shadow-[0_1px_0_rgba(0,0,0,0.04)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
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
          
          {/* Nav Links */}
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
            <MobileNav />
          </div>
        </div>
      </nav>

      <main>
        <HeroSection />
        
        <div className="gradient-divider" />
        
        <FeaturesSection />
        
        <div className="gradient-divider" />
        
        <StepsSection />
        
        <div className="gradient-divider" />
        
        <FAQSection />
        
        <div className="gradient-divider" />
        
        <ScrollReveal>
          <NewsletterForm />
        </ScrollReveal>
        
        <Footer />
      </main>
    </div>
  );
}
