import crypto from "node:crypto";

const SECRET = process.env.APP_SECRET ?? "helia-dev-insecure-secret-change-me";

export type ShareKind = "report" | "lab" | "bill";

/**
 * Build an unguessable, HMAC-signed token that encodes a record kind + id, so a
 * report/invoice can be viewed at a public URL without login. Not encrypted —
 * just tamper-proof: the id isn't secret, but the signature can't be forged.
 */
export function makeShareToken(kind: ShareKind, id: string): string {
  const payload = Buffer.from(`${kind}:${id}`).toString("base64url");
  const sig = crypto
    .createHmac("sha256", SECRET)
    .update(payload)
    .digest("base64url")
    .slice(0, 24);
  return `${payload}.${sig}`;
}

export function readShareToken(token: string): { kind: ShareKind; id: string } | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(payload)
    .digest("base64url")
    .slice(0, 24);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const [kind, id] = Buffer.from(payload, "base64url").toString().split(":");
  if ((kind !== "report" && kind !== "lab" && kind !== "bill") || !id) return null;
  return { kind, id };
}
