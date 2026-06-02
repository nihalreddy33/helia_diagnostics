"use server";

import { revalidatePath } from "next/cache";
import { setActiveRole } from "@/lib/session";
import { ROLES } from "@/lib/types";
import type { Role } from "@/lib/types";

/** Mock-auth role switch used by the dev role toggle. */
export async function switchRole(formData: FormData): Promise<void> {
  const role = String(formData.get("role") ?? "");
  if ((ROLES as readonly string[]).includes(role)) {
    await setActiveRole(role as Role);
  }
  revalidatePath("/", "layout");
}
