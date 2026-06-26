"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withRole } from "@/lib/auth";
import { describePrismaError } from "@/lib/prisma-errors";
import { MODALITIES, rupeesToPaise } from "@/lib/types";
import type { ActionResult, Modality } from "@/lib/types";

function parse(formData: FormData) {
  const modalityRaw = String(formData.get("modality") ?? "").trim();
  return {
    id: String(formData.get("id") ?? "").trim() || undefined,
    name: String(formData.get("name") ?? "").trim(),
    // Empty modality = a non-scan service.
    modality: modalityRaw && (MODALITIES as readonly string[]).includes(modalityRaw)
      ? (modalityRaw as Modality)
      : null,
    price: rupeesToPaise(String(formData.get("price") ?? "")),
    active: formData.get("active") !== null,
  };
}

/** ADMIN only — create or update a billable service (price in paise). */
export async function saveService(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const { id, name, modality, price, active } = parse(formData);

  if (!name) return { ok: false, error: "Service name is required." };
  if (!Number.isInteger(price) || price < 0) {
    return { ok: false, error: "Enter a valid price." };
  }

  try {
    const result = await withRole("ADMIN", async () => {
      const data = { name, modality, price, active };
      return id
        ? prisma.service.update({ where: { id }, data, select: { id: true } })
        : prisma.service.create({ data, select: { id: true } });
    });
    if (result.ok) {
      revalidatePath("/admin/services");
      revalidatePath("/receptionist/billing");
    }
    return result;
  } catch (err) {
    return { ok: false, error: describePrismaError(err, "Could not save service.") };
  }
}
