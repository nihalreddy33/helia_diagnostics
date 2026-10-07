import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-helpers";
import { DbErrorNotice } from "@/components/DbErrorNotice";
import { PatientRegistrationForm } from "@/components/receptionist/PatientRegistrationForm";
import { PatientDirectory } from "@/components/receptionist/PatientDirectory";

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
            Find / edit a patient
          </h2>

          {recent === null ? (
            <DbErrorNotice />
          ) : (
            <PatientDirectory initial={recent} />
          )}
        </section>
      </div>
    </main>
  );
}
