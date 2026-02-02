/**
 * AnimatedCounter Component
 * 
 * Animates a number from 0 to target value when visible in viewport.
 * Uses requestAnimationFrame for smooth 60fps animation.
 */

'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  value: string;
  label: string;
  duration?: number;
}

function parseValue(value: string): { num: number; suffix: string; prefix: string } {
  // Extract number and suffix (e.g., "47,000+" -> 47000, "+")
  const match = value.match(/^([^\d]*)(\d[\d,.]*)(.*)$/);
  if (!match) return { num: 0, suffix: value, prefix: '' };
  
  const prefix = match[1] || '';
  const numStr = match[2].replace(/,/g, '');
  const suffix = match[3] || '';
  const num = parseFloat(numStr);
  
  return { num, suffix, prefix };
}

function formatNumber(num: number, original: string): string {
  // Preserve original formatting (commas, decimals)
  const hasCommas = original.includes(',');
  const decimalPlaces = (original.split('.')[1]?.match(/\d+/)?.[0]?.length) || 0;
  
  if (decimalPlaces > 0) {
    return num.toFixed(decimalPlaces);
  }
  
  if (hasCommas) {
    return Math.round(num).toLocaleString('en-US');
  }
  
  return Math.round(num).toString();
}

export default function AnimatedCounter({ value, label, duration = 2000 }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState('0');
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { num, suffix, prefix } = parseValue(value);

  useEffect(() => {
    const element = ref.current;
    if (!element || hasAnimated) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            
            const startTime = performance.now();
            const startValue = 0;
            
            const animate = (currentTime: number) => {
              const elapsed = currentTime - startTime;
              const progress = Math.min(elapsed / duration, 1);
              
              // Easing function: easeOutExpo for snappy feel
              const easeProgress = 1 - Math.pow(1 - progress, 4);
              const currentValue = startValue + (num - startValue) * easeProgress;
              
              setDisplayValue(formatNumber(currentValue, value));
              
              if (progress < 1) {
                requestAnimationFrame(animate);
              }
            };
            
            requestAnimationFrame(animate);
          }
        });
      },
      { threshold: 0.3, rootMargin: '0px 0px -50px 0px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [num, value, duration, hasAnimated]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl md:text-5xl font-bold text-primary mb-2 tabular-nums">
        {prefix}{displayValue}{suffix}
      </div>
      <div className="text-sm text-muted font-medium mt-1">{label}</div>
    </div>
  );
}
