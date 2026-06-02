import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  icon = "📭",
}: {
  title: string;
  description?: ReactNode;
  icon?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white/50 px-6 py-12 text-center">
      <div className="text-3xl" aria-hidden>
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-800">{title}</h3>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{description}</p>}
    </div>
  );
}
