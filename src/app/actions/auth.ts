"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, getCurrentUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { HOME_BY_ROLE } from "@/lib/nav";
import type { ActionResult } from "@/lib/types";

/**
 * Authenticate with email + password. On success, starts a session and
 * redirects the user to their role's home area. On failure, returns a generic
 * error (no user-enumeration leak).
 */
export async function login(
  _prev: (ActionResult & { key: number }) | null,
  formData: FormData,
): Promise<(ActionResult & { key: number }) | null> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { ok: false, error: "Enter your email and password.", key: Date.now() };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user && (await bcrypt.compare(password, user.password));
  if (!user || !valid) {
    return { ok: false, error: "Invalid email or password.", key: Date.now() };
  }

  await createSession(user.id);
  await logActivity({ id: user.id, name: user.name, role: user.role }, "LOGIN");
  redirect(HOME_BY_ROLE[user.role]); // throws NEXT_REDIRECT — never returns
}

/** End the current session and return to the login screen. */
export async function logout(): Promise<void> {
  const user = await getCurrentUser();
  if (user) {
    await logActivity({ id: user.id, name: user.name, role: user.role }, "LOGOUT");
  }
  await destroySession();
  redirect("/login");
}
