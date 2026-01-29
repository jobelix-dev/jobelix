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
    <div className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 hover:shadow-lg transition-all duration-300 card-shadow relative h-full flex flex-col">
      {/* Large quote mark */}
      <div className="quote-mark absolute top-3 sm:top-4 left-4 sm:left-6 text-3xl sm:text-[4rem]">&ldquo;</div>
      
      {/* Star Rating */}
      <div className="flex items-center gap-0.5 sm:gap-1 mb-3 sm:mb-4 relative z-10">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-warning fill-warning" />
        ))}
      </div>
      
      {/* Quote */}
      <p className="text-sm sm:text-base text-default mb-4 sm:mb-6 leading-relaxed relative z-10 flex-1 pt-2 sm:pt-4">
        {quote}
      </p>
      
      {/* User Info */}
      <div className="flex items-center gap-2.5 sm:gap-3 relative z-10">
        <div className={`w-9 h-9 sm:w-10 sm:h-10 ${colors.bg} rounded-full flex items-center justify-center ${colors.text} font-semibold text-xs sm:text-sm`}>
          {initials}
        </div>
        <div>
          <div className="font-medium text-default text-xs sm:text-sm">{name}</div>
          <div className="text-[10px] sm:text-xs text-muted">{role} · {company}</div>
        </div>
      </div>
    </div>
  );
}
