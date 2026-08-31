import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-helpers";
import { readShareToken } from "@/lib/share";
import { PrintButton } from "@/components/receptionist/PrintButton";
import { A4Frame } from "@/components/A4Frame";
import { DbErrorNotice } from "@/components/DbErrorNotice";
import { groupResults } from "@/lib/lab-package";
import {
  MODALITY_LABELS,
  LAB_FLAG_LABELS,
  LAB_FLAG_STYLES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  formatINR,
  formatDateTimeIST,
} from "@/lib/types";

export const dynamic = "force-dynamic";

function formatDay(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Public, no-login view of a report/invoice, reached via an unguessable signed
 * token (see lib/share.ts). This is the page patients open from the WhatsApp
 * link — responsive for phones, with a Print / Save-PDF button.
 */
export default async function PublicSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const ref = readShareToken(token);
  if (!ref) notFound();

  const record = await safeQuery(async () => {
    if (ref.kind === "report") {
      return {
        kind: "report" as const,
        data: await prisma.report.findUnique({
          where: { id: ref.id },
          include: { patient: true, template: true, radiologist: true },
        }),
      };
    }
    if (ref.kind === "lab") {
      return {
        kind: "lab" as const,
        data: await prisma.labReport.findUnique({
          where: { id: ref.id },
          include: {
            patient: true,
            template: true,
            billItem: { select: { description: true } },
            results: { orderBy: { position: "asc" } },
          },
        }),
      };
    }
    return {
      kind: "bill" as const,
      data: await prisma.bill.findUnique({
        where: { id: ref.id },
        include: { patient: true, items: true },
      }),
    };
  });

  if (record === null) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <DbErrorNotice />
      </main>
    );
  }
  if (!record.data) notFound();
  // Reports must be approved to be visible publicly; invoices are always visible.
  if (record.kind !== "bill" && record.data.status !== "APPROVED") notFound();

  return (
    <div className="mx-auto max-w-[840px]">
      <div>
        <div className="mb-4 flex items-center justify-between gap-3 no-print">
          <div>
            <p className="text-lg font-bold tracking-tight text-brand-700">Helia Diagnostics</p>
            <p className="text-xs text-slate-500">Your secure report link</p>
          </div>
          <PrintButton />
        </div>

        {/* Official Helia letterhead sheet, scaled to fit the screen; prints A4. */}
        <A4Frame>
          <article className="print-sheet">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="letterhead print-letterhead" src="/letterhead.png" alt="" aria-hidden="true" />
            <div className="print-body">
              {record.kind === "report" && <ReportView r={record.data} />}
              {record.kind === "lab" && <LabView r={record.data} />}
              {record.kind === "bill" && <BillView b={record.data} />}
            </div>
          </article>
        </A4Frame>

        <p className="mt-4 text-center text-xs text-slate-400 no-print">
          This is a confidential medical document shared by Helia Diagnostics.
        </p>
      </div>
    </div>
  );
}

