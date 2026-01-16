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
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
          <Rocket className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
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
