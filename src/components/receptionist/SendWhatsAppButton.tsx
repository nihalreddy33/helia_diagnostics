"use client";

import { useActionState } from "react";
import { sendWhatsApp } from "@/app/actions/whatsapp";
import { formatDateTimeIST } from "@/lib/types";
import type { ActionResult } from "@/lib/types";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { ShareKind } from "@/lib/share";

type State = (ActionResult<{ phone: string }> & { key: number }) | null;

async function action(prev: State, formData: FormData): Promise<State> {
  const result = await sendWhatsApp(formData);
  return { ...result, key: (prev?.key ?? 0) + 1 };
}

/**
 * "Send on WhatsApp" control for print/invoice pages. Fires the Interakt send
 * action and shows an inline confirmation. `sentAt` (if the document was sent
 * before) makes the button read "Resend" and shows a standing ✓. Hidden when
 * printing (.no-print).
 */
export function SendWhatsAppButton({
  kind,
  id,
  sentAt,
  sentCount = 0,
}: {
  kind: ShareKind;
  id: string;
  sentAt?: string | null;
  sentCount?: number;
}) {
  const [state, formAction] = useActionState<State, FormData>(action, null);
  const alreadySent = Boolean(sentAt);

  return (
    <div className="no-print flex flex-col items-end gap-1">
      <form
        action={formAction}
        onSubmit={(e) => {
          const msg = alreadySent
            ? "Resend this to the patient on WhatsApp?"
            : "Send this to the patient on WhatsApp?";
          if (!window.confirm(msg)) e.preventDefault();
        }}
      >
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="id" value={id} />
        <SubmitButton
          variant={alreadySent && !state?.ok ? "secondary" : "success"}
          pendingLabel="Sending…"
        >
          <span aria-hidden>↗</span> {alreadySent ? "Resend" : "WhatsApp"}
        </SubmitButton>
      </form>

      {state?.ok ? (
        <span role="status" className="text-xs font-medium text-emerald-700">
          ✓ Sent to {state.data.phone}
        </span>
      ) : alreadySent ? (
        <span className="text-xs text-emerald-700" title={sentCount > 1 ? `Sent ${sentCount} times` : undefined}>
          ✓ Sent {formatDateTimeIST(new Date(sentAt!))}
          {sentCount > 1 ? ` · ×${sentCount}` : ""}
        </span>
      ) : null}

      {state && !state.ok && (
        <span role="alert" className="max-w-[16rem] text-right text-xs text-red-600">
          {state.error}
        </span>
      )}
    </div>
  );
}
