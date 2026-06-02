"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MODALITIES } from "@/lib/types";
import type { ActionResult, Modality } from "@/lib/types";

function generateUhid(): string {
  // HD-<6 digits>. Time-based suffix keeps it readable and unique enough for a
  // mock; a real system would use a sequence/counter.
  const suffix = String(Date.now()).slice(-6);
  return `HD-${suffix}`;
}

export type CreatePatientInput = {
  name: string;
  age: number;
  gender: string;
  targetModality: Modality;
};

/** Reception intake: register a new patient and assign a target modality. */
export async function createPatient(
  formData: FormData,
): Promise<ActionResult<{ id: string; uhid: string }>> {
  const name = String(formData.get("name") ?? "").trim();
  const ageRaw = String(formData.get("age") ?? "").trim();
  const gender = String(formData.get("gender") ?? "").trim();
  const targetModality = String(formData.get("targetModality") ?? "").trim();

  // --- Validation ----------------------------------------------------------
  if (!name) return { ok: false, error: "Patient name is required." };

  const age = Number(ageRaw);
  if (!Number.isInteger(age) || age < 0 || age > 150) {
    return { ok: false, error: "Enter a valid age between 0 and 150." };
  }
  if (!gender) return { ok: false, error: "Please select a gender." };

  if (!(MODALITIES as readonly string[]).includes(targetModality)) {
    return { ok: false, error: "Please select a valid target modality." };
  }

  try {
    const patient = await prisma.patient.create({
      data: {
        uhid: generateUhid(),
        name,
        age,
        gender,
        targetModality: targetModality as Modality,
      },
      select: { id: true, uhid: true },
    });

    revalidatePath("/reception");
    revalidatePath("/radiologist");
    return { ok: true, data: patient };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { ok: false, error: "A patient with this UHID already exists." };
    }
    console.error("createPatient failed", err);
    return { ok: false, error: "Could not register patient. Please try again." };
  }
}
