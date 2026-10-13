import { requireRolePage } from "@/lib/guards";

export const dynamic = "force-dynamic";

/** The accounts team's area: money views and exports, nothing clinical. */
export default async function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRolePage("FINANCE");
  return <>{children}</>;
}
