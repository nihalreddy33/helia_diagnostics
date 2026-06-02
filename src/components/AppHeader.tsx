import Link from "next/link";
import { getActiveRole } from "@/lib/session";
import { ROLE_LABELS } from "@/lib/types";
import type { Role } from "@/lib/types";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { NavLink } from "@/components/NavLink";

// Which nav destinations each role sees. Admin sees everything.
const NAV_BY_ROLE: Record<Role, { href: string; label: string }[]> = {
  RECEPTION: [{ href: "/reception", label: "Reception" }],
  RADIOLOGIST: [{ href: "/radiologist", label: "Reporting" }],
  ADMIN: [
    { href: "/admin", label: "Review Queue" },
    { href: "/archive", label: "Archive" },
  ],
};

export async function AppHeader() {
  const activeRole = await getActiveRole();
  const links = NAV_BY_ROLE[activeRole];

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            H
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-slate-900">Helia Diagnostics</div>
            <div className="text-xs text-slate-500">Reporting Platform</div>
          </div>
        </Link>

        <nav className="flex items-center gap-1" aria-label="Primary">
          {links.map((l) => (
            <NavLink key={l.href} href={l.href}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-xs text-slate-500 sm:inline">
            Acting as <span className="font-medium text-slate-700">{ROLE_LABELS[activeRole]}</span>
          </span>
          <RoleSwitcher activeRole={activeRole} />
        </div>
      </div>
    </header>
  );
}
