import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-helpers";
import { DbErrorNotice } from "@/components/DbErrorNotice";
import { EmptyState } from "@/components/EmptyState";
import { ExpenseForm } from "@/components/admin/ExpenseForm";
import { DeleteExpenseButton } from "@/components/admin/DeleteExpenseButton";
import {
  formatINR,
  DEPARTMENT_LABELS,
  EXPENSE_CATEGORY_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/types";
import type { Department, ExpenseCategory, PaymentMethod } from "@/lib/types";
import {
  istDayString,
  longDate,
  rangeToInstants,
  resolveRange,
  shiftDay,
  shortDate,
  startOfMonth,
  endOfMonth,
} from "@/lib/date-range";

export const dynamic = "force-dynamic";

/**
 * Financial — the admin's money view: what came in, what went out, what's left.
 *
 * Profit is reported on a cash basis (collected − spent) because that is what
 * the centre actually banks; billed revenue is shown alongside it so the gap
 * between raised and received stays visible.
 */
export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from: fromParam, to: toParam } = await searchParams;
  const today = istDayString(new Date());
  // Default to the current month — the period an owner actually works in.
  const monthStart = startOfMonth(today);
  const { from, to } = resolveRange(fromParam ?? monthStart, toParam ?? today, monthStart);
  const { start, end } = rangeToInstants(from, to);

  const lastMonthDay = shiftDay(monthStart, -1);
  const presets = [
    { label: "This month", from: monthStart, to: today },
    { label: "Last month", from: startOfMonth(lastMonthDay), to: endOfMonth(lastMonthDay) },
    { label: "Last 30 days", from: shiftDay(today, -29), to: today },
    { label: "This year", from: `${today.slice(0, 4)}-01-01`, to: today },
  ];

  const data = await safeQuery(async () => {
    const [bills, cancelled, expenses] = await Promise.all([
      prisma.bill.findMany({
        where: { createdAt: { gte: start, lt: end }, cancelledAt: null },
        select: {
          subtotal: true,
          discount: true,
          total: true,
          amountPaid: true,
          paymentMethod: true,
          items: {
            select: { amount: true, service: { select: { department: true } } },
          },
        },
      }),
      prisma.bill.findMany({
        where: { cancelledAt: { gte: start, lt: end } },
        select: { refundAmount: true },
      }),
      prisma.expense.findMany({
        where: { spentAt: { gte: start, lt: end } },
        orderBy: { spentAt: "desc" },
        select: {
          id: true,
          category: true,
          amount: true,
          vendor: true,
          note: true,
          paymentMethod: true,
          spentAt: true,
          recordedBy: { select: { name: true } },
        },
      }),
    ]);
    return { bills, cancelled, expenses };
  });

  if (data === null) {
    return (
      <div className="space-y-6">
        <Header rangeLabel="" />
        <DbErrorNotice />
      </div>
    );
  }

  const { bills, cancelled, expenses } = data;

  // --- Money in --------------------------------------------------------------
  let billed = 0;
  let collected = 0;
  let discounts = 0;
  const byMode: Record<PaymentMethod, number> = { CASH: 0, CARD: 0, UPI: 0 };
  const byDept = new Map<Department, number>();

  for (const b of bills) {
    billed += b.total;
    collected += b.amountPaid;
    discounts += b.discount;
    if (b.amountPaid > 0) byMode[(b.paymentMethod ?? "CASH") as PaymentMethod] += b.amountPaid;
    for (const it of b.items) {
      const d = (it.service?.department ?? "OTHER") as Department;
      byDept.set(d, (byDept.get(d) ?? 0) + it.amount);
    }
  }
  const outstanding = Math.max(0, billed - collected);
  const refunded = cancelled.reduce((n, c) => n + c.refundAmount, 0);

  // --- Money out -------------------------------------------------------------
  const spent = expenses.reduce((n, e) => n + e.amount, 0);
  const byCategory = new Map<ExpenseCategory, number>();
  for (const e of expenses) {
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
  }
  const categoryRows = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);

  // Cash basis: what was banked, less what was paid out and refunded.
  const netProfit = collected - spent - refunded;
  const margin = collected > 0 ? (netProfit / collected) * 100 : 0;

  const rangeLabel = from === to ? longDate(from) : `${longDate(from)} — ${longDate(to)}`;

  return (
    <div className="space-y-6">
      <Header rangeLabel={rangeLabel} />

      {/* Period filter */}
      <form method="get" className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[9.5rem]">
          <label htmlFor="from" className="field-label">From</label>
          <input id="from" type="date" name="from" defaultValue={from} max={today} className="field-input" />
        </div>
        <div className="min-w-[9.5rem]">
          <label htmlFor="to" className="field-label">To</label>
          <input id="to" type="date" name="to" defaultValue={to} max={today} className="field-input" />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            Apply
          </button>
          <Link
            href="/admin/finance"
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
                href={`/admin/finance?from=${p.from}&to=${p.to}`}
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

      {/* Headline: in, out, profit */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Collected</p>
          <p className="mt-1 font-mono text-2xl font-bold text-emerald-700">{formatINR(collected)}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {formatINR(billed)} billed · {bills.length} bill{bills.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Expenses</p>
          <p className="mt-1 font-mono text-2xl font-bold text-red-600">{formatINR(spent)}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {expenses.length} entr{expenses.length === 1 ? "y" : "ies"}
            {refunded > 0 ? ` · ${formatINR(refunded)} refunded` : ""}
          </p>
        </div>
        <div
          className={`card p-4 ${netProfit >= 0 ? "border-brand-200 bg-brand-50" : "border-red-200 bg-red-50"}`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Net profit</p>
          <p
            className={`mt-1 font-mono text-2xl font-bold ${netProfit >= 0 ? "text-brand-800" : "text-red-700"}`}
          >
            {formatINR(netProfit)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {collected > 0 ? `${margin.toFixed(1)}% margin · ` : ""}cash basis
          </p>
        </div>
      </section>

      {/* Secondary money-in detail */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Collections by mode</h2>
          <dl className="space-y-1.5 text-sm">
            {PAYMENT_METHODS.map((m) => (
              <Row key={m} label={PAYMENT_METHOD_LABELS[m]} value={formatINR(byMode[m])} />
            ))}
            <div className="border-t border-slate-100 pt-1.5">
              <Row label="Total" value={formatINR(collected)} strong />
            </div>
          </dl>
        </div>

        <div className="card p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Revenue by department</h2>
          {byDept.size === 0 ? (
            <p className="text-sm text-slate-400">No billed items in this period.</p>
          ) : (
            <dl className="space-y-1.5 text-sm">
              {[...byDept.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([d, amt]) => (
                  <Row key={d} label={DEPARTMENT_LABELS[d]} value={formatINR(amt)} />
                ))}
            </dl>
          )}
        </div>

        <div className="card p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Adjustments</h2>
          <dl className="space-y-1.5 text-sm">
            <Row label="Discounts given" value={formatINR(discounts)} />
            <Row label="Refunds (cancelled)" value={formatINR(refunded)} />
            <Row label="Outstanding dues" value={formatINR(outstanding)} />
          </dl>
          <p className="mt-2 text-xs text-slate-400">
            Outstanding is billed minus collected for this period — not yet banked.
          </p>
        </div>
      </section>

      {/* Expense entry */}
      <section className="card p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Record an expense
        </h2>
        <p className="mb-3 text-xs text-slate-500">
          Money the centre spent. Dated by when it was spent, so it lands in the right period.
        </p>
        <ExpenseForm today={today} />
      </section>

      {/* Expenses breakdown + list */}
      <section className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <div className="card h-fit p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Expenses by category</h2>
          {categoryRows.length === 0 ? (
            <p className="text-sm text-slate-400">Nothing recorded in this period.</p>
          ) : (
            <dl className="space-y-1.5 text-sm">
              {categoryRows.map(([c, amt]) => (
                <Row key={c} label={EXPENSE_CATEGORY_LABELS[c]} value={formatINR(amt)} />
              ))}
              <div className="border-t border-slate-100 pt-1.5">
                <Row label="Total" value={formatINR(spent)} strong />
              </div>
            </dl>
          )}
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">
            Expenses <span className="font-normal text-slate-400">({expenses.length})</span>
          </h2>
          {expenses.length === 0 ? (
            <EmptyState
              title="No expenses in this period"
              description="Add rent, salaries, consumables and the rest above to see actual profit."
              icon="💸"
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-2.5 font-semibold">Date</th>
                    <th className="px-4 py-2.5 font-semibold">Category</th>
                    <th className="px-4 py-2.5 font-semibold">Paid to / note</th>
                    <th className="px-4 py-2.5 font-semibold">Mode</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Amount</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                        {shortDate(e.spentAt)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {EXPENSE_CATEGORY_LABELS[e.category]}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">
                        {e.vendor || <span className="text-slate-400">—</span>}
                        {e.note && <span className="ml-2 text-xs text-slate-400">{e.note}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">
                        {e.paymentMethod ? PAYMENT_METHOD_LABELS[e.paymentMethod] : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-slate-900">
                        {formatINR(e.amount)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <DeleteExpenseButton
                          id={e.id}
                          label={`${EXPENSE_CATEGORY_LABELS[e.category]} ${formatINR(e.amount)}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <p className="text-xs text-slate-400">
        Cancelled bills are excluded from revenue; their refunds are deducted separately. Net profit
        is collected minus expenses and refunds — money actually banked, not amounts still owed.
      </p>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className={strong ? "font-semibold text-slate-800" : "text-slate-500"}>{label}</dt>
      <dd className={`font-mono ${strong ? "font-semibold text-slate-900" : "text-slate-700"}`}>
        {value}
      </dd>
    </div>
  );
}

function Header({ rangeLabel }: { rangeLabel: string }) {
  return (
    <header>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Financial</h1>
      <p className="mt-1 text-sm text-slate-500">
        Money in, money out, and what the centre actually kept.
        {rangeLabel ? ` ${rangeLabel}.` : ""}
      </p>
    </header>
  );
}
