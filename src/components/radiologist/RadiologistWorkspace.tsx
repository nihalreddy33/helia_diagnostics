"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/ui/Badge";
import { ReportEditor } from "./ReportEditor";
import type { WorklistPatient, WorklistTemplate } from "./types";

export function RadiologistWorkspace({
  worklist,
  templates,
}: {
  worklist: WorklistPatient[];
  templates: WorklistTemplate[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    worklist[0]?.id ?? null,
  );

  // Keep the selection valid as the worklist changes (e.g. after a report is
  // approved and revalidation removes that patient from the queue).
  useEffect(() => {
    const first = worklist[0];
    if (!first) {
      setSelectedId(null);
      return;
    }
    if (!worklist.some((p) => p.id === selectedId)) {
      setSelectedId(first.id);
    }
  }, [worklist, selectedId]);

  if (worklist.length === 0) {
    return (
      <EmptyState
        icon="✅"
        title="Worklist is clear"
        description="Every patient with a scan has an approved report. New registrations from reception will appear here automatically."
      />
    );
  }

  const selected = worklist.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
      {/* LEFT: sequential, numbered queue */}
      <aside className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Queue
          </h2>
          <span className="text-xs font-medium text-slate-400">
            {worklist.length} waiting
          </span>
        </div>
        <ol className="space-y-2">
          {worklist.map((patient, index) => {
            const active = patient.id === selectedId;
            return (
              <li key={patient.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(patient.id)}
                  aria-current={active ? "true" : undefined}
                  className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 ${
                    active
                      ? "border-brand-300 bg-brand-50 ring-1 ring-brand-200"
                      : "border-slate-200 bg-white hover:border-brand-200 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      active
                        ? "bg-brand-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-slate-900">
                        {patient.name}
                      </span>
                      {patient.draft && <StatusBadge status={patient.draft.status} />}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                      {patient.uhid} · {patient.age} yrs · {patient.gender}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </aside>

      {/* RIGHT: interactive editor */}
      <section className="card p-6">
        {selected ? (
          // Key by patient id so the editor's controlled state resets cleanly
          // whenever a different patient is selected.
          <ReportEditor key={selected.id} patient={selected} templates={templates} />
        ) : (
          <EmptyState
            title="Select a patient"
            description="Choose a patient from the queue to begin transcribing their report."
          />
        )}
      </section>
    </div>
  );
}
