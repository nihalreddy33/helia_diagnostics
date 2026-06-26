"use client";

import { useActionState } from "react";
import { saveService } from "@/app/actions/services";
import { MODALITIES, MODALITY_LABELS } from "@/lib/types";
import type { ActionResult, Modality } from "@/lib/types";
import { SubmitButton } from "@/components/ui/SubmitButton";

type State = (ActionResult<{ id: string }> & { key: number }) | null;

export type EditableService = {
  id: string;
  name: string;
  modality: Modality | null;
  price: number; // paise
  active: boolean;
};

export function ServiceForm({ service }: { service?: EditableService }) {
  const isEdit = Boolean(service);
  const uid = service?.id ?? "new";

  async function action(prev: State, formData: FormData): Promise<State> {
    const result = await saveService(formData);
    return { ...result, key: (prev?.key ?? 0) + 1 };
  }
  const [state, formAction] = useActionState<State, FormData>(action, null);

  return (
    <form action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={service?.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor={`name-${uid}`}>
            Service name
          </label>
          <input
            id={`name-${uid}`}
            name="name"
            type="text"
            required
            defaultValue={service?.name ?? ""}
            className="field-input"
            placeholder="USG Abdomen — Male"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label" htmlFor={`price-${uid}`}>
              Price (₹)
            </label>
            <input
              id={`price-${uid}`}
              name="price"
              type="number"
              min={0}
              step="0.01"
              required
              defaultValue={service ? service.price / 100 : ""}
              className="field-input"
              placeholder="1200"
            />
          </div>
          <div>
            <label className="field-label" htmlFor={`modality-${uid}`}>
              Scan type
            </label>
            <select
              id={`modality-${uid}`}
              name="modality"
              defaultValue={service?.modality ?? ""}
              className="field-input"
            >
              <option value="">Non-scan</option>
              {MODALITIES.map((m) => (
                <option key={m} value={m}>
                  {MODALITY_LABELS[m]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="active"
          defaultChecked={service ? service.active : true}
          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-300"
        />
        Active (available for billing)
      </label>

      <p className="text-xs text-slate-500">
        A scan-type service automatically creates a scan order on the radiologist worklist when billed.
      </p>

      {state && !state.ok && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {isEdit ? "Service updated." : "Service created."}
        </p>
      )}

      <div className="flex justify-end">
        <SubmitButton
          variant={isEdit ? "secondary" : "primary"}
          pendingLabel={isEdit ? "Saving…" : "Creating…"}
        >
          {isEdit ? "Save changes" : "Create service"}
        </SubmitButton>
      </div>
    </form>
  );
}
