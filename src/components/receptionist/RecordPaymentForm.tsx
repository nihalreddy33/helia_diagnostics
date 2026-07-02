"use client";

import { useState, useActionState } from "react";
import { recordPayment } from "@/app/actions/billing-ops";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, formatINR } from "@/lib/types";
import type { ActionResult } from "@/lib/types";
import { SubmitButton } from "@/components/ui/SubmitButton";

type State = (ActionResult<{ id: string }> & { key: number }) | null;

async function action(prev: State, formData: FormData): Promise<State> {
  const result = await recordPayment(formData);
  return { ...result, key: (prev?.key ?? 0) + 1 };
}

/** Collapsible "collect balance" control for an outstanding bill. */
export function RecordPaymentForm({
  billId,
  balance,
}: {
  billId: string;
  balance: number; // paise
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<State, FormData>(action, null);

  if (state?.ok) {
    return <span className="text-xs font-medium text-emerald-700">Payment recorded ✓</span>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
      >
        Collect
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="billId" value={billId} />
      <input
        type="number"
        name="amount"
        min={1}
        step="0.01"
        defaultValue={balance / 100}
        aria-label="Amount to collect"
        className="w-24 rounded border border-slate-300 px-2 py-1 text-sm"
        placeholder={formatINR(balance)}
      />
      <select
        name="paymentMethod"
        defaultValue="CASH"
        aria-label="Payment method"
        className="rounded border border-slate-300 px-2 py-1 text-sm"
      >
        {PAYMENT_METHODS.map((m) => (
          <option key={m} value={m}>
            {PAYMENT_METHOD_LABELS[m]}
          </option>
        ))}
      </select>
      <SubmitButton variant="success" pendingLabel="…" className="!px-3 !py-1 !text-xs">
        Save
      </SubmitButton>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-slate-400 hover:text-slate-700"
      >
        Cancel
      </button>
      {state && !state.ok && (
        <span role="alert" className="w-full text-xs text-red-600">
          {state.error}
        </span>
      )}
    </form>
  );
}
