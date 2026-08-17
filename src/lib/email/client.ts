import 'server-only';
import { Resend } from 'resend';
import type { EmailContent } from './templates';

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY!);
  }
  return resendClient;
}

// Sends one email and fails soft: any error (missing API key, Resend
// outage, invalid address, etc.) is logged and swallowed so callers —
// e.g. a Stripe webhook handler — never fail a booking because an email
// couldn't go out.
export async function sendEmailSafe(params: { to: string; content: EmailContent }): Promise<void> {
  const { to, content } = params;

  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    console.error(
      `[email] Skipping send to ${to} ("${content.subject}") — RESEND_API_KEY or RESEND_FROM_EMAIL is not set.`
    );
    return;
  }

  try {
    const { error } = await getResendClient().emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });

    if (error) {
      console.error(`[email] Resend returned an error sending to ${to} ("${content.subject}"):`, error);
    }
  } catch (err) {
    console.error(`[email] Failed to send email to ${to} ("${content.subject}"):`, err);
  }
}
