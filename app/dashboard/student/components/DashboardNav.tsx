/**
 * Talent Dashboard Navigation
 * 
 * Tab-based navigation for talent dashboard sections:
 * - Profile: Resume upload and profile editor
 * - Matches: Job matches from employers
 * - Auto Apply: Mass application tools
 * - Activity: Application tracking
 * Note: Component/folder uses "student" for DB compatibility, UI shows "talent"
 */

'use client';

import { User, Briefcase, Zap, Rocket } from 'lucide-react';

type DashboardTab = 'profile' | 'matches' | 'job-preferences' | 'auto-apply';

interface DashboardNavProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
}

export default function DashboardNav({ activeTab, onTabChange }: DashboardNavProps) {
  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'job-preferences' as const, label: 'Preferences', icon: Zap },
    { id: 'auto-apply' as const, label: 'Auto Apply', icon: Rocket },
    { id: 'matches' as const, label: 'Matches', icon: Briefcase, comingSoon: true },
  ];

  return (
    <nav className="mb-6">
      {/* Full width on mobile, centered on desktop */}
      <div className="flex justify-center px-1">
        <div className="w-full sm:w-auto inline-flex bg-surface rounded-2xl sm:rounded-xl p-1.5 sm:p-1 shadow-sm border border-border/30">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`
                  relative flex flex-col sm:flex-row items-center justify-center
                  flex-1 sm:flex-none
                  gap-1 sm:gap-2
                  px-2 sm:px-4 py-3 sm:py-2
                  text-xs sm:text-sm font-medium
                  rounded-xl sm:rounded-lg
                  transition-all duration-200
                  ${isActive 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'text-muted active:bg-primary-subtle/50 sm:hover:text-default sm:hover:bg-primary-subtle/50'
                  }
                `}
              >
                <Icon className="w-5 h-5 sm:w-[18px] sm:h-[18px]" strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[11px] sm:text-sm leading-tight">{tab.label}</span>
                {tab.comingSoon && (
                  <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-2 h-2 bg-info rounded-full" title="Coming Soon" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
