import { redirect } from "next/navigation";
import type { Role, User } from "@prisma/client";
import { getCurrentUser } from "@/lib/session";
import { HOME_BY_ROLE } from "@/lib/nav";

/**
 * Page-level guard: ensure someone is logged in, else send them to /login.
 * Returns the authenticated user (redirect() never returns).
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Page-level guard: ensure the logged-in user has `role`. Wrong role is sent to
 * their own home area; logged-out users go to /login.
 */
export async function requireRolePage(role: Role): Promise<User> {
  const user = await requireUser();
  if (user.role !== role) redirect(HOME_BY_ROLE[user.role]);
  return user;
}
