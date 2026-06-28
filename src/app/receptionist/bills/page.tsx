import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-helpers";
import {
  formatINR,
  formatDateTimeIST,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_STYLES,
} from "@/lib/types";
import { DbErrorNotice } from "@/components/DbErrorNotice";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

/** Start/end of the given IST date (YYYY-MM-DD), as UTC instants. */
function istDayRange(dateStr: string): { start: Date; end: Date } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const start = new Date(`${dateStr}T00:00:00+05:30`);
  if (Number.isNaN(start.getTime())) return null;
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

export default async function BillsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; date?: string }>;
}) {
  const { q, date } = await searchParams;
  const query = (q ?? "").trim();
  const dateStr = (date ?? "").trim();
  const range = dateStr ? istDayRange(dateStr) : null;
  const hasFilters = Boolean(query) || Boolean(range);

  const data = await safeQuery(() => {
    const where: Prisma.BillWhereInput = {};
    if (range) where.createdAt = { gte: range.start, lt: range.end };
    if (query) {
      where.OR = [
        { patient: { name: { contains: query, mode: "insensitive" } } },
        { patient: { mobile: { contains: query } } },
        { invoiceNo: { contains: query, mode: "insensitive" } },
      ];
    }
    return prisma.bill.findMany({
      where,
      include: { patient: true },
      orderBy: { createdAt: "desc" },
      take: hasFilters ? 100 : 10,
    });
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bill Search</h1>
        <p className="mt-1 text-sm text-slate-500">
          Find billed customers by name, mobile number, invoice no, or date.
        </p>
      </header>

      <form method="get" className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[14rem] flex-1">
          <label htmlFor="q" className="field-label">
            Name / mobile / invoice
          </label>
          <input
            id="q"
            type="search"
            name="q"
            defaultValue={query}
            placeholder="e.g. kamlakar, 7288955190, HELIA-INV-1004"
            className="field-input"
          />
        </div>
        <div className="min-w-[10rem]">
          <label htmlFor="date" className="field-label">
            Date
          </label>
          <input id="date" type="date" name="date" defaultValue={dateStr} className="field-input" />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            Search
          </button>
          <Link
            href="/receptionist/bills"
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-300 transition hover:bg-slate-50"
          >
            Reset
          </Link>
        </div>
      </form>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          {hasFilters ? "Results" : "Recent bills"}
          {data && <span className="ml-1 text-slate-400">({data.length})</span>}
        </h2>

        {data === null ? (
          <DbErrorNotice />
        ) : data.length === 0 ? (
          <EmptyState
            title={hasFilters ? "No bills found" : "No bills yet"}
            description={
              hasFilters
                ? "Try a different name, number, or date."
                : "Bills raised at reception will appear here."
            }
            icon="🧾"
          />
        ) : (
          <ul className="space-y-2">
            {data.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/receptionist/billing/${b.id}`}
                  className="card flex flex-wrap items-center justify-between gap-3 p-4 text-sm transition hover:border-brand-300"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800">
                      {b.patient.name}
                      <span className="ml-2 font-mono text-xs font-normal text-slate-400">
                        {b.patient.uhid}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      <span className="font-mono">{b.invoiceNo}</span>
                      {b.patient.mobile ? ` · ${b.patient.mobile}` : ""}
                      <span className="mx-1 text-slate-300">·</span>
                      {formatDateTimeIST(b.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold text-slate-800">
                      {formatINR(b.total)}
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
    </div>
  );
}
