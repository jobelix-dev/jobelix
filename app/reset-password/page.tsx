/**
 * Reset Password Request Page
 * 
 * Allows users to request a password reset email.
 * User enters their email, receives a reset link via email.
 */

import ResetPasswordForm from './ResetPasswordForm'

export const metadata = {
  title: 'Reset Password',
  description: 'Reset your Jobelix account password',
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-default">
            Reset Password
          </h1>
          <p className="mt-2 text-sm text-muted">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <div className="bg-gradient-to-r from-primary-subtle to-info-subtle/20/20 border border-primary-subtle rounded-lg p-8 shadow-sm">
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
