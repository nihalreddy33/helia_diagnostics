import type { Prisma } from "@prisma/client";
import { MODALITY_LABELS } from "@/lib/types";

export type RadiologyReportForPrint = Prisma.ReportGetPayload<{
  include: { patient: true; template: true; radiologist: true };
}>;

function formatReportDate(date: Date | null): string {
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

/**
 * The A4 print sheet for a radiology report, on the Helia letterhead. Shared by
 * the receptionist and radiologist print pages so both render identically.
 */
export function RadiologyReportSheet({ report }: { report: RadiologyReportForPrint }) {
  const modalityLabel = report.template ? MODALITY_LABELS[report.template.modality] : "—";

  // Substitute the {{radiologist}} token in the declaration with the actual
  // reporting doctor (used by e.g. the obstetric PCPNDT declaration).
  const footerText = report.footer
    ? report.footer.replace(/\{\{\s*radiologist\s*\}\}/gi, report.radiologist?.name ?? "____________")
    : "";

  return (
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
            <MetaItem label="Modality" value={modalityLabel} />
            <MetaItem label="Report date" value={formatReportDate(report.approvedAt)} />
            {report.template && <MetaItem label="Study" value={report.template.title} />}
          </dl>
        </section>

        <section className="mt-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-brand-700">Findings</h2>
          <hr className="mt-2 border-slate-200" />
          <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-slate-800">
            {report.findings || "—"}
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-brand-700">Impression</h2>
          <hr className="mt-2 border-slate-200" />
          <p className="mt-4 whitespace-pre-wrap text-[15px] font-medium leading-7 text-slate-900">
            {report.impression || "—"}
          </p>
        </section>

        {footerText && (
          <section className="mt-8">
            <p className="whitespace-pre-wrap text-[11px] leading-5 text-slate-600">{footerText}</p>
          </section>
        )}

        <section className="mt-16 flex justify-end">
          <div className="text-center">
            <div className="h-px w-56 bg-slate-400" />
            <p className="mt-2 text-sm font-semibold text-slate-800">Consultant Radiologist</p>
          </div>
        </section>

        <footer className="mt-12 pt-4 text-center text-[10px] leading-5 text-slate-400">
          <p>This is an electronically generated report. Please correlate clinically.</p>
        </footer>
      </div>
    </article>
  );
}
