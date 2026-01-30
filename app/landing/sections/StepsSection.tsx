/**
 * Steps Section
 * 
 * How it works steps (1-4).
 */

import { steps } from "../data";
import ScrollReveal from "../ScrollReveal";

export default function StepsSection() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <ScrollReveal>
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
              Get Started
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-default mb-4 tracking-tight">
              Up and Running in Minutes
            </h2>
            <p className="text-lg text-muted">
              From sign-up to your first applications - it&apos;s that simple.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 relative">
          {/* Connecting line (hidden on mobile) */}
          <div className="hidden md:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          
          {steps.map((step, index) => (
            <ScrollReveal key={index} delay={index * 100} direction="up" distance={30}>
              <div className="text-center relative group">
                <div className="w-16 h-16 bg-primary text-white text-2xl font-bold rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary/25 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-primary/30 transition-all duration-300 relative z-10">
                  {step.num}
                </div>
                <h4 className="font-semibold text-default mb-2 text-lg">{step.title}</h4>
                <p className="text-sm text-muted leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
