/**
 * Features Section
 * 
 * Auto Apply and Employer Matching feature cards.
 */

import { Zap, Target, CheckCircle } from "lucide-react";
import { autoApplyFeatures, employerMatchingFeatures } from "../data";
import ScrollReveal from "../ScrollReveal";

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-6 section-gradient-1">
      <div className="max-w-6xl mx-auto">
        <ScrollReveal>
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
              How It Works
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-default mb-4 tracking-tight">
              Two Powerful Ways to Land Your Next Role
            </h2>
            <p className="text-lg text-muted max-w-2xl mx-auto">
              Whether you prefer active job hunting or passive matching, Jobelix has you covered.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Auto Apply Feature */}
          <ScrollReveal delay={0} direction="left">
            <div className="group h-full glass rounded-2xl p-8 shadow-sm hover:shadow-xl hover-lift transition-all duration-300 card-shadow">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-xl mb-6 shadow-lg shadow-primary/25 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-primary/30 transition-all duration-300">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-default mb-3 tracking-tight">
                Auto Apply Bot
              </h3>
              <p className="text-muted mb-6 leading-relaxed">
                Our AI-powered bot applies to jobs on LinkedIn automatically. Set your preferences once, 
                and let Jobelix apply to 50+ matching positions daily while you focus on what matters.
              </p>
              <ul className="space-y-3">
                {autoApplyFeatures.map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-default py-2 px-3 -mx-3 rounded-lg hover:bg-primary/5 transition-colors duration-200">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>

          {/* Smart Matching Feature */}
          <ScrollReveal delay={150} direction="right">
            <div className="group h-full glass rounded-2xl p-8 shadow-sm hover:shadow-xl hover-lift transition-all duration-300 card-shadow">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-success rounded-xl mb-6 shadow-lg shadow-success/25 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-success/30 transition-all duration-300">
                <Target className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-default mb-3 tracking-tight">
                Employer Matching
              </h3>
              <p className="text-muted mb-6 leading-relaxed">
                Get discovered by top employers. Our AI matches your skills and preferences 
                with companies actively hiring and they come to you with personalized opportunities.
              </p>
              <ul className="space-y-3">
                {employerMatchingFeatures.map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-default py-2 px-3 -mx-3 rounded-lg hover:bg-success/5 transition-colors duration-200">
                    <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
