"use client";

import { useState, useActionState } from "react";
import { saveLabTemplate } from "@/app/actions/lab-templates";
import type { ActionResult } from "@/lib/types";
import { SubmitButton } from "@/components/ui/SubmitButton";

type State = (ActionResult<{ id: string }> & { key: number }) | null;

type Param = { name: string; unit: string; referenceRange: string };

export type EditableLabTemplate = {
  id: string;
  title: string;
  parameters: Param[];
};

/** A LAB service that can be linked to this format. */
export type ServiceLink = {
  id: string;
  name: string;
  labTemplateId: string | null;
  labTemplateTitle: string | null;
};

const emptyParam = (): Param => ({ name: "", unit: "", referenceRange: "" });

export function LabTemplateForm({
  template,
  services = [],
}: {
  template?: EditableLabTemplate;
  services?: ServiceLink[];
}) {
  const isEdit = Boolean(template);
  const [params, setParams] = useState<Param[]>(
    template?.parameters?.length ? template.parameters : [emptyParam()],
  );
  const [linked, setLinked] = useState<Set<string>>(
    () => new Set(services.filter((s) => s.labTemplateId === template?.id).map((s) => s.id)),
  );
  const [serviceQuery, setServiceQuery] = useState("");
  const visibleServices = services.filter((s) =>
    s.name.toLowerCase().includes(serviceQuery.trim().toLowerCase()),
  );

  function toggleService(id: string) {
    setLinked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function action(prev: State, formData: FormData): Promise<State> {
    const result = await saveLabTemplate(formData);
    return { ...result, key: (prev?.key ?? 0) + 1 };
  }
  const [state, formAction] = useActionState<State, FormData>(action, null);

  function update(i: number, patch: Partial<Param>) {
    setParams((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  const paramsJson = JSON.stringify(params.filter((p) => p.name.trim()));
  const serviceIdsJson = JSON.stringify([...linked]);

  return (
    <form action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={template?.id} />}
      <input type="hidden" name="parameters" value={paramsJson} />
      <input type="hidden" name="serviceIds" value={serviceIdsJson} />

      <div>
        <label className="field-label" htmlFor={`labtitle-${template?.id ?? "new"}`}>
          Test name
        </label>
        <input
          id={`labtitle-${template?.id ?? "new"}`}
          name="title"
          type="text"
          required
          defaultValue={template?.title ?? ""}
          className="field-input"
          placeholder="Complete Blood Count (CBC)"
        />
      </div>

      <div>
        <p className="field-label">Parameters</p>
        <div className="space-y-2">
          <div className="hidden grid-cols-[1fr_6rem_8rem_2rem] gap-2 text-[11px] uppercase tracking-wider text-slate-400 sm:grid">
            <span>Name</span>
            <span>Unit</span>
            <span>Reference</span>
            <span></span>
          </div>
          {params.map((p, i) => (
            <div key={i} className="grid grid-cols-[1fr_6rem_8rem_2rem] gap-2">
              <input
                value={p.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder="Hemoglobin"
                className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
              <input
                value={p.unit}
                onChange={(e) => update(i, { unit: e.target.value })}
                placeholder="g/dL"
                className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
              <input
                value={p.referenceRange}
                onChange={(e) => update(i, { referenceRange: e.target.value })}
                placeholder="13 - 17"
                className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={() => setParams((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-slate-400 hover:text-red-600"
                aria-label="Remove parameter"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setParams((prev) => [...prev, emptyParam()])}
          className="mt-2 rounded-lg px-3 py-1.5 text-sm font-medium text-brand-700 ring-1 ring-inset ring-brand-200 transition hover:bg-brand-50"
        >
          + Add parameter
        </button>
      </div>

      <div>
        <p className="field-label">Linked services</p>
        <p className="mb-2 text-xs text-slate-500">
          When one of these lab services is billed, this format loads automatically for the
          technician — no manual selection.
        </p>
        {services.length > 0 && (
          <div className="mb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Currently linked
            </p>
            {linked.size === 0 ? (
              <p className="mt-1 text-xs text-slate-400">No services linked yet.</p>
            ) : (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {services
                  .filter((s) => linked.has(s.id))
                  .map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-200"
                    >
                      {s.name}
                      <button
                        type="button"
                        onClick={() => toggleService(s.id)}
                        className="text-brand-400 hover:text-red-600"
                        aria-label={`Unlink ${s.name}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
              </div>
            )}
          </div>
        )}
        {services.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            No lab services yet. Add lab services (department: Lab) under{" "}
            <span className="font-medium">Services</span> first.
          </p>
        ) : (
          <>
            <input
              type="search"
              value={serviceQuery}
              onChange={(e) => setServiceQuery(e.target.value)}
              placeholder="Search services…"
              aria-label="Search lab services"
              className="mb-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
            <div className="max-h-52 space-y-0.5 overflow-auto rounded-lg border border-slate-200 p-2">
              {visibleServices.length === 0 ? (
                <p className="px-2 py-2 text-xs text-slate-400">
                  No services match “{serviceQuery}”.
                </p>
              ) : (
                visibleServices.map((s) => {
                  const checked = linked.has(s.id);
                  const elsewhere = s.labTemplateId && s.labTemplateId !== template?.id;
                  return (
                    <label
                      key={s.id}
                      className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleService(s.id)}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-300"
                      />
                      <span className="flex-1 text-slate-700">{s.name}</span>
                      {elsewhere && !checked && (
                        <span className="text-[11px] text-amber-600">
                          currently: {s.labTemplateTitle}
                        </span>
                      )}
                    </label>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {state && !state.ok && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {isEdit ? "Lab test updated." : "Lab test created."}
        </p>
      )}

      <div className="flex justify-end">
        <SubmitButton
          variant={isEdit ? "secondary" : "primary"}
          pendingLabel={isEdit ? "Saving…" : "Creating…"}
        >
          {isEdit ? "Save changes" : "Create lab test"}
        </SubmitButton>
      </div>
    </form>
  );
}
