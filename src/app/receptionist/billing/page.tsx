import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-helpers";
import { formatINR, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_STYLES } from "@/lib/types";
import { DbErrorNotice } from "@/components/DbErrorNotice";
import { BillingWorkbench } from "@/components/receptionist/BillingWorkbench";
import type { ServiceOption } from "@/components/receptionist/BillingWorkbench";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const data = await safeQuery(async () => {
    const [services, recent, doctors] = await Promise.all([
      prisma.service.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
      prisma.bill.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { patient: true },
      }),
      prisma.referringDoctor.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { name: true },
      }),
    ]);
    return { services, recent, doctors };
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Billing</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pull up an existing patient and raise a bill. Scan services are sent to the radiologist worklist automatically.
        </p>
      </header>

      {data === null ? (
        <DbErrorNotice />
      ) : (
        <>
          <BillingWorkbench
            referringDoctors={data.doctors.map((d) => d.name)}
            services={data.services.map<ServiceOption>((s) => ({
              id: s.id,
              name: s.name,
              department: s.department,
              modality: s.modality,
              price: s.price,
            }))}
          />

          {data.recent.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-slate-700">Recent bills</h2>
              <ul className="space-y-2">
                {data.recent.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/receptionist/billing/${b.id}`}
                      className="card flex items-center justify-between gap-4 p-3 text-sm transition hover:border-brand-300"
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-slate-800">{b.patient.name}</span>
                        <span className="ml-2 font-mono text-xs text-slate-400">{b.invoiceNo}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-semibold text-slate-800">
                          {formatINR(b.total)}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${PAYMENT_STATUS_STYLES[b.status]}`}
                        >
                          {PAYMENT_STATUS_LABELS[b.status]}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
