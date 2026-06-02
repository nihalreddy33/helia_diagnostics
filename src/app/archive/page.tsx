import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-helpers";
import { formatMonthYear, MODALITY_LABELS } from "@/lib/types";
import { DbErrorNotice } from "@/components/DbErrorNotice";
import { EmptyState } from "@/components/EmptyState";
import { ArchiveFilters } from "@/components/ArchiveFilters";
import { StatusBadge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

type SearchParams = { month?: string; q?: string };

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { month = "", q = "" } = await searchParams;
  const query = q.trim();

  const where: Prisma.ReportWhereInput = { status: "APPROVED" };
  if (month) where.createdMonthYear = month;
  if (query) {
    where.OR = [
      { impression: { contains: query, mode: "insensitive" } },
      { findings: { contains: query, mode: "insensitive" } },
      { patient: { name: { contains: query, mode: "insensitive" } } },
      { patient: { uhid: { contains: query, mode: "insensitive" } } },
    ];
  }

  const data = await safeQuery(async () => {
    const [reports, monthGroups] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: [{ createdMonthYear: "desc" }, { approvedAt: "desc" }],
        include: { patient: true, template: true, radiologist: true },
      }),
      prisma.report.groupBy({
        by: ["createdMonthYear"],
        where: { status: "APPROVED" },
        orderBy: { createdMonthYear: "desc" },
      }),
    ]);
    return { reports, months: monthGroups.map((g) => g.createdMonthYear) };
  });

  if (data === null) {
    return (
      <PageShell>
        <DbErrorNotice />
      </PageShell>
    );
  }

  // Group the filtered reports by their month bucket for display.
  const grouped = new Map<string, typeof data.reports>();
  for (const r of data.reports) {
    const list = grouped.get(r.createdMonthYear) ?? [];
    list.push(r);
    grouped.set(r.createdMonthYear, list);
  }
  const groupedEntries = [...grouped.entries()];

  return (
    <PageShell>
      <ArchiveFilters months={data.months} selectedMonth={month} query={query} />

      {groupedEntries.length === 0 ? (
        <EmptyState
          title="No approved reports found"
          description={query || month ? "Try adjusting your filters." : "Approved reports will be archived here by month."}
          icon="🗂️"
        />
      ) : (
        <div className="space-y-8">
          {groupedEntries.map(([monthYear, reports]) => (
            <section key={monthYear}>
              <div className="mb-3 flex items-baseline gap-2">
                <h2 className="text-lg font-semibold text-slate-900">{formatMonthYear(monthYear)}</h2>
                <span className="font-mono text-xs text-slate-400">{monthYear}</span>
                <span className="ml-auto text-sm text-slate-500">
                  {reports.length} report{reports.length === 1 ? "" : "s"}
                </span>
              </div>

              <ul className="space-y-3">
                {reports.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold text-slate-900">{r.patient.name}</span>
                        <span className="ml-2 font-mono text-xs text-slate-500">{r.patient.uhid}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {r.template && (
                          <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                            {MODALITY_LABELS[r.template.modality]}
                          </span>
                        )}
                        <StatusBadge status="APPROVED" />
                      </div>
                    </div>

                    <dl className="mt-3 space-y-2 text-sm">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Findings</dt>
                        <dd className="mt-0.5 whitespace-pre-wrap text-slate-700">{r.findings}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Impression</dt>
                        <dd className="mt-0.5 whitespace-pre-wrap text-slate-700">{r.impression}</dd>
                      </div>
                    </dl>

                    <div className="mt-3 text-xs text-slate-400">
                      {r.radiologist ? `Reported by ${r.radiologist.name}` : "Radiologist unassigned"}
                      {r.approvedAt && (
                        <> · Approved {r.approvedAt.toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}</>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Archive — Approved Reports</h1>
        <p className="mt-1 text-slate-600">Approved reports organized by month. Search and filter below.</p>
      </header>
      {children}
    </div>
  );
}
