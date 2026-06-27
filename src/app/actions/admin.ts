"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withRole } from "@/lib/auth";
import { describePrismaError } from "@/lib/prisma-errors";
import { logActivity } from "@/lib/activity";
import type { ActionResult } from "@/lib/types";

export type DeletableEntity = "report" | "patient" | "template" | "user";

const ENTITIES: readonly DeletableEntity[] = ["report", "patient", "template", "user"];

/**
 * ADMIN only — "Destruction Override": hard-delete any report, patient,
 * template, or user. Deleting a patient cascades to their reports; deleting a
 * template/radiologist nulls the reference on related reports (per schema).
 */
export async function hardDelete(
  formData: FormData,
): Promise<ActionResult<{ entity: DeletableEntity; id: string }>> {
  const entity = String(formData.get("entity") ?? "") as DeletableEntity;
  const id = String(formData.get("id") ?? "").trim();

  if (!ENTITIES.includes(entity)) return { ok: false, error: "Unknown record type." };
  if (!id) return { ok: false, error: "Missing record id." };

  try {
    const result = await withRole("ADMIN", async (admin) => {
      if (entity === "user" && admin.id === id) {
        throw new Error("SELF_DELETE");
      }
      switch (entity) {
        case "report":
          await prisma.report.delete({ where: { id } });
          break;
        case "patient":
          await prisma.patient.delete({ where: { id } });
          break;
        case "template":
          await prisma.template.delete({ where: { id } });
          break;
        case "user":
          await prisma.user.delete({ where: { id } });
          break;
      }
      await logActivity(
        { id: admin.id, name: admin.name, role: admin.role },
        "RECORD_DELETED",
        entity,
      );
      return { entity, id };
    });

    if (result.ok) {
      revalidatePath("/admin", "layout");
      revalidatePath("/receptionist/print");
      revalidatePath("/radiologist");
    }
    return result;
  } catch (err) {
    if (err instanceof Error && err.message === "SELF_DELETE") {
      return { ok: false, error: "You can't delete your own admin account." };
    }
    return { ok: false, error: describePrismaError(err, "Could not delete the record.") };
  }
}
