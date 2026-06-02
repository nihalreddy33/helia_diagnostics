"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { saveReport } from "@/app/actions/reports";
import { MODALITY_LABELS } from "@/lib/types";
import type { ActionResult, Modality, ReportStatus } from "@/lib/types";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/EmptyState";

export type QueuePatient = {
  id: string;
  name: string;
  uhid: string;
  age: number;
  gender: string;
  targetModality: Modality | null;
  report: {
    id: string;
    templateId: string | null;
    findings: string;
    impression: string;
    status: ReportStatus;
  } | null;
};

export type EditorTemplate = {
  id: string;
  title: string;
  modality: Modality;
  defaultFindings: string;
  defaultImpression: string;
};

type State = (ActionResult<{ id: string; status: ReportStatus }> & { key: number }) | null;

async function action(_prev: State, formData: FormData): Promise<State> {
  const result = await saveReport(formData);
  return { ...result, key: Date.now() };
}

export function ReportEditor({
  patients,
  templates,
}: {
  patients: QueuePatient[];
  templates: EditorTemplate[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(patients[0]?.id ?? null);
  const selected = patients.find((p) => p.id === selectedId) ?? null;

  if (patients.length === 0) {
    return (
      <EmptyState
        title="Queue is empty"
        description="Every registered patient has an approved report. New intakes from Reception will show up here."
        icon="✅"
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Patient queue */}
      <aside className="lg:col-span-2">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Patient queue <span className="text-slate-400">({patients.length})</span>
        </h2>
        <ul className="space-y-2">
          {patients.map((p) => {
            const isActive = p.id === selectedId;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  aria-pressed={isActive}
                  className={`w-full rounded-lg border px-4 py-3 text-left text-sm shadow-sm transition ${
                    isActive
                      ? "border-brand-400 bg-brand-50 ring-1 ring-brand-200"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-900">{p.name}</span>
                    {p.report && <StatusBadge status={p.report.status} />}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {p.age}y · {p.gender} · <span className="font-mono">{p.uhid}</span>
                    {p.targetModality && <> · {MODALITY_LABELS[p.targetModality]}</>}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Editor */}
      <section className="lg:col-span-3">
        {selected ? (
          <PatientReportForm key={selected.id} patient={selected} templates={templates} />
        ) : (
          <EmptyState title="Select a patient" description="Choose a patient from the queue to begin reporting." icon="👈" />
        )}
      </section>
    </div>
  );
}

function PatientReportForm({
  patient,
  templates,
}: {
  patient: QueuePatient;
  templates: EditorTemplate[];
}) {
  const [state, formAction] = useActionState<State, FormData>(action, null);

  // Templates relevant to the patient's target modality float to the top.
  const sortedTemplates = useMemo(() => {
    return [...templates].sort((a, b) => {
      const aMatch = a.modality === patient.targetModality ? 0 : 1;
      const bMatch = b.modality === patient.targetModality ? 0 : 1;
      return aMatch - bMatch;
    });
  }, [templates, patient.targetModality]);

  const initialTemplateId =
    patient.report?.templateId ??
    sortedTemplates.find((t) => t.modality === patient.targetModality)?.id ??
    "";

  const [templateId, setTemplateId] = useState(initialTemplateId);
  const [findings, setFindings] = useState(patient.report?.findings ?? "");
  const [impression, setImpression] = useState(patient.report?.impression ?? "");

  function loadTemplateDefaults() {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    setFindings(tpl.defaultFindings);
    setImpression(tpl.defaultImpression);
  }

  return (
    <form action={formAction} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{patient.name}</h3>
          <p className="text-xs text-slate-500">
            {patient.age}y · {patient.gender} · <span className="font-mono">{patient.uhid}</span>
          </p>
        </div>
        {patient.report && <StatusBadge status={patient.report.status} />}
      </div>

      {/* Hidden identifiers consumed by the server action */}
      <input type="hidden" name="patientId" value={patient.id} />
      {patient.report && <input type="hidden" name="reportId" value={patient.report.id} />}
      <input type="hidden" name="templateId" value={templateId} />

      {state && !state.ok && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200">
          {state.data.status === "PENDING_REVIEW"
            ? "Submitted for review."
            : "Draft saved."}
        </p>
      )}

      <div className="space-y-5">
        <div>
          <label htmlFor="template" className="field-label">
            Scan template
          </label>
          <div className="flex gap-2">
            <select
              id="template"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="field-input"
            >
              <option value="">No template</option>
              {sortedTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({MODALITY_LABELS[t.modality]})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={loadTemplateDefaults}
              disabled={!templateId}
              className="shrink-0 rounded-lg bg-white px-3 py-2 text-sm font-medium text-brand-700 ring-1 ring-inset ring-brand-300 transition hover:bg-brand-50 disabled:opacity-50"
            >
              Load text
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="findings" className="field-label">
            Findings
          </label>
          <textarea
            id="findings"
            name="findings"
            value={findings}
            onChange={(e) => setFindings(e.target.value)}
            className="field-textarea"
            placeholder="Describe the findings, or load a template above…"
          />
        </div>

        <div>
          <label htmlFor="impression" className="field-label">
            Impression
          </label>
          <textarea
            id="impression"
            name="impression"
            value={impression}
            onChange={(e) => setImpression(e.target.value)}
            className="field-textarea min-h-[5rem]"
            placeholder="Summary impression…"
          />
        </div>

        <div className="flex flex-wrap gap-3 pt-1">
          <SubmitButton name="intent" value="DRAFT" variant="secondary" pendingLabel="Saving…">
            Save draft
          </SubmitButton>
          <SubmitButton name="intent" value="PENDING_REVIEW" pendingLabel="Submitting…">
            Submit for review
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
