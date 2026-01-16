/**
 * Bot Control Section - Credits and Launch Controls
 */

import { CheckCircle } from 'lucide-react';
import CreditsPanel from './components/CreditsPanel';
import BotLaunchPanel from './components/BotLaunchPanel';

interface BotControlSectionProps {
  credits: {
    balance: number;
    loading: boolean;
    claiming: boolean;
    refreshing: boolean;
    error: string | null;
    onClaim: () => Promise<{ success: boolean; message: string }>;
    onBuy: () => Promise<void>;
    onRefresh: () => Promise<void>;
  };
  botLauncher: {
    canLaunch: boolean;
    launching: boolean;
    launchError: string | null;
    hasCredits: boolean;
    checking: boolean;
    onLaunch: () => Promise<{ success: boolean; error?: string }>;
  };
}

export default function BotControlSection({ credits, botLauncher }: BotControlSectionProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
      {/* Features List */}
      <div className="mb-6 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              Finds jobs matching your preferences
            </span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              Generates tailored resumes and cover letters for each job based on their requirements
            </span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              Fills forms using AI to answer questions based off your profile data
            </span>
          </li>
        </ul>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
        This auto-apply bot is currently in beta and provided on an experimental basis.
        Use is at your own discretion. We are not responsible for any account restrictions,
        suspensions, or other consequences resulting from its use.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <CreditsPanel {...credits} />
        <BotLaunchPanel {...botLauncher} />
      </div>
    </div>
  );
}
