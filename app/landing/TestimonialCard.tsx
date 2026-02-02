/**
 * TestimonialCard Component
 * 
 * Reusable testimonial card for landing page social proof section.
 * Displays quote, star rating, and user info with avatar.
 */

import { Star } from 'lucide-react';

interface TestimonialCardProps {
  quote: string;
  name: string;
  role: string;
  company: string;
  initials: string;
  accentColor: 'primary' | 'success' | 'info';
}

export default function TestimonialCard({ 
  quote, 
  name, 
  role, 
  company, 
  initials, 
  accentColor 
}: TestimonialCardProps) {
  const colorMap = {
    primary: { bg: 'bg-primary-subtle', text: 'text-primary' },
    success: { bg: 'bg-success-subtle', text: 'text-success' },
    info: { bg: 'bg-info-subtle', text: 'text-info' },
  };
  const colors = colorMap[accentColor];

  return (
    <div className="bg-white rounded-2xl p-6 hover:shadow-lg transition-all duration-300 card-shadow relative h-full flex flex-col">
      {/* Star Rating */}
      <div className="flex items-center gap-1 mb-4 relative z-10">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-4 h-4 text-warning fill-warning" />
        ))}
      </div>
      
      {/* Quote */}
      <p className="text-default mb-6 leading-relaxed relative z-10 flex-1">
        &ldquo;{quote}&rdquo;
      </p>
      
      {/* User Info */}
      <div className="flex items-center gap-3 relative z-10">
        <div className={`w-10 h-10 ${colors.bg} rounded-full flex items-center justify-center ${colors.text} font-semibold text-sm`}>
          {initials}
        </div>
        <div>
          <div className="font-medium text-default text-sm">{name}</div>
          <div className="text-xs text-muted">{role} · {company}</div>
        </div>
      </div>
    </div>
  );
}
