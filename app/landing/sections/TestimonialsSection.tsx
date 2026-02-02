/**
 * Testimonials Section
 * 
 * Customer testimonials grid.
 */

import { testimonials } from "../data";
import ScrollReveal from "../ScrollReveal";
import TestimonialCard from "../TestimonialCard";

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24 px-6 section-gradient-1">
      <div className="max-w-6xl mx-auto">
        <ScrollReveal>
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
              Testimonials
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-default mb-4 tracking-tight">
              Professionals Love Jobelix
            </h2>
            <p className="text-lg text-muted">
              Join thousands of professionals who found their perfect role
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <ScrollReveal key={index} delay={index * 100} direction="up" distance={30}>
              <TestimonialCard {...testimonial} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
