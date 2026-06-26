"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/ui/Badge";
import { LabReportEditor } from "./LabReportEditor";
import type { LabTemplateOption, LabWorklistItem } from "./types";

export function LabWorkbench({
  worklist,
  templates,
}: {
  worklist: LabWorklistItem[];
  templates: LabTemplateOption[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(worklist[0]?.id ?? null);

  useEffect(() => {
    const first = worklist[0];
    if (!first) {
      setSelectedId(null);
      return;
    }
    if (!worklist.some((w) => w.id === selectedId)) setSelectedId(first.id);
  }, [worklist, selectedId]);

  if (worklist.length === 0) {
    return (
      <EmptyState
        icon="🧪"
        title="No lab tests pending"
        description="Lab tests billed at reception appear here automatically, ready for results."
      />
    );
  }

  const selected = worklist.find((w) => w.id === selectedId) ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
      <aside className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Pending</h2>
          <span className="text-xs font-medium text-slate-400">{worklist.length} waiting</span>
        </div>
        <ol className="space-y-2">
          {worklist.map((w, index) => {
            const active = w.id === selectedId;
            return (
              <li key={w.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(w.id)}
                  aria-current={active ? "true" : undefined}
                  className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 ${
                    active
                      ? "border-brand-300 bg-brand-50 ring-1 ring-brand-200"
                      : "border-slate-200 bg-white hover:border-brand-200 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      active ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-slate-900">{w.patientName}</span>
                      <StatusBadge status={w.status} />
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                      {w.uhid} · {w.age} yrs · {w.gender}
                    </span>
                    {w.orderedTest && (
                      <span className="mt-1 inline-block rounded bg-brand-50 px-1.5 py-0.5 text-[11px] font-medium text-brand-700">
                        {w.orderedTest}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </aside>

      <section className="card p-6">
        {selected ? (
          <LabReportEditor key={selected.id} item={selected} templates={templates} />
        ) : (
          <EmptyState title="Select a test" description="Choose a pending lab test to enter results." />
        )}
      </section>
    </div>
  );
}
