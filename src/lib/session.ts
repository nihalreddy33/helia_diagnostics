import { cookies } from "next/headers";
import type { Role, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/types";

const ROLE_COOKIE = "helia_role";
const DEFAULT_ROLE: Role = "RECEPTIONIST";

function isRole(value: string | undefined): value is Role {
  return !!value && (ROLES as readonly string[]).includes(value);
}

/**
 * Mock auth: the "logged in" role is stored in a cookie so it survives
 * navigation and server-action revalidation. In production this would be a
 * real session derived from credentials (the User.password column exists for
 * exactly that future).
 */
export async function getActiveRole(): Promise<Role> {
  const store = await cookies();
  const value = store.get(ROLE_COOKIE)?.value;
  return isRole(value) ? value : DEFAULT_ROLE;
}

export async function setActiveRole(role: Role): Promise<void> {
  const store = await cookies();
  store.set(ROLE_COOKIE, role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

/**
 * Resolve a representative seeded user for the active role. Mock-auth stand-in
 * for "the currently authenticated user".
 */
export async function getCurrentUser(): Promise<User | null> {
  const role = await getActiveRole();
  return prisma.user.findFirst({
    where: { role },
    orderBy: { createdAt: "asc" },
  });
}
