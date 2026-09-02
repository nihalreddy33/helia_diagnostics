"use client";

import { useActionState } from "react";
import { deleteExpense } from "@/app/actions/expenses";
import type { ActionResult } from "@/lib/types";

type State = (ActionResult<{ id: string }> & { key: number }) | null;

async function action(prev: State, fd: FormData): Promise<State> {
  const r = await deleteExpense(fd);
  return { ...r, key: (prev?.key ?? 0) + 1 };
}

/** Remove one expense row. Confirms first — deleting changes the month's profit. */
export function DeleteExpenseButton({ id, label }: { id: string; label: string }) {
  const [state, formAction] = useActionState<State, FormData>(action, null);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(`Delete this expense (${label})? This changes the period's profit.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="text-slate-400 transition hover:text-red-600"
        aria-label={`Delete expense ${label}`}
        title={state && !state.ok ? state.error : "Delete expense"}
      >
        ✕
      </button>
    </form>
  );
}
