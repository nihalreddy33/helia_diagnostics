import { redirect } from "next/navigation";
import { requireUser } from "@/lib/guards";
import { HOME_BY_ROLE } from "@/lib/nav";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireUser();
  redirect(HOME_BY_ROLE[user.role]);
}
