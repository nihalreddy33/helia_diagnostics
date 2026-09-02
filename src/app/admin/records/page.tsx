import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-helpers";
import { MODALITY_LABELS, STATUS_LABELS } from "@/lib/types";
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
import { DbErrorNotice } from "@/components/DbErrorNotice";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/ui/DeleteButton";

export const dynamic = "force-dynamic";

export default async function RecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from: fromParam, to: toParam } = await searchParams;
  const today = istDayString(new Date());
  // Unfiltered by default — this console is for finding a specific record.
  const hasRange = Boolean(fromParam || toParam);
  const { from, to } = resolveRange(fromParam, toParam, today);

  const lastMonthDay = shiftDay(startOfMonth(today), -1);
  const presets = [
    { label: "Today", from: today, to: today },
    { label: "This month", from: startOfMonth(today), to: today },
    { label: "Last month", from: startOfMonth(lastMonthDay), to: endOfMonth(lastMonthDay) },
    { label: "Last 30 days", from: shiftDay(today, -29), to: today },
  ];

  const data = await safeQuery(async () => {
    const [reports, patients, templates] = await Promise.all([
      prisma.report.findMany({
        where: hasRange
          ? (() => {
              const { start, end } = rangeToInstants(from, to);
              return { createdAt: { gte: start, lt: end } };
            })()
          : {},
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          createdAt: true,
          approvedAt: true,
          deliveredAt: true,
          whatsappSentAt: true,
          whatsappSentCount: true,
          patient: { select: { name: true, uhid: true } },
          template: { select: { title: true } },
        },
      }),
      prisma.patient.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          uhid: true,
          age: true,
          gender: true,
          _count: { select: { reports: true } },
        },
      }),
      prisma.template.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          modality: true,
          _count: { select: { reports: true } },
        },
      }),
    ]);
    return { reports, patients, templates };
  });

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Destruction Override
        </h1>
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          <p className="font-semibold">Hard, irreversible deletions.</p>
          <p className="mt-1 text-red-700">
            Records removed here are permanently destroyed — there is no recycle
            bin or undo. Deleting a patient also deletes all of their reports.
            Deleting a template detaches it from existing reports (their copied
            text is preserved). This console is restricted to administrators.
          </p>
        </div>
      </header>

      {/* When were these reports generated */}
      <form method="get" className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[9.5rem]">
          <label htmlFor="from" className="field-label">Generated from</label>
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
            href="/admin/records"
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-300 transition hover:bg-slate-50"
          >
            Reset
          </Link>
        </div>
        <div className="flex w-full flex-wrap gap-1.5 border-t border-slate-100 pt-3">
          {[{ label: "All time", from: "", to: "" }, ...presets].map((p) => {
            const active = p.from ? hasRange && p.from === from && p.to === to : !hasRange;
            return (
              <Link
                key={p.label}
                href={p.from ? `/admin/records?from=${p.from}&to=${p.to}` : "/admin/records"}
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
        <p className="w-full text-xs text-slate-400">
          Filters the Reports list by when the report was generated. Patients and templates are
          always listed in full.
        </p>
      </form>

      {data === null ? (
        <DbErrorNotice />
      ) : (
        <>
          {/* At-a-glance counts for the reports in view */}
          {(() => {
            const r = data.reports;
            const approved = r.filter((x) => x.status === "APPROVED").length;
            const sent = r.filter((x) => x.whatsappSentCount > 0).length;
            const sends = r.reduce((n, x) => n + x.whatsappSentCount, 0);
            const delivered = r.filter((x) => x.deliveredAt).length;
            const pct = (n: number) => (r.length > 0 ? `${Math.round((n / r.length) * 100)}%` : "—");
            return (
              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat
                  label="Reports generated"
                  value={String(r.length)}
                  hint={hasRange ? (from === to ? longDate(from) : `${longDate(from)} — ${longDate(to)}`) : "All time"}
                />
                <Stat
                  label="Approved"
                  value={String(approved)}
                  hint={`${pct(approved)} · ${r.length - approved} still draft`}
                  tone="emerald"
                />
                <Stat
                  label="Sent on WhatsApp"
                  value={String(sent)}
                  hint={`${pct(sent)} of reports · ${sends} send${sends === 1 ? "" : "s"} total`}
                  tone="brand"
                />
                <Stat
                  label="Handed to patient"
                  value={String(delivered)}
                  hint={`${pct(delivered)} marked delivered`}
                />
              </section>
            );
          })()}

          <Section
            title="Reports"
            count={data.reports.length}
            empty={
              <EmptyState
                icon="🗂️"
                title="No reports"
                description="There are no reports to destroy."
              />
            }
          >
            {data.reports.map((report) => (
              <Row
                key={report.id}
                primary={report.patient?.name ?? "Unknown patient"}
                secondary={
                  <>
                    {report.patient?.uhid && (
                      <span className="font-mono">{report.patient.uhid}</span>
                    )}
                    {report.template?.title ? ` · ${report.template.title}` : ""}
                    {` · ${shortDate(report.createdAt)}`}
                    {report.approvedAt ? ` · approved ${shortDate(report.approvedAt)}` : ""}
                    {report.whatsappSentCount > 0 && (
                      <span className="ml-1 text-brand-600">
                        {` · sent ×${report.whatsappSentCount}`}
                      </span>
                    )}
                    {report.deliveredAt && (
                      <span className="ml-1 text-emerald-600"> · handed over</span>
                    )}
                  </>
                }
                badge={<StatusBadge status={report.status} />}
                delete={
                  <DeleteButton
                    entity="report"
                    id={report.id}
                    description={`Permanently delete this ${STATUS_LABELS[report.status]} report for ${report.patient?.name ?? "this patient"}? This cannot be undone.`}
                  />
                }
              />
            ))}
          </Section>

          <Section
            title="Patients"
            count={data.patients.length}
            empty={
              <EmptyState
                icon="🧑‍⚕️"
                title="No patients"
                description="There are no patients to destroy."
              />
            }
          >
            {data.patients.map((patient) => (
              <Row
                key={patient.id}
                primary={patient.name}
                secondary={
                  <>
                    <span className="font-mono">{patient.uhid}</span>
                    {` · ${patient.age} yrs · ${patient.gender} · ${patient._count.reports} report(s)`}
                  </>
                }
                delete={
                  <DeleteButton
                    entity="patient"
                    id={patient.id}
                    description={`Permanently delete ${patient.name} (${patient.uhid}) and ALL ${patient._count.reports} of their report(s)? This cannot be undone.`}
                  />
                }
              />
            ))}
          </Section>

          <Section
            title="Templates"
            count={data.templates.length}
            empty={
              <EmptyState
                icon="📋"
                title="No templates"
                description="There are no templates to destroy."
              />
            }
          >
            {data.templates.map((template) => (
              <Row
                key={template.id}
                primary={template.title}
                secondary={
                  <>
                    {MODALITY_LABELS[template.modality]}
                    {` · used by ${template._count.reports} report(s)`}
                  </>
                }
                delete={
                  <DeleteButton
                    entity="template"
                    id={template.id}
                    description={`Permanently delete the template "${template.title}"? It will be detached from ${template._count.reports} report(s). This cannot be undone.`}
                  />
                }
              />
            ))}
          </Section>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone = "slate",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "slate" | "emerald" | "brand";
}) {
  const valueTone =
    tone === "emerald" ? "text-emerald-700" : tone === "brand" ? "text-brand-700" : "text-slate-900";
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-bold ${valueTone}`}>{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function Section({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-800">
        {title}{" "}
        <span className="text-sm font-normal text-slate-400">({count})</span>
      </h2>
      {count === 0 ? empty : <div className="space-y-2">{children}</div>}
    </section>
  );
}

function Row({
  primary,
  secondary,
  badge,
  delete: deleteControl,
}: {
  primary: React.ReactNode;
  secondary: React.ReactNode;
  badge?: React.ReactNode;
  delete: React.ReactNode;
}) {
  return (
    <div className="card flex items-center justify-between gap-4 p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-slate-900">{primary}</p>
          {badge}
        </div>
        <p className="mt-0.5 truncate text-sm text-slate-500">{secondary}</p>
      </div>
      <div className="shrink-0">{deleteControl}</div>
    </div>
  );
}
