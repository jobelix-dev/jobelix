/**
 * Bot Control Section - Credits and Launch Controls
 */

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
    <div className="bg-background rounded-xl p-4 shadow-sm space-y-4">
      <h3 className="text-lg font-semibold text-default">Credits & Launch</h3>

      <div className="space-y-4">
        <CreditsPanel {...credits} />
        <BotLaunchPanel {...botLauncher} />
      </div>
    </div>
  );
}
