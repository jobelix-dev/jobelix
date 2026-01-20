'use client';

/**
 * Home Page (Landing Page)
 * 
 * Public landing page promoting Jobelix platform for top engineers.
 * Route: / (root)
 * Accessible to: Everyone (non-authenticated users)
 * Links to: /download, /signup, /login
 */

import Link from "next/link";
import { Rocket, Sparkles, Target, Zap, Users, Building2, TrendingUp, CheckCircle, ArrowRight, Star } from "lucide-react";
import "./globals.css";

export default function Home() {
  return (
    <div className="min-h-screen bg-background scroll-smooth">
      {/* Navigation */}
      <nav className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-default">Jobelix</span>
          </div>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-6">
              <a href="#about" className="text-sm font-medium text-muted hover:text-default transition-colors cursor-pointer">
                About
              </a>
              <a href="#faq" className="text-sm font-medium text-muted hover:text-default transition-colors cursor-pointer">
                FAQ
              </a>
              <a href="#blog" className="text-sm font-medium text-muted hover:text-default transition-colors cursor-pointer">
                Blog
              </a>
            </div>
            <Link
              href="/login"
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="pt-20 pb-24 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-subtle/50 rounded-full text-sm font-medium text-primary mb-6">
                <Star className="w-4 h-4" />
                Trusted by 2,400+ engineers across France
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-default mb-6 leading-tight">
                Where Top Engineers
                <span className="block bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">
                  Meet Top Startups
                </span>
              </h1>
              
              <p className="text-xl text-muted max-w-2xl mx-auto mb-10">
                Jobelix connects exceptional tech talent with France's most innovative startups. 
                AI-powered matching and automated applications help you find your dream role faster.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                <Link
                  href="/download"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary hover:bg-primary-hover text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  <Rocket className="w-5 h-5" />
                  Download Desktop App
                </Link>
                <Link
                  href="/signup?role=student"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white border-2 border-primary text-primary hover:bg-primary-subtle text-lg font-semibold rounded-xl transition-all"
                >
                  Create Free Account
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>

              <p className="text-sm text-muted">
                Already have an account?{' '}
                <Link href="/login" className="font-medium text-primary hover:underline">
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-white border-y border-border">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">2,400+</div>
                <div className="text-sm text-muted">Engineers Registered</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">180+</div>
                <div className="text-sm text-muted">Partner Startups</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">12,000+</div>
                <div className="text-sm text-muted">Applications Sent</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">89%</div>
                <div className="text-sm text-muted">Interview Rate</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="about" className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-default mb-4">
                Two Powerful Ways to Land Your Next Role
              </h2>
              <p className="text-lg text-muted max-w-2xl mx-auto">
                Whether you prefer active job hunting or passive matching, Jobelix has you covered.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Auto Apply Feature */}
              <div className="bg-gradient-to-br from-primary-subtle/30 to-primary-subtle/10 border border-primary-subtle rounded-2xl p-8">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-xl mb-6">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-default mb-3">
                  Auto Apply Bot
                </h3>
                <p className="text-muted mb-6">
                  Our AI-powered bot applies to jobs on LinkedIn automatically. Set your preferences once, 
                  and let Jobelix apply to 50+ matching positions daily while you focus on what matters.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-sm text-default">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    AI-tailored resumes for each application
                  </li>
                  <li className="flex items-center gap-3 text-sm text-default">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    Smart form filling with your profile data
                  </li>
                  <li className="flex items-center gap-3 text-sm text-default">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    Apply 24/7 - even while you sleep
                  </li>
                </ul>
              </div>

              {/* Smart Matching Feature */}
              <div className="bg-gradient-to-br from-success-subtle/30 to-success-subtle/10 border border-success-subtle rounded-2xl p-8">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-success rounded-xl mb-6">
                  <Target className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-default mb-3">
                  Startup Matching
                </h3>
                <p className="text-muted mb-6">
                  Get discovered by France's top startups. Our AI matches your skills and preferences 
                  with companies actively hiring and they come to you with personalized opportunities.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-sm text-default">
                    <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                    Vetted startups with real funding
                  </li>
                  <li className="flex items-center gap-3 text-sm text-default">
                    <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                    AI-powered compatibility scoring
                  </li>
                  <li className="flex items-center gap-3 text-sm text-default">
                    <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                    Direct messages from hiring managers
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-24 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-default mb-4">
                Get Started in Minutes
              </h2>
              <p className="text-lg text-muted">
                From sign-up to your first applications - it's that simple.
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary text-white text-2xl font-bold rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  1
                </div>
                <h4 className="font-semibold text-default mb-2">Create Account</h4>
                <p className="text-sm text-muted">
                  Sign up for free and download our desktop app
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary text-white text-2xl font-bold rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  2
                </div>
                <h4 className="font-semibold text-default mb-2">Build Your Profile</h4>
                <p className="text-sm text-muted">
                  Upload your resume and our AI extracts everything automatically
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary text-white text-2xl font-bold rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  3
                </div>
                <h4 className="font-semibold text-default mb-2">Set Preferences</h4>
                <p className="text-sm text-muted">
                  Define your ideal role, salary, and work style
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary text-white text-2xl font-bold rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  4
                </div>
                <h4 className="font-semibold text-default mb-2">Launch & Match</h4>
                <p className="text-sm text-muted">
                  Start auto-applying and receive startup matches
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-default mb-4">
                Engineers Love Jobelix
              </h2>
              <p className="text-lg text-muted">
                Join thousands of developers who found their perfect role
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-warning fill-warning" />
                  ))}
                </div>
                <p className="text-default mb-4">
                  "Jobelix sent out 200 applications in a week. I got 15 interviews and landed a Senior role at a Series B startup. Incredible."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-subtle rounded-full flex items-center justify-center text-primary font-semibold">
                    ML
                  </div>
                  <div>
                    <div className="font-medium text-default">Marc L.</div>
                    <div className="text-sm text-muted">Senior Backend Engineer</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-warning fill-warning" />
                  ))}
                </div>
                <p className="text-default mb-4">
                  "The startup matching is amazing. A CTO reached out directly and I skipped 3 interview rounds. Best career move ever."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-success-subtle rounded-full flex items-center justify-center text-success font-semibold">
                    SC
                  </div>
                  <div>
                    <div className="font-medium text-default">Sophie C.</div>
                    <div className="text-sm text-muted">Full Stack Developer</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-warning fill-warning" />
                  ))}
                </div>
                <p className="text-default mb-4">
                  "As a junior, I was struggling to get responses. Jobelix's AI-optimized applications got me 8 interviews in 2 weeks."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-info-subtle rounded-full flex items-center justify-center text-info font-semibold">
                    AT
                  </div>
                  <div>
                    <div className="font-medium text-default">Antoine T.</div>
                    <div className="text-sm text-muted">Frontend Developer</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-24 px-6 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-default mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-lg text-muted">
                Everything you need to know about getting started.
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-background rounded-xl p-6 border border-border">
                <h4 className="font-semibold text-default mb-2">Is Jobelix really free?</h4>
                <p className="text-muted">
                  Yes. Creating an account and using the startup matching feature is completely free. 
                  The auto-apply bot requires the desktop app but has no additional cost.
                </p>
              </div>
              <div className="bg-background rounded-xl p-6 border border-border">
                <h4 className="font-semibold text-default mb-2">How does the auto-apply bot work?</h4>
                <p className="text-muted">
                  Our desktop app connects to LinkedIn and automatically applies to jobs matching your preferences. 
                  It fills forms with your profile data and can generate tailored cover letters.
                </p>
              </div>
              <div className="bg-background rounded-xl p-6 border border-border">
                <h4 className="font-semibold text-default mb-2">Will startups contact me directly?</h4>
                <p className="text-muted">
                  Yes. Once your profile is complete, our algorithm matches you with relevant startups. 
                  Hiring managers can reach out to you directly through the platform.
                </p>
              </div>
              <div className="bg-background rounded-xl p-6 border border-border">
                <h4 className="font-semibold text-default mb-2">Is the auto-apply bot safe to use?</h4>
                <p className="text-muted">
                  The bot is currently in beta. While we design it to respect platform guidelines, 
                  automated activity may carry some risk. Use at your own discretion.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Blog Section - Coming Soon */}
        <section id="blog" className="py-24 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-subtle/50 rounded-full text-sm font-medium text-primary mb-6">
              <Sparkles className="w-4 h-4" />
              Coming Soon
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-default mb-4">
              Jobelix Blog
            </h2>
            <p className="text-lg text-muted max-w-2xl mx-auto">
              Career tips, startup insights, and industry trends. 
              Our blog is launching soon. Stay tuned.
            </p>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-6 bg-gradient-to-r from-primary to-primary-hover">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Accelerate Your Career?
            </h2>
            <p className="text-xl text-white/80 mb-8">
              Join thousands of engineers discovering better opportunities with Jobelix.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/download"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-primary text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                <Rocket className="w-5 h-5" />
                Download Desktop App
              </Link>
              <Link
                href="/signup?role=student"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 border-2 border-white text-white text-lg font-semibold rounded-xl hover:bg-white/20 transition-all"
              >
                Create Free Account
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-6 bg-white border-t border-border">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Rocket className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-default">Jobelix</span>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted">
                <a href="#about" className="hover:text-default transition-colors cursor-pointer">About</a>
                <a href="#faq" className="hover:text-default transition-colors cursor-pointer">FAQ</a>
                <a href="#blog" className="hover:text-default transition-colors cursor-pointer">Blog</a>
                <Link href="/login" className="hover:text-default transition-colors">Sign In</Link>
                <Link href="/signup?role=student" className="hover:text-default transition-colors">Sign Up</Link>
                <Link href="/download" className="hover:text-default transition-colors">Download</Link>
              </div>
              <div className="text-sm text-muted">
                © 2026 Jobelix. All rights reserved.
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-border text-center">
              <p className="text-xs text-muted max-w-3xl mx-auto">
                <strong>Note:</strong> The auto-apply feature is currently in beta. Use is at your own discretion. 
                We are not responsible for any account restrictions resulting from its use.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
