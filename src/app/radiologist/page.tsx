import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-helpers";
import { DbErrorNotice } from "@/components/DbErrorNotice";
import { ReportEditor } from "@/components/ReportEditor";
import type { QueuePatient, EditorTemplate } from "@/components/ReportEditor";

export const dynamic = "force-dynamic";

export default async function RadiologistPage() {
  const data = await safeQuery(async () => {
    const [patients, templates] = await Promise.all([
      prisma.patient.findMany({
        orderBy: { createdAt: "desc" },
        include: { reports: { orderBy: { createdAt: "desc" }, take: 1 } },
      }),
      prisma.template.findMany({ orderBy: { title: "asc" } }),
    ]);
    return { patients, templates };
  });

  if (data === null) {
    return (
      <PageShell>
        <DbErrorNotice />
      </PageShell>
    );
  }

  // Queue = patients still needing a report (none yet, or latest not approved).
  const queue: QueuePatient[] = data.patients
    .filter((p) => {
      const latest = p.reports[0];
      return !latest || latest.status !== "APPROVED";
    })
    .map((p) => {
      const latest = p.reports[0];
      return {
        id: p.id,
        name: p.name,
        uhid: p.uhid,
        age: p.age,
        gender: p.gender,
        targetModality: p.targetModality,
        report: latest
          ? {
              id: latest.id,
              templateId: latest.templateId,
              findings: latest.findings,
              impression: latest.impression,
              status: latest.status,
            }
          : null,
      };
    });

  const templates: EditorTemplate[] = data.templates.map((t) => ({
    id: t.id,
    title: t.title,
    modality: t.modality,
    defaultFindings: t.defaultFindings,
    defaultImpression: t.defaultImpression,
  }));

  return (
    <PageShell>
      <ReportEditor patients={queue} templates={templates} />
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Radiologist — Reporting</h1>
        <p className="mt-1 text-slate-600">
          Select a patient, load a scan template, edit the findings &amp; impression, then submit for review.
        </p>
      </header>
      {children}
    </div>
  );
}
