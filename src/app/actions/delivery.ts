"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withRole } from "@/lib/auth";
import { describePrismaError } from "@/lib/prisma-errors";
import { logActivity } from "@/lib/activity";
import type { ActionResult } from "@/lib/types";

/**
 * RECEPTIONIST only — mark an approved report as delivered to the patient (or
 * undo it). Stamps/clears `deliveredAt` and records the handover in the audit
 * log. `kind` selects radiology vs lab report.
 */
export async function setDelivered(
  formData: FormData,
): Promise<ActionResult<{ deliveredAt: string | null }>> {
  const kind = String(formData.get("kind") ?? "");
  const id = String(formData.get("id") ?? "").trim();
  const deliver = String(formData.get("deliver") ?? "true") !== "false";

  if (kind !== "report" && kind !== "lab") return { ok: false, error: "Unknown report type." };
  if (!id) return { ok: false, error: "Missing report id." };

  try {
    const result = await withRole("RECEPTIONIST", async (user) => {
      const deliveredAt = deliver ? new Date() : null;
      const deliveredById = deliver ? user.id : null;

      if (kind === "report") {
        const r = await prisma.report.findUnique({ where: { id }, select: { status: true } });
        if (!r) throw new Error("NOT_FOUND");
        if (r.status !== "APPROVED") throw new Error("NOT_APPROVED");
        await prisma.report.update({ where: { id }, data: { deliveredAt, deliveredById } });
      } else {
        const r = await prisma.labReport.findUnique({ where: { id }, select: { status: true } });
        if (!r) throw new Error("NOT_FOUND");
        if (r.status !== "APPROVED") throw new Error("NOT_APPROVED");
        await prisma.labReport.update({ where: { id }, data: { deliveredAt, deliveredById } });
      }

      if (deliver) {
        await logActivity(
          { id: user.id, name: user.name, role: user.role },
          "REPORT_DELIVERED",
          kind === "lab" ? "Lab report" : "Radiology report",
        );
      }
      return { deliveredAt: deliveredAt ? deliveredAt.toISOString() : null };
    });

    if (result.ok) revalidatePath("/receptionist/print");
    return result;
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Report not found." };
    }
    if (err instanceof Error && err.message === "NOT_APPROVED") {
      return { ok: false, error: "Only approved reports can be delivered." };
    }
    return { ok: false, error: describePrismaError(err, "Could not update delivery status.") };
  }
}
