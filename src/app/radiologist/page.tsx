import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-helpers";
import { DbErrorNotice } from "@/components/DbErrorNotice";
import { RadiologistWorkspace } from "@/components/radiologist/RadiologistWorkspace";
import type {
  WorklistPatient,
  WorklistTemplate,
} from "@/components/radiologist/types";

export const dynamic = "force-dynamic";

export default async function RadiologistPage() {
  const data = await safeQuery(async () => {
    const [patients, templates] = await Promise.all([
      prisma.patient.findMany({
        orderBy: { createdAt: "asc" },
        include: {
          reports: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              status: true,
              findings: true,
              impression: true,
              footer: true,
              templateId: true,
              billItem: { select: { description: true } },
            },
          },
        },
      }),
      prisma.template.findMany({
        orderBy: { title: "asc" },
        select: {
          id: true,
          title: true,
          modality: true,
          defaultFindings: true,
          defaultImpression: true,
          defaultFooter: true,
        },
      }),
    ]);
    return { patients, templates };
  });

  if (data === null) {
    return (
      <div className="space-y-6">
        <Header />
        <DbErrorNotice />
      </div>
    );
  }

  // Worklist = patients awaiting transcription: no report yet, or latest is a DRAFT.
  const worklist: WorklistPatient[] = data.patients
    .filter((p) => {
      const latest = p.reports[0];
      return !latest || latest.status !== "APPROVED";
    })
    .map((p) => {
      const draft = p.reports[0] && p.reports[0].status === "DRAFT" ? p.reports[0] : null;
      return {
        id: p.id,
        uhid: p.uhid,
        name: p.name,
        age: p.age,
        gender: p.gender,
        orderedService: p.reports[0]?.billItem?.description ?? null,
        draft: draft
          ? {
              id: draft.id,
              status: draft.status,
              findings: draft.findings,
              impression: draft.impression,
              footer: draft.footer,
              templateId: draft.templateId ?? null,
            }
          : null,
      };
    });

  const templates: WorklistTemplate[] = data.templates.map((t) => ({
    id: t.id,
    title: t.title,
    modality: t.modality,
    defaultFindings: t.defaultFindings,
    defaultImpression: t.defaultImpression,
    defaultFooter: t.defaultFooter,
  }));

  return (
    <div className="space-y-6">
      <Header />
      <RadiologistWorkspace worklist={worklist} templates={templates} />
    </div>
  );
}

function Header() {
  return (
    <header>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Reporting Worklist
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Transcribe and approve radiology reports for patients awaiting results.
      </p>
    </header>
  );
}
