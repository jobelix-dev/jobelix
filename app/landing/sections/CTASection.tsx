/**
 * CTA Section
 * 
 * Final call-to-action before footer.
 */

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import ScrollReveal from "../ScrollReveal";

export default function CTASection() {
  return (
    <section className="py-20 px-6 bg-primary relative overflow-hidden">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-[0.08] pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} />
      </div>
      
      <ScrollReveal>
        <div className="max-w-4xl mx-auto text-center relative">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight tracking-tight">
            Ready to Land 10x More Interviews?
          </h2>
          <p className="text-lg text-white/90 mb-10 max-w-2xl mx-auto">
            Join 3,200+ professionals who automated their job search. 
            Start applying to your first 50 jobs in under 5 minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/download"
              className="group inline-flex items-center justify-center gap-3 px-10 py-4 bg-white text-primary text-lg font-bold rounded-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 transition-all duration-300"
            >
              <Image src="/icon.png" alt="" width={24} height={24} />
              Download Free
              <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link
              href="/signup?role=talent"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/20 text-white text-lg font-semibold rounded-xl border-2 border-white/40 hover:bg-white/30 hover:border-white/60 transition-all duration-300"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
