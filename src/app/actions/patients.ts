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

/** Shared field validation for registering and editing a patient. */
function parsePatientFields(formData: FormData):
  | { ok: true; name: string; age: number; gender: string; mobile: string }
  | { ok: false; error: string } {
  const name = String(formData.get("name") ?? "").trim();
  const ageRaw = String(formData.get("age") ?? "").trim();
  const gender = String(formData.get("gender") ?? "").trim();
  const mobileRaw = String(formData.get("mobile") ?? "").trim();

  if (!name) return { ok: false, error: "Patient name is required." };
  const age = Number(ageRaw);
  if (!Number.isInteger(age) || age < 0 || age > 150) {
    return { ok: false, error: "Enter a valid age between 0 and 150." };
  }
  if (!GENDERS.includes(gender)) {
    return { ok: false, error: "Please select a gender." };
  }
  const mobile = normalizeMobile(mobileRaw);
  if (!mobile) {
    return { ok: false, error: "Enter a valid 10-digit mobile number." };
  }
  return { ok: true, name, age, gender, mobile };
}

/**
 * RECEPTIONIST only — correct a registered patient's details.
 *
 * Patients do ask for a name change (marriage, a misspelling taken at the desk),
 * and age/gender get keyed wrong. The UHID is never editable: it is printed on
 * past reports and shared links, so it has to stay the patient's fixed handle.
 *
 * Every change is written to the activity log field by field, because these
 * details appear on medical reports and an unexplained change should be
 * traceable to whoever made it.
 */
export async function updatePatient(
  formData: FormData,
): Promise<ActionResult<{ id: string; uhid: string }>> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Missing patient id." };

  const parsed = parsePatientFields(formData);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const { name, age, gender, mobile } = parsed;

  try {
    const result = await withRole("RECEPTIONIST", async (user) => {
      const existing = await prisma.patient.findUnique({
        where: { id },
        select: { uhid: true, name: true, age: true, gender: true, mobile: true },
      });
      if (!existing) throw new Error("NOT_FOUND");

      // Same rule as registration: an edit must not turn this patient into a
      // duplicate of another one on the same number. Self is excluded.
      const sameNumber = await prisma.patient.findMany({
        where: { mobile, id: { not: id } },
        select: { uhid: true, name: true },
      });
      const clash = sameNumber.find((p) => normalizeName(p.name) === normalizeName(name));
      if (clash) throw new Error(`DUPLICATE:${clash.uhid}`);

      const changes: string[] = [];
      if (existing.name !== name) changes.push(`name "${existing.name}" → "${name}"`);
      if (existing.age !== age) changes.push(`age ${existing.age} → ${age}`);
      if (existing.gender !== gender) changes.push(`gender ${existing.gender} → ${gender}`);
      if (existing.mobile !== mobile) changes.push(`mobile ${existing.mobile || "—"} → ${mobile}`);
      if (changes.length === 0) throw new Error("NO_CHANGES");

      const patient = await prisma.patient.update({
        where: { id },
        data: { name, age, gender, mobile },
        select: { id: true, uhid: true },
      });
      await logActivity(
        { id: user.id, name: user.name, role: user.role },
        "PATIENT_UPDATED",
        `${patient.uhid}: ${changes.join(", ")}`,
      );
      return patient;
    });

    if (result.ok) {
      // The patient's name rides on bills, worklists and shared reports.
      revalidatePath("/receptionist");
      revalidatePath("/receptionist/billing");
      revalidatePath("/radiologist");
      revalidatePath("/lab");
      revalidatePath("/admin/records");
    }
    return result;
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "That patient no longer exists." };
    }
    if (err instanceof Error && err.message === "NO_CHANGES") {
      return { ok: false, error: "Nothing changed." };
    }
    if (err instanceof Error && err.message.startsWith("DUPLICATE:")) {
      return {
        ok: false,
        error: `${name} is already registered on ${mobile} as ${err.message.slice(10)}. Two patients can't share a name and number.`,
      };
    }
    return { ok: false, error: describePrismaError(err, "Could not update the patient.") };
  }
}

/** RECEPTIONIST only — register a patient with an auto-generated UHID. */
export async function createPatient(
  formData: FormData,
): Promise<ActionResult<{ id: string; uhid: string }>> {
  const parsed = parsePatientFields(formData);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const { name, age, gender, mobile: normalizedMobile } = parsed;

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
