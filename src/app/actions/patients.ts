"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withRole } from "@/lib/auth";
import { describePrismaError } from "@/lib/prisma-errors";
import { nextUhid } from "@/lib/uhid";
import type { ActionResult } from "@/lib/types";

export type PatientHit = {
  id: string;
  uhid: string;
  name: string;
  age: number;
  gender: string;
  mobile: string;
};

const HIT_SELECT = {
  id: true,
  uhid: true,
  name: true,
  age: true,
  gender: true,
  mobile: true,
} as const;

/** RECEPTIONIST only — look up existing patients by name, UHID, or mobile. */
export async function searchPatients(query: string): Promise<PatientHit[]> {
  const q = query.trim();
  const result = await withRole("RECEPTIONIST", async () => {
    if (!q) {
      return prisma.patient.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: HIT_SELECT,
      });
    }
    return prisma.patient.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { uhid: { contains: q, mode: "insensitive" } },
          { mobile: { contains: q } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: HIT_SELECT,
    });
  });
  return result.ok ? result.data : [];
}

const GENDERS = ["Male", "Female", "Other"];

/** RECEPTIONIST only — register a patient with an auto-generated UHID. */
export async function createPatient(
  formData: FormData,
): Promise<ActionResult<{ id: string; uhid: string }>> {
  const name = String(formData.get("name") ?? "").trim();
  const ageRaw = String(formData.get("age") ?? "").trim();
  const gender = String(formData.get("gender") ?? "").trim();
  const mobile = String(formData.get("mobile") ?? "").trim();

  if (!name) return { ok: false, error: "Patient name is required." };
  const age = Number(ageRaw);
  if (!Number.isInteger(age) || age < 0 || age > 150) {
    return { ok: false, error: "Enter a valid age between 0 and 150." };
  }
  if (!GENDERS.includes(gender)) {
    return { ok: false, error: "Please select a gender." };
  }
  // Mobile is required: at least 10 digits after stripping spaces/+/-.
  if ((mobile.match(/\d/g) ?? []).length < 10) {
    return { ok: false, error: "Enter a valid mobile number (at least 10 digits)." };
  }

  try {
    const result = await withRole("RECEPTIONIST", async () => {
      // Generate the UHID and insert the patient atomically so concurrent
      // intakes can't claim the same sequence number.
      return prisma.$transaction(async (tx) => {
        const uhid = await nextUhid(tx);
        return tx.patient.create({
          data: { uhid, name, age, gender, mobile },
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
