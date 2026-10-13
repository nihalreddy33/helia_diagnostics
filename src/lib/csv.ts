/**
 * Minimal CSV writer for the finance exports. Quotes every field, doubles
 * embedded quotes, and prefixes a UTF-8 BOM so Excel opens the file with the
 * right encoding instead of mangling names.
 */
export function toCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) =>
    `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [header.map(cell).join(","), ...rows.map((r) => r.map(cell).join(","))];
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/** Integer paise → "1234.50", the form accounting software expects. */
export function paiseToRupees(paise: number): string {
  return (paise / 100).toFixed(2);
}

/** A download response for a CSV body. */
export function csvResponse(filename: string, body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
