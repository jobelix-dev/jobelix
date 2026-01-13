/**
 * Bot Control Section - Credits and Launch Controls
 */

import { Rocket } from 'lucide-react';
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
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
          <Rocket className="w-6 h-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Auto Apply Bot
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3 leading-relaxed">
            This auto-apply bot is currently in beta and provided on an experimental basis.
            Use is at your own discretion. We are not responsible for any account restrictions,
            suspensions, or other consequences resulting from its use.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <CreditsPanel {...credits} />
        <BotLaunchPanel {...botLauncher} />
      </div>
    </div>
  );
}
