import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-helpers";
import { DbErrorNotice } from "@/components/DbErrorNotice";
import { EmptyState } from "@/components/EmptyState";
import { Disclosure } from "@/components/admin/Disclosure";
import {
  LabTemplateForm,
  type ServiceLink,
  type TemplateOption,
} from "@/components/admin/LabTemplateForm";

export const dynamic = "force-dynamic";

export default async function LabTemplatesPage() {
  const data = await safeQuery(async () => {
    const [templates, labServices] = await Promise.all([
      prisma.labTemplate.findMany({
        orderBy: { title: "asc" },
        include: {
          parameters: { orderBy: { position: "asc" } },
          members: {
            orderBy: { position: "asc" },
            include: { member: { select: { id: true, title: true, _count: { select: { parameters: true } } } } },
          },
        },
      }),
      prisma.service.findMany({
        where: { department: "LAB" },
        orderBy: { name: "asc" },
        select: { id: true, name: true, labTemplateId: true, labTemplate: { select: { title: true } } },
      }),
    ]);
    return { templates, labServices };
  });

  const templates = data?.templates ?? null;
  const services: ServiceLink[] =
    data?.labServices.map((s) => ({
      id: s.id,
      name: s.name,
      labTemplateId: s.labTemplateId,
      labTemplateTitle: s.labTemplate?.title ?? null,
    })) ?? [];

  // Every format offered as a bundle candidate in the package picker.
  const templateOptions: TemplateOption[] =
    templates?.map((t) => ({
      id: t.id,
      title: t.title,
      parameterCount: t.parameters.length,
      isPackage: t.members.length > 0,
    })) ?? [];

  // Which service names are linked to each format (for the at-a-glance summary).
  const linksByTemplate = new Map<string, string[]>();
  for (const s of services) {
    if (!s.labTemplateId) continue;
    const arr = linksByTemplate.get(s.labTemplateId) ?? [];
    arr.push(s.name);
    linksByTemplate.set(s.labTemplateId, arr);
  }

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
          <LabTemplateForm services={services} templates={templateOptions} />
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
                    <p className="font-medium text-slate-900">
                      {t.title}
                      {t.members.length > 0 && (
                        <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wider text-brand-700 ring-1 ring-inset ring-brand-200">
                          Package
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {t.members.length > 0
                        ? `${t.members.length} tests · ${
                            t.members.reduce((n, m) => n + m.member._count.parameters, 0) +
                            t.parameters.length
                          } parameters`
                        : `${t.parameters.length} parameter${t.parameters.length === 1 ? "" : "s"}`}
                    </p>
                  </div>
                </div>
                {t.members.length > 0 && (
                  <p className="mt-2 text-xs">
                    <span className="font-medium text-slate-500">Includes: </span>
                    <span className="text-brand-700">
                      {t.members.map((m) => m.member.title).join(" · ")}
                    </span>
                  </p>
                )}
                {t.parameters.length > 0 && (
                  <p className="mt-2 line-clamp-1 text-xs text-slate-500">
                    {t.parameters.map((p) => p.name).join(" · ")}
                  </p>
                )}
                {(() => {
                  const linked = linksByTemplate.get(t.id) ?? [];
                  return (
                    <p className="mt-1.5 text-xs">
                      <span className="font-medium text-slate-500">Linked services: </span>
                      {linked.length > 0 ? (
                        <span className="text-brand-700">{linked.join(", ")}</span>
                      ) : (
                        <span className="text-slate-400">none yet</span>
                      )}
                    </p>
                  );
                })()}
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <Disclosure openLabel="Edit" closeLabel="Close">
                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                      <LabTemplateForm
                        services={services}
                        templates={templateOptions}
                        template={{
                          id: t.id,
                          title: t.title,
                          memberIds: t.members.map((m) => m.memberId),
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
