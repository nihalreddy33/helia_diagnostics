import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-helpers";
import { MODALITY_LABELS } from "@/lib/types";
import { DbErrorNotice } from "@/components/DbErrorNotice";
import { EmptyState } from "@/components/EmptyState";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { TemplateForm } from "@/components/admin/TemplateForm";
import { Disclosure } from "@/components/admin/Disclosure";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function TemplatesPage() {
  const templates = await safeQuery(() =>
    prisma.template.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        modality: true,
        defaultFindings: true,
        defaultImpression: true,
        createdAt: true,
      },
    }),
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Template Manager
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Maintain reusable findings and impressions that radiologists can
          pre-fill when reporting.
        </p>
      </header>

      {templates === null ? (
        <DbErrorNotice />
      ) : (
        <>
          <section className="card p-6">
            <h2 className="text-lg font-semibold text-slate-800">
              Create template
            </h2>
            <p className="mt-1 mb-4 text-sm text-slate-500">
              Provide default text that will be copied into new reports of this
              modality.
            </p>
            <TemplateForm />
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-800">
              Templates{" "}
              <span className="text-sm font-normal text-slate-400">
                ({templates.length})
              </span>
            </h2>

            {templates.length === 0 ? (
              <EmptyState
                icon="📋"
                title="No templates yet"
                description="Create your first reporting template using the form above."
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {templates.map((template) => (
                  <article key={template.id} className="card flex flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {template.title}
                        </h3>
                        <span className="mt-1 inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-200">
                          {MODALITY_LABELS[template.modality]}
                        </span>
                      </div>
                      <span className="shrink-0 text-xs text-slate-400">
                        {dateFmt.format(template.createdAt)}
                      </span>
                    </div>

                    <dl className="mt-4 space-y-3 text-sm">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Findings
                        </dt>
                        <dd className="mt-1 line-clamp-3 whitespace-pre-line text-slate-600">
                          {template.defaultFindings}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Impression
                        </dt>
                        <dd className="mt-1 line-clamp-2 whitespace-pre-line text-slate-600">
                          {template.defaultImpression}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
                      <Disclosure openLabel="Edit" closeLabel="Close">
                        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                          <TemplateForm
                            template={{
                              id: template.id,
                              title: template.title,
                              modality: template.modality,
                              defaultFindings: template.defaultFindings,
                              defaultImpression: template.defaultImpression,
                            }}
                          />
                        </div>
                      </Disclosure>
                      <DeleteButton
                        entity="template"
                        id={template.id}
                        label="Delete"
                        description={`Permanently delete the template "${template.title}"? Existing reports keep their copied text. This cannot be undone.`}
                      />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
