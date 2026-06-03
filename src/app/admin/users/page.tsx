import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-helpers";
import { ROLE_LABELS } from "@/lib/types";
import { DbErrorNotice } from "@/components/DbErrorNotice";
import { EmptyState } from "@/components/EmptyState";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { UserForm } from "@/components/admin/UserForm";
import { Disclosure } from "@/components/admin/Disclosure";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function UsersPage() {
  const users = await safeQuery(() =>
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    }),
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          User Management
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Create staff accounts and manage their roles across the platform.
        </p>
      </header>

      {users === null ? (
        <DbErrorNotice />
      ) : (
        <>
          <section className="card p-6">
            <h2 className="text-lg font-semibold text-slate-800">
              Create user
            </h2>
            <p className="mt-1 mb-4 text-sm text-slate-500">
              New users sign in with the email and password set here.
            </p>
            <UserForm />
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-800">
              All users{" "}
              <span className="text-sm font-normal text-slate-400">
                ({users.length})
              </span>
            </h2>

            {users.length === 0 ? (
              <EmptyState
                icon="👥"
                title="No users yet"
                description="Use the form above to create the first staff account."
              />
            ) : (
              <div className="card overflow-hidden p-0">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold">Role</th>
                      <th className="px-4 py-3 font-semibold">Created</th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((user) => (
                      <tr key={user.id} className="align-top">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {user.name}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {user.email}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-200">
                            {ROLE_LABELS[user.role]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {dateFmt.format(user.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-2">
                              <Disclosure openLabel="Edit" closeLabel="Close">
                                <div className="w-[min(36rem,80vw)] rounded-lg border border-slate-200 bg-slate-50/60 p-4 text-left">
                                  <UserForm
                                    user={{
                                      id: user.id,
                                      name: user.name,
                                      email: user.email,
                                      role: user.role,
                                    }}
                                  />
                                </div>
                              </Disclosure>
                              <DeleteButton
                                entity="user"
                                id={user.id}
                                label="Delete"
                                description={`Permanently delete ${user.name} (${user.email})? This cannot be undone.`}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
