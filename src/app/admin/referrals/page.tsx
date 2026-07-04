import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-helpers";
import { formatINR, formatMonthYear } from "@/lib/types";
import { DbErrorNotice } from "@/components/DbErrorNotice";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

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
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const selectedMonth = (month ?? "").trim();

  const data = await safeQuery(async () => {
    const [bills, monthGroups] = await Promise.all([
      prisma.bill.findMany({
        where: {
          cancelledAt: null,
          ...(selectedMonth ? { createdMonthYear: selectedMonth } : {}),
        },
        select: { referringDoctor: true, total: true, amountPaid: true },
      }),
      prisma.bill.groupBy({
        by: ["createdMonthYear"],
        where: { cancelledAt: null },
        orderBy: { createdMonthYear: "desc" },
      }),
    ]);
    return { bills, months: monthGroups.map((g) => g.createdMonthYear) };
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
    const raw = b.referringDoctor.trim() || "(not recorded)";
    const key = raw.toLowerCase();
    const g = groups.get(key) ?? { spellings: new Map(), bills: 0, billed: 0, collected: 0 };
    g.spellings.set(raw, (g.spellings.get(raw) ?? 0) + 1);
    g.bills += 1;
    g.billed += b.total;
    g.collected += b.amountPaid;
    groups.set(key, g);
  }

  const rows: DoctorRow[] = [...groups.values()]
    .map((g) => ({
      name: [...g.spellings.entries()].sort((a, b) => b[1] - a[1])[0]![0],
      bills: g.bills,
      billed: g.billed,
      collected: g.collected,
      balance: Math.max(0, g.billed - g.collected),
    }))
    .sort((a, b) => b.billed - a.billed);

  const totals = rows.reduce(
    (acc, r) => ({
      bills: acc.bills + r.bills,
      billed: acc.billed + r.billed,
      collected: acc.collected + r.collected,
      balance: acc.balance + r.balance,
    }),
    { bills: 0, billed: 0, collected: 0, balance: 0 },
  );

  return (
    <div className="space-y-6">
      <Header />

      <form method="get" className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[11rem]">
          <label htmlFor="month" className="field-label">
            Month
          </label>
          <select id="month" name="month" defaultValue={selectedMonth} className="field-input">
            <option value="">All time</option>
            {data.months.map((m) => (
              <option key={m} value={m}>
                {formatMonthYear(m)}
              </option>
            ))}
          </select>
        </div>
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
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title="No bills in this period"
          description="Bills raised at reception (with a referring doctor) will be summarised here."
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
                    <td className="px-4 py-2.5 font-medium text-slate-800">{r.name}</td>
                    <td className="px-4 py-2.5 text-center text-slate-600">{r.bills}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-800">{formatINR(r.billed)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-emerald-700">{formatINR(r.collected)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-600">
                      {r.balance > 0 ? formatINR(r.balance) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-500">
                      {totals.billed > 0 ? `${((r.billed / totals.billed) * 100).toFixed(1)}%` : "—"}
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
                  <td className="px-4 py-2.5 text-right text-slate-500">100%</td>
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

function Header() {
  return (
    <header>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Referral Business</h1>
      <p className="mt-1 text-sm text-slate-500">
        Revenue by referring doctor — who sends you business, and how much.
      </p>
    </header>
  );
}
