import type { Prisma } from "@prisma/client";

const UHID_PREFIX = "HELIA-";
const UHID_START = 1001;

/**
 * Generate the next structured UHID (HELIA-1001, HELIA-1002, …) inside a
 * transaction so concurrent receptionist intakes can't collide. Reads the
 * current maximum numeric suffix and increments it.
 *
 * Pass the transaction client from `prisma.$transaction` so the read + the
 * subsequent patient insert are atomic.
 */
export async function nextUhid(tx: Prisma.TransactionClient): Promise<string> {
  const latest = await tx.patient.findFirst({
    where: { uhid: { startsWith: UHID_PREFIX } },
    orderBy: { uhid: "desc" },
    select: { uhid: true },
  });

  let next = UHID_START;
  if (latest) {
    const suffix = Number.parseInt(latest.uhid.slice(UHID_PREFIX.length), 10);
    if (Number.isFinite(suffix)) next = suffix + 1;
  }
  return `${UHID_PREFIX}${next}`;
}
