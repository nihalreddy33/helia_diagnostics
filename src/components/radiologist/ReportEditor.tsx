"use client";

import { useActionState, useEffect, useState } from "react";
import { saveReport } from "@/app/actions/reports";
import { draftReport } from "@/app/actions/ai";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { StatusBadge } from "@/components/ui/Badge";
import { MODALITY_LABELS, formatDateTimeIST } from "@/lib/types";
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
  const report = patient.report;
  // When the latest report is already approved, the editor is in "amend" mode:
  // edits update the approved report in place (and are logged as an amendment).
  const isAmend = report?.status === "APPROVED";

  // Controlled editor state. Keyed by patient.id below so it resets per patient.
  const [templateId, setTemplateId] = useState<string>(report?.templateId ?? "");
  const [findings, setFindings] = useState<string>(report?.findings ?? "");
  const [impression, setImpression] = useState<string>(report?.impression ?? "");
  const [footer, setFooter] = useState<string>(report?.footer ?? "");

  const [state, formAction] = useActionState<State, FormData>(saveAction, null);

  // --- AI drafting -----------------------------------------------------------
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function onDraftWithAI() {
    setAiError(null);
    const tpl = templates.find((t) => t.id === templateId);
    const study = tpl?.title ?? patient.orderedService ?? "Radiology study";
    const modality = tpl ? MODALITY_LABELS[tpl.modality] : "—";
    setAiLoading(true);
    try {
      const result = await draftReport({
        notes: findings,
        study,
        modality,
        age: patient.age,
        gender: patient.gender,
      });
      if (result.ok) {
        setFindings(result.data.findings);
        setImpression(result.data.impression);
      } else {
        setAiError(result.error);
      }
    } catch {
      setAiError("Could not reach the AI service. Please try again.");
    } finally {
      setAiLoading(false);
    }
  }

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
  const [reportId, setReportId] = useState<string>(report?.id ?? "");
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
          {report && <StatusBadge status={report.status} />}
        </div>
        {report?.lastEditedAt && (
          <p className="mt-2 text-xs text-slate-500">
            Last edited {formatDateTimeIST(new Date(report.lastEditedAt))}
          </p>
        )}
      </div>

      {isAmend && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="font-semibold">Amending an approved report.</span> Changes update the
          copy patients and reception see, and are recorded in the activity log.
        </div>
      )}

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
          <div className="mb-1 flex items-center justify-between gap-2">
            <label htmlFor="findings" className="field-label !mb-0">
              Findings
            </label>
            <button
              type="button"
              onClick={onDraftWithAI}
              disabled={aiLoading}
              title="Rewrite your notes into a clean report and draft an impression. You can edit the result before approving."
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-200 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span aria-hidden>{aiLoading ? "⏳" : "✨"}</span>
              {aiLoading ? "Drafting…" : "Draft with AI"}
            </button>
          </div>
          <textarea
            id="findings"
            name="findings"
            value={findings}
            onChange={(e) => setFindings(e.target.value)}
            rows={8}
            className="field-textarea"
            placeholder="Type rough findings, then tap “Draft with AI” to expand them…"
          />
          {aiError && (
            <p role="alert" className="mt-1 text-xs text-red-600">
              {aiError}
            </p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            AI cleans up your notes and drafts an impression. Always review before approving.
          </p>
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
            {isAmend
              ? "Report updated. The revised copy is now live."
              : approved
                ? "Report approved. It will drop off the worklist."
                : "Draft saved. You can keep editing or approve when ready."}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {isAmend ? (
            <SubmitButton
              variant="success"
              name="intent"
              value="APPROVED"
              pendingLabel="Saving…"
            >
              Save changes
            </SubmitButton>
          ) : (
            <>
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
            </>
          )}
        </div>
      </form>
    </div>
  );
}
