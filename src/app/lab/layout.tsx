import { requireRolePage } from "@/lib/guards";

export const dynamic = "force-dynamic";

export default async function LabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRolePage("LAB_TECHNICIAN");
  return <>{children}</>;
}
