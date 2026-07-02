"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withRole } from "@/lib/auth";
import { describePrismaError } from "@/lib/prisma-errors";
import { logActivity } from "@/lib/activity";
import { rupeesToPaise } from "@/lib/types";
import type { ActionResult, PaymentMethod, PaymentStatus } from "@/lib/types";

function statusFor(total: number, paid: number): PaymentStatus {
  if (paid >= total && total > 0) return "PAID";
  if (paid > 0) return "PARTIAL";
  return "UNPAID";
}

/**
 * RECEPTIONIST only — record a later payment against an outstanding bill
 * (settle a due). Adds to amountPaid, capped at the total, and recomputes status.
 */
export async function recordPayment(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const billId = String(formData.get("billId") ?? "").trim();
  const amount = Math.max(0, rupeesToPaise(String(formData.get("amount") ?? "0")));
  const methodRaw = String(formData.get("paymentMethod") ?? "").trim();
  const method: PaymentMethod | null =
    methodRaw === "CASH" || methodRaw === "CARD" || methodRaw === "UPI" ? methodRaw : null;

  if (!billId) return { ok: false, error: "Missing bill." };
  if (amount <= 0) return { ok: false, error: "Enter an amount greater than zero." };

  try {
    const result = await withRole("RECEPTIONIST", async (user) => {
      const bill = await prisma.bill.findUnique({
        where: { id: billId },
        select: { total: true, amountPaid: true, cancelledAt: true, invoiceNo: true },
      });
      if (!bill) throw new Error("NOT_FOUND");
      if (bill.cancelledAt) throw new Error("CANCELLED");

      const newPaid = Math.min(bill.total, bill.amountPaid + amount);
      const updated = await prisma.bill.update({
        where: { id: billId },
        data: {
          amountPaid: newPaid,
          status: statusFor(bill.total, newPaid),
          ...(method ? { paymentMethod: method } : {}),
        },
        select: { id: true },
      });
      await logActivity(
        { id: user.id, name: user.name, role: user.role },
        "PAYMENT_RECORDED",
        `${bill.invoiceNo}`,
      );
      return updated;
    });

    if (result.ok) {
      revalidatePath("/receptionist/dues");
      revalidatePath("/receptionist/bills");
      revalidatePath(`/receptionist/billing/${billId}`);
    }
    return result;
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Bill not found." };
    }
    if (err instanceof Error && err.message === "CANCELLED") {
      return { ok: false, error: "This bill is cancelled." };
    }
    return { ok: false, error: describePrismaError(err, "Could not record the payment.") };
  }
}

/**
 * RECEPTIONIST/ADMIN — cancel a bill with a reason. If `refund` is set, the
 * amount already paid is recorded as refunded. Cancelled bills are excluded
 * from collection and dues.
 */
export async function cancelBill(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const billId = String(formData.get("billId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const refund = String(formData.get("refund") ?? "") === "on" || String(formData.get("refund") ?? "") === "true";

  if (!billId) return { ok: false, error: "Missing bill." };
  if (!reason) return { ok: false, error: "Enter a reason for cancellation." };

  try {
    const result = await withRole(["RECEPTIONIST", "ADMIN"], async (user) => {
      const bill = await prisma.bill.findUnique({
        where: { id: billId },
        select: { amountPaid: true, cancelledAt: true, invoiceNo: true },
      });
      if (!bill) throw new Error("NOT_FOUND");
      if (bill.cancelledAt) throw new Error("ALREADY_CANCELLED");

      const refundAmount = refund ? bill.amountPaid : 0;
      const updated = await prisma.bill.update({
        where: { id: billId },
        data: { cancelledAt: new Date(), cancelReason: reason, refundAmount },
        select: { id: true },
      });
      await logActivity(
        { id: user.id, name: user.name, role: user.role },
        "BILL_CANCELLED",
        refund ? `${bill.invoiceNo} (refunded)` : bill.invoiceNo,
      );
      return updated;
    });

    if (result.ok) {
      revalidatePath("/receptionist/dues");
      revalidatePath("/receptionist/bills");
      revalidatePath("/receptionist/collection");
      revalidatePath(`/receptionist/billing/${billId}`);
    }
    return result;
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Bill not found." };
    }
    if (err instanceof Error && err.message === "ALREADY_CANCELLED") {
      return { ok: false, error: "This bill is already cancelled." };
    }
    return { ok: false, error: describePrismaError(err, "Could not cancel the bill.") };
  }
}
