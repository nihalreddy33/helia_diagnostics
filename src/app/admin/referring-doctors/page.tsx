import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-helpers";
import { DbErrorNotice } from "@/components/DbErrorNotice";
import { EmptyState } from "@/components/EmptyState";
import { Disclosure } from "@/components/admin/Disclosure";
import { ReferringDoctorForm } from "@/components/admin/ReferringDoctorForm";

export const dynamic = "force-dynamic";

export default async function ReferringDoctorsPage() {
  const doctors = await safeQuery(() =>
    prisma.referringDoctor.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Referring Doctors</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your regular referring doctors. These appear as suggestions when reception fills the
          referring-doctor field on a bill.
        </p>
      </header>

      <section className="card p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Add doctor</h2>
        <ReferringDoctorForm />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          All doctors {doctors && <span className="text-slate-400">({doctors.length})</span>}
        </h2>
        {doctors === null ? (
          <DbErrorNotice />
        ) : doctors.length === 0 ? (
          <EmptyState title="No doctors yet" description="Add your first referring doctor above." icon="🩺" />
        ) : (
          <ul className="space-y-2">
            {doctors.map((d) => (
              <li key={d.id} className="card flex flex-col p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-slate-900">
                    {d.name}
                    {!d.active && (
                      <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                        inactive
                      </span>
                    )}
                  </p>
                </div>
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <Disclosure openLabel="Edit" closeLabel="Close">
                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                      <ReferringDoctorForm doctor={{ id: d.id, name: d.name, active: d.active }} />
                    </div>
                  </Disclosure>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
