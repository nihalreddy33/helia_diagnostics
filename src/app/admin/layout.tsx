import { requireRolePage } from "@/lib/guards";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRolePage("ADMIN");
  return <>{children}</>;
}
