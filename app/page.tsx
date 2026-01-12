/**
 * Home Page (Landing Page)
 * 
 * Public landing page promoting Jobelix desktop app and student signup.
 * Route: / (root)
 * Accessible to: Everyone (non-authenticated users)
 * Links to: /download, /signup, /login
 */

import Link from "next/link";
import { Rocket, Sparkles, Target, Zap } from "lucide-react";
import "./globals.css";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      <main className="max-w-6xl mx-auto px-6 py-12 md:py-20">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
            Automate Your Job Search
            <span className="block mt-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Apply While You Sleep
            </span>
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto mb-10">
            Jobelix uses AI to automatically apply to hundreds of jobs on LinkedIn. 
            Tailored resumes, smart form filling, and custom cover letters — all done for you.
          </p>

          {/* Primary CTA - Download App */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link
              href="/download"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all"
            >
              <Rocket className="w-5 h-5" />
              Download Desktop App
            </Link>
            <Link
              href="/signup?role=student"
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-lg font-semibold rounded-lg transition-all"
            >
              Sign Up for Web
            </Link>
          </div>

          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-purple-600 dark:text-purple-400 hover:underline">
              Log in
            </Link>
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 dark:bg-purple-900/40 rounded-2xl mb-4">
              <Sparkles className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              AI-Powered Applications
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Our AI analyzes job descriptions and tailors your resume for every application to maximize success rates.
            </p>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/40 rounded-2xl mb-4">
              <Target className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Smart Targeting
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Set your preferences once and let Jobelix find and apply to the perfect jobs that match your criteria.
            </p>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-2xl mb-4">
              <Zap className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Lightning Fast
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Apply to 50+ jobs per day automatically. Save hours of repetitive work and focus on interview prep instead.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-2xl p-8 md:p-12">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 text-center mb-8">
            How Jobelix Works
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-600 text-white font-bold rounded-full flex items-center justify-center mx-auto mb-3">
                1
              </div>
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Download & Sign Up</h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Get the desktop app and create your account
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-600 text-white font-bold rounded-full flex items-center justify-center mx-auto mb-3">
                2
              </div>
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Upload Resume</h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                AI extracts your info and builds your profile
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-600 text-white font-bold rounded-full flex items-center justify-center mx-auto mb-3">
                3
              </div>
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Set Preferences</h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Choose job types, locations, and experience level
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-600 text-white font-bold rounded-full flex items-center justify-center mx-auto mb-3">
                4
              </div>
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Launch Bot</h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Sit back and let Jobelix apply to jobs 24/7
              </p>
            </div>
          </div>
        </div>

        {/* Beta Disclaimer */}
        <div className="mt-12 text-center">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-3xl mx-auto">
            <strong>Beta Notice:</strong> Jobelix is currently in beta. The auto-apply feature is experimental 
            and provided as-is. We are not responsible for any account restrictions or consequences 
            resulting from its use. Use at your own discretion.
          </p>
        </div>
      </main>
    </div>
  );
}
