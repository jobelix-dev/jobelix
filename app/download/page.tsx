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
import DownloadButton from '@/app/components/DownloadButton';
import { CheckCircle2, Download, Sparkles } from 'lucide-react';
import Link from 'next/link';
import ElectronDetector from './ElectronDetector';

export const metadata = {
  title: 'Download Jobelix Desktop App',
  description: 'Download the Jobelix desktop application to automate your LinkedIn job applications with AI-powered tools.',
};

export default async function DownloadPage() {
  // Fetch latest release data server-side with 1-hour cache
  let releaseInfo;
  let fetchError = false;

  try {
    releaseInfo = await getLatestRelease();
  } catch (error) {
    console.error('Failed to fetch release info on download page:', error);
    fetchError = true;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-surface">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <Link 
            href="/" 
            className="inline-block mb-8 text-sm text-primary hover:underline"
          >
            ← Back to Home
          </Link>
          
          <h1 className="text-4xl md:text-5xl font-bold text-default mb-4">
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
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          <div className="p-6 bg-surface rounded-lg border border-border">
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

          <div className="p-6 bg-surface rounded-lg border border-border">
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

          <div className="p-6 bg-surface rounded-lg border border-border">
            <div className="w-12 h-12 bg-success/40 rounded-lg flex items-center justify-center mb-4">
              <Download className="w-6 h-6 text-success" />
            </div>
            <h3 className="text-lg font-semibold text-default mb-2">
              One-Click Installation
            </h3>
            <p className="text-sm text-muted">
              Simple installation process. Download, install, and start applying within minutes. Works on Windows, macOS, and Linux.
            </p>
          </div>
        </div>

        {/* System Requirements */}
        <div className="mt-12 p-6 bg-surface/50 rounded-lg border border-border">
          <h3 className="text-lg font-semibold text-default mb-3">
            System Requirements
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-muted">
            <div>
              <p className="font-medium text-default mb-1">Windows</p>
              <p>Windows 10 or later (64-bit)</p>
            </div>
            <div>
              <p className="font-medium text-default mb-1">macOS</p>
              {/* <p>macOS 10.15 (Catalina) or later</p> */}
              <p>Currently not distributed on macOS.</p>
              <p>Coming soon...</p>
            </div>
            <div>
              <p className="font-medium text-default mb-1">Linux</p>
              <p>Ubuntu 18.04 or later (or equivalent)</p>
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
    </div>
  );
}
