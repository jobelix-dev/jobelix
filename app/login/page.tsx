import LoginForm from "./LoginForm";
import "../globals.css";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-12 bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md bg-white dark:bg-[#0b0b0b] p-8 rounded shadow">
        <h2 className="text-2xl font-semibold mb-4">Log in to Jobelix</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
          Enter your credentials to access your account.
        </p>

        <LoginForm />

        <div className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Don't have an account?{' '}
          <Link href="/" className="text-foreground hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
