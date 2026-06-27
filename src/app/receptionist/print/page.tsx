import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-helpers";
import { DbErrorNotice } from "@/components/DbErrorNotice";
import { EmptyState } from "@/components/EmptyState";
import { DeliveryToggle } from "@/components/receptionist/DeliveryToggle";
import { MODALITY_LABELS, formatMonthYear } from "@/lib/types";

export const dynamic = "force-dynamic";

type PrintItem = {
  id: string;
  kind: "Radiology" | "Lab";
  patientName: string;
  uhid: string;
  label: string;
  approvedAt: Date | null;
  deliveredAt: Date | null;
  deliveredBy: string | null;
  monthYear: string;
  href: string;
};

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
  searchParams: Promise<{ q?: string; month?: string; delivery?: string }>;
}) {
  const { q, month, delivery } = await searchParams;
  const query = (q ?? "").trim();
  const selectedMonth = (month ?? "").trim();
  const deliveryFilter = delivery === "pending" || delivery === "delivered" ? delivery : "";

  const data = await safeQuery(async () => {
    const radWhere: Prisma.ReportWhereInput = { status: "APPROVED" };
    const labWhere: Prisma.LabReportWhereInput = { status: "APPROVED" };
    if (selectedMonth) {
      radWhere.createdMonthYear = selectedMonth;
      labWhere.createdMonthYear = selectedMonth;
    }
    if (deliveryFilter === "pending") {
      radWhere.deliveredAt = null;
      labWhere.deliveredAt = null;
    } else if (deliveryFilter === "delivered") {
      radWhere.deliveredAt = { not: null };
      labWhere.deliveredAt = { not: null };
    }
    if (query) {
      radWhere.OR = [
        { patient: { name: { contains: query, mode: "insensitive" } } },
        { patient: { uhid: { contains: query, mode: "insensitive" } } },
        { impression: { contains: query, mode: "insensitive" } },
      ];
      labWhere.OR = [
        { patient: { name: { contains: query, mode: "insensitive" } } },
        { patient: { uhid: { contains: query, mode: "insensitive" } } },
        { template: { title: { contains: query, mode: "insensitive" } } },
      ];
    }

    const [reports, labReports, radMonths, labMonths] = await Promise.all([
      prisma.report.findMany({
        where: radWhere,
        include: { patient: true, template: true, deliveredBy: { select: { name: true } } },
      }),
      prisma.labReport.findMany({
        where: labWhere,
        include: {
          patient: true,
          template: true,
          billItem: { select: { description: true } },
          deliveredBy: { select: { name: true } },
        },
      }),
      prisma.report.groupBy({ by: ["createdMonthYear"], where: { status: "APPROVED" } }),
      prisma.labReport.groupBy({ by: ["createdMonthYear"], where: { status: "APPROVED" } }),
    ]);

    const months = [
      ...new Set([
        ...radMonths.map((g) => g.createdMonthYear),
        ...labMonths.map((g) => g.createdMonthYear),
      ]),
    ].sort((a, b) => (a < b ? 1 : -1));

    const items: PrintItem[] = [
      ...reports.map<PrintItem>((r) => ({
        id: r.id,
        kind: "Radiology",
        patientName: r.patient.name,
        uhid: r.patient.uhid,
        label: r.template ? MODALITY_LABELS[r.template.modality] : "Report",
        approvedAt: r.approvedAt,
        deliveredAt: r.deliveredAt,
        deliveredBy: r.deliveredBy?.name ?? null,
        monthYear: r.createdMonthYear,
        href: `/receptionist/print/${r.id}`,
      })),
      ...labReports.map<PrintItem>((r) => ({
        id: r.id,
        kind: "Lab",
        patientName: r.patient.name,
        uhid: r.patient.uhid,
        label: r.template?.title ?? r.billItem?.description ?? "Lab report",
        approvedAt: r.approvedAt,
        deliveredAt: r.deliveredAt,
        deliveredBy: r.deliveredBy?.name ?? null,
        monthYear: r.createdMonthYear,
        href: `/receptionist/print/lab/${r.id}`,
      })),
    ].sort((a, b) => (b.approvedAt?.getTime() ?? 0) - (a.approvedAt?.getTime() ?? 0));

    return { items, months };
  });

  if (data === null) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Header />
        <DbErrorNotice />
      </main>
    );
  }

  // Group by month bucket (items already sorted newest-first).
  const grouped = new Map<string, PrintItem[]>();
  for (const it of data.items) {
    const list = grouped.get(it.monthYear) ?? [];
    list.push(it);
    grouped.set(it.monthYear, list);
  }
  const groups = [...grouped.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Header />

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3 card p-4">
        <div className="min-w-[12rem] flex-1">
          <label htmlFor="q" className="field-label">
            Search
          </label>
          <input
            id="q"
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Patient name, UHID, test or impression…"
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
        <div className="min-w-[9rem]">
          <label htmlFor="delivery" className="field-label">
            Delivery
          </label>
          <select id="delivery" name="delivery" defaultValue={deliveryFilter} className="field-input">
            <option value="">All</option>
            <option value="pending">Pending delivery</option>
            <option value="delivered">Delivered</option>
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
            href="/receptionist/print"
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-300 transition hover:bg-slate-50"
          >
            Reset
          </Link>
        </div>
      </form>

      {groups.length === 0 ? (
        <EmptyState
          title={
            query || selectedMonth || deliveryFilter
              ? deliveryFilter === "pending"
                ? "Nothing pending delivery"
                : "No matching reports"
              : "No approved reports yet"
          }
          description={
            query || selectedMonth || deliveryFilter
              ? "Try a different search term, month, or delivery status."
              : "Approved radiology and lab reports appear here, grouped by month and ready to print."
          }
          icon="🖨️"
        />
      ) : (
        <div className="space-y-8">
          {groups.map(([monthKey, items]) => (
            <section key={monthKey}>
              <div className="mb-3 flex items-baseline gap-2">
                <h2 className="text-lg font-semibold text-slate-900">{formatMonthYear(monthKey)}</h2>
                <span className="font-mono text-xs text-slate-400">{monthKey}</span>
                <span className="ml-auto text-sm text-slate-500">
                  {items.length} report{items.length === 1 ? "" : "s"}
                </span>
              </div>

              <ul className="space-y-2">
                {items.map((it) => (
                  <li
                    key={`${it.kind}-${it.id}`}
                    className="card flex flex-wrap items-center gap-3 p-4 transition hover:border-brand-300"
                  >
                    <Link href={it.href} className="group flex min-w-0 flex-1 items-center gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800 group-hover:text-brand-700">
                          {it.patientName}
                          <span className="ml-2 font-mono text-xs font-normal text-slate-400">
                            {it.uhid}
                          </span>
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {it.label} · {formatDate(it.approvedAt)}
                        </p>
                      </div>
                      <span
                        className={`ml-1 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                          it.kind === "Lab"
                            ? "bg-violet-100 text-violet-700 ring-violet-200"
                            : "bg-brand-50 text-brand-700 ring-brand-200"
                        }`}
                      >
                        {it.kind}
                      </span>
                    </Link>
                    <DeliveryToggle
                      kind={it.kind === "Lab" ? "lab" : "report"}
                      id={it.id}
                      deliveredAt={it.deliveredAt}
                      deliveredBy={it.deliveredBy}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

function Header() {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Print Hub</h1>
      <p className="mt-1 text-sm text-slate-500">
        Approved radiology &amp; lab reports organized by month. Search or filter, then open a
        print-ready letterhead.
      </p>
    </header>
  );
}
