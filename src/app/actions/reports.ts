"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { currentMonthYear } from "@/lib/types";
import type { ActionResult, ReportStatus } from "@/lib/types";
import type { Report } from "@prisma/client";

type SaveReportArgs = {
  reportId?: string;
  patientId: string;
  templateId?: string | null;
  findings: string;
  impression: string;
  /** DRAFT keeps it editable; PENDING_REVIEW sends it to the admin queue. */
  intent: Extract<ReportStatus, "DRAFT" | "PENDING_REVIEW">;
};

function parseSaveArgs(formData: FormData): SaveReportArgs {
  const reportId = String(formData.get("reportId") ?? "").trim() || undefined;
  const templateId = String(formData.get("templateId") ?? "").trim() || null;
  return {
    reportId,
    patientId: String(formData.get("patientId") ?? "").trim(),
    templateId,
    findings: String(formData.get("findings") ?? "").trim(),
    impression: String(formData.get("impression") ?? "").trim(),
    intent:
      String(formData.get("intent") ?? "DRAFT") === "PENDING_REVIEW"
        ? "PENDING_REVIEW"
        : "DRAFT",
  };
}

/**
 * Radiologist action: create or update a report, either saving it as a DRAFT
 * or submitting it for review (PENDING_REVIEW).
 */
export async function saveReport(
  formData: FormData,
): Promise<ActionResult<{ id: string; status: ReportStatus }>> {
  const args = parseSaveArgs(formData);

  if (!args.patientId) return { ok: false, error: "A patient must be selected." };
  if (args.intent === "PENDING_REVIEW") {
    if (!args.findings) return { ok: false, error: "Findings cannot be empty before submitting." };
    if (!args.impression) return { ok: false, error: "Impression cannot be empty before submitting." };
  }

  try {
    const user = await getCurrentUser();

    let report: Pick<Report, "id" | "status">;
    if (args.reportId) {
      // Don't allow editing an already-approved (locked) report here.
      const existing = await prisma.report.findUnique({
        where: { id: args.reportId },
        select: { status: true },
      });
      if (!existing) return { ok: false, error: "Report not found." };
      if (existing.status === "APPROVED") {
        return { ok: false, error: "This report is approved and locked." };
      }
      report = await prisma.report.update({
        where: { id: args.reportId },
        data: {
          templateId: args.templateId,
          findings: args.findings,
          impression: args.impression,
          status: args.intent,
          radiologistId: user?.id ?? undefined,
        },
        select: { id: true, status: true },
      });
    } else {
      report = await prisma.report.create({
        data: {
          patientId: args.patientId,
          templateId: args.templateId,
          findings: args.findings,
          impression: args.impression,
          status: args.intent,
          radiologistId: user?.id ?? null,
          createdMonthYear: currentMonthYear(),
        },
        select: { id: true, status: true },
      });
    }

    revalidatePath("/radiologist");
    revalidatePath("/admin");
    return { ok: true, data: report };
  } catch (err) {
    console.error("saveReport failed", err);
    return { ok: false, error: "Could not save the report. Please try again." };
  }
}

/**
 * Admin action: optionally apply final edits, then approve & lock a report.
 * Sets status to APPROVED and stamps approvedAt.
 */
export async function approveReport(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const reportId = String(formData.get("reportId") ?? "").trim();
  const findings = String(formData.get("findings") ?? "").trim();
  const impression = String(formData.get("impression") ?? "").trim();

  if (!reportId) return { ok: false, error: "Missing report id." };
  if (!findings || !impression) {
    return { ok: false, error: "Findings and impression are required to approve." };
  }

  try {
    const existing = await prisma.report.findUnique({
      where: { id: reportId },
      select: { status: true },
    });
    if (!existing) return { ok: false, error: "Report not found." };
    if (existing.status === "APPROVED") {
      return { ok: false, error: "Report is already approved." };
    }

    await prisma.report.update({
      where: { id: reportId },
      data: {
        findings,
        impression,
        status: "APPROVED",
        approvedAt: new Date(),
      },
    });

    revalidatePath("/admin");
    revalidatePath("/archive");
    return { ok: true, data: { id: reportId } };
  } catch (err) {
    console.error("approveReport failed", err);
    return { ok: false, error: "Could not approve the report. Please try again." };
  }
}

/** Fetch approved reports for a given "YYYY-MM" bucket (archive view). */
export async function getReportsByMonth(monthYear: string) {
  return prisma.report.findMany({
    where: { status: "APPROVED", createdMonthYear: monthYear },
    include: { patient: true, template: true, radiologist: true },
    orderBy: { approvedAt: "desc" },
  });
}
