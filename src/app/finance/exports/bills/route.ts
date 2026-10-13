import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { csvResponse, paiseToRupees, toCsv } from "@/lib/csv";
import { istDayString, isValidDay, rangeToInstants, resolveRange } from "@/lib/date-range";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /finance/exports/bills?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Every bill raised in the period, one row each, as the accountant needs it
 * for turnover (GST returns, income tax) — including cancelled bills, marked
 * as such with their refund, so the export reconciles to the invoice run
 * rather than silently omitting numbers.
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

  const bills = await prisma.bill.findMany({
    where: { createdAt: { gte: start, lt: end } },
    orderBy: { createdAt: "asc" },
    select: {
      invoiceNo: true,
      legacyBillNo: true,
      createdAt: true,
      referringDoctor: true,
      subtotal: true,
      discount: true,
      total: true,
      amountPaid: true,
      paymentMethod: true,
      status: true,
      cancelledAt: true,
      refundAmount: true,
      patient: { select: { uhid: true, name: true, mobile: true } },
      items: { select: { description: true, quantity: true } },
    },
  });

  const header = [
    "Invoice No", "Old Bill No", "Date", "UHID", "Patient", "Mobile", "Referring Doctor",
    "Services", "Subtotal", "Discount", "Total", "Paid", "Balance",
    "Payment Mode", "Status", "Cancelled On", "Refund",
  ];
  const rows = bills.map((b) => [
    b.invoiceNo,
    b.legacyBillNo ?? "",
    istDayString(b.createdAt),
    b.patient.uhid,
    b.patient.name,
    b.patient.mobile,
    b.referringDoctor,
    b.items.map((i) => (i.quantity > 1 ? `${i.description} ×${i.quantity}` : i.description)).join("; "),
    paiseToRupees(b.subtotal),
    paiseToRupees(b.discount),
    paiseToRupees(b.total),
    paiseToRupees(b.amountPaid),
    paiseToRupees(b.total - b.amountPaid),
    b.paymentMethod ? PAYMENT_METHOD_LABELS[b.paymentMethod] : "Not recorded",
    b.cancelledAt ? "Cancelled" : PAYMENT_STATUS_LABELS[b.status],
    b.cancelledAt ? istDayString(b.cancelledAt) : "",
    paiseToRupees(b.refundAmount),
  ]);

  // Financial data leaving the system is worth an audit line.
  await logActivity(
    { id: user.id, name: user.name, role: user.role },
    "DATA_EXPORTED",
    `Bills ${from} to ${to} (${bills.length} rows)`,
  );

  return csvResponse(`helia-bills-${from}-to-${to}.csv`, toCsv(header, rows));
}
