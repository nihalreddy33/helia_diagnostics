import type { Role } from "@/lib/types";

export type NavItem = { href: string; label: string };

/** Destinations each role sees in the primary nav. */
export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  ADMIN: [
    { href: "/admin/users", label: "Users" },
    { href: "/admin/services", label: "Services" },
    { href: "/admin/templates", label: "Templates" },
    { href: "/admin/records", label: "Records" },
  ],
  RECEPTIONIST: [
    { href: "/receptionist", label: "Register" },
    { href: "/receptionist/billing", label: "Billing" },
    { href: "/receptionist/print", label: "Print Hub" },
  ],
  RADIOLOGIST: [{ href: "/radiologist", label: "Worklist" }],
};

export const HOME_BY_ROLE: Record<Role, string> = {
  ADMIN: "/admin/users",
  RECEPTIONIST: "/receptionist",
  RADIOLOGIST: "/radiologist",
};
