/**
 * Update Password Page
 * 
 * Page where users set their new password after clicking reset link.
 * Accessed via email link with recovery token.
 */

import type { Metadata } from "next";
import UpdatePasswordForm from './UpdatePasswordForm'
import AppFooter from "../components/AppFooter";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Update Password",
  description: "Set a new password for your Jobelix account.",
  alternates: {
    canonical: canonicalUrl("/update-password"),
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function UpdatePasswordPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 md:p-12">
        <div className="w-full max-w-md space-y-4 sm:space-y-6">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-default">
              Set New Password
            </h1>
            <p className="mt-2 text-sm text-muted">
              Enter your new password below.
            </p>
          </div>

          <div className="bg-gradient-to-r from-primary-subtle to-info-subtle/20/20 border border-primary-subtle rounded-lg p-4 sm:p-6 md:p-8 shadow-sm">
            <UpdatePasswordForm />
          </div>
        </div>
      </div>
      <AppFooter />
    </div>
  )
}
