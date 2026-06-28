"use client";

import { useActionState } from "react";
import { saveReferringDoctor } from "@/app/actions/referring-doctors";
import type { ActionResult } from "@/lib/types";
import { SubmitButton } from "@/components/ui/SubmitButton";

type State = (ActionResult<{ id: string }> & { key: number }) | null;

export type EditableReferringDoctor = {
  id: string;
  name: string;
  active: boolean;
};

export function ReferringDoctorForm({ doctor }: { doctor?: EditableReferringDoctor }) {
  const isEdit = Boolean(doctor);
  const uid = doctor?.id ?? "new";

  async function action(prev: State, formData: FormData): Promise<State> {
    const result = await saveReferringDoctor(formData);
    return { ...result, key: (prev?.key ?? 0) + 1 };
  }
  const [state, formAction] = useActionState<State, FormData>(action, null);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      {isEdit && <input type="hidden" name="id" value={doctor?.id} />}

      <div className="min-w-[14rem] flex-1">
        <label className="field-label" htmlFor={`docname-${uid}`}>
          Doctor name
        </label>
        <input
          id={`docname-${uid}`}
          name="name"
          type="text"
          required
          defaultValue={doctor?.name ?? ""}
          className="field-input"
          placeholder="Dr. Mehta"
        />
      </div>

      <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="active"
          defaultChecked={doctor ? doctor.active : true}
          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-300"
        />
        Active
      </label>

      <SubmitButton
        variant={isEdit ? "secondary" : "primary"}
        pendingLabel={isEdit ? "Saving…" : "Adding…"}
      >
        {isEdit ? "Save" : "Add doctor"}
      </SubmitButton>

      {state && !state.ok && (
        <p role="alert" className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {isEdit ? "Doctor updated." : "Doctor added."}
        </p>
      )}
    </form>
  );
}
