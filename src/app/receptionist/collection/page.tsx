import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-helpers";
import {
  formatINR,
  formatTimeIST,
  formatLongDateIST,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_STYLES,
} from "@/lib/types";
import type { PaymentMethod } from "@/lib/types";
import { DbErrorNotice } from "@/components/DbErrorNotice";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

/** Start/end of "today" in IST, as UTC instants for querying. */
function istTodayRange(now: Date): { start: Date; end: Date } {
  const istDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(now); // YYYY-MM-DD
  const start = new Date(`${istDate}T00:00:00+05:30`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

const METHOD_ACCENT: Record<PaymentMethod, string> = {
  CASH: "text-emerald-700",
  CARD: "text-indigo-700",
  UPI: "text-amber-700",
};

export default async function CollectionPage() {
  const now = new Date();
  const { start, end } = istTodayRange(now);

  const bills = await safeQuery(() =>
    prisma.bill.findMany({
      where: { createdAt: { gte: start, lt: end } },
      include: { patient: true },
      orderBy: { createdAt: "desc" },
    }),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Collection Report</h1>
        <p className="mt-1 text-sm text-slate-500">
          Amount collected today, {formatLongDateIST(now)}, by payment mode.
        </p>
      </header>

      {bills === null ? (
        <DbErrorNotice />
      ) : (
        (() => {
          // Sum the amount actually paid today, grouped by payment mode.
          const byMode: Record<PaymentMethod, number> = { CASH: 0, CARD: 0, UPI: 0 };
          let total = 0;
          for (const b of bills) {
            if (b.amountPaid > 0) {
              const m = (b.paymentMethod ?? "CASH") as PaymentMethod;
              byMode[m] += b.amountPaid;
              total += b.amountPaid;
            }
          }
          const paidBills = bills.filter((b) => b.amountPaid > 0);

          return (
            <>
              {/* Summary cards */}
              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {PAYMENT_METHODS.map((m) => (
                  <div key={m} className="card p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {PAYMENT_METHOD_LABELS[m]}
                    </p>
                    <p className={`mt-1 text-xl font-bold ${METHOD_ACCENT[m]}`}>
                      {formatINR(byMode[m])}
                    </p>
                  </div>
                ))}
                <div className="card border-brand-200 bg-brand-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
                    Total collected
                  </p>
                  <p className="mt-1 text-xl font-bold text-brand-800">{formatINR(total)}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {paidBills.length} bill{paidBills.length === 1 ? "" : "s"}
                  </p>
                </div>
              </section>

              {/* Today's bills */}
              <section>
                <h2 className="mb-3 text-sm font-semibold text-slate-700">Today&apos;s bills</h2>
                {bills.length === 0 ? (
                  <EmptyState
                    title="No bills yet today"
                    description="Bills raised today will be tallied here by payment mode."
                    icon="🧾"
                  />
                ) : (
                  <ul className="space-y-2">
                    {bills.map((b) => (
                      <li key={b.id}>
                        <Link
                          href={`/receptionist/billing/${b.id}`}
                          className="card flex flex-wrap items-center justify-between gap-3 p-3 text-sm transition hover:border-brand-300"
                        >
                          <div className="min-w-0">
                            <span className="font-medium text-slate-800">{b.patient.name}</span>
                            <span className="ml-2 font-mono text-xs text-slate-400">{b.invoiceNo}</span>
                            <span className="ml-2 text-xs text-slate-400">
                              {formatTimeIST(b.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            {b.paymentMethod && (
                              <span className="text-xs text-slate-500">
                                {PAYMENT_METHOD_LABELS[b.paymentMethod]}
                              </span>
                            )}
                            <span className="font-mono text-sm font-semibold text-slate-800">
                              {formatINR(b.amountPaid)}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${PAYMENT_STATUS_STYLES[b.status]}`}
                            >
                              {PAYMENT_STATUS_LABELS[b.status]}
                            </span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <p className="text-xs text-slate-400">
                Collection counts the amount paid at the time of billing. Balances settled later
                aren&apos;t reflected here yet.
              </p>
            </>
          );
        })()
      )}
    </div>
  );
}
