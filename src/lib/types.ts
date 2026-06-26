import type {
  Role,
  Modality,
  ReportStatus,
  PaymentMethod,
  PaymentStatus,
  Department,
  LabFlag,
} from "@prisma/client";

export type {
  Role,
  Modality,
  ReportStatus,
  PaymentMethod,
  PaymentStatus,
  Department,
  LabFlag,
};

export const PAYMENT_METHODS: readonly PaymentMethod[] = ["CASH", "CARD", "UPI"];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  CARD: "Card",
  UPI: "UPI",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: "Unpaid",
  PARTIAL: "Partial",
  PAID: "Paid",
};

export const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  UNPAID: "bg-red-100 text-red-800 ring-red-200",
  PARTIAL: "bg-amber-100 text-amber-800 ring-amber-200",
  PAID: "bg-emerald-100 text-emerald-800 ring-emerald-200",
};

/** Format a date with time in IST, e.g. "26 Jun 2026, 3:45 PM IST". */
export function formatDateTimeIST(date: Date): string {
  const s = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(date);
  return `${s} IST`;
}

/** Format just the time in IST, e.g. "3:45 PM". */
export function formatTimeIST(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(date);
}

/** Format a long date in IST, e.g. "Thursday, 26 June 2026". */
export function formatLongDateIST(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

/** Money is stored as integer paise. Convert a rupee string/number to paise. */
export function rupeesToPaise(rupees: string | number): number {
  const n = typeof rupees === "string" ? Number(rupees.replace(/[,₹\s]/g, "")) : rupees;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** Format integer paise as an INR amount, e.g. 120000 -> "₹1,200.00". */
export function formatINR(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format((paise || 0) / 100);
}

export const ROLES: readonly Role[] = [
  "ADMIN",
  "RECEPTIONIST",
  "RADIOLOGIST",
  "LAB_TECHNICIAN",
];

export const MODALITIES: readonly Modality[] = ["XRAY", "CT", "MRI", "USG"];

export const REPORT_STATUSES: readonly ReportStatus[] = ["DRAFT", "APPROVED"];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  RECEPTIONIST: "Receptionist",
  RADIOLOGIST: "Radiologist",
  LAB_TECHNICIAN: "Lab Technician",
};

export const DEPARTMENTS: readonly Department[] = ["RADIOLOGY", "LAB", "OTHER"];

export const DEPARTMENT_LABELS: Record<Department, string> = {
  RADIOLOGY: "Radiology (scan)",
  LAB: "Lab test",
  OTHER: "Other (non-clinical)",
};

export const LAB_FLAGS: readonly LabFlag[] = ["NORMAL", "HIGH", "LOW"];

export const LAB_FLAG_LABELS: Record<LabFlag, string> = {
  NORMAL: "Normal",
  HIGH: "High",
  LOW: "Low",
};

export const LAB_FLAG_STYLES: Record<LabFlag, string> = {
  NORMAL: "text-slate-600",
  HIGH: "text-red-600 font-semibold",
  LOW: "text-amber-600 font-semibold",
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
