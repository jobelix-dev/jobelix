/**
 * FAQ Section
 * 
 * Frequently asked questions.
 */

import { faqs } from "../data";
import ScrollReveal from "../ScrollReveal";

export default function FAQSection() {
  return (
    <section id="faq" className="py-24 px-6 bg-white">
      <div className="max-w-4xl mx-auto">
        <ScrollReveal>
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
              FAQ
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-default mb-4 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted">
              Everything you need to know about getting started.
            </p>
          </div>
        </ScrollReveal>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <ScrollReveal key={index} delay={index * 75} direction="up" distance={20}>
              <div className="bg-surface rounded-xl p-6 hover:shadow-md hover-lift transition-all duration-300 card-shadow">
                <h4 className="font-semibold text-default mb-2">{faq.q}</h4>
                <p className="text-muted leading-relaxed">
                  {faq.a}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
