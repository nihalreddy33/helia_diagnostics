"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withRole } from "@/lib/auth";
import { describePrismaError } from "@/lib/prisma-errors";
import { nextUhid } from "@/lib/uhid";
import { logActivity } from "@/lib/activity";
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

/** Collapse whitespace and case so "MR  Vijay Kumar" == "Mr Vijay Kumar". */
function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * RECEPTIONIST only — patients already registered on a mobile number.
 *
 * One number legitimately covers a whole family here (and some numbers cover a
 * dozen unrelated patients), so this powers a warning at registration rather
 * than a hard uniqueness rule.
 */
export async function patientsOnMobile(mobile: string): Promise<PatientHit[]> {
  const normalized = normalizeMobile(mobile);
  if (!normalized) return [];
  const result = await withRole("RECEPTIONIST", async () =>
    prisma.patient.findMany({
      where: { mobile: normalized },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: HIT_SELECT,
    }),
  );
  return result.ok ? result.data : [];
}

/**
 * Normalize a mobile number to a 10-digit Indian mobile, accepting an optional
 * +91 country code or leading 0. Returns null if it isn't a valid mobile.
 */
function normalizeMobile(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

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
  // Mobile is required and must be a valid 10-digit mobile number.
  const normalizedMobile = normalizeMobile(mobile);
  if (!normalizedMobile) {
    return { ok: false, error: "Enter a valid 10-digit mobile number." };
  }

  try {
    const result = await withRole("RECEPTIONIST", async (user) => {
      // Re-registering the same person is almost always a mistake: it splits
      // their history across two UHIDs. Refuse an exact name + mobile repeat.
      // A shared number with a different name is a family member, so allowed.
      const sameNumber = await prisma.patient.findMany({
        where: { mobile: normalizedMobile },
        select: { uhid: true, name: true },
      });
      const clash = sameNumber.find((p) => normalizeName(p.name) === normalizeName(name));
      if (clash) throw new Error(`DUPLICATE:${clash.uhid}`);

      // Generate the UHID and insert the patient atomically so concurrent
      // intakes can't claim the same sequence number.
      const patient = await prisma.$transaction(async (tx) => {
        const uhid = await nextUhid(tx);
        return tx.patient.create({
          data: { uhid, name, age, gender, mobile: normalizedMobile },
          select: { id: true, uhid: true },
        });
      });
      await logActivity(
        { id: user.id, name: user.name, role: user.role },
        "PATIENT_REGISTERED",
        `${name} (${patient.uhid})`,
      );
      return patient;
    });
    if (result.ok) {
      revalidatePath("/receptionist");
      revalidatePath("/radiologist");
    }
    return result;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("DUPLICATE:")) {
      return {
        ok: false,
        error: `${name} is already registered on ${normalizedMobile} as ${err.message.slice(10)}. Search for that patient and bill them instead of registering again.`,
      };
    }
    return { ok: false, error: describePrismaError(err, "Could not register patient.") };
  }
}
