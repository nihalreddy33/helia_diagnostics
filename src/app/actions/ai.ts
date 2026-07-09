"use server";

import { withRole } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { draftRadiologyReport } from "@/lib/anthropic";
import type { ActionResult } from "@/lib/types";

/**
 * RADIOLOGIST only — draft a report from rough findings notes using Claude.
 * Returns polished findings + a drafted impression for the radiologist to
 * review and edit. Never approves anything on its own.
 */
export async function draftReport(input: {
  notes: string;
  study: string;
  modality: string;
  age: number;
  gender: string;
}): Promise<ActionResult<{ findings: string; impression: string }>> {
  const notes = (input.notes ?? "").trim();
  if (notes.length < 3) {
    return { ok: false, error: "Type a few findings first, then let AI draft the report." };
  }

  try {
    return await withRole("RADIOLOGIST", async (user) => {
      const draft = await draftRadiologyReport({
        notes,
        study: input.study || "Radiology study",
        modality: input.modality || "—",
        age: Number.isFinite(input.age) ? input.age : 0,
        gender: input.gender || "—",
      });
      await logActivity(
        { id: user.id, name: user.name, role: user.role },
        "AI_DRAFTED",
        input.study || "Radiology study",
      );
      return draft;
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "AI_NOT_CONFIGURED") {
        return { ok: false, error: "AI drafting isn't configured yet (set ANTHROPIC_API_KEY)." };
      }
      if (err.message === "AI_REFUSED") {
        return { ok: false, error: "The AI declined to draft this. Please write it manually." };
      }
      if (err.message === "AI_EMPTY" || err.message === "AI_BAD_OUTPUT") {
        return { ok: false, error: "The AI response couldn't be read. Please try again." };
      }
    }
    return { ok: false, error: "Could not reach the AI service. Please try again." };
  }
}
