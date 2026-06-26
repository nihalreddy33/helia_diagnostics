"use client";

import { useActionState } from "react";
import { createPatient } from "@/app/actions/patients";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { ActionResult } from "@/lib/types";

const GENDERS = ["Male", "Female", "Other"] as const;

type State = (ActionResult<{ id: string; uhid: string }> & { key: number }) | null;

async function action(prev: State, fd: FormData): Promise<State> {
  const r = await createPatient(fd);
  return { ...r, key: (prev?.key ?? 0) + 1 };
}

export function PatientRegistrationForm() {
  const [state, formAction] = useActionState<State, FormData>(action, null);

  // Remount the form on every successful registration so the inputs clear.
  const formKey = state?.ok ? state.key : "form";

  return (
    <div className="space-y-4">
      {state && !state.ok && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {state.error}
        </div>
      )}

      {state?.ok && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <p className="text-sm font-medium text-emerald-700">Patient registered successfully</p>
          <p className="mt-1 text-xs text-emerald-600">Hospital ID (UHID)</p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-emerald-900">
            {state.data.uhid}
          </p>
        </div>
      )}

      <form key={formKey} action={formAction} className="space-y-4">
        <div>
          <label htmlFor="name" className="field-label">
            Patient name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="off"
            placeholder="e.g. Jane Doe"
            className="field-input"
          />
        </div>

        <div>
          <label htmlFor="mobile" className="field-label">
            Mobile number
          </label>
          <input
            id="mobile"
            name="mobile"
            type="tel"
            inputMode="tel"
            required
            autoComplete="off"
            placeholder="e.g. 98765 43210"
            className="field-input"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="age" className="field-label">
              Age
            </label>
            <input
              id="age"
              name="age"
              type="number"
              min={0}
              max={150}
              required
              placeholder="Years"
              className="field-input"
            />
          </div>

          <div>
            <label htmlFor="gender" className="field-label">
              Gender
            </label>
            <select id="gender" name="gender" required defaultValue="" className="field-input">
              <option value="" disabled>
                Select gender
              </option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-1">
          <SubmitButton variant="primary" pendingLabel="Registering…">
            Register patient
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
