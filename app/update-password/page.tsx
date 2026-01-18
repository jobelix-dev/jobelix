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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-default">
            Set New Password
          </h1>
          <p className="mt-2 text-sm text-muted">
            Enter your new password below.
          </p>
        </div>

        <div className="bg-gradient-to-r from-primary-subtle to-info-subtle/20/20 border border-primary-subtle rounded-lg p-8 shadow-sm">
          <UpdatePasswordForm />
        </div>
      </div>
    </div>
  )
}
