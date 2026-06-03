import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-helpers";
import { DbErrorNotice } from "@/components/DbErrorNotice";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/ui/Badge";
import { MODALITY_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function PrintHubPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const reports = await safeQuery(() =>
    prisma.report.findMany({
      where: {
        status: "APPROVED",
        ...(query
          ? {
              OR: [
                { patient: { name: { contains: query, mode: "insensitive" } } },
                { patient: { uhid: { contains: query, mode: "insensitive" } } },
                { impression: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { patient: true, template: true },
      orderBy: { approvedAt: "desc" },
      take: 50,
    }),
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Print Hub</h1>
        <p className="mt-1 text-sm text-slate-500">
          Search approved reports and open a print-ready letterhead.
        </p>
      </header>

      <form method="get" className="mb-6 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search by patient name, UHID, or impression…"
          className="field-input"
          aria-label="Search approved reports"
        />
        <button
          type="submit"
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
        >
          Search
        </button>
      </form>

      {reports === null ? (
        <DbErrorNotice />
      ) : reports.length === 0 ? (
        <EmptyState
          title={query ? "No matching reports" : "No approved reports yet"}
          description={
            query
              ? "Try a different patient name, UHID, or impression keyword."
              : "Approved reports will appear here, ready to print."
          }
          icon="🖨️"
        />
      ) : (
        <ul className="space-y-2">
          {reports.map((r) => (
            <li key={r.id}>
              <Link
                href={`/receptionist/print/${r.id}`}
                className="card flex items-center justify-between gap-4 p-4 transition hover:border-brand-300 hover:shadow"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {r.patient.name}
                    <span className="ml-2 font-mono text-xs font-normal text-slate-400">
                      {r.patient.uhid}
                    </span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {r.template ? MODALITY_LABELS[r.template.modality] : "Report"} ·{" "}
                    {formatDate(r.approvedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusBadge status={r.status} />
                  <span aria-hidden className="text-slate-300">
                    ›
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
