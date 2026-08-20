import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-helpers";
import {
  formatINR,
  formatMonthYear,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_STYLES,
} from "@/lib/types";
import { DbErrorNotice } from "@/components/DbErrorNotice";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

/** Sentinel slug for bills with no referring doctor recorded. */
const NOT_RECORDED = "--none--";

function formatDay(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "2-digit",
  }).format(date);
}

/**
 * Every patient and test referred by one doctor — the drill-down behind a name
 * on the Referral Business summary. Bills carry the doctor as free text, so
 * they're matched case-insensitively, exactly as the summary groups them.
 */
export default async function ReferralDoctorPage({
  params,
  searchParams,
}: {
  params: Promise<{ doctor: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const [{ doctor }, { month }] = await Promise.all([params, searchParams]);
  const slug = decodeURIComponent(doctor);
  const isNotRecorded = slug === NOT_RECORDED;
  const selectedMonth = (month ?? "").trim();

  // Preserve the month filter on the way back to the summary.
  const backHref = selectedMonth
    ? `/admin/referrals?month=${encodeURIComponent(selectedMonth)}`
    : "/admin/referrals";

  const data = await safeQuery(async () => {
    const bills = await prisma.bill.findMany({
      where: {
        cancelledAt: null,
        ...(selectedMonth ? { createdMonthYear: selectedMonth } : {}),
        ...(isNotRecorded
          ? { referringDoctor: "" }
          : { referringDoctor: { equals: slug, mode: "insensitive" as const } }),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        invoiceNo: true,
        createdAt: true,
        referringDoctor: true,
        total: true,
        amountPaid: true,
        status: true,
        patient: { select: { uhid: true, name: true, age: true, gender: true } },
        items: { select: { description: true, quantity: true } },
      },
    });
    return { bills };
  });

  if (data === null) {
    return (
      <div className="space-y-6">
        <Header name={slug} isNotRecorded={isNotRecorded} backHref={backHref} />
        <DbErrorNotice />
      </div>
    );
  }

  const { bills } = data;

  // Display the doctor's most frequently recorded spelling, as the summary does.
  const spellings = new Map<string, number>();
  for (const b of bills) {
    const raw = b.referringDoctor.trim();
    if (raw) spellings.set(raw, (spellings.get(raw) ?? 0) + 1);
  }
  const displayName = isNotRecorded
    ? "(not recorded)"
    : ([...spellings.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? slug);

  const totals = bills.reduce(
    (acc, b) => ({
      billed: acc.billed + b.total,
      collected: acc.collected + b.amountPaid,
      balance: acc.balance + Math.max(0, b.total - b.amountPaid),
    }),
    { billed: 0, collected: 0, balance: 0 },
  );

  // Which tests this doctor sends most — the reason to open this page.
  const testCounts = new Map<string, number>();
  for (const b of bills) {
    for (const it of b.items) {
      testCounts.set(it.description, (testCounts.get(it.description) ?? 0) + it.quantity);
    }
  }
  const topTests = [...testCounts.entries()].sort((a, b) => b[1] - a[1]);

  const unpaidCount = bills.filter((b) => b.total - b.amountPaid > 0).length;

  return (
    <div className="space-y-6">
      <Header name={displayName} isNotRecorded={isNotRecorded} backHref={backHref} />

      {bills.length === 0 ? (
        <EmptyState
          title="No bills for this referrer"
          description={
            selectedMonth
              ? `Nothing recorded in ${formatMonthYear(selectedMonth)}. Try another month.`
              : "Bills naming this doctor will be listed here."
          }
          icon="🩺"
        />
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Referrals</p>
              <p className="mt-1 font-mono text-xl font-bold text-slate-900">{bills.length}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {selectedMonth ? formatMonthYear(selectedMonth) : "All time"}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Billed</p>
              <p className="mt-1 font-mono text-xl font-bold text-slate-900">{formatINR(totals.billed)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Collected</p>
              <p className="mt-1 font-mono text-xl font-bold text-emerald-700">
                {formatINR(totals.collected)}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Pending balance
              </p>
              <p className="mt-1 font-mono text-xl font-bold text-red-600">{formatINR(totals.balance)}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {unpaidCount} bill{unpaidCount === 1 ? "" : "s"} outstanding
              </p>
            </div>
          </section>

          {/* Tests this doctor refers, most-sent first */}
          <section className="card p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">
              Tests referred <span className="font-normal text-slate-400">({topTests.length} distinct)</span>
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {topTests.map(([name, count]) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-200"
                >
                  {name}
                  <span className="font-mono text-brand-500">×{count}</span>
                </span>
              ))}
            </div>
          </section>

          {/* Patient-by-patient list */}
          <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-2.5 font-semibold">Date</th>
                  <th className="px-4 py-2.5 font-semibold">Patient</th>
                  <th className="px-4 py-2.5 font-semibold">Tests</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Amount</th>
                  <th className="px-4 py-2.5 text-center font-semibold">Paid</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => {
                  const due = Math.max(0, b.total - b.amountPaid);
                  return (
                    <tr key={b.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                        {formatDay(b.createdAt)}
                      </td>
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/receptionist/billing/${b.id}`}
                          className="font-medium text-slate-800 hover:text-brand-700 hover:underline"
                        >
                          {b.patient.name}
                        </Link>
                        <span className="ml-2 font-mono text-xs text-slate-400">{b.patient.uhid}</span>
                        <span className="ml-2 text-xs text-slate-400">
                          {b.patient.age}y · {b.patient.gender}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {b.items.map((it) => it.description).join(", ") || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-slate-800">
                        {formatINR(b.total)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${PAYMENT_STATUS_STYLES[b.status]}`}
                        >
                          {b.status === "PAID" ? "✓" : "✗"} {PAYMENT_STATUS_LABELS[b.status]}
                        </span>
                        {due > 0 && (
                          <span className="ml-1 font-mono text-xs text-red-600">
                            {formatINR(due)} due
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <p className="text-xs text-slate-400">
            Cancelled bills are excluded. &ldquo;Amount&rdquo; is net of discounts. Click a patient to
            open their bill.
          </p>
        </>
      )}
    </div>
  );
}

function Header({
  name,
  isNotRecorded,
  backHref,
}: {
  name: string;
  isNotRecorded: boolean;
  backHref: string;
}) {
  return (
    <header>
      <Link href={backHref} className="text-sm font-medium text-brand-700 hover:underline">
        ← Back to Referral Business
      </Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{name}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {isNotRecorded
          ? "Bills raised without a referring doctor recorded."
          : "Every patient and test referred by this doctor."}
      </p>
    </header>
  );
}
