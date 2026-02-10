/**
 * Terms of Service Page
 *
 * Terms and conditions for using Jobelix.
 * Route: /terms
 */

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import BackButton from "@/app/components/BackButton";
import {
  SITE_NAME,
  canonicalUrl,
  defaultOpenGraphImages,
  defaultTwitterImages,
} from "@/lib/seo";

const title = "Terms of Service";
const description =
  "Read the terms and conditions for using Jobelix, including user responsibilities, service limitations, and legal disclaimers.";
const canonical = canonicalUrl("/terms");

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

export default function TermsOfServicePage() {
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
            Terms of Service
          </h1>
          <p className="text-muted text-sm mb-8">
            Last updated: {lastUpdated}
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-default mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="text-muted leading-relaxed">
              Welcome to Jobelix. By accessing or using our website at
              jobelix.fr and our desktop application (collectively, the
              &quot;Service&quot;), you agree to be bound by these Terms of
              Service (&quot;Terms&quot;). If you do not agree to these Terms,
              please do not use our Service.
            </p>
            <p className="text-muted leading-relaxed mt-4">
              We reserve the right to modify these Terms at any time. We will
              notify you of material changes by posting the updated Terms on
              this page. Your continued use of the Service after changes
              constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-default mb-4">
              2. Description of Service
            </h2>
            <p className="text-muted leading-relaxed">
              Jobelix is a job platform that connects job seekers with
              employers. Our Service includes:
            </p>
            <ul className="list-disc list-inside text-muted space-y-2 mt-4">
              <li>AI-powered job matching based on your profile and preferences</li>
              <li>Resume parsing and profile building tools</li>
              <li>Automated job application features</li>
              <li>Job search and filtering capabilities</li>
              <li>Desktop application for enhanced functionality</li>
              <li>Credit-based system for premium features</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-default mb-4">
              3. User Accounts
            </h2>

            <h3 className="text-lg font-medium text-default mt-6 mb-3">
              3.1 Registration
            </h3>
            <p className="text-muted leading-relaxed">
              To access certain features of the Service, you must create an
              account. You may register using your email address or through
              third-party authentication providers (Google, LinkedIn, GitHub).
              You agree to provide accurate, current, and complete information
              during registration.
            </p>

            <h3 className="text-lg font-medium text-default mt-6 mb-3">
              3.2 Account Security
            </h3>
            <p className="text-muted leading-relaxed">
              You are responsible for maintaining the confidentiality of your
              account credentials and for all activities that occur under your
              account. You must notify us immediately of any unauthorized use of
              your account.
            </p>

            <h3 className="text-lg font-medium text-default mt-6 mb-3">
              3.3 Account Types
            </h3>
            <p className="text-muted leading-relaxed">
              We offer different account types for job seekers (students/talent)
              and employers (companies). Each account type has specific features
              and limitations. You may only maintain one account per type.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-default mb-4">
              4. User Responsibilities
            </h2>
            <p className="text-muted leading-relaxed mb-4">
              By using our Service, you agree to:
            </p>
            <ul className="list-disc list-inside text-muted space-y-2">
              <li>Provide accurate and truthful information in your profile and applications</li>
              <li>Use the Service only for lawful purposes</li>
              <li>Not impersonate any person or entity</li>
              <li>Not upload malicious code, viruses, or harmful content</li>
              <li>Not attempt to gain unauthorized access to our systems</li>
              <li>Not use the Service to harass, spam, or deceive others</li>
              <li>Not scrape, crawl, or extract data from the Service without permission</li>
              <li>Comply with all applicable laws and regulations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-default mb-4">
              5. Auto-Apply Feature
            </h2>
            <p className="text-muted leading-relaxed">
              Our Service includes an automated job application feature. By
              using this feature, you acknowledge and agree that:
            </p>
            <ul className="list-disc list-inside text-muted space-y-2 mt-4">
              <li>
                Applications are submitted on your behalf using the information
                you provide
              </li>
              <li>
                You are responsible for ensuring your profile information is
                accurate and up-to-date
              </li>
              <li>
                We cannot guarantee that applications will be received or
                considered by employers
              </li>
              <li>
                You should review and comply with the terms of service of
                third-party job platforms (e.g., LinkedIn) when using auto-apply
              </li>
              <li>
                Excessive or inappropriate use of auto-apply may result in
                account suspension
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-default mb-4">
              6. Credits and Payments
            </h2>

            <h3 className="text-lg font-medium text-default mt-6 mb-3">
              6.1 Credit System
            </h3>
            <p className="text-muted leading-relaxed">
              Certain features of the Service require credits. Credits can be
              purchased through our platform and are used to access premium
              features such as automated job applications.
            </p>

            <h3 className="text-lg font-medium text-default mt-6 mb-3">
              6.2 Purchases
            </h3>
            <p className="text-muted leading-relaxed">
              All purchases are processed through Stripe. By making a purchase,
              you agree to Stripe&apos;s terms of service. Prices are displayed
              in the applicable currency and may include taxes.
            </p>

            <h3 className="text-lg font-medium text-default mt-6 mb-3">
              6.3 Refunds
            </h3>
            <p className="text-muted leading-relaxed">
              Credits are non-refundable except where required by law. If you
              experience technical issues that prevent you from using purchased
              credits, please contact our support team.
            </p>

            <h3 className="text-lg font-medium text-default mt-6 mb-3">
              6.4 Free Credits
            </h3>
            <p className="text-muted leading-relaxed">
              We may offer free credits for promotional purposes. Free credits
              may have expiration dates and cannot be exchanged for cash.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-default mb-4">
              7. Intellectual Property
            </h2>

            <h3 className="text-lg font-medium text-default mt-6 mb-3">
              7.1 Our Content
            </h3>
            <p className="text-muted leading-relaxed">
              The Service, including its design, features, code, and content
              (excluding user-generated content), is owned by Jobelix and
              protected by copyright, trademark, and other intellectual property
              laws. You may not copy, modify, distribute, or create derivative
              works without our written permission.
            </p>

            <h3 className="text-lg font-medium text-default mt-6 mb-3">
              7.2 Your Content
            </h3>
            <p className="text-muted leading-relaxed">
              You retain ownership of content you upload to the Service (e.g.,
              resumes, profile information). By uploading content, you grant us
              a non-exclusive, worldwide, royalty-free license to use, display,
              and process your content as necessary to provide the Service.
            </p>

            <h3 className="text-lg font-medium text-default mt-6 mb-3">
              7.3 Feedback
            </h3>
            <p className="text-muted leading-relaxed">
              If you provide feedback or suggestions about the Service, you
              grant us the right to use such feedback without compensation or
              attribution.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-default mb-4">
              8. Third-Party Services
            </h2>
            <p className="text-muted leading-relaxed">
              Our Service integrates with third-party services including Google,
              LinkedIn, GitHub, Stripe, and others. Your use of these services
              is subject to their respective terms of service and privacy
              policies. We are not responsible for the practices of third-party
              services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-default mb-4">
              9. Disclaimer of Warranties
            </h2>
            <p className="text-muted leading-relaxed">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS
              AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR
              IMPLIED. WE DO NOT WARRANT THAT:
            </p>
            <ul className="list-disc list-inside text-muted space-y-2 mt-4">
              <li>The Service will be uninterrupted, error-free, or secure</li>
              <li>Any defects will be corrected</li>
              <li>The Service will meet your specific requirements</li>
              <li>Job applications will result in employment</li>
              <li>AI matching will be accurate or suitable for your needs</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-default mb-4">
              10. Limitation of Liability
            </h2>
            <p className="text-muted leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, JOBELIX SHALL NOT BE
              LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
              PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS,
              DATA, OR EMPLOYMENT OPPORTUNITIES, ARISING FROM YOUR USE OF THE
              SERVICE.
            </p>
            <p className="text-muted leading-relaxed mt-4">
              Our total liability for any claims arising from or related to the
              Service shall not exceed the amount you paid to us in the twelve
              (12) months preceding the claim.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-default mb-4">
              11. Indemnification
            </h2>
            <p className="text-muted leading-relaxed">
              You agree to indemnify, defend, and hold harmless Jobelix and its
              officers, directors, employees, and agents from any claims,
              liabilities, damages, losses, or expenses arising from your use of
              the Service, your violation of these Terms, or your violation of
              any rights of another party.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-default mb-4">
              12. Termination
            </h2>
            <p className="text-muted leading-relaxed">
              We may suspend or terminate your account at any time for any
              reason, including violation of these Terms. Upon termination, your
              right to use the Service ceases immediately. Unused credits may be
              forfeited upon termination for cause.
            </p>
            <p className="text-muted leading-relaxed mt-4">
              You may terminate your account at any time by contacting us or
              using the account deletion feature. Some provisions of these Terms
              will survive termination, including intellectual property rights,
              disclaimers, and limitations of liability.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-default mb-4">
              13. Governing Law and Disputes
            </h2>
            <p className="text-muted leading-relaxed">
              These Terms are governed by the laws of France, without regard to
              conflict of law principles. Any disputes arising from these Terms
              or your use of the Service shall be resolved in the courts of
              France. If you are a consumer in the European Union, you may also
              bring proceedings in the courts of your country of residence.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-default mb-4">
              14. Severability
            </h2>
            <p className="text-muted leading-relaxed">
              If any provision of these Terms is found to be unenforceable or
              invalid, that provision shall be limited or eliminated to the
              minimum extent necessary, and the remaining provisions shall
              remain in full force and effect.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-default mb-4">
              15. Entire Agreement
            </h2>
            <p className="text-muted leading-relaxed">
              These Terms, together with our Privacy Policy, constitute the
              entire agreement between you and Jobelix regarding the use of the
              Service and supersede any prior agreements.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-default mb-4">
              16. Contact Us
            </h2>
            <p className="text-muted leading-relaxed">
              If you have any questions about these Terms, please contact us:
            </p>
            <div className="mt-4 p-4 bg-surface rounded-lg border border-border/30">
              <p className="text-default font-medium">Jobelix</p>
              <p className="text-muted mt-2">
                Email:{" "}
                <a
                  href="mailto:legal@jobelix.fr"
                  className="text-primary hover:underline"
                >
                  legal@jobelix.fr
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
          </section>
        </article>

        {/* Back button */}
        <div className="mt-12 pt-8 border-t border-border/30">
          <BackButton />
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
