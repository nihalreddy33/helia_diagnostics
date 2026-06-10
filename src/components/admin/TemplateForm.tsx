"use client";

import { useActionState } from "react";
import { saveTemplate } from "@/app/actions/templates";
import { MODALITIES, MODALITY_LABELS } from "@/lib/types";
import type { ActionResult, Modality } from "@/lib/types";
import { SubmitButton } from "@/components/ui/SubmitButton";

type State = (ActionResult<{ id: string }> & { key: number }) | null;

export type EditableTemplate = {
  id: string;
  title: string;
  modality: Modality;
  defaultFindings: string;
  defaultImpression: string;
  defaultFooter: string;
};

/**
 * Reusable create/edit form for diagnostic templates. When `template` is
 * provided the form edits it (saveTemplate with hidden id); otherwise it
 * creates a new template.
 */
export function TemplateForm({ template }: { template?: EditableTemplate }) {
  const isEdit = Boolean(template);
  const uid = template?.id ?? "new";

  async function action(prev: State, formData: FormData): Promise<State> {
    const result = await saveTemplate(formData);
    return { ...result, key: (prev?.key ?? 0) + 1 };
  }

  const [state, formAction] = useActionState<State, FormData>(action, null);

  return (
    <form action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={template?.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor={`title-${uid}`}>
            Title
          </label>
          <input
            id={`title-${uid}`}
            name="title"
            type="text"
            required
            defaultValue={template?.title ?? ""}
            className="field-input"
            placeholder="Chest X-Ray (PA view)"
          />
        </div>

        <div>
          <label className="field-label" htmlFor={`modality-${uid}`}>
            Modality
          </label>
          <select
            id={`modality-${uid}`}
            name="modality"
            required
            defaultValue={template?.modality ?? ""}
            className="field-input"
          >
            {!isEdit && (
              <option value="" disabled>
                Select a modality…
              </option>
            )}
            {MODALITIES.map((modality) => (
              <option key={modality} value={modality}>
                {MODALITY_LABELS[modality]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="field-label" htmlFor={`findings-${uid}`}>
          Default findings
        </label>
        <textarea
          id={`findings-${uid}`}
          name="defaultFindings"
          required
          rows={5}
          defaultValue={template?.defaultFindings ?? ""}
          className="field-textarea"
          placeholder="Describe the standard findings to pre-fill on new reports…"
        />
      </div>

      <div>
        <label className="field-label" htmlFor={`impression-${uid}`}>
          Default impression
        </label>
        <textarea
          id={`impression-${uid}`}
          name="defaultImpression"
          required
          rows={3}
          defaultValue={template?.defaultImpression ?? ""}
          className="field-textarea"
          placeholder="Describe the standard impression to pre-fill on new reports…"
        />
      </div>

      <div>
        <label className="field-label" htmlFor={`footer-${uid}`}>
          Default declaration / footer{" "}
          <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          id={`footer-${uid}`}
          name="defaultFooter"
          rows={3}
          defaultValue={template?.defaultFooter ?? ""}
          className="field-textarea"
          placeholder="e.g. PCPNDT declaration. Use {{radiologist}} for the reporting doctor's name…"
        />
      </div>

      {state && !state.ok && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}
      {state && state.ok && (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
        >
          {isEdit ? "Template updated." : "Template created."}
        </p>
      )}

      <div className="flex justify-end">
        <SubmitButton
          variant={isEdit ? "secondary" : "primary"}
          pendingLabel={isEdit ? "Saving…" : "Creating…"}
        >
          {isEdit ? "Save changes" : "Create template"}
        </SubmitButton>
      </div>
    </form>
  );
}
