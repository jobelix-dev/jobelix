/**
 * Home Page (Landing Page)
 * 
 * Enterprise-grade landing page with scroll-based animations,
 * animated metrics, and polished interactions.
 * 
 * Route: / (root)
 * Accessible to: Everyone (non-authenticated users)
 */

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Zap, Target, CheckCircle, ArrowRight, Send, Users, TrendingUp, Clock } from "lucide-react";
import "./globals.css";
import {
  SITE_NAME,
  canonicalUrl,
  defaultOpenGraphImages,
  defaultTwitterImages,
  organizationJsonLd,
  softwareApplicationJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import TestimonialCard from "./landing/TestimonialCard";
import NewsletterForm from "./landing/NewsletterForm";
import AnimatedCounter from "./landing/AnimatedCounter";
import ScrollReveal from "./landing/ScrollReveal";
import LogoCarousel from "./landing/LogoCarousel";

const title = "AI Job Matching and Auto-Apply";
const description =
  "Jobelix connects top talent with employers using AI-powered matching and automated applications. Download the desktop app and land roles faster.";
const canonical = canonicalUrl("/");

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical,
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title,
    description,
    url: canonical,
    siteName: SITE_NAME,
    type: "website",
    images: defaultOpenGraphImages(),
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: defaultTwitterImages(),
  },
};

// Testimonials data
const testimonials = [
  {
    quote: "Jobelix applied to 180 jobs in my first week. I got 12 interviews and accepted an offer at a Series B startup. The AI-tailored resumes actually work.",
    name: "Marc L.",
    role: "Senior Backend Engineer",
    company: "Now at Doctolib",
    initials: "ML",
    accentColor: "primary" as const,
  },
  {
    quote: "The employer matching is incredible. A VP of Engineering reached out directly - I skipped the recruiter screen entirely. Game changer for senior roles.",
    name: "Sophie C.",
    role: "Staff Engineer",
    company: "Previously at Datadog",
    initials: "SC",
    accentColor: "success" as const,
  },
  {
    quote: "As a bootcamp grad, getting callbacks was impossible. Jobelix sent 200+ applications with tailored cover letters. Landed my first dev job in 3 weeks.",
    name: "Antoine T.",
    role: "Frontend Developer",
    company: "Now at Alan",
    initials: "AT",
    accentColor: "info" as const,
  },
];

// Stats data with icons
const stats = [
  { value: "47,000+", label: "Applications Sent", icon: Send },
  { value: "3,200+", label: "Active Users", icon: Users },
  { value: "34%", label: "Get Interviews", icon: TrendingUp },
  { value: "15hrs", label: "Saved Per Week", icon: Clock },
];

// Steps data
const steps = [
  { num: "1", title: "Create Account", desc: "Sign up for free and download our desktop app" },
  { num: "2", title: "Build Your Profile", desc: "Upload your resume - our AI extracts everything automatically" },
  { num: "3", title: "Set Preferences", desc: "Define your ideal role, salary, and work style" },
  { num: "4", title: "Launch & Match", desc: "Start auto-applying and receive employer matches" },
];

// FAQ data
const faqs = [
  {
    q: "Is Jobelix really free?",
    a: "Yes, the core platform is free. You can create a profile and get matched with employers at no cost. For the auto-apply bot, we offer a \"Freemium\" model: you receive free daily tokens to apply to jobs, or you can buy tokens to enable more automated applications."
  },
  {
    q: "How does the auto-apply bot work?",
    a: "To use the bot, you must download the desktop app. The bot connects to LinkedIn and applies to jobs that match your criteria. Crucially, it uses AI to tailor your resume and generate a unique cover letter for every single application, increasing your chances of being noticed."
  },
  {
    q: "Will employers contact me directly?",
    a: "Absolutely. Once your profile is live, our matching algorithm highlights you to relevant companies. Hiring managers review your profile and can initiate a conversation directly through the Jobelix platform."
  },
  {
    q: "Is the auto-apply bot safe to use?",
    a: "The bot is currently in beta. While we design it to respect platform guidelines, automated activity may carry some risk (account suspension, banishment, or other). Use at your own discretion."
  },
];

