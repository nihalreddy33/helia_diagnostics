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

/** ADMIN only — create or update a lab test format with its parameters. */
export async function saveLabTemplate(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const id = String(formData.get("id") ?? "").trim() || undefined;
  const title = String(formData.get("title") ?? "").trim();
  const params = parseParams(String(formData.get("parameters") ?? "[]"));

  if (!title) return { ok: false, error: "Test name is required." };
  if (params.length === 0) return { ok: false, error: "Add at least one parameter." };

  try {
    const result = await withRole("ADMIN", async () => {
      const paramData = params.map((p, i) => ({
        name: p.name,
        unit: p.unit,
        referenceRange: p.referenceRange,
        position: i,
      }));

      if (id) {
        // Replace the parameter set wholesale.
        await prisma.labTemplateParameter.deleteMany({ where: { templateId: id } });
        return prisma.labTemplate.update({
          where: { id },
          data: { title, parameters: { create: paramData } },
          select: { id: true },
        });
      }
      return prisma.labTemplate.create({
        data: { title, parameters: { create: paramData } },
        select: { id: true },
      });
    });
    if (result.ok) revalidatePath("/admin/lab-templates");
    return result;
  } catch (err) {
    return { ok: false, error: describePrismaError(err, "Could not save lab test.") };
  }
}
