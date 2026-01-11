/**
 * Update Password Page
 * 
 * Page where users set their new password after clicking reset link.
 * Accessed via email link with recovery token.
 */

import UpdatePasswordForm from './UpdatePasswordForm'

export const metadata = {
  title: 'Update Password',
  description: 'Set your new password',
}

export default function UpdatePasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Set New Password</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Enter your new password below.
          </p>
        </div>

        <div className="rounded-lg border bg-white p-8 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
          <UpdatePasswordForm />
        </div>
      </div>
    </div>
  )
}
