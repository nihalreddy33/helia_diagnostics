import Anthropic from "@anthropic-ai/sdk";

/**
 * Claude-powered drafting assistant for radiology reports. Takes the reporting
 * radiologist's rough findings notes + study context and returns a polished
 * findings section and a drafted impression. The radiologist always reviews and
 * edits before approving — this only produces a draft.
 */

const MODEL = "claude-sonnet-5";

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export type DraftInput = {
  /** The radiologist's rough / shorthand findings notes. */
  notes: string;
  /** Study description, e.g. "USG Abdomen & Pelvis" or "Chest X-Ray (PA View)". */
  study: string;
  /** Modality label, e.g. "Ultrasound (USG)". */
  modality: string;
  /** Patient age in years. */
  age: number;
  /** Patient gender. */
  gender: string;
};

export type DraftResult = { findings: string; impression: string };

const SYSTEM_PROMPT = `You are an experienced radiologist's reporting assistant at an Indian diagnostic centre. You help the reporting radiologist turn rough findings notes into a clean report draft.

Given the study context and the radiologist's rough notes, produce two sections:
1. "findings" — the notes rewritten as clear, professional radiological prose in standard reporting style.
2. "impression" — a concise clinical impression that follows from the findings.

Rules:
- Preserve every clinical fact, measurement, and observation the radiologist stated. Do NOT invent findings, measurements, diagnoses, or normal-organ boilerplate that the notes do not support.
- If the notes are sparse, keep both sections correspondingly brief. Never pad.
- Use British/Indian medical English and conventional radiology phrasing.
- Do not add patient identifiers, headings, salutations, disclaimers, or a signature — only the findings and impression text.
- This is a draft for a qualified radiologist to review and edit; accuracy and faithfulness to the notes matter more than fluency.`;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    findings: { type: "string" },
    impression: { type: "string" },
  },
  required: ["findings", "impression"],
  additionalProperties: false,
} as const;

/** Throws on misconfiguration, refusal, or malformed output; caller maps to ActionResult. */
export async function draftRadiologyReport(input: DraftInput): Promise<DraftResult> {
  if (!isAiConfigured()) throw new Error("AI_NOT_CONFIGURED");

  const client = new Anthropic({ timeout: 45_000, maxRetries: 1 });

  const userMessage = [
    `Study: ${input.study}`,
    `Modality: ${input.modality}`,
    `Patient: ${input.age} years, ${input.gender}`,
    "",
    "Radiologist's rough findings notes:",
    input.notes.trim(),
  ].join("\n");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    // Straightforward text-shaping task — disable thinking for a fast response.
    thinking: { type: "disabled" },
    system: SYSTEM_PROMPT,
    output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
    messages: [{ role: "user", content: userMessage }],
  });

  if (response.stop_reason === "refusal") throw new Error("AI_REFUSED");

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("AI_EMPTY");

  let parsed: DraftResult;
  try {
    parsed = JSON.parse(text.text) as DraftResult;
  } catch {
    throw new Error("AI_BAD_OUTPUT");
  }
  if (typeof parsed.findings !== "string" || typeof parsed.impression !== "string") {
    throw new Error("AI_BAD_OUTPUT");
  }
  return { findings: parsed.findings.trim(), impression: parsed.impression.trim() };
}
