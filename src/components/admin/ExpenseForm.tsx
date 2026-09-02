"use client";

import { useActionState } from "react";
import { createExpense } from "@/app/actions/expenses";
import { SubmitButton } from "@/components/ui/SubmitButton";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/types";
import type { ActionResult } from "@/lib/types";

type State = (ActionResult<{ id: string }> & { key: number }) | null;

async function action(prev: State, fd: FormData): Promise<State> {
  const r = await createExpense(fd);
  return { ...r, key: (prev?.key ?? 0) + 1 };
}

/** Record money spent. `today` is the IST day, passed in from the server. */
export function ExpenseForm({ today }: { today: string }) {
  const [state, formAction] = useActionState<State, FormData>(action, null);
  // Remount on success so every field clears for the next entry.
  const formKey = state?.ok ? state.key : "expense-form";

  return (
    <div className="space-y-3">
      {state && !state.ok && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Expense recorded.
        </p>
      )}

      <form key={formKey} action={formAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="spentOn" className="field-label">Date</label>
          <input
            id="spentOn"
            name="spentOn"
            type="date"
            required
            defaultValue={today}
            max={today}
            className="field-input"
          />
        </div>

        <div>
          <label htmlFor="category" className="field-label">Category</label>
          <select id="category" name="category" required defaultValue="" className="field-input">
            <option value="" disabled>Select category</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="amount" className="field-label">Amount (₹)</label>
          <input
            id="amount"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            placeholder="32000"
            className="field-input"
          />
        </div>

        <div>
          <label htmlFor="paymentMethod" className="field-label">Paid by</label>
          <select id="paymentMethod" name="paymentMethod" defaultValue="" className="field-input">
            <option value="">Not recorded</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="vendor" className="field-label">Paid to (optional)</label>
          <input
            id="vendor"
            name="vendor"
            type="text"
            autoComplete="off"
            placeholder="e.g. Krishna Surgicals"
            className="field-input"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="note" className="field-label">Note (optional)</label>
          <input
            id="note"
            name="note"
            type="text"
            autoComplete="off"
            placeholder="e.g. August rent"
            className="field-input"
          />
        </div>

        <div className="flex items-end">
          <SubmitButton variant="primary" pendingLabel="Saving…">
            Add expense
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
