"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withRole } from "@/lib/auth";
import { describePrismaError } from "@/lib/prisma-errors";
import { logActivity } from "@/lib/activity";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, formatINR, rupeesToPaise } from "@/lib/types";
import { isValidDay } from "@/lib/date-range";
import type { ActionResult, ExpenseCategory, PaymentMethod } from "@/lib/types";

/** ADMIN only — record money the centre spent. */
export async function createExpense(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const category = String(formData.get("category") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const vendor = String(formData.get("vendor") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const methodRaw = String(formData.get("paymentMethod") ?? "").trim();
  const spentOn = String(formData.get("spentOn") ?? "").trim();

  if (!(EXPENSE_CATEGORIES as readonly string[]).includes(category)) {
    return { ok: false, error: "Select a valid category." };
  }
  const amount = rupeesToPaise(amountRaw);
  if (!amountRaw || amount <= 0) {
    return { ok: false, error: "Enter an amount greater than zero." };
  }
  if (!isValidDay(spentOn)) {
    return { ok: false, error: "Select the date the money was spent." };
  }
  const paymentMethod =
    methodRaw && (PAYMENT_METHODS as readonly string[]).includes(methodRaw)
      ? (methodRaw as PaymentMethod)
      : null;

  // Stamp the IST day at noon so the stored instant lands on that calendar day
  // regardless of the server's zone.
  const spentAt = new Date(`${spentOn}T12:00:00+05:30`);

  try {
    const result = await withRole("ADMIN", async (user) => {
      const expense = await prisma.expense.create({
        data: {
          category: category as ExpenseCategory,
          amount,
          vendor,
          note,
          paymentMethod,
          spentAt,
          createdMonthYear: spentOn.slice(0, 7),
          recordedById: user.id,
        },
        select: { id: true },
      });
      await logActivity(
        { id: user.id, name: user.name, role: user.role },
        "EXPENSE_RECORDED",
        `${category} ${formatINR(amount)}${vendor ? ` · ${vendor}` : ""}`,
      );
      return expense;
    });
    if (result.ok) revalidatePath("/admin/finance");
    return result;
  } catch (err) {
    return { ok: false, error: describePrismaError(err, "Could not record the expense.") };
  }
}

/** ADMIN only — remove an expense entered by mistake. */
export async function deleteExpense(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Missing expense id." };

  try {
    const result = await withRole("ADMIN", async (user) => {
      const existing = await prisma.expense.findUnique({
        where: { id },
        select: { category: true, amount: true, vendor: true },
      });
      if (!existing) throw new Error("NOT_FOUND");
      await prisma.expense.delete({ where: { id } });
      await logActivity(
        { id: user.id, name: user.name, role: user.role },
        "EXPENSE_DELETED",
        `${existing.category} ${formatINR(existing.amount)}${existing.vendor ? ` · ${existing.vendor}` : ""}`,
      );
      return { id };
    });
    if (result.ok) revalidatePath("/admin/finance");
    return result;
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "That expense no longer exists." };
    }
    return { ok: false, error: describePrismaError(err, "Could not delete the expense.") };
  }
}
