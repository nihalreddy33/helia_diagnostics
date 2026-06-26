import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-helpers";
import { DbErrorNotice } from "@/components/DbErrorNotice";
import { LabWorkbench } from "@/components/lab/LabWorkbench";
import type { LabWorklistItem, LabTemplateOption } from "@/components/lab/types";

export const dynamic = "force-dynamic";

export default async function LabPage() {
  const data = await safeQuery(async () => {
    const [reports, templates] = await Promise.all([
      prisma.labReport.findMany({
        where: { status: "DRAFT" },
        orderBy: { createdAt: "asc" },
        include: {
          patient: true,
          billItem: { select: { description: true } },
          results: { orderBy: { position: "asc" } },
        },
      }),
      prisma.labTemplate.findMany({
        orderBy: { title: "asc" },
        include: { parameters: { orderBy: { position: "asc" } } },
      }),
    ]);
    return { reports, templates };
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Lab Worklist</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enter and approve results for lab tests ordered at reception.
        </p>
      </header>

      {data === null ? (
        <DbErrorNotice />
      ) : (
        <LabWorkbench
          worklist={data.reports.map<LabWorklistItem>((r) => ({
            id: r.id,
            status: r.status,
            patientName: r.patient.name,
            uhid: r.patient.uhid,
            age: r.patient.age,
            gender: r.patient.gender,
            orderedTest: r.billItem?.description ?? null,
            templateId: r.templateId,
            results: r.results.map((x) => ({
              name: x.name,
              value: x.value,
              unit: x.unit,
              referenceRange: x.referenceRange,
              flag: x.flag,
            })),
          }))}
          templates={data.templates.map<LabTemplateOption>((t) => ({
            id: t.id,
            title: t.title,
            parameters: t.parameters.map((p) => ({
              name: p.name,
              unit: p.unit,
              referenceRange: p.referenceRange,
            })),
          }))}
        />
      )}
    </div>
  );
}
