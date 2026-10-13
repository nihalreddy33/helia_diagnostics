import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { csvResponse, paiseToRupees, toCsv } from "@/lib/csv";
import { istDayString, isValidDay, rangeToInstants, resolveRange } from "@/lib/date-range";
import { EXPENSE_CATEGORY_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /finance/exports/expenses?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Every expense in the period, one row each — the outgoings side the
 * accountant needs for the profit & loss and for TDS review (rent,
 * professional fees and the like are what TDS attaches to).
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "FINANCE" && user.role !== "ADMIN")) {
    return new Response("Forbidden", { status: 403 });
  }

  const url = new URL(req.url);
  const fromParam = url.searchParams.get("from") ?? "";
  const toParam = url.searchParams.get("to") ?? "";
  if (!isValidDay(fromParam) || !isValidDay(toParam)) {
    return new Response("from and to must be YYYY-MM-DD", { status: 400 });
  }
  const { from, to } = resolveRange(fromParam, toParam, istDayString(new Date()));
  const { start, end } = rangeToInstants(from, to);

  const expenses = await prisma.expense.findMany({
    where: { spentAt: { gte: start, lt: end } },
    orderBy: { spentAt: "asc" },
    select: {
      spentAt: true,
      category: true,
      vendor: true,
      note: true,
      amount: true,
      paymentMethod: true,
      recordedBy: { select: { name: true } },
    },
  });

  const header = ["Date", "Category", "Paid To", "Note", "Amount", "Payment Mode", "Recorded By"];
  const rows = expenses.map((e) => [
    istDayString(e.spentAt),
    EXPENSE_CATEGORY_LABELS[e.category],
    e.vendor,
    e.note,
    paiseToRupees(e.amount),
    e.paymentMethod ? PAYMENT_METHOD_LABELS[e.paymentMethod] : "Not recorded",
    e.recordedBy?.name ?? "",
  ]);

  await logActivity(
    { id: user.id, name: user.name, role: user.role },
    "DATA_EXPORTED",
    `Expenses ${from} to ${to} (${expenses.length} rows)`,
  );

  return csvResponse(`helia-expenses-${from}-to-${to}.csv`, toCsv(header, rows));
}
