"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import type { ActionResult } from "@/lib/types";
import { SubmitButton } from "@/components/ui/SubmitButton";

type State = (ActionResult & { key: number }) | null;

export function LoginForm() {
  const [state, formAction] = useActionState<State, FormData>(login, null);

  return (
    <form action={formAction} className="space-y-4">
      {state && !state.ok && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200"
        >
          {state.error}
        </p>
      )}

      <div>
        <label htmlFor="email" className="field-label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="field-input"
          placeholder="you@helia.example"
        />
      </div>

      <div>
        <label htmlFor="password" className="field-label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="field-input"
          placeholder="••••••••"
        />
      </div>

      <SubmitButton pendingLabel="Signing in…" className="w-full">
        Sign in
      </SubmitButton>
    </form>
  );
}
