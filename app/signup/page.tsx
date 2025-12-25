import SignupForm from "./SignupForm";
import Header from "../components/Header";
import "../globals.css";

type SearchParams = Promise<{ role?: string } | undefined>;

export default async function SignupPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Await searchParams (Next.js 15 requirement)
  const params = await searchParams;
  // default to student if role is missing/invalid
  const role = params?.role === "company" ? "company" : "student";

  return (
    <div className="min-h-screen flex items-center justify-center p-12 bg-zinc-50 dark:bg-black">
      <Header />
      <div className="w-full max-w-md bg-white dark:bg-[#0b0b0b] p-8 rounded shadow">
        <h2 className="text-2xl font-semibold mb-4">
          {role === 'student' ? 'Join as a student' : 'Join as an Employer'}
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
          {role === 'student' 
            ? 'Create your account to start exploring job opportunities and connect with top employers.'
            : 'Create your account to post positions and discover exceptional talent.'}
        </p>

        <SignupForm role={role} />
      </div>
    </div>
  );
}
