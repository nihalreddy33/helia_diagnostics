"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { setDelivered } from "@/app/actions/delivery";
import { formatDateTimeIST } from "@/lib/types";
import type { ActionResult } from "@/lib/types";

type State = (ActionResult<{ deliveredAt: string | null }> & { key: number }) | null;

async function action(prev: State, formData: FormData): Promise<State> {
  const result = await setDelivered(formData);
  return { ...result, key: (prev?.key ?? 0) + 1 };
}

function Submit({
  delivered,
  pendingLabel,
}: {
  delivered: boolean;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        delivered
          ? "rounded-md px-2 py-1 text-xs font-medium text-slate-400 ring-1 ring-inset ring-slate-200 transition hover:text-slate-700 disabled:opacity-50"
          : "rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
      }
    >
      {pending ? pendingLabel : delivered ? "Undo" : "Mark delivered"}
    </button>
  );
}

/** Shows a report's delivery status with a toggle to mark delivered / undo. */
export function DeliveryToggle({
  kind,
  id,
  deliveredAt,
}: {
  kind: "report" | "lab";
  id: string;
  deliveredAt: Date | null;
}) {
  const [, formAction] = useActionState<State, FormData>(action, null);
  const delivered = deliveredAt !== null;

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="deliver" value={delivered ? "false" : "true"} />
      {delivered ? (
        <span className="text-right text-xs">
          <span className="block font-medium text-emerald-700">Delivered</span>
          <span className="block text-slate-400">{formatDateTimeIST(deliveredAt!)}</span>
        </span>
      ) : (
        <span className="text-xs font-medium text-amber-600">Not delivered</span>
      )}
      <Submit delivered={delivered} pendingLabel="…" />
    </form>
  );
}
