"use client";

import { useActionState } from "react";
import { createUser, updateUser } from "@/app/actions/users";
import { ROLES, ROLE_LABELS } from "@/lib/types";
import type { ActionResult, Role } from "@/lib/types";
import { SubmitButton } from "@/components/ui/SubmitButton";

type State = (ActionResult<{ id: string }> & { key: number }) | null;

export type EditableUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

/**
 * Reusable create/edit form for system users. When `user` is provided the form
 * runs in edit mode (updateUser, password optional = reset); otherwise it
 * creates a new user (createUser).
 */
export function UserForm({ user }: { user?: EditableUser }) {
  const isEdit = Boolean(user);

  async function action(prev: State, formData: FormData): Promise<State> {
    const result = isEdit
      ? await updateUser(formData)
      : await createUser(formData);
    return { ...result, key: (prev?.key ?? 0) + 1 };
  }

  const [state, formAction] = useActionState<State, FormData>(action, null);

  return (
    <form action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={user?.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor={`name-${user?.id ?? "new"}`}>
            Name
          </label>
          <input
            id={`name-${user?.id ?? "new"}`}
            name="name"
            type="text"
            required
            defaultValue={user?.name ?? ""}
            autoComplete="name"
            className="field-input"
            placeholder="Dr. Jane Doe"
          />
        </div>

        <div>
          <label className="field-label" htmlFor={`email-${user?.id ?? "new"}`}>
            Email
          </label>
          <input
            id={`email-${user?.id ?? "new"}`}
            name="email"
            type="email"
            required={!isEdit}
            defaultValue={user?.email ?? ""}
            readOnly={isEdit}
            autoComplete="email"
            className={`field-input ${isEdit ? "cursor-not-allowed bg-slate-50 text-slate-500" : ""}`}
            placeholder="jane@helia.example"
          />
          {isEdit && (
            <p className="mt-1 text-xs text-slate-500">Email can&apos;t be changed.</p>
          )}
        </div>

        <div>
          <label
            className="field-label"
            htmlFor={`password-${user?.id ?? "new"}`}
          >
            {isEdit ? "New password (optional)" : "Password"}
          </label>
          <input
            id={`password-${user?.id ?? "new"}`}
            name="password"
            type="password"
            required={!isEdit}
            minLength={6}
            autoComplete="new-password"
            className="field-input"
            placeholder={isEdit ? "Leave blank to keep current" : "At least 6 characters"}
          />
        </div>

        <div>
          <label className="field-label" htmlFor={`role-${user?.id ?? "new"}`}>
            Role
          </label>
          <select
            id={`role-${user?.id ?? "new"}`}
            name="role"
            required
            defaultValue={user?.role ?? ""}
            className="field-input"
          >
            {!isEdit && (
              <option value="" disabled>
                Select a role…
              </option>
            )}
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state && !state.ok && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}
      {state && state.ok && (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
        >
          {isEdit ? "User updated." : "User created."}
        </p>
      )}

      <div className="flex justify-end">
        <SubmitButton
          variant={isEdit ? "secondary" : "primary"}
          pendingLabel={isEdit ? "Saving…" : "Creating…"}
        >
          {isEdit ? "Save changes" : "Create user"}
        </SubmitButton>
      </div>
    </form>
  );
}
