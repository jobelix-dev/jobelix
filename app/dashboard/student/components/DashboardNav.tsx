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

import { User, Briefcase, Zap, Activity, Rocket } from 'lucide-react';

type DashboardTab = 'profile' | 'matches' | 'job-preferences' | 'auto-apply';

interface DashboardNavProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
}

export default function DashboardNav({ activeTab, onTabChange }: DashboardNavProps) {
  const tabs = [
    { id: 'profile' as const, label: 'My Profile', icon: User },
    { id: 'job-preferences' as const, label: 'Job Preferences', icon: Zap },
    { id: 'auto-apply' as const, label: 'Auto Apply', icon: Rocket },
    { id: 'matches' as const, label: 'Matches', icon: Briefcase, comingSoon: true },
  ];

  return (
    <div className="flex justify-center mb-8">
      <div className="inline-flex gap-2 p-1.5 bg-primary-subtle/30 rounded-full">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-full transition-all
                ${isActive 
                  ? 'bg-white text-primary shadow-sm' 
                  : 'text-muted hover:text-default hover:bg-white/50'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.comingSoon && (
                <span className="ml-1 px-2 py-0.5 text-xs font-semibold bg-info/30 text-info rounded-full">
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