function MetaGrid({ items }: { items: [string, string][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
          <dd className="mt-0.5 text-sm font-medium text-slate-800">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

type ReportData = Prisma.ReportGetPayload<{
  include: { patient: true; template: true; radiologist: true };
}>;

function ReportView({ r }: { r: ReportData }) {
  const modality = r.template ? MODALITY_LABELS[r.template.modality] : "—";
  const footerText = r.footer
    ? r.footer.replace(/\{\{\s*radiologist\s*\}\}/gi, r.radiologist?.name ?? "____________")
    : "";

  return (
    <>
      <SectionTitle>Radiology Report</SectionTitle>
      <div className="border-y border-slate-200 py-5">
        <MetaGrid
          items={[
            ["UHID", r.patient.uhid],
            ["Patient name", r.patient.name],
            ["Age / Gender", `${r.patient.age} yrs · ${r.patient.gender}`],
            ["Modality", modality],
            ["Report date", formatDay(r.approvedAt)],
            ...((r.template ? [["Study", r.template.title]] : []) as [string, string][]),
          ]}
        />
      </div>

      <Block title="Findings" text={r.findings} />
      <Block title="Impression" text={r.impression} emphasize />

      {footerText && (
        <p className="mt-6 whitespace-pre-wrap text-[11px] leading-5 text-slate-600">{footerText}</p>
      )}

      <Signature label="Consultant Radiologist" />
      <Disclaimer text="This is an electronically generated report. Please correlate clinically." />
    </>
  );
}

type LabData = Prisma.LabReportGetPayload<{
  include: {
    patient: true;
    template: true;
    billItem: { select: { description: true } };
    results: true;
  };
}>;

function LabView({ r }: { r: LabData }) {
  const testName = r.template?.title ?? r.billItem?.description ?? "Laboratory Report";
  return (
    <>
      <SectionTitle>{testName}</SectionTitle>
      <div className="border-y border-slate-200 py-5">
        <MetaGrid
          items={[
            ["UHID", r.patient.uhid],
            ["Patient name", r.patient.name],
            ["Age / Gender", `${r.patient.age} yrs · ${r.patient.gender}`],
            ["Test", testName],
            ["Report date", formatDay(r.approvedAt)],
          ]}
        />
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wider text-slate-400">
              <th className="py-2 pr-2 font-semibold">Parameter</th>
              <th className="py-2 pr-2 font-semibold">Result</th>
              <th className="py-2 pr-2 font-semibold">Unit</th>
              <th className="py-2 font-semibold">Reference</th>
            </tr>
          </thead>
          <tbody>
            {groupResults(r.results).flatMap((g) => [
              // Package member name, so a multi-test report stays segregated.
              ...(g.section
                ? [
                    <tr key={`h-${g.section}`} className="bg-slate-50">
                      <td
                        colSpan={4}
                        className="pt-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-700"
                      >
                        {g.section}
                      </td>
                    </tr>,
                  ]
                : []),
              ...g.items.map((res) => (
                <tr key={res.id} className="border-b border-slate-100">
                  <td className="py-2 pr-2 text-slate-800">{res.name}</td>
                  <td className={`py-2 pr-2 ${LAB_FLAG_STYLES[res.flag]}`}>
                    {res.value || "—"}
                    {res.flag !== "NORMAL" && (
                      <span className="ml-1 text-[10px] uppercase">({LAB_FLAG_LABELS[res.flag]})</span>
                    )}
                  </td>
                  <td className="py-2 pr-2 text-slate-600">{res.unit || "—"}</td>
                  <td className="py-2 text-slate-600">{res.referenceRange || "—"}</td>
                </tr>
              )),
            ])}
          </tbody>
        </table>
        {r.results.length === 0 && <p className="mt-4 text-sm text-slate-400">No results recorded.</p>}
      </div>

      <Signature label="Lab In-Charge" signatureSrc="/lab-signature.png" />
      <Disclaimer text="This is an electronically generated report. Results should be correlated clinically." />
    </>
  );
}

type BillData = Prisma.BillGetPayload<{ include: { patient: true; items: true } }>;

function BillView({ b }: { b: BillData }) {
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <SectionTitle>Invoice</SectionTitle>
        <div className="text-right">
          <p className="font-mono text-sm font-semibold text-slate-800">{b.invoiceNo}</p>
          <p className="text-xs text-slate-500">{formatDateTimeIST(b.createdAt)}</p>
          {b.cancelledAt && (
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-red-600">Cancelled</p>
          )}
        </div>
      </div>

      <div className="mt-4 border-y border-slate-200 py-5">
        <MetaGrid
          items={[
            ["UHID", b.patient.uhid],
            ["Patient name", b.patient.name],
            ["Age / Gender", `${b.patient.age} yrs · ${b.patient.gender}`],
            ["Payment", `${PAYMENT_STATUS_LABELS[b.status]}${b.paymentMethod ? ` · ${PAYMENT_METHOD_LABELS[b.paymentMethod]}` : ""}`],
          ]}
        />
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wider text-slate-400">
              <th className="py-2 pr-2 font-semibold">Service</th>
              <th className="py-2 pr-2 text-center font-semibold">Qty</th>
              <th className="py-2 pr-2 text-right font-semibold">Rate</th>
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {b.items.map((it) => (
              <tr key={it.id} className="border-b border-slate-100">
                <td className="py-2 pr-2 text-slate-800">{it.description}</td>
                <td className="py-2 pr-2 text-center text-slate-600">{it.quantity}</td>
                <td className="py-2 pr-2 text-right font-mono text-slate-600">{formatINR(it.unitPrice)}</td>
                <td className="py-2 text-right font-mono text-slate-800">{formatINR(it.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex justify-end">
        <dl className="w-60 space-y-1.5 text-sm">
          <TotalRow label="Subtotal" value={formatINR(b.subtotal)} />
          {b.discount > 0 && <TotalRow label="Discount" value={`− ${formatINR(b.discount)}`} />}
          <div className="flex justify-between border-t border-slate-200 pt-2">
            <dt className="font-semibold text-slate-900">Total</dt>
            <dd className="font-mono text-base font-bold text-slate-900">{formatINR(b.total)}</dd>
          </div>
          <TotalRow label="Paid" value={formatINR(b.amountPaid)} />
          <TotalRow label="Balance" value={formatINR(b.total - b.amountPaid)} />
        </dl>
      </div>
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="text-lg font-bold tracking-tight text-slate-900">{children}</h1>;
}

function Block({
  title,
  text,
  emphasize,
}: {
  title: string;
  text: string | null | undefined;
  emphasize?: boolean;
}) {
  return (
    <section className="mt-6">
      <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-brand-700">{title}</h2>
      <hr className="mt-2 border-slate-200" />
      <p
        className={`mt-3 whitespace-pre-wrap text-[15px] leading-7 ${
          emphasize ? "font-medium text-slate-900" : "text-slate-800"
        }`}
      >
        {text || "—"}
      </p>
    </section>
  );
}

function Signature({ label, signatureSrc }: { label: string; signatureSrc?: string }) {
  return (
    <section className="mt-12 flex justify-end">
      <div className="text-center">
        {signatureSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={signatureSrc}
            alt=""
            aria-hidden="true"
            className="mx-auto mb-1 h-12 w-auto object-contain"
          />
        )}
        <div className="h-px w-52 bg-slate-400" />
        <p className="mt-2 text-sm font-semibold text-slate-800">{label}</p>
      </div>
    </section>
  );
}

function Disclaimer({ text }: { text: string }) {
  return <p className="mt-8 text-center text-[10px] leading-5 text-slate-400">{text}</p>;
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-mono text-slate-700">{value}</dd>
    </div>
  );
}
