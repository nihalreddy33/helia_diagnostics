import { cookies } from "next/headers";
import crypto from "node:crypto";
import type { Role, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "helia_session";

// Secret used to sign the session cookie. Set APP_SECRET in the environment for
// production; the dev fallback keeps local setup zero-config but is not secret.
const SECRET = process.env.APP_SECRET ?? "helia-dev-insecure-secret-change-me";

function sign(value: string): string {
  const sig = crypto.createHmac("sha256", SECRET).update(value).digest("base64url");
  return `${value}.${sig}`;
}

/** Verify a signed token and return the embedded value, or null if tampered. */
function unsign(token: string | undefined): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const value = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac("sha256", SECRET).update(value).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return value;
}

/** Start an authenticated session for `userId` (signed, httpOnly cookie). */
export async function createSession(userId: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, sign(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Resolve the currently authenticated user from the session cookie. */
export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const userId = unsign(store.get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  try {
    return await prisma.user.findUnique({ where: { id: userId } });
  } catch {
    return null;
  }
}

export async function getActiveRole(): Promise<Role | null> {
  const user = await getCurrentUser();
  return user?.role ?? null;
}
