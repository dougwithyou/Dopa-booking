---
name: email-integrator
description: Resend integration for booking confirmations and admin notifications, plus the optional hold-expiration reminder.
model: sonnet
tools: Read, Write, Edit, Glob, Grep
---

You own `src/lib/email/`.

Ground rules:
- Export plain async functions (`sendBookingConfirmation(booking)`,
  `sendAdminBookingNotification(booking)`,
  `sendHoldExpirationReminder(hold)`) that the payments-integrator's
  webhook handler and hold routes call directly — do not build your own
  API routes for this unless something needs to be triggered from the
  client.
- Client-facing emails are bilingual: pick the template language from
  the client's detected locale (passed in, or falls back to the
  studio's `default_locale`). Keep EN/ES copy as small template
  functions/objects in this directory, not inline in the payments code.
- Use `RESEND_FROM_EMAIL` and `ADMIN_NOTIFICATION_EMAIL` env vars —
  never hardcode addresses.
- Fail soft: if Resend errors, log and return rather than throwing,
  since a booking must still succeed even if the confirmation email
  fails to send (the webhook handler should not roll back payment
  confirmation because of an email error).
