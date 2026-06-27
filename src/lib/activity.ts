import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export type Actor = { id: string; name: string; role: Role };

/**
 * Record an audit-trail entry. Never throws — a logging failure must not break
 * the action it accompanies (important given the hosted DB can be flaky).
 */
export async function logActivity(
  actor: Actor | null,
  action: string,
  detail = "",
): Promise<void> {
  if (!actor) return;
  try {
    await prisma.activityLog.create({
      data: {
        userId: actor.id,
        userName: actor.name,
        userRole: actor.role,
        action,
        detail,
      },
    });
  } catch (err) {
    console.error("activity log failed", err);
  }
}

/** Friendly labels for the action codes recorded above. */
export const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Signed in",
  LOGOUT: "Signed out",
  PATIENT_REGISTERED: "Registered patient",
  BILL_CREATED: "Raised bill",
  REPORT_APPROVED: "Approved radiology report",
  LAB_REPORT_APPROVED: "Approved lab report",
  REPORT_DELIVERED: "Handed report to patient",
  USER_CREATED: "Created user",
  RECORD_DELETED: "Deleted record",
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}
