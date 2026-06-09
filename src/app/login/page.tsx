import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { HOME_BY_ROLE } from "@/lib/nav";
import { LoginForm } from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Already signed in? Skip the form.
  const user = await getCurrentUser();
  if (user) redirect(HOME_BY_ROLE[user.role]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
          H
        </span>
        <h1 className="mt-3 text-xl font-bold text-slate-900">Helia Diagnostics</h1>
        <p className="text-sm text-slate-500">Sign in to your account</p>
      </div>

      <div className="card p-6">
        <LoginForm />
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        Accounts are created by an administrator.
      </p>
    </div>
  );
}
