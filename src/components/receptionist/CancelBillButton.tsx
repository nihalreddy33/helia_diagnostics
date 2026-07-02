"use client";

import { useState, useActionState } from "react";
import { cancelBill } from "@/app/actions/billing-ops";
import { formatINR } from "@/lib/types";
import type { ActionResult } from "@/lib/types";
import { SubmitButton } from "@/components/ui/SubmitButton";

type State = (ActionResult<{ id: string }> & { key: number }) | null;

async function action(prev: State, formData: FormData): Promise<State> {
  const result = await cancelBill(formData);
  return { ...result, key: (prev?.key ?? 0) + 1 };
}

/** Cancel-bill control for the invoice page (hidden in print via .no-print). */
export function CancelBillButton({
  billId,
  amountPaid,
}: {
  billId: string;
  amountPaid: number; // paise
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<State, FormData>(action, null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 ring-1 ring-inset ring-red-200 transition hover:bg-red-50"
      >
        Cancel bill
      </button>
    );
  }

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm("Cancel this bill? This can't be undone.")) e.preventDefault();
      }}
      className="flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2"
    >
      <input type="hidden" name="billId" value={billId} />
      <input
        type="text"
        name="reason"
        required
        placeholder="Reason (e.g. wrong test)"
        aria-label="Cancellation reason"
        className="min-w-[12rem] flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
      />
      {amountPaid > 0 && (
        <label className="flex items-center gap-1.5 text-xs text-slate-700">
          <input type="checkbox" name="refund" defaultChecked className="h-4 w-4 rounded border-slate-300 text-red-600" />
          Refund {formatINR(amountPaid)}
        </label>
      )}
      <SubmitButton variant="danger" pendingLabel="…" className="!px-3 !py-1 !text-xs">
        Confirm cancel
      </SubmitButton>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-slate-500 hover:text-slate-800"
      >
        Keep
      </button>
      {state && !state.ok && (
        <span role="alert" className="w-full text-xs text-red-600">
          {state.error}
        </span>
      )}
    </form>
  );
}
