import { formatMonthYear } from "@/lib/types";

/**
 * Plain GET form — submitting updates the URL search params, which the server
 * component reads to filter. No client JS needed.
 */
export function ArchiveFilters({
  months,
  selectedMonth,
  query,
}: {
  months: string[];
  selectedMonth: string;
  query: string;
}) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex-1 min-w-[12rem]">
        <label htmlFor="q" className="field-label">
          Search
        </label>
        <input
          id="q"
          name="q"
          defaultValue={query}
          placeholder="Patient name, UHID, or impression…"
          className="field-input"
        />
      </div>

      <div className="min-w-[10rem]">
        <label htmlFor="month" className="field-label">
          Month
        </label>
        <select id="month" name="month" defaultValue={selectedMonth} className="field-input">
          <option value="">All months</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {formatMonthYear(m)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          Apply
        </button>
        <a
          href="/archive"
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-300 transition hover:bg-slate-50"
        >
          Reset
        </a>
      </div>
    </form>
  );
}
