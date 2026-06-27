import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-helpers";
import { actionLabel } from "@/lib/activity";
import { ROLE_LABELS, formatDateTimeIST } from "@/lib/types";
import type { Role } from "@/lib/types";
import { DbErrorNotice } from "@/components/DbErrorNotice";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

const ROLE_BADGE: Record<Role, string> = {
  ADMIN: "bg-violet-100 text-violet-700 ring-violet-200",
  RECEPTIONIST: "bg-sky-100 text-sky-700 ring-sky-200",
  RADIOLOGIST: "bg-brand-50 text-brand-700 ring-brand-200",
  LAB_TECHNICIAN: "bg-amber-100 text-amber-800 ring-amber-200",
};

function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${ROLE_BADGE[role]}`}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

export default async function ActivityPage() {
  const data = await safeQuery(async () => {
    const [logs, users, latest] = await Promise.all([
      prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, role: true } }),
      // Latest activity timestamp per user, for the "last active" summary.
      prisma.activityLog.groupBy({
        by: ["userId"],
        _max: { createdAt: true },
      }),
    ]);
    return { logs, users, latest };
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Activity</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sign-ins and key actions across the platform. Times are IST.
        </p>
      </header>

      {data === null ? (
        <DbErrorNotice />
      ) : (
        <>
          {/* Last-active summary per user */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Last active</h2>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {data.users.map((u) => {
                const last = data.latest.find((l) => l.userId === u.id)?._max.createdAt ?? null;
                return (
                  <li key={u.id} className="card flex items-center justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{u.name}</p>
                      <RoleBadge role={u.role} />
                    </div>
                    <span className="shrink-0 text-right text-xs text-slate-500">
                      {last ? formatDateTimeIST(last) : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Activity feed */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-slate-700">
              Recent activity{" "}
              <span className="text-slate-400">(latest {data.logs.length})</span>
            </h2>
            {data.logs.length === 0 ? (
              <EmptyState
                title="No activity yet"
                description="Sign-ins and actions will be recorded here."
                icon="📋"
              />
            ) : (
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
                {data.logs.map((log) => (
                  <li key={log.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
                    <span className="w-44 shrink-0 text-xs text-slate-400">
                      {formatDateTimeIST(log.createdAt)}
                    </span>
                    <span className="font-medium text-slate-800">{log.userName}</span>
                    <RoleBadge role={log.userRole} />
                    <span className="text-slate-600">{actionLabel(log.action)}</span>
                    {log.detail && <span className="text-slate-400">· {log.detail}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
