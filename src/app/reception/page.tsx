import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-helpers";
import { MODALITY_LABELS } from "@/lib/types";
import { PatientIntakeForm } from "@/components/PatientIntakeForm";
import { DbErrorNotice } from "@/components/DbErrorNotice";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export default async function ReceptionPage() {
  const recent = await safeQuery(() =>
    prisma.patient.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Reception — Patient Intake</h1>
        <p className="mt-1 text-slate-600">Register a patient and assign the scan modality.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <PatientIntakeForm />
        </section>

        <section className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Recently registered</h2>
          {recent === null ? (
            <DbErrorNotice />
          ) : recent.length === 0 ? (
            <EmptyState title="No patients yet" description="Registered patients will appear here." icon="🧾" />
          ) : (
            <ul className="space-y-2">
              {recent.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm"
                >
                  <div>
                    <div className="font-medium text-slate-900">{p.name}</div>
                    <div className="text-xs text-slate-500">
                      {p.age}y · {p.gender} · <span className="font-mono">{p.uhid}</span>
                    </div>
                  </div>
                  {p.targetModality && (
                    <span className="rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700">
                      {MODALITY_LABELS[p.targetModality]}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
