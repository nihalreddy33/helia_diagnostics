/**
 * Thin client for Interakt's WhatsApp Business API.
 * Sends a pre-approved template message. Docs:
 * https://www.interakt.shop/resource-center/how-to-send-whatsapp-templates-using-apis-webhooks/
 */

const ENDPOINT = "https://api.interakt.ai/v1/public/message/";

export type InteraktResult = { ok: true } | { ok: false; error: string };

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.INTERAKT_API_KEY && process.env.INTERAKT_TEMPLATE);
}

/**
 * Send a WhatsApp template message via Interakt.
 * `phone` must be the national 10-digit number (no country code / no spaces).
 * `bodyValues` fill the template's {{1}}, {{2}}, … placeholders in order.
 */
export async function sendInteraktTemplate(opts: {
  phone: string;
  bodyValues: string[];
  templateName?: string;
  languageCode?: string;
  countryCode?: string;
}): Promise<InteraktResult> {
  const apiKey = process.env.INTERAKT_API_KEY;
  const templateName = opts.templateName ?? process.env.INTERAKT_TEMPLATE;
  if (!apiKey || !templateName) {
    return { ok: false, error: "WhatsApp is not configured (set INTERAKT_API_KEY and INTERAKT_TEMPLATE)." };
  }

  const payload = {
    countryCode: opts.countryCode ?? "+91",
    phoneNumber: opts.phone,
    type: "Template",
    template: {
      name: templateName,
      languageCode: opts.languageCode ?? process.env.INTERAKT_TEMPLATE_LANG ?? "en",
      bodyValues: opts.bodyValues,
    },
  };

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Basic ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      // Don't let a hung upstream stall the whole request forever.
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return { ok: false, error: "Could not reach WhatsApp service. Please try again." };
  }

  const data = (await res.json().catch(() => null)) as { result?: boolean; message?: string } | null;

  if (!res.ok || (data && data.result === false)) {
    const detail = data?.message?.trim();
    if (res.status === 429) return { ok: false, error: "WhatsApp rate limit hit. Try again in a minute." };
    return { ok: false, error: detail ? `WhatsApp: ${detail}` : `WhatsApp send failed (${res.status}).` };
  }

  return { ok: true };
}
