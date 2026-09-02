import type { Role } from "@/lib/types";

export type NavItem = {
  href: string;
  label: string;
  /** Match this link's active state exactly (for section-root links whose href
   *  is a prefix of sibling routes, e.g. "/radiologist" vs "/radiologist/print"). */
  exact?: boolean;
};

/** Destinations each role sees in the primary nav. */
export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  ADMIN: [
    { href: "/admin/users", label: "Users" },
    { href: "/admin/services", label: "Services" },
    { href: "/admin/templates", label: "Templates" },
    { href: "/admin/lab-templates", label: "Lab Tests" },
    { href: "/admin/referring-doctors", label: "Doctors" },
    { href: "/admin/referrals", label: "Referrals" },
    { href: "/admin/finance", label: "Financial" },
    { href: "/admin/activity", label: "Activity" },
    { href: "/admin/records", label: "Records" },
  ],
  RECEPTIONIST: [
    { href: "/receptionist", label: "Register", exact: true },
    { href: "/receptionist/billing", label: "Billing" },
    { href: "/receptionist/bills", label: "Bills" },
    { href: "/receptionist/dues", label: "Dues" },
    { href: "/receptionist/collection", label: "Collection" },
    { href: "/receptionist/print", label: "Print Hub" },
  ],
  RADIOLOGIST: [
    { href: "/radiologist", label: "Worklist", exact: true },
    { href: "/radiologist/print", label: "Print Hub" },
  ],
  LAB_TECHNICIAN: [{ href: "/lab", label: "Worklist" }],
};

export const HOME_BY_ROLE: Record<Role, string> = {
  ADMIN: "/admin/users",
  RECEPTIONIST: "/receptionist",
  RADIOLOGIST: "/radiologist",
  LAB_TECHNICIAN: "/lab",
};
