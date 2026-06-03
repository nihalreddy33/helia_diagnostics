import { redirect } from "next/navigation";
import { getActiveRole } from "@/lib/session";
import { HOME_BY_ROLE } from "@/lib/nav";

export default async function HomePage() {
  const role = await getActiveRole();
  redirect(HOME_BY_ROLE[role]);
}
