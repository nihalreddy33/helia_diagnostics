import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-helpers";
import { DbErrorNotice } from "@/components/DbErrorNotice";
import { ReviewQueue } from "@/components/ReviewQueue";
import type { PendingReport } from "@/components/ReviewQueue";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const reports = await safeQuery(() =>
    prisma.report.findMany({
      where: { status: "PENDING_REVIEW" },
      orderBy: { createdAt: "asc" },
      include: { patient: true, template: true, radiologist: true },
    }),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Admin — Review Queue</h1>
        <p className="mt-1 text-slate-600">
          Review reports submitted for approval, make final edits, and approve &amp; lock.
        </p>
      </header>

      {reports === null ? (
        <DbErrorNotice />
      ) : (
        <ReviewQueue
          reports={reports.map<PendingReport>((r) => ({
            id: r.id,
            findings: r.findings,
            impression: r.impression,
            createdMonthYear: r.createdMonthYear,
            patientName: r.patient.name,
            uhid: r.patient.uhid,
            age: r.patient.age,
            gender: r.patient.gender,
            templateTitle: r.template?.title ?? null,
            modality: r.template?.modality ?? r.patient.targetModality ?? null,
            radiologistName: r.radiologist?.name ?? null,
          }))}
        />
      )}
    </div>
  );
}
