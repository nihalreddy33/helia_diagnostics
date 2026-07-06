"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/ui/Badge";
import { ReportEditor } from "./ReportEditor";
import type { WorklistPatient, WorklistTemplate } from "./types";

type Tab = "pending" | "completed";

export function RadiologistWorkspace({
  pending,
  completed,
  templates,
}: {
  pending: WorklistPatient[];
  completed: WorklistPatient[];
  templates: WorklistTemplate[];
}) {
  const [tab, setTab] = useState<Tab>("pending");
  const list = tab === "pending" ? pending : completed;

  const [selectedId, setSelectedId] = useState<string | null>(list[0]?.id ?? null);

  // Keep the selection valid as lists change (e.g. after a report is approved
  // and revalidation moves that patient from pending to completed).
  useEffect(() => {
    if (list.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!list.some((p) => p.id === selectedId)) {
      setSelectedId(list[0]!.id);
    }
  }, [list, selectedId]);

  const selected = useMemo(
    () => list.find((p) => p.id === selectedId) ?? null,
    [list, selectedId],
  );

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm font-medium">
        <TabButton active={tab === "pending"} onClick={() => setTab("pending")}>
          Pending{pending.length > 0 && <Count>{pending.length}</Count>}
        </TabButton>
        <TabButton active={tab === "completed"} onClick={() => setTab("completed")}>
          Completed{completed.length > 0 && <Count>{completed.length}</Count>}
        </TabButton>
      </div>

      {list.length === 0 ? (
        tab === "pending" ? (
          <EmptyState
            icon="✅"
            title="Worklist is clear"
            description="Every patient with a scan has an approved report. New registrations from reception will appear here automatically."
          />
        ) : (
          <EmptyState
            icon="📋"
            title="No approved reports yet"
            description="Approved reports appear here. You can re-open any of them to review or amend."
          />
        )
      ) : (
        <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
          {/* LEFT: queue for the active tab */}
          <aside className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {tab === "pending" ? "Queue" : "Approved"}
              </h2>
              <span className="text-xs font-medium text-slate-400">
                {list.length} {tab === "pending" ? "waiting" : "reports"}
              </span>
            </div>
            <ol className="space-y-2">
              {list.map((patient, index) => {
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
                          active ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-slate-900">
                            {patient.name}
                          </span>
                          {patient.report && <StatusBadge status={patient.report.status} />}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500">
                          {patient.uhid} · {patient.age} yrs · {patient.gender}
                        </span>
                        {patient.orderedService && (
                          <span className="mt-1 inline-block rounded bg-brand-50 px-1.5 py-0.5 text-[11px] font-medium text-brand-700">
                            {patient.orderedService}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </aside>

          {/* RIGHT: interactive editor (keyed so state resets per patient) */}
          <section className="card p-6">
            {selected ? (
              <ReportEditor key={selected.id} patient={selected} templates={templates} />
            ) : (
              <EmptyState
                title="Select a patient"
                description="Choose a patient from the list to begin."
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 transition ${
        active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

function Count({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-200 px-1.5 text-xs font-semibold text-slate-600">
      {children}
    </span>
  );
}
