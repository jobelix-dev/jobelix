/**
 * WorkAuthorizationSection Component
 * 
 * Section for work authorization (EU and US)
 */

'use client';

import React from 'react';
import { Globe } from 'lucide-react';

interface WorkAuthorizationSectionProps {
  values: {
    eu_work_authorization: boolean;
    us_work_authorization: boolean;
  };
  onChange: (field: string, value: boolean) => void;
}

export default function WorkAuthorizationSection({
  values,
  onChange,
}: WorkAuthorizationSectionProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-primary-hover flex items-center gap-2">
        <Globe className="w-4 h-4" />
        Work Authorization
      </h4>

      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={values.eu_work_authorization}
            onChange={(e) => onChange('eu_work_authorization', e.target.checked)}
            className="w-4 h-4 text-primary bg-white border border-border rounded focus:ring-2 focus:ring-primary transition-colors cursor-pointer"
          />
          <span className="text-sm text-muted group-hover:text-primary-hover transition-colors">
            Authorized to work in EU
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={values.us_work_authorization}
            onChange={(e) => onChange('us_work_authorization', e.target.checked)}
            className="w-4 h-4 text-primary bg-white border border-border rounded focus:ring-2 focus:ring-primary transition-colors cursor-pointer"
          />
          <span className="text-sm text-muted group-hover:text-primary-hover transition-colors">
            Authorized to work in US
          </span>
        </label>
      </div>
    </div>
  );
}
