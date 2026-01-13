/**
 * How Auto Apply Works - Informational Section
 */

import { BookOpen } from 'lucide-react';

export default function HowItWorksSection() {
  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
          <BookOpen className="w-6 h-6 text-purple-600 dark:text-purple-400" />
        </div>
        <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          How Auto Apply Works
        </h3>
      </div>
      
      <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
        <div className="flex gap-3">
          <span className="font-semibold text-purple-600 dark:text-purple-400 min-w-[60px]">Step 1</span>
          <span>Fill in your job preferences below</span>
        </div>
        <div className="flex gap-3">
          <span className="font-semibold text-purple-600 dark:text-purple-400 min-w-[60px]">Step 2</span>
          <span>Claim your 50 daily credits</span>
        </div>
        <div className="flex gap-3">
          <span className="font-semibold text-purple-600 dark:text-purple-400 min-w-[60px]">Step 3</span>
          <span>Launch the bot and log in to your LinkedIn account</span>
        </div>
        <div className="flex gap-3">
          <span className="font-semibold text-purple-600 dark:text-purple-400 min-w-[60px]">Step 4</span>
          <span>Move the browser window to the side and let it apply automatically</span>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-purple-200 dark:border-purple-700">
        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          ✨ Features
        </h4>
        <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
          <li className="flex items-start gap-2">
            <span>🎯</span>
            <span>Analyzes job descriptions to understand requirements</span>
          </li>
          <li className="flex items-start gap-2">
            <span>✏️</span>
            <span>Tailors your resume to match each posting and bypass ATS</span>
          </li>
          <li className="flex items-start gap-2">
            <span>📄</span>
            <span>Generates custom cover letters when needed</span>
          </li>
          <li className="flex items-start gap-2">
            <span>🤖</span>
            <span>Fills application forms intelligently using AI</span>
          </li>
          <li className="flex items-start gap-2">
            <span>💾</span>
            <span>Saves all resumes locally <span className="text-xs text-zinc-500 dark:text-zinc-400">(coming soon)</span></span>
          </li>
        </ul>
      </div>
    </div>
  );
}
