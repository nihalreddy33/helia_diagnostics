import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-helpers";
import { MODALITY_LABELS, formatINR } from "@/lib/types";
import { DbErrorNotice } from "@/components/DbErrorNotice";
import { EmptyState } from "@/components/EmptyState";
import { Disclosure } from "@/components/admin/Disclosure";
import { ServiceForm } from "@/components/admin/ServiceForm";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const services = await safeQuery(() =>
    prisma.service.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Services &amp; Pricing</h1>
        <p className="mt-1 text-sm text-slate-500">
          The price list the receptionist bills from. Scan-type services create a report order automatically.
        </p>
      </header>

      <section className="card p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">New service</h2>
        <div className="mt-3">
          <ServiceForm />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          All services {services && <span className="text-slate-400">({services.length})</span>}
        </h2>
        {services === null ? (
          <DbErrorNotice />
        ) : services.length === 0 ? (
          <EmptyState title="No services yet" description="Add your first billable service above." icon="🧾" />
        ) : (
          <ul className="space-y-2">
            {services.map((s) => (
              <li key={s.id} className="card flex flex-col p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      {s.name}
                      {!s.active && (
                        <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                          inactive
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {s.modality ? MODALITY_LABELS[s.modality] : "Non-scan"}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-semibold text-slate-800">
                    {formatINR(s.price)}
                  </span>
                </div>
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <Disclosure openLabel="Edit" closeLabel="Close">
                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                      <ServiceForm
                        service={{
                          id: s.id,
                          name: s.name,
                          modality: s.modality,
                          price: s.price,
                          active: s.active,
                        }}
                      />
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
