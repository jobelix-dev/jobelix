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
    quote: "The employer matching is incredible. A VP of Engineering reached out directly—I skipped the recruiter screen entirely. Game changer for senior roles.",
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
  { num: "2", title: "Build Your Profile", desc: "Upload your resume—our AI extracts everything automatically" },
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

// Trusted by logos (text placeholders)
const trustedBy = [
  "TechCorp",
  "DataFlow",
  "CloudNine",
  "Innovate.io",
  "ScaleUp",
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
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image 
              src="/icon.png" 
              alt="Jobelix" 
              width={32} 
              height={32} 
              className="rounded-lg transition-transform duration-300 group-hover:scale-110" 
            />
            <span className="text-xl font-bold text-default">Jobelix</span>
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
          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="text-sm font-medium text-muted hover:text-default transition-colors hidden sm:block"
            >
              Sign In
            </Link>
            <Link
              href="/download"
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 active:translate-y-0 btn-glow"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-6 relative overflow-hidden noise-overlay">
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
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-default mb-6 leading-[1.08] tracking-tight">
                  Land Your Dream Job
                  <span className="block bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">
                    While You Sleep
                  </span>
                </h1>
              </ScrollReveal>
              
              {/* Subheadline */}
              <ScrollReveal delay={200} duration={600}>
                <p className="text-xl text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
                  AI-powered automation that applies to hundreds of matching positions daily. 
                  Tailored resumes. Smart form filling. You just show up to interviews.
                </p>
              </ScrollReveal>

              {/* CTAs */}
              <ScrollReveal delay={300} duration={600}>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                  <Link
                    href="/download"
                    className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-primary text-white text-lg font-semibold rounded-xl shadow-lg shadow-primary/25 hover:bg-primary-hover hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-1 active:translate-y-0 transition-all duration-300 btn-glow"
                  >
                    <Image src="/icon.png" alt="" width={20} height={20} className="opacity-90" />
                    Download for Free
                    <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                    <span className="kbd hidden sm:inline-flex">⌘D</span>
                  </Link>
                  <Link
                    href="/signup?role=talent"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 text-primary text-lg font-semibold rounded-xl bg-white shadow-sm hover:shadow-md hover:bg-primary/5 transition-all duration-300"
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

        {/* Trusted By Section */}
        <section className="py-12 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <p className="text-center text-sm font-medium text-muted/70 uppercase tracking-wider mb-8">
              Trusted by professionals at
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
              {trustedBy.map((company, index) => (
                <span 
                  key={index} 
                  className="text-xl font-bold text-muted/40 hover:text-primary/60 transition-colors duration-300 cursor-default"
                >
                  {company}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Gradient Divider */}
        <div className="gradient-divider" />

        {/* Stats Section */}
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

        {/* Gradient Divider */}
        <div className="gradient-divider" />

        {/* Features Section */}
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
                    {[
                      "AI-tailored resumes for each application",
                      "Smart form filling with your profile data",
                      "Apply 24/7 - even while you sleep",
                    ].map((item, i) => (
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
                    {[
                      "Vetted employers with real opportunities",
                      "AI-powered compatibility scoring",
                      "Direct messages from hiring managers",
                    ].map((item, i) => (
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

        {/* Gradient Divider */}
        <div className="gradient-divider" />

        {/* How It Works */}
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
                  From sign-up to your first applications—it&apos;s that simple.
                </p>
              </div>
            </ScrollReveal>

            <div className="grid md:grid-cols-4 gap-8 relative">
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

        {/* Gradient Divider */}
        <div className="gradient-divider" />

        {/* Social Proof / Testimonials */}
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

        {/* Gradient Divider */}
        <div className="gradient-divider" />

        {/* FAQ Section */}
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

        {/* Gradient Divider */}
        <div className="gradient-divider" />

        {/* Newsletter Section */}
        <ScrollReveal>
          <NewsletterForm />
        </ScrollReveal>

        {/* CTA Section */}
        <section className="py-24 px-6 animated-gradient-bg relative overflow-hidden">
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
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
              <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
                Join 3,200+ professionals who automated their job search. 
                Start applying to your first 50 jobs in under 5 minutes.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/download"
                  className="group inline-flex items-center justify-center gap-3 px-10 py-5 bg-white text-primary text-lg font-bold rounded-xl shadow-2xl hover:-translate-y-1 active:translate-y-0 transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
                >
                  <Image src="/icon.png" alt="" width={24} height={24} />
                  Download Free
                  <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/signup?role=talent"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 text-white text-lg font-semibold rounded-xl hover:bg-white/20 transition-all duration-300 backdrop-blur-sm"
                >
                  Create Free Account
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* Footer */}
        <footer className="py-16 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            {/* Top section */}
            <div className="flex flex-col lg:flex-row items-start justify-between gap-12 mb-12">
              {/* Brand */}
              <div className="max-w-xs">
                <Link href="/" className="flex items-center gap-2.5 group mb-4">
                  <Image 
                    src="/icon.png" 
                    alt="Jobelix" 
                    width={32} 
                    height={32} 
                    className="rounded-lg transition-transform duration-300 group-hover:scale-110" 
                  />
                  <span className="text-xl font-bold text-default">Jobelix</span>
                </Link>
                <p className="text-sm text-muted leading-relaxed">
                  AI-powered job matching and automated applications. Land your dream role faster.
                </p>
              </div>

              {/* Links */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 lg:gap-16">
                <div>
                  <h4 className="font-semibold text-default mb-4 text-sm">Product</h4>
                  <ul className="space-y-3">
                    <li><a href="#features" className="text-sm text-muted hover:text-primary transition-colors">Features</a></li>
                    <li><Link href="/download" className="text-sm text-muted hover:text-primary transition-colors">Download</Link></li>
                    <li><a href="#faq" className="text-sm text-muted hover:text-primary transition-colors">FAQ</a></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-default mb-4 text-sm">Account</h4>
                  <ul className="space-y-3">
                    <li><Link href="/login" className="text-sm text-muted hover:text-primary transition-colors">Sign In</Link></li>
                    <li><Link href="/signup?role=talent" className="text-sm text-muted hover:text-primary transition-colors">Create Account</Link></li>
                    <li><Link href="/signup?role=employer" className="text-sm text-muted hover:text-primary transition-colors">For Employers</Link></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-default mb-4 text-sm">Social</h4>
                  <ul className="space-y-3">
                    <li><a href="https://twitter.com/jobelix" target="_blank" rel="noopener" className="text-sm text-muted hover:text-primary transition-colors">Twitter</a></li>
                    <li><a href="https://linkedin.com/company/jobelix" target="_blank" rel="noopener" className="text-sm text-muted hover:text-primary transition-colors">LinkedIn</a></li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Bottom section */}
            <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <p className="text-sm text-muted/70">
                © 2026 Jobelix. All rights reserved.
              </p>
              <p className="text-xs text-muted/50">
                The auto-apply feature is in beta. Use at your own discretion.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
