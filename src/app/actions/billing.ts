"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withRole } from "@/lib/auth";
import { describePrismaError } from "@/lib/prisma-errors";
import { nextInvoiceNo } from "@/lib/invoice";
import { currentMonthYear, rupeesToPaise } from "@/lib/types";
import type { ActionResult, PaymentMethod, PaymentStatus } from "@/lib/types";

type LineInput = { serviceId: string; quantity: number };

function parseItems(raw: string): LineInput[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((x) => ({
        serviceId: String((x as LineInput)?.serviceId ?? ""),
        quantity: Math.max(1, Math.floor(Number((x as LineInput)?.quantity ?? 1))),
      }))
      .filter((x) => x.serviceId);
  } catch {
    return [];
  }
}

function resolveStatus(total: number, paid: number): PaymentStatus {
  if (paid >= total && total > 0) return "PAID";
  if (paid > 0) return "PARTIAL";
  return "UNPAID";
}

/**
 * RECEPTIONIST only — raise a bill for a patient. Prices are taken from the DB
 * (never trusted from the client). Each scan service also creates a DRAFT
 * report so the patient lands on the radiologist worklist.
 */
export async function createBill(
  formData: FormData,
): Promise<ActionResult<{ id: string; invoiceNo: string }>> {
  const patientId = String(formData.get("patientId") ?? "").trim();
  const items = parseItems(String(formData.get("items") ?? "[]"));
  const discount = Math.max(0, rupeesToPaise(String(formData.get("discount") ?? "0")));
  const amountPaid = Math.max(0, rupeesToPaise(String(formData.get("amountPaid") ?? "0")));
  const methodRaw = String(formData.get("paymentMethod") ?? "").trim();
  const paymentMethod: PaymentMethod | null =
    methodRaw === "CASH" || methodRaw === "CARD" || methodRaw === "UPI" ? methodRaw : null;

  if (!patientId) return { ok: false, error: "Select a patient first." };
  if (items.length === 0) return { ok: false, error: "Add at least one service to the bill." };

  try {
    const result = await withRole("RECEPTIONIST", async (user) => {
      return prisma.$transaction(async (tx) => {
        const patient = await tx.patient.findUnique({ where: { id: patientId } });
        if (!patient) throw new Error("PATIENT_NOT_FOUND");

        // Pull authoritative prices for the requested services.
        const services = await tx.service.findMany({
          where: { id: { in: items.map((i) => i.serviceId) }, active: true },
        });
        const byId = new Map(services.map((s) => [s.id, s]));

        const lines = items.map((i) => {
          const svc = byId.get(i.serviceId);
          if (!svc) throw new Error("SERVICE_UNAVAILABLE");
          return { svc, quantity: i.quantity, amount: svc.price * i.quantity };
        });

        const subtotal = lines.reduce((sum, l) => sum + l.amount, 0);
        const total = Math.max(0, subtotal - discount);
        const month = currentMonthYear();

        const bill = await tx.bill.create({
          data: {
            invoiceNo: await nextInvoiceNo(tx),
            patientId,
            receptionistId: user.id,
            subtotal,
            discount,
            total,
            amountPaid: Math.min(amountPaid, total),
            paymentMethod,
            status: resolveStatus(total, amountPaid),
            createdMonthYear: month,
          },
          select: { id: true, invoiceNo: true },
        });

        for (const l of lines) {
          // A radiology service spawns a DRAFT report (radiologist worklist);
          // a lab service spawns a DRAFT lab report (lab technician worklist).
          let reportId: string | null = null;
          let labReportId: string | null = null;

          if (l.svc.department === "RADIOLOGY") {
            const report = await tx.report.create({
              data: { patientId, findings: "", impression: "", status: "DRAFT", createdMonthYear: month },
              select: { id: true },
            });
            reportId = report.id;
          } else if (l.svc.department === "LAB") {
            const labReport = await tx.labReport.create({
              data: { patientId, status: "DRAFT", createdMonthYear: month },
              select: { id: true },
            });
            labReportId = labReport.id;
          }

          await tx.billItem.create({
            data: {
              billId: bill.id,
              serviceId: l.svc.id,
              description: l.svc.name,
              quantity: l.quantity,
              unitPrice: l.svc.price,
              amount: l.amount,
              reportId,
              labReportId,
            },
          });
        }

        return bill;
      });
    });

    if (result.ok) {
      revalidatePath("/receptionist/billing");
      revalidatePath("/radiologist");
      revalidatePath("/lab");
    }
    return result;
  } catch (err) {
    if (err instanceof Error && err.message === "PATIENT_NOT_FOUND") {
      return { ok: false, error: "That patient no longer exists." };
    }
    if (err instanceof Error && err.message === "SERVICE_UNAVAILABLE") {
      return { ok: false, error: "One of the selected services is unavailable." };
    }
    return { ok: false, error: describePrismaError(err, "Could not create the bill.") };
  }
}
