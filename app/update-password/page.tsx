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
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Set New Password
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Enter your new password below.
          </p>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-8 shadow-sm">
          <UpdatePasswordForm />
        </div>
      </div>
    </div>
  )
}
