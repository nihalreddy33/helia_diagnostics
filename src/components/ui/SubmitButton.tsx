"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

type Variant = "primary" | "secondary" | "success";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-300",
  secondary:
    "bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus-visible:ring-brand-300",
  success:
    "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-300",
};

/**
 * Submit button wired to the enclosing <form>'s pending state so it disables
 * and shows progress during a server action. Pass `name`/`value` to set which
 * intent triggered the submit.
 */
export function SubmitButton({
  children,
  variant = "primary",
  pendingLabel,
  name,
  value,
  className = "",
}: {
  children: ReactNode;
  variant?: Variant;
  pendingLabel?: string;
  name?: string;
  value?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      aria-busy={pending}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
