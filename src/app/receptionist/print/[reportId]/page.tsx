import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-helpers";
import { DbErrorNotice } from "@/components/DbErrorNotice";
import { PrintButton } from "@/components/receptionist/PrintButton";
import { MODALITY_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

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

export default async function PrintReportPage({
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

  if (!report) {
    notFound();
  }

  const modalityLabel = report.template ? MODALITY_LABELS[report.template.modality] : "—";
  const radiologistName = report.radiologist?.name ?? "—";

  // Substitute the {{radiologist}} token in the declaration with the actual
  // reporting doctor (used by e.g. the obstetric PCPNDT declaration).
  const footerText = report.footer
    ? report.footer.replace(/\{\{\s*radiologist\s*\}\}/gi, report.radiologist?.name ?? "____________")
    : "";

  return (
    <div>
      {/* Toolbar — hidden when printing */}
      <div className="no-print sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link
            href="/receptionist/print"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-brand-700"
          >
            <span aria-hidden>‹</span> Back to Print Hub
          </Link>
          <PrintButton />
        </div>
      </div>

      {/* A4 letterhead sheet — border-free */}
      <article className="print-sheet">
        <header className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-brand-700">Helia Diagnostics</h1>
          <hr className="mx-auto mt-3 w-24 border-t-2 border-brand-600" />
          <p className="mt-3 text-xs tracking-wide text-slate-500">
            Diagnostic Imaging &amp; Radiology · Helia Diagnostics Center
          </p>
        </header>

        {/* Patient / report meta block */}
        <section className="mt-10 border-y border-slate-200 py-6">
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

        {/* Findings */}
        <section className="mt-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-brand-700">Findings</h2>
          <hr className="mt-2 border-slate-200" />
          <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-slate-800">
            {report.findings || "—"}
          </p>
        </section>

        {/* Impression */}
        <section className="mt-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-brand-700">
            Impression
          </h2>
          <hr className="mt-2 border-slate-200" />
          <p className="mt-4 whitespace-pre-wrap text-[15px] font-medium leading-7 text-slate-900">
            {report.impression || "—"}
          </p>
        </section>

        {/* Declaration / footer (optional) */}
        {footerText && (
          <section className="mt-8">
            <p className="whitespace-pre-wrap text-[11px] leading-5 text-slate-600">
              {footerText}
            </p>
          </section>
        )}

        {/* Signature */}
        <section className="mt-16 flex justify-end">
          <div className="text-center">
            <div className="h-px w-56 bg-slate-400" />
            <p className="mt-2 text-sm font-semibold text-slate-800">{radiologistName}</p>
            <p className="text-xs text-slate-500">Reported by · Radiologist</p>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-16 border-t border-slate-200 pt-4 text-center text-[10px] leading-5 text-slate-400">
          <p>
            This is an electronically generated report from Helia Diagnostics. For queries, please
            contact the diagnostics center.
          </p>
        </footer>
      </article>
    </div>
  );
}
