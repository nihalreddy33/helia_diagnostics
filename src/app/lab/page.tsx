import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-helpers";
import { DbErrorNotice } from "@/components/DbErrorNotice";
import { LabWorkbench } from "@/components/lab/LabWorkbench";
import type { LabWorklistItem } from "@/components/lab/types";

export const dynamic = "force-dynamic";

export default async function LabPage() {
  const data = await safeQuery(async () => {
    const reports = await prisma.labReport.findMany({
      where: { status: "DRAFT" },
      orderBy: { createdAt: "asc" },
      include: {
        patient: true,
        // Include the ordered service's linked format so reports billed BEFORE
        // the format was linked still show the parameters (retroactive fallback).
        billItem: {
          select: {
            description: true,
            service: {
              select: {
                labTemplate: {
                  select: {
                    id: true,
                    parameters: {
                      orderBy: { position: "asc" },
                      select: { name: true, unit: true, referenceRange: true },
                    },
                  },
                },
              },
            },
          },
        },
        results: { orderBy: { position: "asc" } },
      },
    });
    return { reports };
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
          worklist={data.reports.map<LabWorklistItem>((r) => {
            const linkedTpl = r.billItem?.service?.labTemplate ?? null;
            const results =
              r.results.length > 0
                ? r.results.map((x) => ({
                    name: x.name,
                    value: x.value,
                    unit: x.unit,
                    referenceRange: x.referenceRange,
                    flag: x.flag,
                  }))
                : // Report billed before its format was linked — load the format now.
                  (linkedTpl?.parameters ?? []).map((p) => ({
                    name: p.name,
                    value: "",
                    unit: p.unit,
                    referenceRange: p.referenceRange,
                    flag: "NORMAL" as const,
                  }));
            return {
              id: r.id,
              status: r.status,
              patientName: r.patient.name,
              uhid: r.patient.uhid,
              age: r.patient.age,
              gender: r.patient.gender,
              orderedTest: r.billItem?.description ?? null,
              templateId: r.templateId ?? linkedTpl?.id ?? null,
              results,
            };
          })}
        />
      )}
    </div>
  );
}
