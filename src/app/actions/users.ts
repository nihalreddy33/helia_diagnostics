"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { withRole } from "@/lib/auth";
import { describePrismaError } from "@/lib/prisma-errors";
import { ROLES } from "@/lib/types";
import type { ActionResult, Role } from "@/lib/types";

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** ADMIN only — create a system user with a hashed password. */
export async function createUser(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "");

  if (!name) return { ok: false, error: "Name is required." };
  if (!validEmail(email)) return { ok: false, error: "Enter a valid email address." };
  if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
  if (!(ROLES as readonly string[]).includes(role)) {
    return { ok: false, error: "Select a valid role." };
  }

  try {
    const result = await withRole("ADMIN", async () => {
      const hash = await bcrypt.hash(password, 10);
      return prisma.user.create({
        data: { name, email, password: hash, role: role as Role },
        select: { id: true },
      });
    });
    if (result.ok) revalidatePath("/admin/users");
    return result;
  } catch (err) {
    return { ok: false, error: describePrismaError(err, "Could not create user.") };
  }
}

/** ADMIN only — update a user's name/role, optionally resetting the password. */
export async function updateUser(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!id) return { ok: false, error: "Missing user id." };
  if (!name) return { ok: false, error: "Name is required." };
  if (!(ROLES as readonly string[]).includes(role)) {
    return { ok: false, error: "Select a valid role." };
  }
  if (password && password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }

  try {
    const result = await withRole("ADMIN", async () => {
      const data: { name: string; role: Role; password?: string } = {
        name,
        role: role as Role,
      };
      if (password) data.password = await bcrypt.hash(password, 10);
      return prisma.user.update({ where: { id }, data, select: { id: true } });
    });
    if (result.ok) revalidatePath("/admin/users");
    return result;
  } catch (err) {
    return { ok: false, error: describePrismaError(err, "Could not update user.") };
  }
}