export default function Home() {
  const organizationSchema = organizationJsonLd();
  const websiteSchema = websiteJsonLd();
  const softwareSchema = softwareApplicationJsonLd({
    urlPath: "/",
    description,
  });

  return (
    <div className="min-h-screen bg-background scroll-smooth">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />

      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-xl sticky top-0 z-50 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group">
            <Image 
              src="/icon.png" 
              alt="Jobelix" 
              width={28} 
              height={28} 
              className="rounded-lg transition-transform duration-300 group-hover:scale-110 sm:w-8 sm:h-8" 
            />
            <span className="text-lg sm:text-xl font-bold text-default">Jobelix</span>
          </Link>
          
          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="nav-link text-sm font-medium text-muted hover:text-default transition-colors">
              Features
            </a>
            <a href="#testimonials" className="nav-link text-sm font-medium text-muted hover:text-default transition-colors">
              Testimonials
            </a>
            <a href="#faq" className="nav-link text-sm font-medium text-muted hover:text-default transition-colors">
              FAQ
            </a>
          </div>
          
          {/* CTAs */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Link 
              href="/login" 
              className="text-sm font-medium text-muted hover:text-default transition-colors hidden sm:block"
            >
              Sign In
            </Link>
            <Link
              href="/download"
              className="px-3 sm:px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 active:translate-y-0 btn-glow"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="pt-12 sm:pt-16 md:pt-20 pb-12 sm:pb-16 px-4 sm:px-6 relative overflow-hidden noise-overlay">
          {/* Background gradient orbs with improved animation */}
          <div className="absolute top-0 left-1/4 w-[300px] sm:w-[400px] md:w-[500px] h-[300px] sm:h-[400px] md:h-[500px] bg-primary/10 rounded-full blur-[80px] sm:blur-[100px] animate-gradient-shift pointer-events-none" />
          <div className="absolute top-40 right-1/4 w-[250px] sm:w-[300px] md:w-[400px] h-[250px] sm:h-[300px] md:h-[400px] bg-success/8 rounded-full blur-[80px] sm:blur-[100px] animate-gradient-shift-delayed pointer-events-none" />
          <div className="absolute bottom-20 left-1/3 w-[200px] sm:w-[250px] md:w-[300px] h-[200px] sm:h-[250px] md:h-[300px] bg-info/5 rounded-full blur-[60px] sm:blur-[80px] animate-float pointer-events-none" />
          
          <div className="max-w-6xl mx-auto relative">
            <div className="text-center max-w-4xl mx-auto">
              {/* Animated Badge with Shimmer */}
              <ScrollReveal delay={0} duration={500}>
                <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 bg-white/80 backdrop-blur-sm rounded-full text-xs sm:text-sm font-medium shadow-sm mb-6 sm:mb-8">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  <span className="shimmer-badge font-semibold">Now on Windows, macOS & Linux</span>
                </div>
              </ScrollReveal>
              
              {/* Headline */}
              <ScrollReveal delay={100} duration={600}>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-default mb-4 sm:mb-6 leading-[1.1] sm:leading-[1.08] tracking-tight px-2">
                  Land Your Dream Job
                  <span className="block bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">
                    While You Sleep
                  </span>
                </h1>
              </ScrollReveal>
              
              {/* Subheadline */}
              <ScrollReveal delay={200} duration={600}>
                <p className="text-base sm:text-lg md:text-xl text-muted max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed px-2">
                  AI-powered automation that applies to hundreds of matching positions daily. 
                  Tailored resumes. Smart form filling. You just show up to interviews.
                </p>
              </ScrollReveal>

              {/* CTAs */}
              <ScrollReveal delay={300} duration={600}>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-6 sm:mb-8 px-2">
                  <Link
                    href="/download"
                    className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-8 py-3.5 sm:py-4 bg-primary text-white text-base sm:text-lg font-semibold rounded-xl shadow-lg shadow-primary/25 hover:bg-primary-hover hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-1 active:translate-y-0 transition-all duration-300 btn-glow"
                  >
                    <Image src="/icon.png" alt="" width={20} height={20} className="opacity-90" />
                    Download for Free
                    <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                    <span className="kbd hidden md:inline-flex">⌘D</span>
                  </Link>
                  <Link
                    href="/signup?role=talent"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 text-primary text-base sm:text-lg font-semibold rounded-xl bg-white shadow-sm hover:shadow-md hover:bg-primary/5 transition-all duration-300"
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

            {/* Hero Screenshot Mockup */}
            <ScrollReveal delay={400} duration={800} distance={50}>
              <div className="relative mt-10 sm:mt-12 md:mt-16 mx-auto max-w-4xl reflection px-2 sm:px-0">
                {/* macOS-style window frame */}
                <div className="relative bg-white rounded-xl sm:rounded-2xl screenshot-glow overflow-hidden">
                  {/* Window title bar */}
                  <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-b from-surface to-surface/80">
                    <div className="flex gap-1.5 sm:gap-2">
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#FF5F57] shadow-inner" />
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#FFBD2E] shadow-inner" />
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#28CA41] shadow-inner" />
                    </div>
                    <div className="flex-1" />
                  </div>
                  {/* Screenshot */}
                  <div className="relative aspect-[16/9] bg-surface">
                    <Image 
                      src="/hero-screenshot.png"
                      alt="Jobelix auto-applying to LinkedIn jobs"
                      fill
                      className="object-cover object-top"
                      priority
                    />
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Gradient Divider */}
        <div className="gradient-divider" />

        {/* Logo Carousel - Trusted By */}
        <LogoCarousel />

        {/* Gradient Divider */}
        <div className="gradient-divider" />

        {/* Stats Section */}
        <section className="py-12 sm:py-16 md:py-20 section-gradient-2">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 md:gap-12">
              {stats.map((stat, index) => {
                const IconComponent = stat.icon;
                return (
                  <ScrollReveal key={index} delay={index * 100} direction="up" distance={20}>
                    <div className="text-center">
                      <div className="stat-icon mx-auto">
                        <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                      </div>
                      <AnimatedCounter value={stat.value} label={stat.label} />
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* Gradient Divider */}
        <div className="gradient-divider" />

        {/* Features Section */}
        <section id="features" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 section-gradient-1">
          <div className="max-w-6xl mx-auto">
            <ScrollReveal>
              <div className="text-center mb-10 sm:mb-12 md:mb-16">
                <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wider mb-2 sm:mb-3">
                  How It Works
                </p>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-default mb-3 sm:mb-4 tracking-tight px-2">
                  Two Powerful Ways to Land Your Next Role
                </h2>
                <p className="text-base sm:text-lg text-muted max-w-2xl mx-auto px-2">
                  Whether you prefer active job hunting or passive matching, Jobelix has you covered.
                </p>
              </div>
            </ScrollReveal>

            <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
              {/* Auto Apply Feature */}
              <ScrollReveal delay={0} direction="left">
                <div className="group h-full glass rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-xl hover-lift transition-all duration-300 card-shadow">
                  <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-primary rounded-lg sm:rounded-xl mb-4 sm:mb-6 shadow-lg shadow-primary/25 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-primary/30 transition-all duration-300">
                    <Zap className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-default mb-2 sm:mb-3 tracking-tight">
                    Auto Apply Bot
                  </h3>
                  <p className="text-sm sm:text-base text-muted mb-4 sm:mb-6 leading-relaxed">
                    Our AI-powered bot applies to jobs on LinkedIn automatically. Set your preferences once, 
                    and let Jobelix apply to 50+ matching positions daily while you focus on what matters.
                  </p>
                  <ul className="space-y-2 sm:space-y-3">
                    {[
                      "AI-tailored resumes for each application",
                      "Smart form filling with your profile data",
                      "Apply 24/7 - even while you sleep",
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-default py-1.5 sm:py-2 px-2 sm:px-3 -mx-2 sm:-mx-3 rounded-lg hover:bg-primary/5 transition-colors duration-200">
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollReveal>

              {/* Smart Matching Feature */}
              <ScrollReveal delay={150} direction="right">
                <div className="group h-full glass rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-xl hover-lift transition-all duration-300 card-shadow">
                  <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-success rounded-lg sm:rounded-xl mb-4 sm:mb-6 shadow-lg shadow-success/25 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-success/30 transition-all duration-300">
                    <Target className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-default mb-2 sm:mb-3 tracking-tight">
                    Employer Matching
                  </h3>
                  <p className="text-sm sm:text-base text-muted mb-4 sm:mb-6 leading-relaxed">
                    Get discovered by top employers. Our AI matches your skills and preferences 
                    with companies actively hiring and they come to you with personalized opportunities.
                  </p>
                  <ul className="space-y-2 sm:space-y-3">
                    {[
                      "Vetted employers with real opportunities",
                      "AI-powered compatibility scoring",
                      "Direct messages from hiring managers",
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-default py-1.5 sm:py-2 px-2 sm:px-3 -mx-2 sm:-mx-3 rounded-lg hover:bg-success/5 transition-colors duration-200">
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-success flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* Gradient Divider */}
        <div className="gradient-divider" />

        {/* How It Works */}
        <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <ScrollReveal>
              <div className="text-center mb-10 sm:mb-12 md:mb-16">
                <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wider mb-2 sm:mb-3">
                  Get Started
                </p>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-default mb-3 sm:mb-4 tracking-tight">
                  Up and Running in Minutes
                </h2>
                <p className="text-base sm:text-lg text-muted">
                  From sign-up to your first applications - it&apos;s that simple.
                </p>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8 relative">
              {/* Connecting line (hidden on mobile) */}
              <div className="hidden md:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
              
              {steps.map((step, index) => (
                <ScrollReveal key={index} delay={index * 100} direction="up" distance={30}>
                  <div className="text-center relative group">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-primary text-white text-lg sm:text-xl md:text-2xl font-bold rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 md:mb-5 shadow-lg shadow-primary/25 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-primary/30 transition-all duration-300 relative z-10">
                      {step.num}
                    </div>
                    <h4 className="font-semibold text-default mb-1 sm:mb-2 text-sm sm:text-base md:text-lg">{step.title}</h4>
                    <p className="text-xs sm:text-sm text-muted leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Gradient Divider */}
        <div className="gradient-divider" />

        {/* Social Proof / Testimonials */}
        <section id="testimonials" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 section-gradient-1">
          <div className="max-w-6xl mx-auto">
            <ScrollReveal>
              <div className="text-center mb-10 sm:mb-12 md:mb-16">
                <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wider mb-2 sm:mb-3">
                  Testimonials
                </p>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-default mb-3 sm:mb-4 tracking-tight">
                  Professionals Love Jobelix
                </h2>
                <p className="text-base sm:text-lg text-muted">
                  Join thousands of professionals who found their perfect role
                </p>
              </div>
            </ScrollReveal>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {testimonials.map((testimonial, index) => (
                <ScrollReveal key={index} delay={index * 100} direction="up" distance={30}>
                  <TestimonialCard {...testimonial} />
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Gradient Divider */}
        <div className="gradient-divider" />

        {/* FAQ Section */}
        <section id="faq" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 bg-white">
          <div className="max-w-4xl mx-auto">
            <ScrollReveal>
              <div className="text-center mb-10 sm:mb-12 md:mb-16">
                <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wider mb-2 sm:mb-3">
                  FAQ
                </p>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-default mb-3 sm:mb-4 tracking-tight">
                  Frequently Asked Questions
                </h2>
                <p className="text-base sm:text-lg text-muted">
                  Everything you need to know about getting started.
                </p>
              </div>
            </ScrollReveal>

            <div className="space-y-3 sm:space-y-4">
              {faqs.map((faq, index) => (
                <ScrollReveal key={index} delay={index * 75} direction="up" distance={20}>
                  <div className="bg-surface rounded-lg sm:rounded-xl p-4 sm:p-6 hover:shadow-md hover-lift transition-all duration-300 card-shadow">
                    <h4 className="font-semibold text-default mb-1.5 sm:mb-2 text-sm sm:text-base">{faq.q}</h4>
                    <p className="text-muted leading-relaxed text-sm sm:text-base">
                      {faq.a}
                    </p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Gradient Divider */}
        <div className="gradient-divider" />

        {/* Newsletter Section */}
        <ScrollReveal>
          <NewsletterForm />
        </ScrollReveal>

        {/* CTA Section */}
        <section className="py-14 sm:py-16 md:py-20 px-4 sm:px-6 bg-primary relative overflow-hidden">
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-[0.08] pointer-events-none">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
              backgroundSize: '32px 32px'
            }} />
          </div>
          
          <ScrollReveal>
            <div className="max-w-4xl mx-auto text-center relative">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4 leading-tight tracking-tight px-2">
                Ready to Land 10x More Interviews?
              </h2>
              <p className="text-base sm:text-lg text-white/90 mb-8 sm:mb-10 max-w-2xl mx-auto px-2">
                Join 3,200+ professionals who automated their job search. 
                Start applying to your first 50 jobs in under 5 minutes.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-2">
                <Link
                  href="/download"
                  className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-10 py-3.5 sm:py-4 bg-white text-primary text-base sm:text-lg font-bold rounded-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 transition-all duration-300"
                >
                  <Image src="/icon.png" alt="" width={24} height={24} />
                  Download Free
                  <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/signup?role=talent"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 bg-white/20 text-white text-base sm:text-lg font-semibold rounded-xl border-2 border-white/40 hover:bg-white/30 hover:border-white/60 transition-all duration-300"
                >
                  Create Free Account
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* Footer */}
        <footer className="py-6 sm:py-8 px-4 sm:px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
              {/* Brand */}
              <Link href="/" className="flex items-center gap-2 group">
                <Image 
                  src="/icon.png" 
                  alt="Jobelix" 
                  width={24} 
                  height={24} 
                  className="rounded-lg transition-transform duration-300 group-hover:scale-110" 
                />
                <span className="text-lg font-bold text-default">Jobelix</span>
              </Link>

              {/* Links */}
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
                <a href="#features" className="text-xs sm:text-sm text-muted hover:text-primary transition-colors">Features</a>
                <a href="#testimonials" className="text-xs sm:text-sm text-muted hover:text-primary transition-colors">Testimonials</a>
                <a href="#faq" className="text-xs sm:text-sm text-muted hover:text-primary transition-colors">FAQ</a>
                <Link href="/download" className="text-xs sm:text-sm text-muted hover:text-primary transition-colors">Download</Link>
                <Link href="/login" className="text-xs sm:text-sm text-muted hover:text-primary transition-colors">Sign In</Link>
              </div>
              
              {/* Copyright */}
              <p className="text-xs text-muted/60">
                © 2026 Jobelix
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
