/**
 * Stats Section
 * 
 * Animated statistics display with icons.
 */

import { stats } from "../data";
import ScrollReveal from "../ScrollReveal";
import AnimatedCounter from "../AnimatedCounter";

export default function StatsSection() {
  return (
    <section className="py-20 section-gradient-2">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <ScrollReveal key={index} delay={index * 100} direction="up" distance={20}>
                <div className="text-center">
                  <div className="stat-icon mx-auto">
                    <IconComponent className="w-5 h-5 text-primary" />
                  </div>
                  <AnimatedCounter value={stat.value} label={stat.label} />
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
