import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-helpers";
import {
  MODALITY_LABELS,
  DEPARTMENT_LABELS,
  DEPARTMENTS,
  formatINR,
} from "@/lib/types";
import type { Department } from "@/lib/types";
import { DbErrorNotice } from "@/components/DbErrorNotice";
import { EmptyState } from "@/components/EmptyState";
import { Disclosure } from "@/components/admin/Disclosure";
import { ServiceForm } from "@/components/admin/ServiceForm";

export const dynamic = "force-dynamic";

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; dept?: string }>;
}) {
  const { q, dept } = await searchParams;
  const query = (q ?? "").trim();
  const department = (DEPARTMENTS as readonly string[]).includes(dept ?? "")
    ? (dept as Department)
    : "";

  const services = await safeQuery(() => {
    const where: Prisma.ServiceWhereInput = {};
    if (query) where.name = { contains: query, mode: "insensitive" };
    if (department) where.department = department;
    return prisma.service.findMany({
      where,
      orderBy: [{ active: "desc" }, { name: "asc" }],
    });
  });

  const filtered = Boolean(query || department);

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

      <section className="space-y-3">
        <form method="get" className="card flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-[14rem] flex-1">
            <label htmlFor="q" className="field-label">Search</label>
            <input
              id="q"
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search services by name…"
              className="field-input"
            />
          </div>
          <div className="min-w-[10rem]">
            <label htmlFor="dept" className="field-label">Department</label>
            <select id="dept" name="dept" defaultValue={department} className="field-input">
              <option value="">All departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {DEPARTMENT_LABELS[d]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              Apply
            </button>
            <Link
              href="/admin/services"
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-300 transition hover:bg-slate-50"
            >
              Reset
            </Link>
          </div>
        </form>

        <h2 className="text-sm font-semibold text-slate-700">
          {filtered ? "Matching services" : "All services"}{" "}
          {services && <span className="text-slate-400">({services.length})</span>}
        </h2>
        {services === null ? (
          <DbErrorNotice />
        ) : services.length === 0 ? (
          <EmptyState
            title={filtered ? "No services match" : "No services yet"}
            description={
              filtered
                ? "Try a different name or department."
                : "Add your first billable service above."
            }
            icon="🧾"
          />
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
                      {DEPARTMENT_LABELS[s.department]}
                      {s.modality ? ` · ${MODALITY_LABELS[s.modality]}` : ""}
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
                          department: s.department,
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
