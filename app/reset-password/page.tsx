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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Reset Password</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <div className="rounded-lg border bg-white p-8 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
          <ResetPasswordForm />
        </div>

        <div className="text-center text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">Remember your password? </span>
          <a href="/login" className="font-medium text-foreground hover:underline">
            Sign in
          </a>
        </div>
      </div>
    </div>
  )
}
