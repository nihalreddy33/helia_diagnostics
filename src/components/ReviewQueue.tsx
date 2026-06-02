"use client";

import { useState, useActionState } from "react";
import { approveReport } from "@/app/actions/reports";
import { MODALITY_LABELS } from "@/lib/types";
import type { ActionResult, Modality } from "@/lib/types";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/EmptyState";

export type PendingReport = {
  id: string;
  findings: string;
  impression: string;
  createdMonthYear: string;
  patientName: string;
  uhid: string;
  age: number;
  gender: string;
  templateTitle: string | null;
  modality: Modality | null;
  radiologistName: string | null;
};

type State = (ActionResult<{ id: string }> & { key: number }) | null;

async function action(_prev: State, formData: FormData): Promise<State> {
  const result = await approveReport(formData);
  return { ...result, key: Date.now() };
}

export function ReviewQueue({ reports }: { reports: PendingReport[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(reports[0]?.id ?? null);
  const selected = reports.find((r) => r.id === selectedId) ?? null;

  if (reports.length === 0) {
    return (
      <EmptyState
        title="Nothing to review"
        description="Reports submitted by radiologists will appear here for approval."
        icon="🎉"
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <aside className="lg:col-span-2">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Pending review <span className="text-slate-400">({reports.length})</span>
        </h2>
        <ul className="space-y-2">
          {reports.map((r) => {
            const isActive = r.id === selectedId;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  aria-pressed={isActive}
                  className={`w-full rounded-lg border px-4 py-3 text-left text-sm shadow-sm transition ${
                    isActive
                      ? "border-brand-400 bg-brand-50 ring-1 ring-brand-200"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-900">{r.patientName}</span>
                    <StatusBadge status="PENDING_REVIEW" />
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    <span className="font-mono">{r.uhid}</span>
                    {r.modality && <> · {MODALITY_LABELS[r.modality]}</>}
                    {r.radiologistName && <> · {r.radiologistName}</>}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section className="lg:col-span-3">
        {selected ? (
          <ReviewForm key={selected.id} report={selected} />
        ) : (
          <EmptyState title="Select a report" icon="👈" />
        )}
      </section>
    </div>
  );
}

function ReviewForm({ report }: { report: PendingReport }) {
  const [state, formAction] = useActionState<State, FormData>(action, null);

  return (
    <form action={formAction} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-900">{report.patientName}</h3>
        <p className="text-xs text-slate-500">
          {report.age}y · {report.gender} · <span className="font-mono">{report.uhid}</span>
          {report.templateTitle && <> · {report.templateTitle}</>}
        </p>
      </div>

      <input type="hidden" name="reportId" value={report.id} />

      {state && !state.ok && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200">
          Report approved &amp; locked.
        </p>
      )}

      <div className="space-y-5">
        <div>
          <label htmlFor="findings" className="field-label">
            Findings
          </label>
          <textarea
            id="findings"
            name="findings"
            defaultValue={report.findings}
            className="field-textarea"
          />
        </div>
        <div>
          <label htmlFor="impression" className="field-label">
            Impression
          </label>
          <textarea
            id="impression"
            name="impression"
            defaultValue={report.impression}
            className="field-textarea min-h-[5rem]"
          />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <SubmitButton variant="success" pendingLabel="Approving…">
            Approve &amp; Lock
          </SubmitButton>
          <span className="text-xs text-slate-500">
            Edits above are saved as part of approval.
          </span>
        </div>
      </div>
    </form>
  );
}
