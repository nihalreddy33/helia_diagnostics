"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withRole } from "@/lib/auth";
import { describePrismaError } from "@/lib/prisma-errors";
import type { ActionResult } from "@/lib/types";

/** ADMIN only — create or update a referring doctor (billing suggestion list). */
export async function saveReferringDoctor(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const id = String(formData.get("id") ?? "").trim() || undefined;
  const name = String(formData.get("name") ?? "").trim();
  const active = formData.get("active") !== null;

  if (!name) return { ok: false, error: "Doctor name is required." };

  try {
    const result = await withRole("ADMIN", async () => {
      const data = { name, active };
      return id
        ? prisma.referringDoctor.update({ where: { id }, data, select: { id: true } })
        : prisma.referringDoctor.create({ data, select: { id: true } });
    });
    if (result.ok) {
      revalidatePath("/admin/referring-doctors");
      revalidatePath("/receptionist/billing");
    }
    return result;
  } catch (err) {
    return { ok: false, error: describePrismaError(err, "Could not save the doctor.") };
  }
}
