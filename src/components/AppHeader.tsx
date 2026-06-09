import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { logout } from "@/app/actions/auth";
import { ROLE_LABELS } from "@/lib/types";
import { NAV_BY_ROLE, HOME_BY_ROLE } from "@/lib/nav";
import { NavLink } from "@/components/NavLink";
import { BrandLogo } from "@/components/BrandLogo";

export async function AppHeader() {
  const user = await getCurrentUser();

  // Logged out (e.g. the /login route): render no app chrome.
  if (!user) return null;

  const links = NAV_BY_ROLE[user.role];

  return (
    <header className="no-print border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
        <Link href={HOME_BY_ROLE[user.role]} className="flex items-center" aria-label="Helia Diagnostics home">
          <BrandLogo variant="header" />
        </Link>

        <nav className="flex items-center gap-1" aria-label="Primary">
          {links.map((l) => (
            <NavLink key={l.href} href={l.href}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-sm font-medium text-slate-700">{user.name}</div>
            <div className="text-xs text-slate-400">{ROLE_LABELS[user.role]}</div>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 hover:text-slate-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
