import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-helpers";
import { DbErrorNotice } from "@/components/DbErrorNotice";
import { PrintToolbar } from "@/components/receptionist/PrintToolbar";
import { LAB_FLAG_LABELS, LAB_FLAG_STYLES } from "@/lib/types";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-800">{value}</dd>
    </div>
  );
}

export default async function LabReportPrintPage({
  params,
}: {
  params: Promise<{ labReportId: string }>;
}) {
  const { labReportId } = await params;

  const report = await safeQuery(() =>
    prisma.labReport.findUnique({
      where: { id: labReportId },
      include: {
        patient: true,
        template: true,
        billItem: { select: { description: true } },
        results: { orderBy: { position: "asc" } },
      },
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

  const testName = report.template?.title ?? report.billItem?.description ?? "Laboratory Report";

  return (
    <div className="print-page">
      <PrintToolbar
        backHref="/receptionist/print"
        backLabel="Back to Print Hub"
        share={
          report.status === "APPROVED"
            ? {
                kind: "lab",
                id: report.id,
                sentAt: report.whatsappSentAt?.toISOString() ?? null,
                sentCount: report.whatsappSentCount,
              }
            : undefined
        }
      />

      <article className="print-sheet">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="letterhead print-letterhead" src="/letterhead.png" alt="" aria-hidden="true" />
        <div className="print-body">
        <section className="border-y border-slate-200 py-6">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
            <MetaItem label="UHID" value={report.patient.uhid} />
            <MetaItem label="Patient name" value={report.patient.name} />
            <MetaItem
              label="Age / Gender"
              value={`${report.patient.age} yrs · ${report.patient.gender}`}
            />
            <MetaItem label="Test" value={testName} />
            <MetaItem label="Report date" value={formatDate(report.approvedAt)} />
          </dl>
        </section>

        <section className="mt-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-slate-200 text-left text-[10px] uppercase tracking-wider text-slate-400">
                <th className="py-2 font-semibold">Parameter</th>
                <th className="py-2 font-semibold">Result</th>
                <th className="py-2 font-semibold">Unit</th>
                <th className="py-2 font-semibold">Reference Range</th>
              </tr>
            </thead>
            <tbody>
              {report.results.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="py-2 text-slate-800">{r.name}</td>
                  <td className={`py-2 ${LAB_FLAG_STYLES[r.flag]}`}>
                    {r.value || "—"}
                    {r.flag !== "NORMAL" && (
                      <span className="ml-1 text-[10px] uppercase">({LAB_FLAG_LABELS[r.flag]})</span>
                    )}
                  </td>
                  <td className="py-2 text-slate-600">{r.unit || "—"}</td>
                  <td className="py-2 text-slate-600">{r.referenceRange || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {report.results.length === 0 && (
            <p className="mt-4 text-sm text-slate-400">No results recorded.</p>
          )}
        </section>

        <section className="mt-16 flex justify-end">
          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/lab-signature.png"
              alt=""
              aria-hidden="true"
              className="mx-auto mb-1 h-14 w-auto object-contain"
            />
            <div className="h-px w-56 bg-slate-400" />
            <p className="mt-2 text-sm font-semibold text-slate-800">Lab In-Charge</p>
          </div>
        </section>

        <footer className="mt-12 pt-4 text-center text-[10px] leading-5 text-slate-400">
          <p>This is an electronically generated report. Results should be correlated clinically.</p>
        </footer>
        </div>
      </article>
    </div>
  );
}
