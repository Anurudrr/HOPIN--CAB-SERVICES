# Supabase Functions

This repo uses Supabase as the backend runtime. The functions in this folder are
the server-side entrypoints for privileged or scheduled work that should not run
directly from the browser.

All function responses attach an `x-request-id` header for tracing.

## Functions

- `admin-review-driver-application`: authenticated admin-only review endpoint
- `submit-contact-message`: public contact form insert with server-side validation
- `subscribe-to-journal`: public newsletter subscription endpoint
- `ai-support-chat`: authenticated rider/driver AI support assistant
- `expire-rides`: cron-safe expiry job for stale scheduled rides
- `notify-booking-confirmed`: webhook-driven booking confirmation email sender

## Required Environment Variables

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY` for `ai-support-chat`
- `GROQ_MODEL` optional override for `ai-support-chat` (defaults to `llama3-8b-8192`)
- `BACKEND_CRON_SECRET` for `expire-rides`
- `RESEND_API_KEY` for `notify-booking-confirmed`
- `RESEND_FROM_EMAIL` optional sender override for `notify-booking-confirmed`
- `BOOKING_WEBHOOK_SECRET` optional shared secret for database webhook calls

## Observability

- `ai-support-chat` writes audit rows to `support_chat_events` when the latest
  migration chain is applied.
- Public and admin functions emit structured logs with a request id for easier
  incident tracing.
- `submit-contact-message` and `subscribe-to-journal` use IP-based hourly rate
  limiting when migration `017_public_function_rate_limits_and_notifications.sql`
  has been applied.

## Suggested Deployment Flow

```bash
supabase functions deploy admin-review-driver-application
supabase functions deploy submit-contact-message
supabase functions deploy subscribe-to-journal
supabase functions deploy ai-support-chat
supabase functions deploy expire-rides
supabase functions deploy notify-booking-confirmed
```

Run the new backend migration before deploying the functions:

```bash
supabase db push
```
