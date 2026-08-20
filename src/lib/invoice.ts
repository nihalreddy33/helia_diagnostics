import type { Prisma } from "@prisma/client";
import { istStamp } from "@/lib/sequence";

const INVOICE_PREFIX = "HELIA-INV-";
const INVOICE_START = 1001;

/**
 * Generate the next invoice number, e.g. HELIA-INV-200826-1414 —
 * prefix + the IST billing date (DDMMYY) + a continuous serial that never
 * resets, keeping the accounting run unbroken.
 *
 * The serial is the numeric MAX of the trailing digits across every existing
 * invoice, so it keeps counting correctly past legacy numbers in the older
 * HELIA-INV-1413 shape (and past 9999, which a text sort would get wrong).
 */
export async function nextInvoiceNo(tx: Prisma.TransactionClient): Promise<string> {
  const rows = await tx.$queryRaw<{ max: number | bigint | null }[]>`
    SELECT MAX(CAST(substring("invoiceNo" FROM '[0-9]+$') AS INTEGER)) AS max
    FROM "Bill"
    WHERE "invoiceNo" LIKE ${`${INVOICE_PREFIX}%`}
  `;

  const max = rows[0]?.max;
  const next = max === null || max === undefined ? INVOICE_START : Number(max) + 1;

  return `${INVOICE_PREFIX}${istStamp()}-${next}`;
}
