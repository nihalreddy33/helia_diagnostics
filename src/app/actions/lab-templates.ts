"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withRole } from "@/lib/auth";
import { describePrismaError } from "@/lib/prisma-errors";
import type { ActionResult } from "@/lib/types";

type ParamInput = { name: string; unit: string; referenceRange: string };

function parseParams(raw: string): ParamInput[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((x) => ({
        name: String((x as ParamInput)?.name ?? "").trim(),
        unit: String((x as ParamInput)?.unit ?? "").trim(),
        referenceRange: String((x as ParamInput)?.referenceRange ?? "").trim(),
      }))
      .filter((p) => p.name);
  } catch {
    return [];
  }
}

function parseIds(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.map((x) => String(x)).filter(Boolean))];
  } catch {
    return [];
  }
}

/** ADMIN only — create or update a lab test format with its parameters. */
export async function saveLabTemplate(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const id = String(formData.get("id") ?? "").trim() || undefined;
  const title = String(formData.get("title") ?? "").trim();
  const params = parseParams(String(formData.get("parameters") ?? "[]"));
  const serviceIds = parseIds(String(formData.get("serviceIds") ?? "[]"));

  if (!title) return { ok: false, error: "Test name is required." };
  if (params.length === 0) return { ok: false, error: "Add at least one parameter." };

  try {
    const result = await withRole("ADMIN", async () => {
      return prisma.$transaction(async (tx) => {
        const paramData = params.map((p, i) => ({
          name: p.name,
          unit: p.unit,
          referenceRange: p.referenceRange,
          position: i,
        }));

        let saved: { id: string };
        if (id) {
          // Replace the parameter set wholesale.
          await tx.labTemplateParameter.deleteMany({ where: { templateId: id } });
          saved = await tx.labTemplate.update({
            where: { id },
            data: { title, parameters: { create: paramData } },
            select: { id: true },
          });
        } else {
          saved = await tx.labTemplate.create({
            data: { title, parameters: { create: paramData } },
            select: { id: true },
          });
        }

        // Reconcile which LAB services use this format: link the selected ones
        // (moving them off any other format) and unlink deselected ones.
        if (serviceIds.length > 0) {
          await tx.service.updateMany({
            where: { id: { in: serviceIds }, department: "LAB" },
            data: { labTemplateId: saved.id },
          });
        }
        await tx.service.updateMany({
          where: { labTemplateId: saved.id, id: { notIn: serviceIds } },
          data: { labTemplateId: null },
        });

        return saved;
      });
    });
    if (result.ok) {
      revalidatePath("/admin/lab-templates");
      revalidatePath("/receptionist/billing");
    }
    return result;
  } catch (err) {
    return { ok: false, error: describePrismaError(err, "Could not save lab test.") };
  }
}
