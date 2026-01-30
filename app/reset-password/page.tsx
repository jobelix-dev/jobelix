/**
 * Reset Password Request Page
 * 
 * Allows users to request a password reset email.
 * User enters their email, receives a reset link via email.
 */

import type { Metadata } from "next";
import ResetPasswordForm from './ResetPasswordForm'
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Reset your Jobelix account password.",
  alternates: {
    canonical: canonicalUrl("/reset-password"),
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-8 md:p-12">
      <div className="w-full max-w-md space-y-4 sm:space-y-6">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-default">
            Reset Password
          </h1>
          <p className="mt-2 text-sm text-muted">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        <div className="bg-gradient-to-r from-primary-subtle to-info-subtle/20/20 border border-primary-subtle rounded-lg p-4 sm:p-6 md:p-8 shadow-sm">
          <ResetPasswordForm />
        </div>

        <div className="text-center text-sm">
          <span className="text-muted">Remember your password? </span>
          <a href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </a>
        </div>
      </div>
    </div>
  )
}
