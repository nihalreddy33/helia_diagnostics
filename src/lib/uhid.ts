import type { Prisma } from "@prisma/client";
import { istStamp } from "@/lib/sequence";

const UHID_PREFIX = "HELIA-";
const UHID_START = 1001;

/**
 * Generate the next structured UHID, e.g. HELIA-200826-1426 —
 * prefix + the IST registration date (DDMMYY) + a continuous serial that
 * never resets, so the number stays unique for the patient's lifetime.
 *
 * The serial is the numeric MAX of the trailing digits across every existing
 * UHID, so it keeps counting correctly past legacy ids in the older
 * HELIA-1425 shape (and past 9999, which a text sort would get wrong).
 *
 * Pass the transaction client from `prisma.$transaction` so the read + the
 * subsequent patient insert are atomic and concurrent intakes can't collide.
 */
export async function nextUhid(tx: Prisma.TransactionClient): Promise<string> {
  const rows = await tx.$queryRaw<{ max: number | bigint | null }[]>`
    SELECT MAX(CAST(substring(uhid FROM '[0-9]+$') AS INTEGER)) AS max
    FROM "Patient"
    WHERE uhid LIKE ${`${UHID_PREFIX}%`}
  `;

  const max = rows[0]?.max;
  const next = max === null || max === undefined ? UHID_START : Number(max) + 1;

  return `${UHID_PREFIX}${istStamp()}-${next}`;
}
