"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withRole } from "@/lib/auth";
import { describePrismaError } from "@/lib/prisma-errors";
import { nextUhid } from "@/lib/uhid";
import type { ActionResult } from "@/lib/types";

const GENDERS = ["Male", "Female", "Other"];

/** RECEPTIONIST only — register a patient with an auto-generated UHID. */
export async function createPatient(
  formData: FormData,
): Promise<ActionResult<{ id: string; uhid: string }>> {
  const name = String(formData.get("name") ?? "").trim();
  const ageRaw = String(formData.get("age") ?? "").trim();
  const gender = String(formData.get("gender") ?? "").trim();

  if (!name) return { ok: false, error: "Patient name is required." };
  const age = Number(ageRaw);
  if (!Number.isInteger(age) || age < 0 || age > 150) {
    return { ok: false, error: "Enter a valid age between 0 and 150." };
  }
  if (!GENDERS.includes(gender)) {
    return { ok: false, error: "Please select a gender." };
  }

  try {
    const result = await withRole("RECEPTIONIST", async () => {
      // Generate the UHID and insert the patient atomically so concurrent
      // intakes can't claim the same sequence number.
      return prisma.$transaction(async (tx) => {
        const uhid = await nextUhid(tx);
        return tx.patient.create({
          data: { uhid, name, age, gender },
          select: { id: true, uhid: true },
        });
      });
    });
    if (result.ok) {
      revalidatePath("/receptionist");
      revalidatePath("/radiologist");
    }
    return result;
  } catch (err) {
    return { ok: false, error: describePrismaError(err, "Could not register patient.") };
  }
}
