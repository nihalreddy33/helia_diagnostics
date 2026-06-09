import { requireRolePage } from "@/lib/guards";

export const dynamic = "force-dynamic";

export default async function ReceptionistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRolePage("RECEPTIONIST");
  return <>{children}</>;
}
