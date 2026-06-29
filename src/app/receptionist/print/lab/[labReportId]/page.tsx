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
      <PrintToolbar backHref="/receptionist/print" backLabel="Back to Print Hub" />

      <article className="print-sheet">
        <header className="letterhead text-center">
          <h1 className="text-3xl font-bold tracking-tight text-brand-700">Helia Diagnostics</h1>
          <hr className="mx-auto mt-3 w-24 border-t-2 border-brand-600" />
          <p className="mt-3 text-xs tracking-wide text-slate-500">
            Pathology &amp; Laboratory · Helia Diagnostics Center
          </p>
        </header>

        <section className="mt-10 border-y border-slate-200 py-6">
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

        <section className="mt-20 flex justify-end">
          <div className="text-center">
            <div className="h-px w-56 bg-slate-400" />
            <p className="mt-2 text-sm font-semibold text-slate-800">Lab In-Charge</p>
          </div>
        </section>

        <footer className="mt-16 border-t border-slate-200 pt-4 text-center text-[10px] leading-5 text-slate-400">
          <p>
            This is an electronically generated laboratory report from Helia Diagnostics. Results
            should be correlated clinically.
          </p>
        </footer>
      </article>
    </div>
  );
}
