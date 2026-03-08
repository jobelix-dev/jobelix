import { redirect } from 'next/navigation';

// Company dashboard is rendered inside /dashboard (role-based routing).
// Direct navigation to /dashboard/company redirects there.
export default function CompanyPage() {
  redirect('/dashboard');
}
