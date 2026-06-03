import type { Role, Modality, ReportStatus } from "@prisma/client";

export type { Role, Modality, ReportStatus };

export const ROLES: readonly Role[] = ["ADMIN", "RECEPTIONIST", "RADIOLOGIST"];

export const MODALITIES: readonly Modality[] = ["XRAY", "CT", "MRI", "USG"];

export const REPORT_STATUSES: readonly ReportStatus[] = ["DRAFT", "APPROVED"];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  RECEPTIONIST: "Receptionist",
  RADIOLOGIST: "Radiologist",
};

export const MODALITY_LABELS: Record<Modality, string> = {
  XRAY: "X-Ray",
  CT: "CT Scan",
  MRI: "MRI",
  USG: "Ultrasound (USG)",
};

export const STATUS_LABELS: Record<ReportStatus, string> = {
  DRAFT: "Draft",
  APPROVED: "Approved",
};

export const STATUS_STYLES: Record<ReportStatus, string> = {
  DRAFT: "bg-amber-100 text-amber-800 ring-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-800 ring-emerald-200",
};

/** Standard discriminated result returned by every server action. */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/** Current month bucket in the "YYYY-MM" format used across the app. */
export function currentMonthYear(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** Human-friendly label for a "YYYY-MM" bucket, e.g. "2026-06" -> "June 2026". */
export function formatMonthYear(monthYear: string): string {
  const [year, month] = monthYear.split("-");
  if (!year || !month) return monthYear;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  return date.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
