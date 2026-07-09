import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-helpers";
import { DbErrorNotice } from "@/components/DbErrorNotice";
import { EmptyState } from "@/components/EmptyState";
import { MODALITY_LABELS, formatMonthYear } from "@/lib/types";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function RadiologistPrintHub({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; month?: string }>;
}) {
  const { q, month } = await searchParams;
  const query = (q ?? "").trim();
  const selectedMonth = (month ?? "").trim();

  const data = await safeQuery(async () => {
    const where: Prisma.ReportWhereInput = { status: "APPROVED" };
    if (selectedMonth) where.createdMonthYear = selectedMonth;
    if (query) {
      where.OR = [
        { patient: { name: { contains: query, mode: "insensitive" } } },
        { patient: { uhid: { contains: query, mode: "insensitive" } } },
        { impression: { contains: query, mode: "insensitive" } },
      ];
    }
    const [reports, monthGroups] = await Promise.all([
      prisma.report.findMany({
        where,
        include: { patient: true, template: true },
        orderBy: { approvedAt: "desc" },
      }),
      prisma.report.groupBy({ by: ["createdMonthYear"], where: { status: "APPROVED" } }),
    ]);
    return { reports, months: monthGroups.map((g) => g.createdMonthYear).sort((a, b) => (a < b ? 1 : -1)) };
  });

  if (data === null) {
    return (
      <div className="space-y-6">
        <Header />
        <DbErrorNotice />
      </div>
    );
  }

  // Group reports by month (already newest-first by approvedAt).
  const grouped = new Map<string, typeof data.reports>();
  for (const r of data.reports) {
    const list = grouped.get(r.createdMonthYear) ?? [];
    list.push(r);
    grouped.set(r.createdMonthYear, list);
  }
  const groups = [...grouped.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));

  return (
    <div className="space-y-6">
      <Header />

      <form method="get" className="mb-2 flex flex-wrap items-end gap-3 card p-4">
        <div className="min-w-[12rem] flex-1">
          <label htmlFor="q" className="field-label">
            Search
          </label>
          <input
            id="q"
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Patient name, UHID, or impression…"
            className="field-input"
          />
        </div>
        <div className="min-w-[10rem]">
          <label htmlFor="month" className="field-label">
            Month
          </label>
          <select id="month" name="month" defaultValue={selectedMonth} className="field-input">
            <option value="">All months</option>
            {data.months.map((m) => (
              <option key={m} value={m}>
                {formatMonthYear(m)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            Apply
          </button>
          <Link
            href="/radiologist/print"
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-300 transition hover:bg-slate-50"
          >
            Reset
          </Link>
        </div>
      </form>

      {groups.length === 0 ? (
        <EmptyState
          title={query || selectedMonth ? "No matching reports" : "No approved reports yet"}
          description={
            query || selectedMonth
              ? "Try a different search term or month."
              : "Reports you approve appear here, ready to open on the Helia letterhead and print."
          }
          icon="🖨️"
        />
      ) : (
        <div className="space-y-8">
          {groups.map(([monthKey, reports]) => (
            <section key={monthKey}>
              <div className="mb-3 flex items-baseline gap-2">
                <h2 className="text-lg font-semibold text-slate-900">{formatMonthYear(monthKey)}</h2>
                <span className="font-mono text-xs text-slate-400">{monthKey}</span>
                <span className="ml-auto text-sm text-slate-500">
                  {reports.length} report{reports.length === 1 ? "" : "s"}
                </span>
              </div>

              <ul className="space-y-2">
                {reports.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/radiologist/print/${r.id}`}
                      className="card group flex flex-wrap items-center gap-3 p-4 transition hover:border-brand-300"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800 group-hover:text-brand-700">
                          {r.patient.name}
                          <span className="ml-2 font-mono text-xs font-normal text-slate-400">
                            {r.patient.uhid}
                          </span>
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {(r.template ? MODALITY_LABELS[r.template.modality] : "Report")}
                          {r.template ? ` · ${r.template.title}` : ""} · {formatDate(r.approvedAt)}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-medium text-brand-700 group-hover:underline">
                        Open &amp; print →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Header() {
  return (
    <header>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Print Hub</h1>
      <p className="mt-1 text-sm text-slate-500">
        Your approved radiology reports, grouped by month. Open any one on the Helia letterhead to
        print or save as PDF.
      </p>
    </header>
  );
}
