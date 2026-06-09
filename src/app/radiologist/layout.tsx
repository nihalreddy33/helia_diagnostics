import { requireRolePage } from "@/lib/guards";

export const dynamic = "force-dynamic";

export default async function RadiologistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRolePage("RADIOLOGIST");
  return <>{children}</>;
}
