/**
 * Privacy Policy Page
 *
 * GDPR-compliant privacy policy for Jobelix.
 * Route: /privacy
 */

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  SITE_NAME,
  canonicalUrl,
  defaultOpenGraphImages,
  defaultTwitterImages,
} from "@/lib/seo";

const title = "Privacy Policy";
const description =
  "Learn how Jobelix collects, uses, and protects your personal information. We are committed to your privacy and GDPR compliance.";
const canonical = canonicalUrl("/privacy");

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

export default function PrivacyPolicyPage() {
  const lastUpdated = "February 5, 2026";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/30 bg-surface/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link href="/" className="flex items-center gap-2 group w-fit">
            <Image
              src="/icon.png"
              alt="Jobelix"
              width={28}
              height={28}
              className="rounded-lg transition-transform duration-300 group-hover:scale-110"
            />
            <span className="text-lg font-bold text-default">Jobelix</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <article className="prose prose-neutral dark:prose-invert max-w-none">
          <h1 className="text-3xl font-bold text-default mb-2">
            Privacy Policy
          </h1>
          <p className="text-muted text-sm mb-8">
            Last updated: {lastUpdated}
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-default mb-4">
              1. Introduction
            </h2>
            <p className="text-muted leading-relaxed">
              Jobelix (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;)
              respects your privacy and is committed to protecting your personal
              data. This privacy policy explains how we collect, use, disclose,
              and safeguard your information when you use our website at
              jobelix.fr and our desktop application (collectively, the
              &quot;Service&quot;).
            </p>
            <p className="text-muted leading-relaxed mt-4">
              We comply with the General Data Protection Regulation (GDPR) and
              other applicable data protection laws. By using our Service, you
              agree to the collection and use of information in accordance with
              this policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-default mb-4">
              2. Information We Collect
            </h2>

            <h3 className="text-lg font-medium text-default mt-6 mb-3">
              2.1 Information You Provide
            </h3>
            <ul className="list-disc list-inside text-muted space-y-2">
              <li>
                <strong>Account Information:</strong> Email address, password,
                and profile details when you create an account
              </li>
              <li>
                <strong>Profile Data:</strong> Resume/CV, work experience,
                education, skills, and job preferences
              </li>
              <li>
                <strong>OAuth Data:</strong> When you sign in with Google,
                LinkedIn, or GitHub, we receive your name, email, and profile
                picture from these providers
              </li>
              <li>
                <strong>Communication Data:</strong> Messages and feedback you
                send to us
              </li>
            </ul>

            <h3 className="text-lg font-medium text-default mt-6 mb-3">
              2.2 Information Collected Automatically
            </h3>
            <ul className="list-disc list-inside text-muted space-y-2">
              <li>
                <strong>Usage Data:</strong> Pages visited, features used, and
                actions taken within the Service
              </li>
              <li>
                <strong>Device Information:</strong> Browser type, operating
                system, and device identifiers
              </li>
              <li>
                <strong>Log Data:</strong> IP address, access times, and
                referring URLs
              </li>
            </ul>

            <h3 className="text-lg font-medium text-default mt-6 mb-3">
              2.3 Third-Party Data
            </h3>
            <p className="text-muted leading-relaxed">
              If you connect your GitHub account, we may access your public
              profile information and repositories to help build your
              professional profile. You control which data is imported and can
              disconnect at any time.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-default mb-4">
              3. How We Use Your Information
            </h2>
            <p className="text-muted leading-relaxed mb-4">
              We use your information for the following purposes:
            </p>
            <ul className="list-disc list-inside text-muted space-y-2">
              <li>
                <strong>Service Delivery:</strong> To provide, maintain, and
                improve our job matching and auto-apply features
              </li>
              <li>
                <strong>AI Matching:</strong> To analyze your profile and match
                you with relevant job opportunities
              </li>
              <li>
                <strong>Account Management:</strong> To manage your account,
                process transactions, and provide customer support
              </li>
              <li>
                <strong>Communication:</strong> To send service updates,
                security alerts, and marketing communications (with your
                consent)
              </li>
              <li>
                <strong>Analytics:</strong> To understand how users interact
                with our Service and improve user experience
              </li>
              <li>
                <strong>Legal Compliance:</strong> To comply with legal
                obligations and protect our rights
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-default mb-4">
              4. Legal Basis for Processing (GDPR)
            </h2>
            <p className="text-muted leading-relaxed mb-4">
              Under GDPR, we process your personal data based on the following
              legal grounds:
            </p>
            <ul className="list-disc list-inside text-muted space-y-2">
              <li>
                <strong>Contract Performance:</strong> Processing necessary to
                provide you with our Service
              </li>
              <li>
                <strong>Consent:</strong> Where you have given explicit consent
                (e.g., marketing emails, OAuth connections)
              </li>
              <li>
                <strong>Legitimate Interests:</strong> For analytics, security,
                and service improvement, where your rights do not override our
                interests
              </li>
              <li>
                <strong>Legal Obligation:</strong> When required by law
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-default mb-4">
              5. Data Sharing and Disclosure
            </h2>
            <p className="text-muted leading-relaxed mb-4">
              We do not sell your personal data. We may share your information
              with:
            </p>
            <ul className="list-disc list-inside text-muted space-y-2">
              <li>
                <strong>Employers:</strong> When you apply for jobs through our
                platform, your profile information is shared with the respective
                employers
              </li>
              <li>
                <strong>Service Providers:</strong> Third-party vendors who
                assist with hosting (Supabase, Vercel), payment processing
                (Stripe), and analytics
              </li>
              <li>
                <strong>Legal Requirements:</strong> When required by law,
                court order, or governmental authority
              </li>
              <li>
                <strong>Business Transfers:</strong> In connection with a
                merger, acquisition, or sale of assets
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-default mb-4">
              6. Data Retention
            </h2>
            <p className="text-muted leading-relaxed">
              We retain your personal data only for as long as necessary to
              fulfill the purposes outlined in this policy, unless a longer
              retention period is required by law. When you delete your account,
              we will delete or anonymize your personal data within 30 days,
              except where we are legally required to retain it.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-default mb-4">
              7. Your Rights (GDPR)
            </h2>
            <p className="text-muted leading-relaxed mb-4">
              Under GDPR, you have the following rights regarding your personal
              data:
            </p>
            <ul className="list-disc list-inside text-muted space-y-2">
              <li>
                <strong>Access:</strong> Request a copy of your personal data
              </li>
              <li>
                <strong>Rectification:</strong> Request correction of inaccurate
                data
              </li>
              <li>
                <strong>Erasure:</strong> Request deletion of your data
                (&quot;right to be forgotten&quot;)
              </li>
              <li>
                <strong>Restriction:</strong> Request limitation of processing
              </li>
              <li>
                <strong>Portability:</strong> Request your data in a
                machine-readable format
              </li>
              <li>
                <strong>Objection:</strong> Object to processing based on
                legitimate interests
              </li>
              <li>
                <strong>Withdraw Consent:</strong> Withdraw consent at any time
                where processing is based on consent
              </li>
            </ul>
            <p className="text-muted leading-relaxed mt-4">
              To exercise these rights, please contact us at{" "}
              <a
                href="mailto:privacy@jobelix.fr"
                className="text-primary hover:underline"
              >
                privacy@jobelix.fr
              </a>
              . We will respond within 30 days.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-default mb-4">
              8. Data Security
            </h2>
            <p className="text-muted leading-relaxed">
              We implement appropriate technical and organizational measures to
              protect your personal data against unauthorized access, alteration,
              disclosure, or destruction. These measures include encryption in
              transit (TLS/SSL), secure data storage, access controls, and
              regular security assessments. However, no method of transmission
              over the Internet is 100% secure.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-default mb-4">
              9. International Data Transfers
            </h2>
            <p className="text-muted leading-relaxed">
              Your data may be transferred to and processed in countries outside
              the European Economic Area (EEA). When we transfer data outside
              the EEA, we ensure appropriate safeguards are in place, such as
              Standard Contractual Clauses approved by the European Commission.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-default mb-4">
              10. Cookies and Tracking
            </h2>
            <p className="text-muted leading-relaxed">
              We use essential cookies to operate our Service and analytics
              cookies to understand usage patterns. You can control cookie
              preferences through your browser settings. For more information,
              see our cookie settings in the application.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-default mb-4">
              11. Third-Party Services
            </h2>
            <p className="text-muted leading-relaxed mb-4">
              Our Service integrates with third-party services, each with their
              own privacy policies:
            </p>
            <ul className="list-disc list-inside text-muted space-y-2">
              <li>
                <strong>Supabase:</strong> Database and authentication (
                <a
                  href="https://supabase.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Privacy Policy
                </a>
                )
              </li>
              <li>
                <strong>Stripe:</strong> Payment processing (
                <a
                  href="https://stripe.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Privacy Policy
                </a>
                )
              </li>
              <li>
                <strong>Vercel:</strong> Hosting and analytics (
                <a
                  href="https://vercel.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Privacy Policy
                </a>
                )
              </li>
              <li>
                <strong>OpenAI:</strong> AI processing for resume parsing (
                <a
                  href="https://openai.com/privacy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Privacy Policy
                </a>
                )
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-default mb-4">
              12. Children&apos;s Privacy
            </h2>
            <p className="text-muted leading-relaxed">
              Our Service is not intended for individuals under 16 years of age.
              We do not knowingly collect personal data from children. If you
              believe we have collected data from a child, please contact us
              immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-default mb-4">
              13. Changes to This Policy
            </h2>
            <p className="text-muted leading-relaxed">
              We may update this privacy policy from time to time. We will
              notify you of any material changes by posting the new policy on
              this page and updating the &quot;Last updated&quot; date. We
              encourage you to review this policy periodically.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-default mb-4">
              14. Contact Us
            </h2>
            <p className="text-muted leading-relaxed">
              If you have any questions about this privacy policy or our data
              practices, please contact us:
            </p>
            <div className="mt-4 p-4 bg-surface rounded-lg border border-border/30">
              <p className="text-default font-medium">Jobelix</p>
              <p className="text-muted mt-2">
                Email:{" "}
                <a
                  href="mailto:privacy@jobelix.fr"
                  className="text-primary hover:underline"
                >
                  privacy@jobelix.fr
                </a>
              </p>
              <p className="text-muted">
                Website:{" "}
                <a
                  href="https://www.jobelix.fr"
                  className="text-primary hover:underline"
                >
                  www.jobelix.fr
                </a>
              </p>
            </div>
            <p className="text-muted leading-relaxed mt-4">
              You also have the right to lodge a complaint with a supervisory
              authority, in particular in the EU Member State of your habitual
              residence, place of work, or place of the alleged infringement.
            </p>
          </section>
        </article>

        {/* Back to home */}
        <div className="mt-12 pt-8 border-t border-border/30">
          <Link
            href="/"
            className="text-primary hover:underline inline-flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Home
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 py-6 px-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} Jobelix. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/terms"
              className="text-xs text-muted hover:text-primary transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              className="text-xs text-muted hover:text-primary transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
