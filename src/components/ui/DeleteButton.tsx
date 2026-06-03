"use client";

import { useActionState } from "react";
import { hardDelete } from "@/app/actions/admin";
import type { DeletableEntity } from "@/app/actions/admin";
import type { ActionResult } from "@/lib/types";
import { SubmitButton } from "@/components/ui/SubmitButton";

type State = (ActionResult<{ entity: DeletableEntity; id: string }> & { key: number }) | null;

async function action(_prev: State, formData: FormData): Promise<State> {
  const result = await hardDelete(formData);
  return { ...result, key: Date.now() };
}

/**
 * ADMIN "Destruction Override" control. Renders a form posting to `hardDelete`
 * with a native confirm() guard so a destructive click is always intentional.
 */
export function DeleteButton({
  entity,
  id,
  label = "Delete",
  description,
}: {
  entity: DeletableEntity;
  id: string;
  label?: string;
  description?: string;
}) {
  const [state, formAction] = useActionState<State, FormData>(action, null);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const msg = description ?? `Permanently delete this ${entity}? This cannot be undone.`;
        if (!window.confirm(msg)) e.preventDefault();
      }}
      className="inline-flex flex-col items-end gap-1"
    >
      <input type="hidden" name="entity" value={entity} />
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="danger" pendingLabel="Deleting…">
        {label}
      </SubmitButton>
      {state && !state.ok && (
        <span role="alert" className="text-xs text-red-600">
          {state.error}
        </span>
      )}
    </form>
  );
}
