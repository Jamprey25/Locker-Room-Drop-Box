import { formatMeetingDateTime } from "@/lib/meetings";

type MeetingEmailPayload = {
  title: string;
  scheduledAt: Date;
  notes: string | null;
  recipientEmails: string[];
};

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function meetingEmailFromAddress(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Locker Room Dropbox <onboarding@resend.dev>"
  );
}

function buildMeetingEmailHtml(payload: MeetingEmailPayload): string {
  const when = formatMeetingDateTime(payload.scheduledAt);
  const notesBlock = payload.notes?.trim()
    ? `<p style="margin:16px 0 0;color:#334155;"><strong>Notes:</strong><br/>${escapeHtml(payload.notes.trim()).replace(/\n/g, "<br/>")}</p>`
    : "";

  return `
    <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a;max-width:560px;">
      <p style="margin:0 0 12px;">Your study group confirmed a meeting time.</p>
      <p style="margin:0;font-size:18px;font-weight:600;">${escapeHtml(payload.title)}</p>
      <p style="margin:8px 0 0;color:#0369a1;">${escapeHtml(when)}</p>
      ${notesBlock}
      <p style="margin:24px 0 0;color:#64748b;font-size:14px;">
        Sent from Locker Room Dropbox.
      </p>
    </div>
  `.trim();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendMeetingConfirmationEmails(
  payload: MeetingEmailPayload
): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      error:
        "Email is not configured. Add RESEND_API_KEY (and RESEND_FROM_EMAIL) in Vercel.",
    };
  }

  const uniqueRecipients = [...new Set(payload.recipientEmails.map((e) => e.toLowerCase()))];
  if (uniqueRecipients.length === 0) {
    return { ok: false, error: "No member emails found to notify." };
  }

  const subject = `Meeting confirmed: ${payload.title}`;
  const html = buildMeetingEmailHtml(payload);
  const from = meetingEmailFromAddress();

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: uniqueRecipients,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[sendMeetingConfirmationEmails]", res.status, body);
      return {
        ok: false,
        error: "Could not send meeting emails. Check Resend settings.",
      };
    }

    return { ok: true };
  } catch (error) {
    console.error("[sendMeetingConfirmationEmails]", error);
    return {
      ok: false,
      error: "Could not reach the email provider.",
    };
  }
}
