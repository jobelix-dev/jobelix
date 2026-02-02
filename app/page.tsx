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
  FeaturesSection,
  StepsSection,
  FAQSection,
  Footer,
} from "./landing/sections";
import NewsletterForm from "./landing/NewsletterForm";
import ScrollReveal from "./landing/ScrollReveal";
import LandingNav from "./landing/LandingNav";

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
      <LandingNav />

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
