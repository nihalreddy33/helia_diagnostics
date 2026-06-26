"use client";

import { useState, useActionState } from "react";
import { saveLabReport } from "@/app/actions/lab-reports";
import { LAB_FLAGS, LAB_FLAG_LABELS } from "@/lib/types";
import type { ActionResult, LabFlag, ReportStatus } from "@/lib/types";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { StatusBadge } from "@/components/ui/Badge";
import type { LabResultRow, LabTemplateOption, LabWorklistItem } from "./types";

type State = (ActionResult<{ id: string; status: ReportStatus }> & { key: number }) | null;

async function action(prev: State, formData: FormData): Promise<State> {
  const result = await saveLabReport(formData);
  return { ...result, key: (prev?.key ?? 0) + 1 };
}

const emptyRow = (): LabResultRow => ({
  name: "",
  value: "",
  unit: "",
  referenceRange: "",
  flag: "NORMAL",
});

export function LabReportEditor({
  item,
  templates,
}: {
  item: LabWorklistItem;
  templates: LabTemplateOption[];
}) {
  const [templateId, setTemplateId] = useState(item.templateId ?? "");
  const [rows, setRows] = useState<LabResultRow[]>(
    item.results.length > 0 ? item.results : [],
  );
  const [state, formAction] = useActionState<State, FormData>(action, null);

  function loadTemplate(nextId: string) {
    setTemplateId(nextId);
    const tpl = templates.find((t) => t.id === nextId);
    if (tpl) {
      setRows(
        tpl.parameters.map((p) => ({
          name: p.name,
          value: "",
          unit: p.unit,
          referenceRange: p.referenceRange,
          flag: "NORMAL",
        })),
      );
    }
  }

  function updateRow(i: number, patch: Partial<LabResultRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  const resultsJson = JSON.stringify(rows.filter((r) => r.name.trim()));
  const approved = state?.ok && state.data.status === "APPROVED";

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{item.patientName}</h2>
            <p className="mt-0.5 text-sm text-slate-600">
              <span className="font-medium text-slate-700">{item.uhid}</span>
              <span className="mx-2 text-slate-300">·</span>
              {item.age} yrs<span className="mx-2 text-slate-300">·</span>
              {item.gender}
              {item.orderedTest && (
                <>
                  <span className="mx-2 text-slate-300">·</span>
                  <span className="font-medium text-brand-700">{item.orderedTest}</span>
                </>
              )}
            </p>
          </div>
          <StatusBadge status={item.status} />
        </div>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="reportId" value={item.id} />
        <input type="hidden" name="templateId" value={templateId} />
        <input type="hidden" name="results" value={resultsJson} />

        <div>
          <label htmlFor="labTemplate" className="field-label">
            Load a test format
          </label>
          <select
            id="labTemplate"
            value={templateId}
            onChange={(e) => loadTemplate(e.target.value)}
            className="field-input"
          >
            <option value="">Select a lab test…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Loading a format fills the parameters and reference ranges. Enter the result for each.
          </p>
        </div>

        {/* Results table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-400">
                <th className="py-2 font-semibold">Parameter</th>
                <th className="py-2 font-semibold">Result</th>
                <th className="py-2 font-semibold">Unit</th>
                <th className="py-2 font-semibold">Reference</th>
                <th className="py-2 font-semibold">Flag</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-sm text-slate-400">
                    Load a test format above, or add a parameter.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-1.5 pr-2">
                      <input
                        value={r.name}
                        onChange={(e) => updateRow(i, { name: e.target.value })}
                        className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
                        placeholder="Parameter"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        value={r.value}
                        onChange={(e) => updateRow(i, { value: e.target.value })}
                        className="w-24 rounded border border-slate-300 px-2 py-1 text-sm font-medium"
                        placeholder="—"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        value={r.unit}
                        onChange={(e) => updateRow(i, { unit: e.target.value })}
                        className="w-20 rounded border border-slate-200 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        value={r.referenceRange}
                        onChange={(e) => updateRow(i, { referenceRange: e.target.value })}
                        className="w-28 rounded border border-slate-200 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <select
                        value={r.flag}
                        onChange={(e) => updateRow(i, { flag: e.target.value as LabFlag })}
                        className="rounded border border-slate-200 px-1 py-1 text-sm"
                      >
                        {LAB_FLAGS.map((f) => (
                          <option key={f} value={f}>
                            {LAB_FLAG_LABELS[f]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        className="text-slate-400 hover:text-red-600"
                        aria-label={`Remove ${r.name || "row"}`}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, emptyRow()])}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand-700 ring-1 ring-inset ring-brand-200 transition hover:bg-brand-50"
        >
          + Add parameter
        </button>

        {state && !state.ok && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {state.error}
          </div>
        )}
        {state?.ok && (
          <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {approved ? "Lab report approved. It will drop off the worklist." : "Draft saved."}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <SubmitButton variant="secondary" name="intent" value="DRAFT" pendingLabel="Saving…">
            Save draft
          </SubmitButton>
          <SubmitButton variant="success" name="intent" value="APPROVED" pendingLabel="Approving…">
            Approve report
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
