import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-helpers";
import { DbErrorNotice } from "@/components/DbErrorNotice";
import { PrintToolbar } from "@/components/receptionist/PrintToolbar";
import { RadiologyReportSheet } from "@/components/print/RadiologyReportSheet";

export const dynamic = "force-dynamic";

export default async function RadiologistPrintReportPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;

  const report = await safeQuery(() =>
    prisma.report.findUnique({
      where: { id: reportId },
      include: { patient: true, template: true, radiologist: true },
    }),
  );

  if (report === null) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <DbErrorNotice />
      </main>
    );
  }
  if (!report) notFound();

  return (
    <div className="print-page">
      <PrintToolbar backHref="/radiologist/print" backLabel="Back to Print Hub" />
      <RadiologyReportSheet report={report} />
    </div>
  );
}
