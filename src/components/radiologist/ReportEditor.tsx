"use client";

import { useActionState, useEffect, useState } from "react";
import { saveReport } from "@/app/actions/reports";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { StatusBadge } from "@/components/ui/Badge";
import { MODALITY_LABELS } from "@/lib/types";
import type { ActionResult, ReportStatus } from "@/lib/types";
import type { WorklistPatient, WorklistTemplate } from "./types";

type SaveData = { id: string; status: ReportStatus };
type State = (ActionResult<SaveData> & { key: number }) | null;

async function saveAction(prev: State, formData: FormData): Promise<State> {
  const result = await saveReport(formData);
  return { ...result, key: (prev?.key ?? 0) + 1 };
}

export function ReportEditor({
  patient,
  templates,
}: {
  patient: WorklistPatient;
  templates: WorklistTemplate[];
}) {
  const draft = patient.draft;

  // Controlled editor state. Keyed by patient.id below so it resets per patient.
  const [templateId, setTemplateId] = useState<string>(draft?.templateId ?? "");
  const [findings, setFindings] = useState<string>(draft?.findings ?? "");
  const [impression, setImpression] = useState<string>(draft?.impression ?? "");
  const [footer, setFooter] = useState<string>(draft?.footer ?? "");

  const [state, formAction] = useActionState<State, FormData>(saveAction, null);

  // Choosing a template immediately injects its defaults into the textareas.
  // The patient profile is rendered separately and never touched by this.
  function onTemplateChange(nextId: string) {
    setTemplateId(nextId);
    const tpl = templates.find((t) => t.id === nextId);
    if (tpl) {
      setFindings(tpl.defaultFindings);
      setImpression(tpl.defaultImpression);
      setFooter(tpl.defaultFooter);
    }
  }

  // After a successful save that is NOT an approval, keep editing in place but
  // remember the freshly-created report id so subsequent saves update it.
  const [reportId, setReportId] = useState<string>(draft?.id ?? "");
  useEffect(() => {
    if (state?.ok && state.data.status === "DRAFT") {
      setReportId(state.data.id);
    }
  }, [state]);

  const approved = state?.ok && state.data.status === "APPROVED";

  return (
    <div className="space-y-5">
      {/* Patient profile — NEVER cleared when changing templates. */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{patient.name}</h2>
            <p className="mt-0.5 text-sm text-slate-600">
              <span className="font-medium text-slate-700">{patient.uhid}</span>
              <span className="mx-2 text-slate-300">·</span>
              {patient.age} yrs
              <span className="mx-2 text-slate-300">·</span>
              {patient.gender}
            </p>
          </div>
          {draft && <StatusBadge status={draft.status} />}
        </div>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="patientId" value={patient.id} />
        {reportId && <input type="hidden" name="reportId" value={reportId} />}

        <div>
          <label htmlFor="templateId" className="field-label">
            Template
          </label>
          <select
            id="templateId"
            name="templateId"
            value={templateId}
            onChange={(e) => onTemplateChange(e.target.value)}
            className="field-input"
          >
            <option value="">No template (blank)</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} — {MODALITY_LABELS[t.modality]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Choosing a template fills the findings and impression below. The patient
            details above are unaffected.
          </p>
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
            rows={8}
            className="field-textarea"
            placeholder="Describe the radiological findings…"
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
            rows={5}
            className="field-textarea"
            placeholder="Summarise the diagnostic impression…"
          />
        </div>

        <div>
          <label htmlFor="footer" className="field-label">
            Declaration / footer <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            id="footer"
            name="footer"
            value={footer}
            onChange={(e) => setFooter(e.target.value)}
            rows={4}
            className="field-textarea"
            placeholder="Notes or declaration printed below the impression…"
          />
          <p className="mt-1 text-xs text-slate-500">
            <code className="rounded bg-slate-100 px-1">{"{{radiologist}}"}</code> is replaced with
            your name on the printed report.
          </p>
        </div>

        {state && !state.ok && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {state.error}
          </div>
        )}

        {state?.ok && (
          <div
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            {approved
              ? "Report approved. It will drop off the worklist."
              : "Draft saved. You can keep editing or approve when ready."}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <SubmitButton
            variant="secondary"
            name="intent"
            value="DRAFT"
            pendingLabel="Saving…"
          >
            Save draft
          </SubmitButton>
          <SubmitButton
            variant="success"
            name="intent"
            value="APPROVED"
            pendingLabel="Approving…"
          >
            Approve report
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
