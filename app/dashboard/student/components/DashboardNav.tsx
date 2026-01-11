/**
 * Student Dashboard Navigation
 * 
 * Tab-based navigation for student dashboard sections:
 * - Profile: Resume upload and profile editor
 * - Matches: Job matches from startups
 * - Auto Apply: Mass application tools
 * - Activity: Application tracking
 */

'use client';

import { User, Briefcase, Zap, Activity } from 'lucide-react';

type DashboardTab = 'profile' | 'matches' | 'auto-apply' | 'activity';

interface DashboardNavProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
}

export default function DashboardNav({ activeTab, onTabChange }: DashboardNavProps) {
  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'auto-apply' as const, label: 'Auto Apply', icon: Zap },
    { id: 'matches' as const, label: 'Matches', icon: Briefcase, comingSoon: true },
    { id: 'activity' as const, label: 'Activity', icon: Activity, comingSoon: true },
  ];

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800 mb-8">
      <div className="flex gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-t-lg transition-colors
                ${isActive 
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-t border-x border-zinc-200 dark:border-zinc-800' 
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.comingSoon && (
                <span className="ml-1 px-2 py-0.5 text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                  Coming Soon
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
