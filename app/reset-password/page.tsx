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
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Reset Password
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-8 shadow-sm">
          <ResetPasswordForm />
        </div>

        <div className="text-center text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">Remember your password? </span>
          <a href="/login" className="font-medium text-purple-600 dark:text-purple-400 hover:underline">
            Sign in
          </a>
        </div>
      </div>
    </div>
  )
}
