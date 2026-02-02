/**
 * Landing Page Data
 * 
 * Static data for the landing page sections.
 */

import { Send, Users, TrendingUp, Clock, LucideIcon } from "lucide-react";

// Testimonials data
export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  company: string;
  initials: string;
  accentColor: 'primary' | 'success';
}

export const testimonials: Testimonial[] = [
  {
    quote: "Jobelix applied to 180 jobs in my first week. I got 12 interviews and accepted an offer at a Series B startup. The AI-tailored resumes actually work.",
    name: "Marc L.",
    role: "Senior Backend Engineer",
    company: "Now at Doctolib",
    initials: "ML",
    accentColor: "primary",
  },
  {
    quote: "The employer matching is incredible. A VP of Engineering reached out directly - I skipped the recruiter screen entirely. Game changer for senior roles.",
    name: "Sophie C.",
    role: "Staff Engineer",
    company: "Previously at Datadog",
    initials: "SC",
    accentColor: "success",
  },
  {
    quote: "As a bootcamp grad, getting callbacks was impossible. Jobelix sent 200+ applications with tailored cover letters. Landed my first dev job in 3 weeks.",
    name: "Antoine T.",
    role: "Frontend Developer",
    company: "Now at Alan",
    initials: "AT",
    accentColor: "primary",
  },
];

// Stats data with icons
export interface Stat {
  value: string;
  label: string;
  icon: LucideIcon;
}

export const stats: Stat[] = [
  { value: "47,000+", label: "Applications Sent", icon: Send },
  { value: "3,200+", label: "Active Users", icon: Users },
  { value: "34%", label: "Get Interviews", icon: TrendingUp },
  { value: "15hrs", label: "Saved Per Week", icon: Clock },
];

// Steps data
export interface Step {
  num: string;
  title: string;
  desc: string;
}

export const steps: Step[] = [
  { num: "1", title: "Create Account", desc: "Sign up for free and download our desktop app" },
  { num: "2", title: "Build Your Profile", desc: "Upload your resume - our AI extracts everything automatically" },
  { num: "3", title: "Set Preferences", desc: "Define your ideal role, salary, and work style" },
  { num: "4", title: "Launch & Match", desc: "Start auto-applying and receive employer matches" },
];

// FAQ data
export interface FAQ {
  q: string;
  a: string;
}

export const faqs: FAQ[] = [
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

// Feature list items
export const autoApplyFeatures = [
  "AI-tailored resumes for each application",
  "Smart form filling with your profile data",
  "Apply 24/7 - even while you sleep",
];

export const employerMatchingFeatures = [
  "Vetted employers with real opportunities",
  "AI-powered compatibility scoring",
  "Direct messages from hiring managers",
];
