import Link from "next/link";
import { istDayString, longDate, resolveRange, shiftDay, startOfMonth, endOfMonth } from "@/lib/date-range";

export const dynamic = "force-dynamic";

/** First day of the Indian financial year (1 April) containing `day`. */
function fyStart(day: string): string {
  const y = Number(day.slice(0, 4));
  const m = Number(day.slice(5, 7));
  return m >= 4 ? `${y}-04-01` : `${y - 1}-04-01`;
}

/**
 * CSV downloads for the accountant. The app does not compute GST, TDS or
 * income tax — those depend on filings and thresholds it cannot see — it hands
 * over the two ledgers they are computed from, for the period chosen.
 */
export default async function FinanceExportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from: fromParam, to: toParam } = await searchParams;
  const today = istDayString(new Date());
  const monthStart = startOfMonth(today);
  const { from, to } = resolveRange(fromParam ?? monthStart, toParam ?? today, monthStart);

  const lastMonthDay = shiftDay(monthStart, -1);
  const thisFy = fyStart(today);
  const lastFyStart = `${Number(thisFy.slice(0, 4)) - 1}-04-01`;
  const lastFyEnd = shiftDay(thisFy, -1);
  const presets = [
    { label: "This month", from: monthStart, to: today },
    { label: "Last month", from: startOfMonth(lastMonthDay), to: endOfMonth(lastMonthDay) },
    { label: "This FY (Apr–Mar)", from: thisFy, to: today },
    { label: "Last FY", from: lastFyStart, to: lastFyEnd },
  ];

  const qs = `from=${from}&to=${to}`;
  const rangeLabel = from === to ? longDate(from) : `${longDate(from)} — ${longDate(to)}`;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Exports</h1>
        <p className="mt-1 text-sm text-slate-500">
          Download the period&apos;s ledgers as CSV for GST, TDS and income-tax work. {rangeLabel}.
        </p>
      </header>

      <form method="get" className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[9.5rem]">
          <label htmlFor="from" className="field-label">From</label>
          <input id="from" type="date" name="from" defaultValue={from} max={today} className="field-input" />
        </div>
        <div className="min-w-[9.5rem]">
          <label htmlFor="to" className="field-label">To</label>
          <input id="to" type="date" name="to" defaultValue={to} max={today} className="field-input" />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          Set period
        </button>
        <div className="flex w-full flex-wrap gap-1.5 border-t border-slate-100 pt-3">
          {presets.map((p) => {
            const active = p.from === from && p.to === to;
            return (
              <Link
                key={p.label}
                href={`/finance/exports?from=${p.from}&to=${p.to}`}
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

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card flex flex-col p-5">
          <h2 className="text-sm font-semibold text-slate-800">Bills — revenue ledger</h2>
          <p className="mt-1 flex-1 text-xs leading-5 text-slate-500">
            One row per invoice: date, patient, referring doctor, services, subtotal, discount,
            total, paid, balance and payment mode. Cancelled bills are included and marked, with
            their refund, so the file reconciles to the invoice run. This is the turnover figure
            behind GST returns and the income side of the P&amp;L.
          </p>
          <a
            href={`/finance/exports/bills?${qs}`}
            className="mt-4 inline-flex w-fit items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            Download bills CSV
          </a>
        </div>

        <div className="card flex flex-col p-5">
          <h2 className="text-sm font-semibold text-slate-800">Expenses — outgoings ledger</h2>
          <p className="mt-1 flex-1 text-xs leading-5 text-slate-500">
            One row per expense: date, category, who was paid, note, amount and payment mode.
            This is the expense side of the P&amp;L, and the list to review for payments that
            attract TDS, such as rent and professional fees.
          </p>
          <a
            href={`/finance/exports/expenses?${qs}`}
            className="mt-4 inline-flex w-fit items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            Download expenses CSV
          </a>
        </div>
      </section>

      <p className="text-xs text-slate-400">
        Amounts are in rupees. Each download is recorded in the activity log. The files carry the
        figures; the tax treatment of them is for your accountant.
      </p>
    </div>
  );
}
