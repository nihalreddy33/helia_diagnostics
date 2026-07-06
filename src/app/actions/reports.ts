"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withRole } from "@/lib/auth";
import { describePrismaError } from "@/lib/prisma-errors";
import { currentMonthYear } from "@/lib/types";
import { logActivity } from "@/lib/activity";
import type { ActionResult, ReportStatus } from "@/lib/types";

type SaveIntent = "DRAFT" | "APPROVED";

function parse(formData: FormData) {
  return {
    reportId: String(formData.get("reportId") ?? "").trim() || undefined,
    patientId: String(formData.get("patientId") ?? "").trim(),
    templateId: String(formData.get("templateId") ?? "").trim() || null,
    findings: String(formData.get("findings") ?? "").trim(),
    impression: String(formData.get("impression") ?? "").trim(),
    footer: String(formData.get("footer") ?? "").trim(),
    intent: (String(formData.get("intent") ?? "APPROVED") === "DRAFT"
      ? "DRAFT"
      : "APPROVED") as SaveIntent,
  };
}

/**
 * RADIOLOGIST only — transcribe, approve, and amend reports. First approval
 * stamps `approvedAt`; DRAFT keeps it editable. An already-approved report can
 * be re-opened and amended: it stays APPROVED, keeps its original `approvedAt`,
 * and the edit is recorded as an amendment in the audit log.
 */
export async function saveReport(
  formData: FormData,
): Promise<ActionResult<{ id: string; status: ReportStatus }>> {
  const { reportId, patientId, templateId, findings, impression, footer, intent } =
    parse(formData);

  if (!patientId) return { ok: false, error: "A patient must be selected." };
  if (intent === "APPROVED") {
    if (!findings) return { ok: false, error: "Findings cannot be empty before approving." };
    if (!impression) return { ok: false, error: "Impression cannot be empty before approving." };
  }

  try {
    const result = await withRole("RADIOLOGIST", async (user) => {
      let saved: { id: string; status: ReportStatus };
      let wasApproved = false;

      if (reportId) {
        const existing = await prisma.report.findUnique({
          where: { id: reportId },
          select: { status: true },
        });
        if (!existing) throw new Error("NOT_FOUND");
        wasApproved = existing.status === "APPROVED";

        // An approved report stays approved when amended (you can't un-approve
        // by editing); its original approval timestamp is preserved. Amending
        // requires findings + impression, same as a first approval.
        if (wasApproved && (!findings || !impression)) throw new Error("AMEND_INCOMPLETE");

        const statusFields = wasApproved
          ? { status: "APPROVED" as const } // keep approvedAt untouched
          : intent === "APPROVED"
            ? { status: "APPROVED" as const, approvedAt: new Date() }
            : { status: "DRAFT" as const };

        saved = await prisma.report.update({
          where: { id: reportId },
          data: { templateId, findings, impression, footer, radiologistId: user.id, ...statusFields },
          select: { id: true, status: true },
        });
      } else {
        const statusFields =
          intent === "APPROVED"
            ? { status: "APPROVED" as const, approvedAt: new Date() }
            : { status: "DRAFT" as const };
        saved = await prisma.report.create({
          data: {
            patientId,
            templateId,
            findings,
            impression,
            footer,
            radiologistId: user.id,
            createdMonthYear: currentMonthYear(),
            ...statusFields,
          },
          select: { id: true, status: true },
        });
      }

      if (wasApproved) {
        await logActivity(
          { id: user.id, name: user.name, role: user.role },
          "REPORT_AMENDED",
        );
      } else if (saved.status === "APPROVED") {
        await logActivity(
          { id: user.id, name: user.name, role: user.role },
          "REPORT_APPROVED",
        );
      }
      return saved;
    });

    if (result.ok) {
      revalidatePath("/radiologist");
      revalidatePath("/receptionist/print");
    }
    return result;
  } catch (err) {
    if (err instanceof Error && err.message === "AMEND_INCOMPLETE") {
      return { ok: false, error: "Findings and impression cannot be empty when amending." };
    }
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Report not found." };
    }
    return { ok: false, error: describePrismaError(err, "Could not save the report.") };
  }
}
