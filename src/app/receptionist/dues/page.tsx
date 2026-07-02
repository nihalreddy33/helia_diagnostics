import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-helpers";
import {
  formatINR,
  formatDateTimeIST,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_STYLES,
} from "@/lib/types";
import { DbErrorNotice } from "@/components/DbErrorNotice";
import { EmptyState } from "@/components/EmptyState";
import { RecordPaymentForm } from "@/components/receptionist/RecordPaymentForm";

export const dynamic = "force-dynamic";

export default async function DuesPage() {
  const bills = await safeQuery(() =>
    prisma.bill.findMany({
      where: { cancelledAt: null, status: { in: ["UNPAID", "PARTIAL"] } },
      include: { patient: true },
      orderBy: { createdAt: "desc" },
    }),
  );

  const totalOutstanding = bills
    ? bills.reduce((sum, b) => sum + Math.max(0, b.total - b.amountPaid), 0)
    : 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Outstanding Dues</h1>
        <p className="mt-1 text-sm text-slate-500">
          Bills with a pending balance. Collect the balance and it updates the bill.
        </p>
      </header>

      {bills === null ? (
        <DbErrorNotice />
      ) : bills.length === 0 ? (
        <EmptyState title="No dues" description="Every bill is fully paid. Nice." icon="✅" />
      ) : (
        <>
          <div className="card flex items-center justify-between p-4">
            <span className="text-sm font-medium text-slate-600">Total outstanding</span>
            <span className="font-mono text-xl font-bold text-red-600">
              {formatINR(totalOutstanding)}
            </span>
          </div>

          <ul className="space-y-2">
            {bills.map((b) => {
              const balance = Math.max(0, b.total - b.amountPaid);
              return (
                <li key={b.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                  <Link href={`/receptionist/billing/${b.id}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {b.patient.name}
                      <span className="ml-2 font-mono text-xs font-normal text-slate-400">
                        {b.patient.uhid}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      <span className="font-mono">{b.invoiceNo}</span>
                      {b.patient.mobile ? ` · ${b.patient.mobile}` : ""}
                      <span className="mx-1 text-slate-300">·</span>
                      {formatDateTimeIST(b.createdAt)}
                    </p>
                  </Link>

                  <div className="flex items-center gap-4">
                    <div className="text-right text-xs">
                      <p className="text-slate-500">
                        Paid {formatINR(b.amountPaid)} / {formatINR(b.total)}
                      </p>
                      <p className="font-mono text-sm font-semibold text-red-600">
                        Bal {formatINR(balance)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${PAYMENT_STATUS_STYLES[b.status]}`}
                    >
                      {PAYMENT_STATUS_LABELS[b.status]}
                    </span>
                    <RecordPaymentForm billId={b.id} balance={balance} />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
