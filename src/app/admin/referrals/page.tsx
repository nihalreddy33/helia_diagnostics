import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-helpers";
import { formatINR } from "@/lib/types";
import {
  istDayString,
  longDate,
  rangeToInstants,
  resolveRange,
  shiftDay,
  startOfMonth,
  endOfMonth,
} from "@/lib/date-range";
import { DbErrorNotice } from "@/components/DbErrorNotice";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

/** Label for bills with no referring doctor, and the slug its drill-down uses. */
const NOT_RECORDED_LABEL = "(not recorded)";
const NOT_RECORDED_SLUG = "--none--";

type DoctorRow = {
  name: string; // display name (as most commonly recorded)
  bills: number;
  billed: number; // paise (net of discount)
  collected: number; // paise
  balance: number; // paise
};

export default async function ReferralsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; q?: string }>;
}) {
  const { from: fromParam, to: toParam, q } = await searchParams;
  const today = istDayString(new Date());
  // Referrals default to all-time; a range only applies once dates are given.
  const hasRange = Boolean(fromParam || toParam);
  const { from, to } = resolveRange(fromParam, toParam, today);
  const query = (q ?? "").trim();

  const lastMonthDay = shiftDay(startOfMonth(today), -1);
  const presets: { label: string; from: string; to: string }[] = [
    { label: "This month", from: startOfMonth(today), to: today },
    { label: "Last month", from: startOfMonth(lastMonthDay), to: endOfMonth(lastMonthDay) },
    { label: "Last 30 days", from: shiftDay(today, -29), to: today },
    { label: "This year", from: `${today.slice(0, 4)}-01-01`, to: today },
  ];

  const data = await safeQuery(async () => {
    const bills = await prisma.bill.findMany({
      where: {
        cancelledAt: null,
        ...(hasRange
          ? (() => {
              const { start, end } = rangeToInstants(from, to);
              return { createdAt: { gte: start, lt: end } };
            })()
          : {}),
      },
      select: { referringDoctor: true, total: true, amountPaid: true },
    });
    return { bills };
  });

  if (data === null) {
    return (
      <div className="space-y-6">
        <Header />
        <DbErrorNotice />
      </div>
    );
  }

  // Group by doctor, case-insensitively; keep the most frequent spelling for display.
  const groups = new Map<string, { spellings: Map<string, number>; bills: number; billed: number; collected: number }>();
  for (const b of data.bills) {
    const raw = b.referringDoctor.trim() || NOT_RECORDED_LABEL;
    const key = raw.toLowerCase();
    const g = groups.get(key) ?? { spellings: new Map(), bills: 0, billed: 0, collected: 0 };
    g.spellings.set(raw, (g.spellings.get(raw) ?? 0) + 1);
    g.bills += 1;
    g.billed += b.total;
    g.collected += b.amountPaid;
    groups.set(key, g);
  }

  const allRows: DoctorRow[] = [...groups.values()]
    .map((g) => ({
      name: [...g.spellings.entries()].sort((a, b) => b[1] - a[1])[0]![0],
      bills: g.bills,
      billed: g.billed,
      collected: g.collected,
      balance: Math.max(0, g.billed - g.collected),
    }))
    .sort((a, b) => b.billed - a.billed);

  // Share stays measured against the whole period, so a doctor's percentage
  // means the same thing whether or not the list is filtered by name.
  const periodBilled = allRows.reduce((n, r) => n + r.billed, 0);
  const rows = query
    ? allRows.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()))
    : allRows;

  const totals = rows.reduce(
    (acc, r) => ({
      bills: acc.bills + r.bills,
      billed: acc.billed + r.billed,
      collected: acc.collected + r.collected,
      balance: acc.balance + r.balance,
    }),
    { bills: 0, billed: 0, collected: 0, balance: 0 },
  );

  const rangeLabel = !hasRange
    ? "All time."
    : from === to
      ? `${longDate(from)}.`
      : `${longDate(from)} to ${longDate(to)}.`;

  // Carry the active range and search into a doctor's drill-down.
  const detailParams = new URLSearchParams();
  if (hasRange) {
    detailParams.set("from", from);
    detailParams.set("to", to);
  }
  if (query) detailParams.set("q", query);
  const detailQs = detailParams.toString() ? `?${detailParams.toString()}` : "";

  return (
    <div className="space-y-6">
      <Header rangeLabel={rangeLabel} />

      <form method="get" className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[14rem] flex-1">
          <label htmlFor="q" className="field-label">Search doctor</label>
          <input
            id="q"
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search by referring doctor's name…"
            className="field-input"
          />
        </div>
        <div className="min-w-[9.5rem]">
          <label htmlFor="from" className="field-label">From</label>
          <input id="from" type="date" name="from" defaultValue={hasRange ? from : ""} max={today} className="field-input" />
        </div>
        <div className="min-w-[9.5rem]">
          <label htmlFor="to" className="field-label">To</label>
          <input id="to" type="date" name="to" defaultValue={hasRange ? to : ""} max={today} className="field-input" />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            Apply
          </button>
          <Link
            href="/admin/referrals"
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-300 transition hover:bg-slate-50"
          >
            Reset
          </Link>
        </div>
        <div className="flex w-full flex-wrap gap-1.5 border-t border-slate-100 pt-3">
          {[{ label: "All time", from: "", to: "" }, ...presets].map((p) => {
            const active = p.from ? hasRange && p.from === from && p.to === to : !hasRange;
            const params = new URLSearchParams();
            if (p.from) {
              params.set("from", p.from);
              params.set("to", p.to);
            }
            if (query) params.set("q", query);
            const qs = params.toString();
            return (
              <Link
                key={p.label}
                href={`/admin/referrals${qs ? `?${qs}` : ""}`}
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

      {rows.length === 0 ? (
        <EmptyState
          title={query ? `No referrer matches “${query}”` : "No bills in this period"}
          description={
            query
              ? "Try a different spelling, or clear the search to see every referrer."
              : "Bills raised at reception (with a referring doctor) will be summarised here."
          }
          icon="🩺"
        />
      ) : (
        <>
          {/* Summary cards */}
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Billed</p>
              <p className="mt-1 font-mono text-xl font-bold text-slate-900">{formatINR(totals.billed)}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {totals.bills} bill{totals.bills === 1 ? "" : "s"} · {rows.length} referrer{rows.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Collected</p>
              <p className="mt-1 font-mono text-xl font-bold text-emerald-700">{formatINR(totals.collected)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pending balance</p>
              <p className="mt-1 font-mono text-xl font-bold text-red-600">{formatINR(totals.balance)}</p>
            </div>
          </section>

          {/* Per-doctor table */}
          <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-2.5 font-semibold">Referring doctor</th>
                  <th className="px-4 py-2.5 text-center font-semibold">Bills</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Billed</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Collected</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Balance</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Share</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name.toLowerCase()} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2.5 font-medium">
                      <Link
                        href={`/admin/referrals/${encodeURIComponent(
                          r.name === NOT_RECORDED_LABEL ? NOT_RECORDED_SLUG : r.name.toLowerCase(),
                        )}${detailQs}`}
                        className="text-slate-800 hover:text-brand-700 hover:underline"
                      >
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-center text-slate-600">{r.bills}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-800">{formatINR(r.billed)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-emerald-700">{formatINR(r.collected)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-600">
                      {r.balance > 0 ? formatINR(r.balance) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-500">
                      {periodBilled > 0 ? `${((r.billed / periodBilled) * 100).toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                  <td className="px-4 py-2.5 text-slate-900">Total</td>
                  <td className="px-4 py-2.5 text-center text-slate-900">{totals.bills}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-900">{formatINR(totals.billed)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-emerald-700">{formatINR(totals.collected)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-700">{formatINR(totals.balance)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-500">
                    {periodBilled > 0 ? `${((totals.billed / periodBilled) * 100).toFixed(1)}%` : "—"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </section>

          <p className="text-xs text-slate-400">
            Cancelled bills are excluded. &ldquo;Billed&rdquo; is net of discounts; names are grouped
            case-insensitively.
          </p>
        </>
      )}
    </div>
  );
}

function Header({ rangeLabel }: { rangeLabel?: string }) {
  return (
    <header>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Referral Business</h1>
      <p className="mt-1 text-sm text-slate-500">
        Revenue by referring doctor — who sends you business, and how much.
        {rangeLabel ? ` ${rangeLabel}` : ""}
      </p>
    </header>
  );
}
