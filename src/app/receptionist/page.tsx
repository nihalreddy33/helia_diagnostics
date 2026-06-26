import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-helpers";
import { DbErrorNotice } from "@/components/DbErrorNotice";
import { EmptyState } from "@/components/EmptyState";
import { PatientRegistrationForm } from "@/components/receptionist/PatientRegistrationForm";

export const dynamic = "force-dynamic";

export default async function ReceptionistPage() {
  const recent = await safeQuery(() =>
    prisma.patient.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, name: true, age: true, gender: true, uhid: true, mobile: true },
    }),
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Patient Registration</h1>
        <p className="mt-1 text-sm text-slate-500">
          Register a new patient. A unique hospital ID (UHID) is generated automatically.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className="card p-6 lg:col-span-3">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            New patient
          </h2>
          <PatientRegistrationForm />
        </section>

        <section className="lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Recently registered
          </h2>

          {recent === null ? (
            <DbErrorNotice />
          ) : recent.length === 0 ? (
            <EmptyState
              title="No patients yet"
              description="Newly registered patients will appear here."
              icon="🧾"
            />
          ) : (
            <ul className="space-y-2">
              {recent.map((p) => (
                <li key={p.id} className="card flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{p.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {p.age} yrs · {p.gender}
                      {p.mobile ? ` · ${p.mobile}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-brand-50 px-2 py-1 font-mono text-xs font-semibold text-brand-700">
                    {p.uhid}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
