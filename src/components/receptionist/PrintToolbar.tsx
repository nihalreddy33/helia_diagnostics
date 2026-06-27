import Link from "next/link";
import { PrintButton } from "./PrintButton";

/**
 * Sticky toolbar for print pages: back link, a letterhead on/off toggle, and
 * the print/save-PDF button. The toggle is a plain checkbox — globals.css uses
 * `:has(.letterhead-toggle:not(:checked))` to hide the clinic letterhead (while
 * keeping its space) for printing on pre-printed stationery.
 */
export function PrintToolbar({
  backHref,
  backLabel,
}: {
  backHref: string;
  backLabel: string;
}) {
  return (
    <div className="no-print sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-brand-700"
        >
          <span aria-hidden>‹</span> {backLabel}
        </Link>
        <div className="flex items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              defaultChecked
              className="letterhead-toggle h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-300"
            />
            Letterhead
          </label>
          <PrintButton />
        </div>
      </div>
    </div>
  );
}
