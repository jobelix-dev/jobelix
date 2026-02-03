/**
 * Download Page
 * 
 * Public page for downloading the Jobelix desktop application.
 * Server-side fetches latest release data from GitHub.
 * Client-side detects if user is already in Electron app.
 * 
 * Route: /download
 */

import { getLatestRelease, getFallbackDownloadUrl } from '@/lib/client/github-api';
import { CheckCircle2, Download, Sparkles } from 'lucide-react';
import ElectronDetector from './ElectronDetector';
import BackToDashboardLink from './BackToDashboardLink';
import AppFooter from '../components/AppFooter';
import type { Metadata } from "next";
import {
  SITE_NAME,
  canonicalUrl,
  defaultOpenGraphImages,
  defaultTwitterImages,
  softwareApplicationJsonLd,
} from "@/lib/seo";

const title = "Download Jobelix Desktop App";
const description =
  "Download the Jobelix desktop app to automate LinkedIn job applications with AI-powered matching and auto-apply tools.";
const canonical = canonicalUrl("/download");

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

export default async function DownloadPage() {
  // Fetch latest release data server-side with 1-hour cache
  let releaseInfo;
  let fetchError = false;

  const softwareSchema = softwareApplicationJsonLd({
    urlPath: "/download",
    description,
  });

  try {
    releaseInfo = await getLatestRelease();
  } catch (error) {
    console.error('Failed to fetch release info on download page:', error);
    fetchError = true;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-surface">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <div className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex items-center justify-start mb-8">
          <BackToDashboardLink />
        </div>

        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-default mb-4">
            Download Jobelix Desktop App
          </h1>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            Automate your LinkedIn job applications with our AI-powered desktop application.
            Apply to hundreds of jobs while you sleep.
          </p>
        </div>

        {/* Electron Detection & Download Section */}
        <ElectronDetector releaseInfo={releaseInfo} fetchError={fetchError} />

        {/* Features Grid */}
        <div className="mt-12 sm:mt-16 grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="p-4 sm:p-6 bg-surface rounded-lg border border-border">
            <div className="w-12 h-12 bg-primary-subtle/40 rounded-lg flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-default mb-2">
              AI-Powered Automation
            </h3>
            <p className="text-sm text-muted">
              Our AI analyzes job descriptions and tailors your resume for each application to maximize your chances.
            </p>
          </div>

          <div className="p-4 sm:p-6 bg-surface rounded-lg border border-border">
            <div className="w-12 h-12 bg-info/40 rounded-lg flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6 text-info" />
            </div>
            <h3 className="text-lg font-semibold text-default mb-2">
              Smart Form Filling
            </h3>
            <p className="text-sm text-muted">
              Automatically fills out application forms, answers screening questions, and generates custom cover letters.
            </p>
          </div>

          <div className="p-4 sm:p-6 bg-surface rounded-lg border border-border">
            <div className="w-12 h-12 bg-success/40 rounded-lg flex items-center justify-center mb-4">
              <Download className="w-6 h-6 text-success" />
            </div>
            <h3 className="text-lg font-semibold text-default mb-2">
              One-Click Installation
            </h3>
            <p className="text-sm text-muted">
              Simple installation process. Download, install, and start applying within minutes. Works on Windows, macOS, Ubuntu, and Arch Linux.
            </p>
          </div>
        </div>

        {/* System Requirements */}
        <div className="mt-8 sm:mt-12 p-4 sm:p-6 bg-surface/50 rounded-lg border border-border">
          <h3 className="text-lg font-semibold text-default mb-3">
            System Requirements
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted">
            <div>
              <p className="font-medium text-default mb-1">Windows</p>
              <p>Windows 10 or later (64-bit)</p>
            </div>
            <div>
              <p className="font-medium text-default mb-1">macOS</p>
              <p>macOS 14+ (Intel &amp; Apple Silicon)</p>
            </div>
            <div>
              <p className="font-medium text-default mb-1">Linux</p>
              <p>Ubuntu 22.04+ (x64 &amp; ARM64)</p>
            </div>
            <div>
              <p className="font-medium text-default mb-1">Arch Linux</p>
              <p>Rolling release (x86_64)</p>
            </div>
          </div>
        </div>

        {/* Fallback Manual Download */}
        {fetchError && (
          <div className="mt-8 text-center">
            <p className="text-sm text-muted mb-3">
              Having trouble? Download directly from GitHub:
            </p>
            <a
              href={getFallbackDownloadUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <Download className="w-4 h-4" />
              View all releases on GitHub
            </a>
          </div>
        )}
      </div>
      <AppFooter />
    </div>
  );
}
