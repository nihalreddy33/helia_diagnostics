"use client";

import { useState } from "react";
import type { ReactNode } from "react";

/**
 * Lightweight toggle used to reveal an inline edit form within an otherwise
 * server-rendered table/list without pulling the whole row client-side.
 */
export function Disclosure({
  openLabel = "Edit",
  closeLabel = "Cancel",
  children,
}: {
  openLabel?: string;
  closeLabel?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="rounded-lg px-3 py-1.5 text-sm font-semibold text-brand-700 ring-1 ring-inset ring-brand-200 transition hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
      >
        {open ? closeLabel : openLabel}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </>
  );
}
