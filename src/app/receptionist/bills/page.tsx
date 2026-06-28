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

/** Midnight (start) of the given IST date (YYYY-MM-DD), as a UTC instant. */
function istDayStart(dateStr: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const d = new Date(`${dateStr}T00:00:00+05:30`);
  return Number.isNaN(d.getTime()) ? null : d;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function BillsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string }>;
}) {
  const { q, from, to } = await searchParams;
  const query = (q ?? "").trim();
  const fromStr = (from ?? "").trim();
  const toStr = (to ?? "").trim();

  // Inclusive date range in IST: bills from the start of `from` up to the end
  // of `to` (i.e. the day after `to` at midnight).
  const fromInstant = fromStr ? istDayStart(fromStr) : null;
  const toDayStart = toStr ? istDayStart(toStr) : null;
  const toInstant = toDayStart ? new Date(toDayStart.getTime() + DAY_MS) : null;

  const hasFilters = Boolean(query) || Boolean(fromInstant) || Boolean(toInstant);

  const data = await safeQuery(() => {
    const where: Prisma.BillWhereInput = {};
    if (fromInstant || toInstant) {
      where.createdAt = {};
      if (fromInstant) where.createdAt.gte = fromInstant;
      if (toInstant) where.createdAt.lt = toInstant;
    }
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
        <div className="min-w-[9rem]">
          <label htmlFor="from" className="field-label">
            From
          </label>
          <input id="from" type="date" name="from" defaultValue={fromStr} className="field-input" />
        </div>
        <div className="min-w-[9rem]">
          <label htmlFor="to" className="field-label">
            To
          </label>
          <input id="to" type="date" name="to" defaultValue={toStr} className="field-input" />
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
