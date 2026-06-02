"use client";

import { useActionState } from "react";
import { createPatient } from "@/app/actions/patients";
import { MODALITIES, MODALITY_LABELS } from "@/lib/types";
import type { ActionResult } from "@/lib/types";
import { SubmitButton } from "@/components/ui/SubmitButton";

type State = (ActionResult<{ id: string; uhid: string }> & { key: number }) | null;

async function action(_prev: State, formData: FormData): Promise<State> {
  const result = await createPatient(formData);
  return { ...result, key: Date.now() };
}

const GENDERS = ["Male", "Female", "Other"];

export function PatientIntakeForm() {
  const [state, formAction] = useActionState<State, FormData>(action, null);
  const succeeded = state?.ok === true;

  return (
    <form
      action={formAction}
      // Remount inputs on success so the form clears for the next patient.
      key={succeeded ? state.data.uhid : "form"}
      className="space-y-5"
    >
      {state && !state.ok && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
          {state.error}
        </p>
      )}
      {succeeded && (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200">
          Patient registered. UHID <span className="font-mono font-semibold">{state.data.uhid}</span> assigned.
        </p>
      )}

      <div>
        <label htmlFor="name" className="field-label">
          Patient name
        </label>
        <input id="name" name="name" required autoComplete="off" className="field-input" placeholder="e.g. Rahul Verma" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="age" className="field-label">
            Age
          </label>
          <input id="age" name="age" type="number" min={0} max={150} required className="field-input" placeholder="45" />
        </div>
        <div>
          <label htmlFor="gender" className="field-label">
            Gender
          </label>
          <select id="gender" name="gender" required defaultValue="" className="field-input">
            <option value="" disabled>
              Select…
            </option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="targetModality" className="field-label">
          Target modality
        </label>
        <select id="targetModality" name="targetModality" required defaultValue="" className="field-input">
          <option value="" disabled>
            Select scan type…
          </option>
          {MODALITIES.map((m) => (
            <option key={m} value={m}>
              {MODALITY_LABELS[m]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">
          UHID is generated automatically on registration.
        </p>
      </div>

      <SubmitButton pendingLabel="Registering…">Register patient</SubmitButton>
    </form>
  );
}
