/**
 * IST calendar-day range handling shared by the reports that filter by date.
 *
 * Ranges are expressed as inclusive "YYYY-MM-DD" IST days and converted to UTC
 * instants only when querying, so a bill raised at 11pm IST counts against the
 * day the front desk actually raised it.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD" for the IST calendar day containing `date`. */
export function istDayString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(date);
}

/** Shift an IST "YYYY-MM-DD" by whole days, staying in IST. */
export function shiftDay(day: string, deltaDays: number): string {
  return istDayString(new Date(new Date(`${day}T00:00:00+05:30`).getTime() + deltaDays * DAY_MS));
}

/** First day of the IST month containing `day`. */
export function startOfMonth(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

/** Last day of the IST month containing `day`. */
export function endOfMonth(day: string): string {
  const [y, m] = day.split("-").map(Number) as [number, number];
  const firstOfNext = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return shiftDay(firstOfNext, -1);
}

export function isValidDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00+05:30`));
}

/**
 * Resolve ?from/?to into an inclusive IST day range. Invalid values fall back
 * to `fallback`, and a reversed range is swapped rather than returning nothing.
 */
export function resolveRange(
  fromParam: string | undefined,
  toParam: string | undefined,
  fallback: string,
): { from: string; to: string } {
  const from = fromParam && isValidDay(fromParam) ? fromParam : fallback;
  const to = toParam && isValidDay(toParam) ? toParam : from;
  return from <= to ? { from, to } : { from: to, to: from };
}

/** UTC instants bounding the inclusive IST day range, for querying. */
export function rangeToInstants(from: string, to: string): { start: Date; end: Date } {
  return {
    start: new Date(`${from}T00:00:00+05:30`),
    end: new Date(new Date(`${to}T00:00:00+05:30`).getTime() + DAY_MS),
  };
}

/** "Thursday, 20 August 2026" for an IST day string. */
export function longDate(day: string): string {
  return new Date(`${day}T12:00:00+05:30`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

/** "20 Aug 26" — compact form for table cells. */
export function shortDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "2-digit",
  }).format(date);
}
