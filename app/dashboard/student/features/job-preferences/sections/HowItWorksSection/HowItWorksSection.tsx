/**
 * How Auto Apply Works - Informational Section
 */

import { BookOpen } from 'lucide-react';

export default function HowItWorksSection() {
  return (
    <div className="bg-gradient-to-r from-primary-subtle to-info-subtle/20/20 border border-border rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary-subtle/40 rounded-lg">
          <BookOpen className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-2xl font-bold text-default">
          How Auto Apply Works
        </h3>
      </div>
      
      <div className="space-y-3 text-sm text-muted">
        <div className="flex gap-3">
          <span className="font-semibold text-primary min-w-[60px]">Step 1</span>
          <span>Fill in your job preferences below</span>
        </div>
        <div className="flex gap-3">
          <span className="font-semibold text-primary min-w-[60px]">Step 2</span>
          <span>Claim your 50 daily credits</span>
        </div>
        <div className="flex gap-3">
          <span className="font-semibold text-primary min-w-[60px]">Step 3</span>
          <span>Launch the bot and log in to your LinkedIn account</span>
        </div>
        <div className="flex gap-3">
          <span className="font-semibold text-primary min-w-[60px]">Step 4</span>
          <span>Move the browser window to the side and let it apply automatically</span>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-border">
        <h4 className="text-sm font-semibold text-default mb-3">
          ✨ Features
        </h4>
        <ul className="space-y-2 text-sm text-muted">
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
            <span>Saves all resumes locally <span className="text-xs text-muted">(coming soon)</span></span>
          </li>
        </ul>
      </div>
    </div>
  );
}
