/**
 * Auto Apply Tab Content
 * 
 * Mass application tools and automation features.
 * Includes development/testing tools for Python integration.
 */

'use client';

import { Zap, Rocket, Settings } from 'lucide-react';

interface AutoApplyTabProps {
  onLaunchPython: () => void;
}

export default function AutoApplyTab({ onLaunchPython }: AutoApplyTabProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Auto Apply
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Automate your job applications with AI-powered tools
        </p>
      </div>

      {/* Development Testing Section */}
      <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Test Python Integration
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Development testing only
            </p>
          </div>
        </div>
        
        <button
          onClick={onLaunchPython}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Launch Chromium Test
        </button>
      </div>

      {/* Mass Apply Feature (Coming Soon) */}
      <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
          <Rocket className="w-8 h-8 text-zinc-400" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          Mass Apply Coming Soon
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto mb-4">
          Apply to multiple positions with a single click. Our AI will customize your application for each role.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-full">
          <Zap className="w-3 h-3" />
          In Development
        </div>
      </div>
    </div>
  );
}
