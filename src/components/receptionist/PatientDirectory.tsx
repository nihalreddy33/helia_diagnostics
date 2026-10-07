"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { searchPatients, updatePatient, type PatientHit } from "@/app/actions/patients";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { formatAge } from "@/lib/types";
import type { ActionResult } from "@/lib/types";

const GENDERS = ["Male", "Female", "Other"] as const;

/** Mirrors the server's normalizeMobile so the field can't hold a bad number. */
function sanitizeMobile(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.length > 10 && d.startsWith("91")) d = d.slice(2);
  else if (d.length > 10 && d.startsWith("0")) d = d.slice(1);
  return d.slice(0, 10);
}

type State = (ActionResult<{ id: string; uhid: string }> & { key: number }) | null;

async function action(prev: State, fd: FormData): Promise<State> {
  const r = await updatePatient(fd);
  return { ...r, key: (prev?.key ?? 0) + 1 };
}

/**
 * Find any registered patient and correct their details. Sits beside the
 * registration form because that's where the desk already goes for patient
 * admin, and because the recent list alone can't reach an older record.
 */
export function PatientDirectory({ initial }: { initial: PatientHit[] }) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PatientHit[]>(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [isSearching, startSearch] = useTransition();

  // Debounced lookup; an empty box falls back to the most recent patients.
  useEffect(() => {
    const t = setTimeout(() => {
      startSearch(async () => {
        setHits(await searchPatients(query));
      });
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name, UHID or mobile…"
        aria-label="Search patients"
        className="field-input"
      />

      {hits.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
          {query ? `No patient matches “${query}”.` : "No patients yet."}
        </p>
      ) : (
        <ul className={`space-y-2 ${isSearching ? "opacity-60" : ""}`}>
          {hits.map((p) =>
            editing === p.id ? (
              <li key={p.id} className="card border-brand-200 p-4">
                <EditForm patient={p} onDone={() => setEditing(null)} />
              </li>
            ) : (
              <li key={p.id} className="card flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{p.name}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    <span className="font-mono text-brand-700">{p.uhid}</span>
                    {` · ${formatAge(p.age)} · ${p.gender}`}
                    {p.mobile ? ` · ${p.mobile}` : ""}
                    {p.legacyMrNo ? ` · ${p.legacyMrNo}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(p.id)}
                  className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-200 transition hover:bg-brand-50"
                >
                  Edit
                </button>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

function EditForm({ patient, onDone }: { patient: PatientHit; onDone: () => void }) {
  const [state, formAction] = useActionState<State, FormData>(action, null);
  const [mobile, setMobile] = useState(patient.mobile);

  // Close the editor once the save lands so the row shows the new details.
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={patient.id} />

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Editing{" "}
          <span className="font-mono text-brand-700">{patient.uhid}</span>
        </p>
        <button
          type="button"
          onClick={onDone}
          className="text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          Cancel
        </button>
      </div>

      <div>
        <label htmlFor={`name-${patient.id}`} className="field-label">Patient name</label>
        <input
          id={`name-${patient.id}`}
          name="name"
          type="text"
          required
          autoComplete="off"
          defaultValue={patient.name}
          className="field-input"
        />
      </div>

      <div>
        <label htmlFor={`mobile-${patient.id}`} className="field-label">Mobile number</label>
        <input
          id={`mobile-${patient.id}`}
          name="mobile"
          type="tel"
          inputMode="numeric"
          required
          autoComplete="off"
          maxLength={10}
          pattern="[6-9][0-9]{9}"
          title="Enter a valid 10-digit mobile number (starts with 6-9)"
          value={mobile}
          onChange={(e) => setMobile(sanitizeMobile(e.target.value))}
          className="field-input"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`age-${patient.id}`} className="field-label">Age</label>
          <input
            id={`age-${patient.id}`}
            name="age"
            type="number"
            min={0}
            max={150}
            required
            defaultValue={patient.age ?? ""}
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor={`gender-${patient.id}`} className="field-label">Gender</label>
          <select
            id={`gender-${patient.id}`}
            name="gender"
            required
            defaultValue={patient.gender}
            className="field-input"
          >
            {GENDERS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      {state && !state.ok && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <p className="text-xs text-slate-400">
        The UHID can&apos;t change — it&apos;s printed on past reports. Edits are recorded in the
        activity log.
      </p>

      <div className="flex justify-end">
        <SubmitButton variant="primary" pendingLabel="Saving…">
          Save changes
        </SubmitButton>
      </div>
    </form>
  );
}
