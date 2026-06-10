"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withRole } from "@/lib/auth";
import { describePrismaError } from "@/lib/prisma-errors";
import { MODALITIES } from "@/lib/types";
import type { ActionResult, Modality } from "@/lib/types";

function parse(formData: FormData) {
  return {
    id: String(formData.get("id") ?? "").trim() || undefined,
    title: String(formData.get("title") ?? "").trim(),
    modality: String(formData.get("modality") ?? ""),
    defaultFindings: String(formData.get("defaultFindings") ?? "").trim(),
    defaultImpression: String(formData.get("defaultImpression") ?? "").trim(),
    defaultFooter: String(formData.get("defaultFooter") ?? "").trim(),
  };
}

/** ADMIN only — create or update a diagnostic template. */
export async function saveTemplate(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const { id, title, modality, defaultFindings, defaultImpression, defaultFooter } =
    parse(formData);

  if (!title) return { ok: false, error: "Title is required." };
  if (!(MODALITIES as readonly string[]).includes(modality)) {
    return { ok: false, error: "Select a valid modality." };
  }
  if (!defaultFindings) return { ok: false, error: "Default findings are required." };
  if (!defaultImpression) return { ok: false, error: "Default impression is required." };

  try {
    const result = await withRole("ADMIN", async () => {
      const data = {
        title,
        modality: modality as Modality,
        defaultFindings,
        defaultImpression,
        defaultFooter,
      };
      return id
        ? prisma.template.update({ where: { id }, data, select: { id: true } })
        : prisma.template.create({ data, select: { id: true } });
    });
    if (result.ok) revalidatePath("/admin/templates");
    return result;
  } catch (err) {
    return { ok: false, error: describePrismaError(err, "Could not save template.") };
  }
}
