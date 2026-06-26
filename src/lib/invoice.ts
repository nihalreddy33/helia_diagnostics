import type { Prisma } from "@prisma/client";

const INVOICE_PREFIX = "HELIA-INV-";
const INVOICE_START = 1001;

/**
 * Generate the next sequential invoice number (HELIA-INV-1001, …) inside a
 * transaction so concurrent bills can't collide.
 */
export async function nextInvoiceNo(tx: Prisma.TransactionClient): Promise<string> {
  const latest = await tx.bill.findFirst({
    where: { invoiceNo: { startsWith: INVOICE_PREFIX } },
    orderBy: { invoiceNo: "desc" },
    select: { invoiceNo: true },
  });

  let next = INVOICE_START;
  if (latest) {
    const suffix = Number.parseInt(latest.invoiceNo.slice(INVOICE_PREFIX.length), 10);
    if (Number.isFinite(suffix)) next = suffix + 1;
  }
  return `${INVOICE_PREFIX}${next}`;
}
