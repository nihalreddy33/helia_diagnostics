import type { Role, User } from "@prisma/client";
import { getCurrentUser } from "@/lib/session";

/**
 * Thrown by `requireRole` when the active session does not satisfy the
 * required role. Server actions catch this and convert it into a friendly
 * `ActionResult` error rather than crashing the request.
 */
export class AuthorizationError extends Error {
  constructor(message = "You are not authorized to perform this action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Server-side RBAC gate. Resolves the executing user and asserts their role is
 * one of `allowed`, throwing `AuthorizationError` otherwise. Every mutating
 * server action calls this BEFORE touching the database.
 */
export async function requireRole(
  allowed: Role | Role[],
): Promise<User> {
  const allowedRoles = Array.isArray(allowed) ? allowed : [allowed];
  const user = await getCurrentUser();

  if (!user) {
    throw new AuthorizationError("No active session. Please sign in.");
  }
  if (!allowedRoles.includes(user.role)) {
    throw new AuthorizationError(
      `This action requires the ${allowedRoles.join(" or ")} role.`,
    );
  }
  return user;
}

/**
 * Run a mutation under an RBAC gate, returning a uniform `ActionResult`.
 * Centralizes auth + error handling so individual actions stay declarative.
 */
export async function withRole<T>(
  allowed: Role | Role[],
  fn: (user: User) => Promise<T>,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const user = await requireRole(allowed);
    const data = await fn(user);
    return { ok: true, data };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { ok: false, error: err.message };
    }
    throw err; // Let domain handlers (e.g. Prisma constraint mapping) deal with it.
  }
}
