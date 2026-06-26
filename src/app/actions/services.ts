"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withRole } from "@/lib/auth";
import { describePrismaError } from "@/lib/prisma-errors";
import { MODALITIES, DEPARTMENTS, rupeesToPaise } from "@/lib/types";
import type { ActionResult, Modality, Department } from "@/lib/types";

function parse(formData: FormData) {
  const departmentRaw = String(formData.get("department") ?? "OTHER").trim();
  const department: Department = (DEPARTMENTS as readonly string[]).includes(departmentRaw)
    ? (departmentRaw as Department)
    : "OTHER";

  const modalityRaw = String(formData.get("modality") ?? "").trim();
  // Modality only applies to radiology services.
  const modality =
    department === "RADIOLOGY" && (MODALITIES as readonly string[]).includes(modalityRaw)
      ? (modalityRaw as Modality)
      : null;

  return {
    id: String(formData.get("id") ?? "").trim() || undefined,
    name: String(formData.get("name") ?? "").trim(),
    department,
    modality,
    price: rupeesToPaise(String(formData.get("price") ?? "")),
    active: formData.get("active") !== null,
  };
}

/** ADMIN only — create or update a billable service (price in paise). */
export async function saveService(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const { id, name, department, modality, price, active } = parse(formData);

  if (!name) return { ok: false, error: "Service name is required." };
  if (!Number.isInteger(price) || price < 0) {
    return { ok: false, error: "Enter a valid price." };
  }
  if (department === "RADIOLOGY" && !modality) {
    return { ok: false, error: "Choose a scan type for a radiology service." };
  }

  try {
    const result = await withRole("ADMIN", async () => {
      const data = { name, department, modality, price, active };
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
