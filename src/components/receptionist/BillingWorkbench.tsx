"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBill } from "@/app/actions/billing";
import { searchPatients } from "@/app/actions/patients";
import type { PatientHit } from "@/app/actions/patients";
import {
  MODALITY_LABELS,
  DEPARTMENT_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  formatINR,
  rupeesToPaise,
} from "@/lib/types";
import type { ActionResult, Modality, Department } from "@/lib/types";
import { SubmitButton } from "@/components/ui/SubmitButton";

export type ServiceOption = {
  id: string;
  name: string;
  department: Department;
  modality: Modality | null;
  price: number; // paise
};

function serviceTag(s: ServiceOption): string {
  if (s.department === "RADIOLOGY" && s.modality) return MODALITY_LABELS[s.modality];
  return DEPARTMENT_LABELS[s.department];
}

type Line = { service: ServiceOption; quantity: number };
type State = (ActionResult<{ id: string; invoiceNo: string }> & { key: number }) | null;

async function action(prev: State, formData: FormData): Promise<State> {
  const result = await createBill(formData);
  return { ...result, key: (prev?.key ?? 0) + 1 };
}

export function BillingWorkbench({ services }: { services: ServiceOption[] }) {
  const router = useRouter();
  const [patient, setPatient] = useState<PatientHit | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [serviceQuery, setServiceQuery] = useState("");
  const [discount, setDiscount] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [method, setMethod] = useState("CASH");

  // Filter the services catalogue by name or modality label.
  const filteredServices = useMemo(() => {
    const q = serviceQuery.trim().toLowerCase();
    if (!q) return services;
    return services.filter((s) => {
      const modalityLabel = s.modality ? MODALITY_LABELS[s.modality].toLowerCase() : "non-scan";
      return s.name.toLowerCase().includes(q) || modalityLabel.includes(q);
    });
  }, [services, serviceQuery]);

  const [state, formAction] = useActionState<State, FormData>(action, null);

  // Navigate to the printable invoice once the bill is created.
  useEffect(() => {
    if (state?.ok) router.push(`/receptionist/billing/${state.data.id}`);
  }, [state, router]);

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.service.price * l.quantity, 0),
    [lines],
  );
  const discountPaise = Math.max(0, rupeesToPaise(discount));
  const total = Math.max(0, subtotal - discountPaise);
  const paidPaise = Math.max(0, rupeesToPaise(amountPaid));
  const balance = Math.max(0, total - paidPaise);
  const statusLabel = paidPaise >= total && total > 0 ? "Paid" : paidPaise > 0 ? "Partial" : "Unpaid";

  function addService(svc: ServiceOption) {
    setLines((prev) => {
      const i = prev.findIndex((l) => l.service.id === svc.id);
      if (i >= 0) {
        const copy = [...prev];
        copy[i] = { ...copy[i]!, quantity: copy[i]!.quantity + 1 };
        return copy;
      }
      return [...prev, { service: svc, quantity: 1 }];
    });
  }
  function setQty(id: string, qty: number) {
    setLines((prev) =>
      prev
        .map((l) => (l.service.id === id ? { ...l, quantity: Math.max(0, qty) } : l))
        .filter((l) => l.quantity > 0),
    );
  }

  const itemsJson = JSON.stringify(
    lines.map((l) => ({ serviceId: l.service.id, quantity: l.quantity })),
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        <PatientPicker patient={patient} onPick={setPatient} />

        {/* Service catalogue */}
        <section className="card p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Add services
            </h2>
            {services.length > 0 && (
              <input
                type="search"
                value={serviceQuery}
                onChange={(e) => setServiceQuery(e.target.value)}
                placeholder="Search tests…"
                aria-label="Search services"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 sm:w-56"
              />
            )}
          </div>
          {services.length === 0 ? (
            <p className="text-sm text-slate-500">
              No active services. An admin can add them under{" "}
              <span className="font-medium">Services</span>.
            </p>
          ) : filteredServices.length === 0 ? (
            <p className="text-sm text-slate-400">No tests match “{serviceQuery}”.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {filteredServices.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => addService(s)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm transition hover:border-brand-300 hover:bg-brand-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-800">{s.name}</span>
                      <span className="text-xs text-slate-400">{serviceTag(s)}</span>
                    </span>
                    <span className="shrink-0 font-mono text-xs font-semibold text-slate-700">
                      {formatINR(s.price)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Bill summary / payment */}
      <form action={formAction} className="card h-fit space-y-4 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Bill</h2>

        <div>
          <label htmlFor="referringDoctor" className="field-label">
            Referring doctor
          </label>
          <input
            id="referringDoctor"
            name="referringDoctor"
            type="text"
            required
            autoComplete="off"
            placeholder="e.g. Dr. Mehta (or Self)"
            className="field-input"
          />
        </div>

        {lines.length === 0 ? (
          <p className="text-sm text-slate-400">No services added yet.</p>
        ) : (
          <ul className="space-y-2">
            {lines.map((l) => (
              <li key={l.service.id} className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-slate-700">{l.service.name}</span>
                <input
                  type="number"
                  min={1}
                  value={l.quantity}
                  onChange={(e) => setQty(l.service.id, Number(e.target.value))}
                  className="w-12 rounded border border-slate-300 px-1 py-0.5 text-center text-xs"
                  aria-label={`Quantity for ${l.service.name}`}
                />
                <span className="w-20 text-right font-mono text-xs text-slate-700">
                  {formatINR(l.service.price * l.quantity)}
                </span>
                <button
                  type="button"
                  onClick={() => setQty(l.service.id, 0)}
                  className="text-slate-400 hover:text-red-600"
                  aria-label={`Remove ${l.service.name}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-1 border-t border-slate-100 pt-3 text-sm">
          <Row label="Subtotal" value={formatINR(subtotal)} />
          <div className="flex items-center justify-between">
            <label htmlFor="discount" className="text-slate-500">Discount (₹)</label>
            <input
              id="discount"
              name="discount"
              type="number"
              min={0}
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="w-24 rounded border border-slate-300 px-2 py-1 text-right text-sm"
              placeholder="0"
            />
          </div>
          <Row label="Total" value={formatINR(total)} strong />
        </div>

        <div className="space-y-2 border-t border-slate-100 pt-3">
          <div>
            <label htmlFor="paymentMethod" className="field-label">Payment method</label>
            <select
              id="paymentMethod"
              name="paymentMethod"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="field-input"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="amountPaid" className="field-label">Amount paid (₹)</label>
            <input
              id="amountPaid"
              name="amountPaid"
              type="number"
              min={0}
              step="0.01"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              className="field-input"
              placeholder={(total / 100).toString()}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Balance</span>
            <span className="font-medium text-slate-800">
              {formatINR(balance)} · <span className="text-slate-500">{statusLabel}</span>
            </span>
          </div>
        </div>

        {/* Hidden fields consumed by the server action */}
        <input type="hidden" name="patientId" value={patient?.id ?? ""} />
        <input type="hidden" name="items" value={itemsJson} />

        {state && !state.ok && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <SubmitButton className="w-full" pendingLabel="Saving…">
          Generate bill
        </SubmitButton>
        {(!patient || lines.length === 0) && (
          <p className="text-center text-xs text-slate-400">
            Select a patient and add at least one service.
          </p>
        )}
      </form>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={strong ? "font-mono text-base font-bold text-slate-900" : "font-mono text-slate-700"}>
        {value}
      </span>
    </div>
  );
}

function PatientPicker({
  patient,
  onPick,
}: {
  patient: PatientHit | null;
  onPick: (p: PatientHit | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PatientHit[]>([]);
  const [pending, startTransition] = useTransition();

  // Debounced lookup.
  useEffect(() => {
    if (patient) return;
    const t = setTimeout(() => {
      startTransition(async () => {
        setHits(await searchPatients(query));
      });
    }, 250);
    return () => clearTimeout(t);
  }, [query, patient]);

  if (patient) {
    return (
      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Patient</h2>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
          <div>
            <p className="font-semibold text-slate-900">{patient.name}</p>
            <p className="text-xs text-slate-500">
              <span className="font-mono">{patient.uhid}</span> · {patient.age} yrs · {patient.gender}
              {patient.mobile ? ` · ${patient.mobile}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onPick(null)}
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            Change
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Find patient</h2>
        <Link href="/receptionist" className="text-xs font-medium text-brand-700 hover:underline">
          Register new →
        </Link>
      </div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name, UHID, or mobile…"
        className="field-input"
        aria-label="Search patients"
      />
      <ul className="mt-2 max-h-64 space-y-1 overflow-auto">
        {pending && hits.length === 0 && <li className="px-2 py-2 text-sm text-slate-400">Searching…</li>}
        {!pending && hits.length === 0 && (
          <li className="px-2 py-2 text-sm text-slate-400">No patients found.</li>
        )}
        {hits.map((h) => (
          <li key={h.id}>
            <button
              type="button"
              onClick={() => onPick(h)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition hover:bg-slate-50"
            >
              <span className="font-medium text-slate-800">{h.name}</span>
              <span className="text-xs text-slate-400">
                <span className="font-mono">{h.uhid}</span> · {h.age}y · {h.gender}
                {h.mobile ? ` · ${h.mobile}` : ""}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
