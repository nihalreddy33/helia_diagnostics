import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-helpers";
import { DbErrorNotice } from "@/components/DbErrorNotice";
import { PrintButton } from "@/components/receptionist/PrintButton";
import {
  formatINR,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/types";

export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ billId: string }>;
}) {
  const { billId } = await params;

  const bill = await safeQuery(() =>
    prisma.bill.findUnique({
      where: { id: billId },
      include: { patient: true, receptionist: true, items: true },
    }),
  );

  if (bill === null) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <DbErrorNotice />
      </main>
    );
  }
  if (!bill) notFound();

  return (
    <div>
      {/* Toolbar — hidden when printing */}
      <div className="no-print sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link
            href="/receptionist/billing"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-brand-700"
          >
            <span aria-hidden>‹</span> Back to Billing
          </Link>
          <PrintButton />
        </div>
      </div>

      <article className="print-sheet">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-brand-700">Helia Diagnostics</h1>
            <p className="mt-1 text-xs tracking-wide text-slate-500">
              Diagnostic Imaging &amp; Radiology · Helia Diagnostics Center
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Invoice</p>
            <p className="font-mono text-sm font-semibold text-slate-800">{bill.invoiceNo}</p>
            <p className="mt-1 text-xs text-slate-500">{formatDate(bill.createdAt)}</p>
          </div>
        </header>

        <hr className="mt-6 border-slate-200" />

        {/* Bill-to */}
        <section className="mt-6 grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Billed to</p>
            <p className="mt-1 font-semibold text-slate-900">{bill.patient.name}</p>
            <p className="text-xs text-slate-500">
              <span className="font-mono">{bill.patient.uhid}</span> · {bill.patient.age} yrs ·{" "}
              {bill.patient.gender}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Payment</p>
            <p className="mt-1 text-sm font-medium text-slate-800">
              {PAYMENT_STATUS_LABELS[bill.status]}
              {bill.paymentMethod && (
                <span className="text-slate-500"> · {PAYMENT_METHOD_LABELS[bill.paymentMethod]}</span>
              )}
            </p>
          </div>
        </section>

        {/* Line items */}
        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-y border-slate-200 text-left text-[10px] uppercase tracking-wider text-slate-400">
              <th className="py-2 font-semibold">Service</th>
              <th className="py-2 text-center font-semibold">Qty</th>
              <th className="py-2 text-right font-semibold">Rate</th>
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((it) => (
              <tr key={it.id} className="border-b border-slate-100">
                <td className="py-2 text-slate-800">{it.description}</td>
                <td className="py-2 text-center text-slate-600">{it.quantity}</td>
                <td className="py-2 text-right font-mono text-slate-600">{formatINR(it.unitPrice)}</td>
                <td className="py-2 text-right font-mono text-slate-800">{formatINR(it.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <section className="mt-6 flex justify-end">
          <dl className="w-64 space-y-1.5 text-sm">
            <TotalRow label="Subtotal" value={formatINR(bill.subtotal)} />
            {bill.discount > 0 && <TotalRow label="Discount" value={`− ${formatINR(bill.discount)}`} />}
            <div className="flex justify-between border-t border-slate-200 pt-2">
              <dt className="font-semibold text-slate-900">Total</dt>
              <dd className="font-mono text-base font-bold text-slate-900">{formatINR(bill.total)}</dd>
            </div>
            <TotalRow label="Paid" value={formatINR(bill.amountPaid)} />
            <TotalRow label="Balance" value={formatINR(bill.total - bill.amountPaid)} />
          </dl>
        </section>

        <footer className="mt-16 border-t border-slate-200 pt-4 text-center text-[10px] leading-5 text-slate-400">
          <p>
            {bill.receptionist ? `Billed by ${bill.receptionist.name}. ` : ""}
            This is a computer-generated invoice from Helia Diagnostics.
          </p>
        </footer>
      </article>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-mono text-slate-700">{value}</dd>
    </div>
  );
}
