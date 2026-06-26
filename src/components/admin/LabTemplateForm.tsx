"use client";

import { useState, useActionState } from "react";
import { saveLabTemplate } from "@/app/actions/lab-templates";
import type { ActionResult } from "@/lib/types";
import { SubmitButton } from "@/components/ui/SubmitButton";

type State = (ActionResult<{ id: string }> & { key: number }) | null;

type Param = { name: string; unit: string; referenceRange: string };

export type EditableLabTemplate = {
  id: string;
  title: string;
  parameters: Param[];
};

const emptyParam = (): Param => ({ name: "", unit: "", referenceRange: "" });

export function LabTemplateForm({ template }: { template?: EditableLabTemplate }) {
  const isEdit = Boolean(template);
  const [params, setParams] = useState<Param[]>(
    template?.parameters?.length ? template.parameters : [emptyParam()],
  );

  async function action(prev: State, formData: FormData): Promise<State> {
    const result = await saveLabTemplate(formData);
    return { ...result, key: (prev?.key ?? 0) + 1 };
  }
  const [state, formAction] = useActionState<State, FormData>(action, null);

  function update(i: number, patch: Partial<Param>) {
    setParams((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  const paramsJson = JSON.stringify(params.filter((p) => p.name.trim()));

  return (
    <form action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={template?.id} />}
      <input type="hidden" name="parameters" value={paramsJson} />

      <div>
        <label className="field-label" htmlFor={`labtitle-${template?.id ?? "new"}`}>
          Test name
        </label>
        <input
          id={`labtitle-${template?.id ?? "new"}`}
          name="title"
          type="text"
          required
          defaultValue={template?.title ?? ""}
          className="field-input"
          placeholder="Complete Blood Count (CBC)"
        />
      </div>

      <div>
        <p className="field-label">Parameters</p>
        <div className="space-y-2">
          <div className="hidden grid-cols-[1fr_6rem_8rem_2rem] gap-2 text-[11px] uppercase tracking-wider text-slate-400 sm:grid">
            <span>Name</span>
            <span>Unit</span>
            <span>Reference</span>
            <span></span>
          </div>
          {params.map((p, i) => (
            <div key={i} className="grid grid-cols-[1fr_6rem_8rem_2rem] gap-2">
              <input
                value={p.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder="Hemoglobin"
                className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
              <input
                value={p.unit}
                onChange={(e) => update(i, { unit: e.target.value })}
                placeholder="g/dL"
                className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
              <input
                value={p.referenceRange}
                onChange={(e) => update(i, { referenceRange: e.target.value })}
                placeholder="13 - 17"
                className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={() => setParams((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-slate-400 hover:text-red-600"
                aria-label="Remove parameter"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setParams((prev) => [...prev, emptyParam()])}
          className="mt-2 rounded-lg px-3 py-1.5 text-sm font-medium text-brand-700 ring-1 ring-inset ring-brand-200 transition hover:bg-brand-50"
        >
          + Add parameter
        </button>
      </div>

      {state && !state.ok && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {isEdit ? "Lab test updated." : "Lab test created."}
        </p>
      )}

      <div className="flex justify-end">
        <SubmitButton
          variant={isEdit ? "secondary" : "primary"}
          pendingLabel={isEdit ? "Saving…" : "Creating…"}
        >
          {isEdit ? "Save changes" : "Create lab test"}
        </SubmitButton>
      </div>
    </form>
  );
}
