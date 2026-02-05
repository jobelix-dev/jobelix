/**
 * Hero Section
 * 
 * Landing page hero with headline, CTAs, and video demo.
 */

import Link from "next/link";
import Image from "next/image";
import ScrollReveal from "../ScrollReveal";

export default function HeroSection() {
  return (
    <section className="pt-20 pb-16 px-6 relative overflow-hidden noise-overlay bg-white">
      {/* Background gradient orbs with improved animation */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] animate-gradient-shift pointer-events-none" />
      <div className="absolute top-40 right-1/4 w-[400px] h-[400px] bg-success/8 rounded-full blur-[100px] animate-gradient-shift-delayed pointer-events-none" />
      <div className="absolute bottom-20 left-1/3 w-[300px] h-[300px] bg-info/5 rounded-full blur-[80px] animate-float pointer-events-none" />
      
      <div className="max-w-6xl mx-auto relative">
        <div className="text-center max-w-4xl mx-auto">
          {/* Animated Badge with Shimmer */}
          <ScrollReveal delay={0} duration={500}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/80 backdrop-blur-sm rounded-full text-sm font-medium shadow-sm mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="shimmer-badge font-semibold">Now available on Windows, macOS & Linux</span>
            </div>
          </ScrollReveal>
          
          {/* Headline */}
          <ScrollReveal delay={100} duration={600}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-default mb-6 leading-[1.08] tracking-tight">
              Land Your Dream Job
              <span className="block bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">
                While You Sleep
              </span>
            </h1>
          </ScrollReveal>
          
          {/* Subheadline */}
          <ScrollReveal delay={200} duration={600}>
            <p className="text-lg md:text-xl text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
              AI-powered automation that applies to hundreds of matching positions daily. 
              Tailored resumes. Smart form filling. You just show up to interviews.
            </p>
          </ScrollReveal>

          {/* CTAs */}
          <ScrollReveal delay={300} duration={600}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Link
                href="/download"
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-3 px-6 py-3 sm:px-8 sm:py-4 bg-primary text-white text-base sm:text-lg font-semibold rounded-xl shadow-lg shadow-primary/25 hover:bg-primary-hover hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-1 active:translate-y-0 transition-all duration-300 btn-glow"
              >
                <Image src="/icon.png" alt="" width={20} height={20} className="opacity-90" />
                Download for Free
              </Link>
              <Link
                href="/signup?role=talent"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 sm:px-8 sm:py-4 text-primary text-base sm:text-lg font-semibold rounded-xl bg-white shadow-sm hover:shadow-md hover:bg-primary/5 transition-all duration-300"
              >
                Create Free Account
              </Link>
            </div>

            <p className="text-sm text-muted">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-primary hover:underline underline-offset-4">
                Sign in here
              </Link>
            </p>
          </ScrollReveal>
        </div>

        {/* Hero Video Demo */}
        <ScrollReveal delay={400} duration={800} distance={50}>
          <div className="relative mt-16 mx-auto max-w-4xl reflection">
            {/* macOS-style window frame */}
            <div className="relative bg-white rounded-2xl screenshot-glow overflow-hidden">
              {/* Window title bar */}
              <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-b from-surface to-surface/80">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#FF5F57] shadow-inner" />
                  <div className="w-3 h-3 rounded-full bg-[#FFBD2E] shadow-inner" />
                  <div className="w-3 h-3 rounded-full bg-[#28CA41] shadow-inner" />
                </div>
                <div className="flex-1" />
              </div>
              {/* Video */}
              <div className="relative aspect-[16/9] bg-surface">
                <video 
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover object-top"
                  aria-label="Jobelix auto-applying to LinkedIn jobs demonstration"
                >
                  <source src="/hero-demo.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
