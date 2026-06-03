import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-helpers";
import {
  MODALITY_LABELS,
  STATUS_LABELS,
  formatMonthYear,
} from "@/lib/types";
import { DbErrorNotice } from "@/components/DbErrorNotice";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/ui/DeleteButton";

export const dynamic = "force-dynamic";

export default async function RecordsPage() {
  const data = await safeQuery(async () => {
    const [reports, patients, templates] = await Promise.all([
      prisma.report.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          createdMonthYear: true,
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

      {data === null ? (
        <DbErrorNotice />
      ) : (
        <>
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
                    {` · ${formatMonthYear(report.createdMonthYear)}`}
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
