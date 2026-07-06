"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withRole } from "@/lib/auth";
import { describePrismaError } from "@/lib/prisma-errors";
import { logActivity } from "@/lib/activity";
import { sendInteraktTemplate } from "@/lib/interakt";
import { makeShareToken, type ShareKind } from "@/lib/share";
import type { ActionResult } from "@/lib/types";

/** Absolute base URL for building patient-facing links (env override, else request host). */
async function resolveBaseUrl(): Promise<string> {
  const configured = process.env.APP_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Mask a 10-digit number for display in confirmations / logs: 9876543210 → 98765•••10. */
function maskMobile(m: string): string {
  return m.length >= 10 ? `${m.slice(0, 5)}•••${m.slice(-2)}` : m;
}

/**
 * RECEPTIONIST only — send a report/invoice to the patient over WhatsApp via
 * Interakt. The message carries a secure, no-login link to view/download it.
 */
export async function sendWhatsApp(
  formData: FormData,
): Promise<ActionResult<{ phone: string }>> {
  const kind = String(formData.get("kind") ?? "") as ShareKind;
  const id = String(formData.get("id") ?? "").trim();

  if (kind !== "report" && kind !== "lab" && kind !== "bill") {
    return { ok: false, error: "Unknown document type." };
  }
  if (!id) return { ok: false, error: "Missing document id." };

  try {
    const result = await withRole("RECEPTIONIST", async (user) => {
      // Resolve the recipient + a human label for the message, per document kind.
      let patientName = "";
      let mobile = "";
      let thing = ""; // fills the {{2}} placeholder, e.g. "Chest X-Ray report"

      if (kind === "report") {
        const r = await prisma.report.findUnique({
          where: { id },
          include: { patient: true, template: true },
        });
        if (!r) throw new Error("NOT_FOUND");
        if (r.status !== "APPROVED") throw new Error("NOT_APPROVED");
        patientName = r.patient.name;
        mobile = r.patient.mobile;
        thing = `${r.template?.title ?? "Radiology"} report`;
      } else if (kind === "lab") {
        const r = await prisma.labReport.findUnique({
          where: { id },
          include: { patient: true, template: true, billItem: { select: { description: true } } },
        });
        if (!r) throw new Error("NOT_FOUND");
        if (r.status !== "APPROVED") throw new Error("NOT_APPROVED");
        patientName = r.patient.name;
        mobile = r.patient.mobile;
        thing = `${r.template?.title ?? r.billItem?.description ?? "Lab"} report`;
      } else {
        const b = await prisma.bill.findUnique({ where: { id }, include: { patient: true } });
        if (!b) throw new Error("NOT_FOUND");
        patientName = b.patient.name;
        mobile = b.patient.mobile;
        thing = `invoice ${b.invoiceNo}`;
      }

      if (!mobile) throw new Error("NO_MOBILE");

      const link = `${await resolveBaseUrl()}/r/${makeShareToken(kind, id)}`;
      const firstName = patientName.split(/\s+/)[0] || patientName;

      const sent = await sendInteraktTemplate({
        phone: mobile,
        bodyValues: [firstName, thing, link],
      });
      if (!sent.ok) throw new Error(`WA:${sent.error}`);

      // Stamp the record so a persistent "sent on WhatsApp" tick shows up.
      const stamp = { whatsappSentAt: new Date(), whatsappSentCount: { increment: 1 } };
      if (kind === "report") await prisma.report.update({ where: { id }, data: stamp });
      else if (kind === "lab") await prisma.labReport.update({ where: { id }, data: stamp });
      else await prisma.bill.update({ where: { id }, data: stamp });

      await logActivity(
        { id: user.id, name: user.name, role: user.role },
        "WHATSAPP_SENT",
        `${thing} → ${patientName} (${maskMobile(mobile)})`,
      );

      return { phone: maskMobile(mobile) };
    });

    if (result.ok) {
      revalidatePath("/receptionist/print");
      revalidatePath("/receptionist/bills");
    }
    return result;
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "NOT_FOUND") return { ok: false, error: "Document not found." };
      if (err.message === "NOT_APPROVED") return { ok: false, error: "Only approved reports can be sent." };
      if (err.message === "NO_MOBILE") return { ok: false, error: "No mobile number on file for this patient." };
      if (err.message.startsWith("WA:")) return { ok: false, error: err.message.slice(3) };
    }
    return { ok: false, error: describePrismaError(err, "Could not send WhatsApp message.") };
  }
}
