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

const DAY_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD" for the IST calendar day containing `date`. */
function istDayString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(date);
}

/** Shift an IST "YYYY-MM-DD" by whole days, staying in IST. */
function shiftDay(day: string, deltaDays: number): string {
  return istDayString(new Date(new Date(`${day}T00:00:00+05:30`).getTime() + deltaDays * DAY_MS));
}

/** First day of the IST month containing `day`. */
function startOfMonth(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

function isValidDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00+05:30`));
}

/**
 * Resolve the ?from/?to query into an inclusive IST day range, defaulting to
 * today. Invalid values fall back to today; a reversed range is swapped.
 */
function resolveRange(
  fromParam: string | undefined,
  toParam: string | undefined,
  today: string,
): { from: string; to: string } {
  const from = fromParam && isValidDay(fromParam) ? fromParam : today;
  const to = toParam && isValidDay(toParam) ? toParam : from;
  return from <= to ? { from, to } : { from: to, to: from };
}

/** UTC instants bounding the inclusive IST day range, for querying. */
function rangeToInstants(from: string, to: string): { start: Date; end: Date } {
  return {
    start: new Date(`${from}T00:00:00+05:30`),
    end: new Date(new Date(`${to}T00:00:00+05:30`).getTime() + DAY_MS),
  };
}

function longDate(day: string): string {
  return formatLongDateIST(new Date(`${day}T12:00:00+05:30`));
}

const METHOD_ACCENT: Record<PaymentMethod, string> = {
  CASH: "text-emerald-700",
  CARD: "text-indigo-700",
  UPI: "text-amber-700",
};

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from: fromParam, to: toParam } = await searchParams;
  const today = istDayString(new Date());
  const { from, to } = resolveRange(fromParam, toParam, today);
  const { start, end } = rangeToInstants(from, to);

  const isSingleDay = from === to;
  const isToday = isSingleDay && from === today;

  const yesterday = shiftDay(today, -1);
  const presets: { label: string; from: string; to: string }[] = [
    { label: "Today", from: today, to: today },
    { label: "Yesterday", from: yesterday, to: yesterday },
    { label: "Last 7 days", from: shiftDay(today, -6), to: today },
    { label: "This month", from: startOfMonth(today), to: today },
  ];

  const bills = await safeQuery(() =>
    prisma.bill.findMany({
      where: { createdAt: { gte: start, lt: end }, cancelledAt: null },
      include: { patient: true },
      orderBy: { createdAt: "desc" },
    }),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Collection Report</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isSingleDay
            ? `Amount collected ${isToday ? "today, " : "on "}${longDate(from)}, by payment mode.`
            : `Amount collected from ${longDate(from)} to ${longDate(to)}, by payment mode.`}
        </p>
      </header>

      {/* Date-wise filter */}
      <form method="get" className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[10rem]">
          <label htmlFor="from" className="field-label">From</label>
          <input
            id="from"
            type="date"
            name="from"
            defaultValue={from}
            max={today}
            className="field-input"
          />
        </div>
        <div className="min-w-[10rem]">
          <label htmlFor="to" className="field-label">To</label>
          <input
            id="to"
            type="date"
            name="to"
            defaultValue={to}
            max={today}
            className="field-input"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            Apply
          </button>
          <Link
            href="/receptionist/collection"
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-300 transition hover:bg-slate-50"
          >
            Reset
          </Link>
        </div>
        <div className="flex w-full flex-wrap gap-1.5 border-t border-slate-100 pt-3">
          {presets.map((p) => {
            const active = p.from === from && p.to === to;
            return (
              <Link
                key={p.label}
                href={`/receptionist/collection?from=${p.from}&to=${p.to}`}
                className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition ${
                  active
                    ? "bg-brand-50 text-brand-700 ring-brand-200"
                    : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {p.label}
              </Link>
            );
          })}
        </div>
      </form>

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

              {/* Bills in the selected range */}
              <section>
                <h2 className="mb-3 text-sm font-semibold text-slate-700">
                  {isToday ? "Today's bills" : `Bills (${bills.length})`}
                </h2>
                {bills.length === 0 ? (
                  <EmptyState
                    title={isToday ? "No bills yet today" : "No bills in this period"}
                    description={
                      isToday
                        ? "Bills raised today will be tallied here by payment mode."
                        : "Try a different date range."
                    }
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
                              {isSingleDay
                                ? formatTimeIST(b.createdAt)
                                : `${istDayString(b.createdAt).split("-").reverse().join("/")} · ${formatTimeIST(b.createdAt)}`}
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
