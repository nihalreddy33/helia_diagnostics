import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-helpers";
import { DbErrorNotice } from "@/components/DbErrorNotice";
import { EmptyState } from "@/components/EmptyState";
import { Disclosure } from "@/components/admin/Disclosure";
import { LabTemplateForm } from "@/components/admin/LabTemplateForm";

export const dynamic = "force-dynamic";

export default async function LabTemplatesPage() {
  const templates = await safeQuery(() =>
    prisma.labTemplate.findMany({
      orderBy: { title: "asc" },
      include: { parameters: { orderBy: { position: "asc" } } },
    }),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Lab Tests</h1>
        <p className="mt-1 text-sm text-slate-500">
          Define lab test formats and their parameters. Technicians load these to enter results.
        </p>
      </header>

      <section className="card p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">New lab test</h2>
        <div className="mt-3">
          <LabTemplateForm />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          All lab tests {templates && <span className="text-slate-400">({templates.length})</span>}
        </h2>
        {templates === null ? (
          <DbErrorNotice />
        ) : templates.length === 0 ? (
          <EmptyState title="No lab tests yet" description="Add your first lab test format above." icon="🧪" />
        ) : (
          <ul className="space-y-2">
            {templates.map((t) => (
              <li key={t.id} className="card flex flex-col p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{t.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {t.parameters.length} parameter{t.parameters.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                {t.parameters.length > 0 && (
                  <p className="mt-2 line-clamp-1 text-xs text-slate-500">
                    {t.parameters.map((p) => p.name).join(" · ")}
                  </p>
                )}
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <Disclosure openLabel="Edit" closeLabel="Close">
                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                      <LabTemplateForm
                        template={{
                          id: t.id,
                          title: t.title,
                          parameters: t.parameters.map((p) => ({
                            name: p.name,
                            unit: p.unit,
                            referenceRange: p.referenceRange,
                          })),
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
