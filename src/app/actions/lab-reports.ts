"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withRole } from "@/lib/auth";
import { describePrismaError } from "@/lib/prisma-errors";
import { LAB_FLAGS } from "@/lib/types";
import type { ActionResult, LabFlag, ReportStatus } from "@/lib/types";

type ResultInput = {
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  flag: LabFlag;
};

function parseResults(raw: string): ResultInput[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((x) => {
        const flagRaw = String((x as ResultInput)?.flag ?? "NORMAL");
        return {
          name: String((x as ResultInput)?.name ?? "").trim(),
          value: String((x as ResultInput)?.value ?? "").trim(),
          unit: String((x as ResultInput)?.unit ?? "").trim(),
          referenceRange: String((x as ResultInput)?.referenceRange ?? "").trim(),
          flag: (LAB_FLAGS as readonly string[]).includes(flagRaw)
            ? (flagRaw as LabFlag)
            : ("NORMAL" as LabFlag),
        };
      })
      .filter((r) => r.name);
  } catch {
    return [];
  }
}

/**
 * LAB_TECHNICIAN only — save a lab report's results table. Intent APPROVED
 * stamps approvedAt and locks it; DRAFT keeps it editable.
 */
export async function saveLabReport(
  formData: FormData,
): Promise<ActionResult<{ id: string; status: ReportStatus }>> {
  const reportId = String(formData.get("reportId") ?? "").trim();
  const templateId = String(formData.get("templateId") ?? "").trim() || null;
  const results = parseResults(String(formData.get("results") ?? "[]"));
  const intent: "DRAFT" | "APPROVED" =
    String(formData.get("intent") ?? "DRAFT") === "APPROVED" ? "APPROVED" : "DRAFT";

  if (!reportId) return { ok: false, error: "Missing lab report id." };
  if (intent === "APPROVED" && results.length === 0) {
    return { ok: false, error: "Add at least one result before approving." };
  }

  try {
    const result = await withRole("LAB_TECHNICIAN", async (user) => {
      const existing = await prisma.labReport.findUnique({
        where: { id: reportId },
        select: { status: true },
      });
      if (!existing) throw new Error("NOT_FOUND");
      if (existing.status === "APPROVED") throw new Error("LOCKED");

      // Rewrite the result rows and report state in one transaction.
      return prisma.$transaction(async (tx) => {
        await tx.labResult.deleteMany({ where: { reportId } });
        const approvedFields =
          intent === "APPROVED"
            ? { status: "APPROVED" as const, approvedAt: new Date() }
            : { status: "DRAFT" as const };
        return tx.labReport.update({
          where: { id: reportId },
          data: {
            templateId,
            technicianId: user.id,
            ...approvedFields,
            results: {
              create: results.map((r, i) => ({
                name: r.name,
                value: r.value,
                unit: r.unit,
                referenceRange: r.referenceRange,
                flag: r.flag,
                position: i,
              })),
            },
          },
          select: { id: true, status: true },
        });
      });
    });

    if (result.ok) {
      revalidatePath("/lab");
      revalidatePath("/receptionist/print");
    }
    return result;
  } catch (err) {
    if (err instanceof Error && err.message === "LOCKED") {
      return { ok: false, error: "This lab report is approved and locked." };
    }
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Lab report not found." };
    }
    return { ok: false, error: describePrismaError(err, "Could not save the lab report.") };
  }
}
