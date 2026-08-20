/**
 * DDMMYY stamp for the current IST calendar day (e.g. "200826" for
 * 20 August 2026). Used in patient UHIDs and invoice numbers so the
 * registration / billing date is readable straight off the number.
 */
export function istStamp(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  })
    .format(now) // "20/08/26"
    .replaceAll("/", "");
}
